/**
 * Gamification Real-Time Client with Safe Fallback & Auto-Reconnect
 * 
 * Features:
 * - Server-Sent Events (SSE) connection with automatic token authentication
 * - Real-time event dispatching: XP updates, Level-ups, Rules updates, Leaderboard changes
 * - Safe fallback invalidation polling if SSE is disconnected
 * - Tab visibility change listener: immediately synchronizes stale state upon tab focus
 * - Dispatches custom browser window events for seamless decoupling
 */

import { fetchGamificationSyncState } from './gamificationApi';

class GamificationRealtimeClient {
  constructor() {
    this.eventSource = null;
    this.token = null;
    this.currentUser = null;
    this.isConnected = false;
    this.lastSyncTimestamp = new Date().toISOString();
    this.fallbackPollTimer = null;
    this.subscribers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 15000;
    this.levelUpDedupeSet = new Set();

    // Listen for tab focus / visibility change to heal stale state
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.token) {
          this.triggerFallbackSync();
        }
      });
    }
  }

  /**
   * Subscribe a listener callback
   * @param {Function} callback - (eventName, payload) => void
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(eventName, payload) {
    this.subscribers.forEach((cb) => {
      try {
        cb(eventName, payload);
      } catch (err) {
        console.warn('[RealtimeClient] Subscriber error:', err);
      }
    });

    // Also dispatch a global window event for components that listen directly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`gamification:${eventName}`, { detail: payload }));
    }
  }

  /**
   * Connect to real-time events stream
   */
  connect(token, user) {
    if (!token) return;
    this.token = token;
    this.currentUser = user;

    // Disconnect any existing session
    this.disconnect(false);

    try {
      const url = `/api/gamification/events?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.stopFallbackPolling();
      };

      this.eventSource.addEventListener('connected', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.isConnected = true;
          this.lastSyncTimestamp = data.serverTime || new Date().toISOString();
        } catch (err) {
          // ignore
        }
      });

      // 1. XP Updated (Total XP, level, progress, rank, recent XP)
      this.eventSource.addEventListener('xp_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.lastSyncTimestamp = data.timestamp || new Date().toISOString();
          this.notifySubscribers('xp_updated', data);
        } catch (err) {
          console.warn('[RealtimeClient] Error parsing xp_updated:', err);
        }
      });

      // 2. Level Up Celebration (🎉 Level Up!)
      this.eventSource.addEventListener('level_up', (e) => {
        try {
          const data = JSON.parse(e.data);
          // Deduplicate by level and timestamp to prevent duplicate celebration modals
          const dedupeKey = `${data.userId}_${data.currentLevel}_${Math.floor(Date.now() / 5000)}`;
          if (!this.levelUpDedupeSet.has(dedupeKey)) {
            this.levelUpDedupeSet.add(dedupeKey);
            setTimeout(() => this.levelUpDedupeSet.delete(dedupeKey), 10000);
            this.notifySubscribers('level_up', data);
          }
        } catch (err) {
          console.warn('[RealtimeClient] Error parsing level_up:', err);
        }
      });

      // 3. Admin / Super Admin live user XP update
      this.eventSource.addEventListener('admin_user_xp_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.notifySubscribers('admin_user_xp_updated', data);
        } catch (err) {
          console.warn('[RealtimeClient] Error parsing admin_user_xp_updated:', err);
        }
      });

      // 4. Super Admin changed XP rules
      this.eventSource.addEventListener('rules_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.notifySubscribers('rules_updated', data);
        } catch (err) {
          console.warn('[RealtimeClient] Error parsing rules_updated:', err);
        }
      });

      // 5. Leaderboard shift
      this.eventSource.addEventListener('leaderboard_updated', (e) => {
        try {
          const data = e.data ? JSON.parse(e.data) : {};
          this.notifySubscribers('leaderboard_updated', data);
        } catch (err) {
          this.notifySubscribers('leaderboard_updated', {});
        }
      });

      this.eventSource.onerror = () => {
        this.isConnected = false;
        // Start safe fallback polling when SSE encounters issues
        this.startFallbackPolling();
      };
    } catch (err) {
      console.warn('[RealtimeClient] EventSource init failed, activating fallback polling:', err.message);
      this.startFallbackPolling();
    }
  }

  /**
   * Safe Fallback Polling when WebSockets or SSE are unavailable/disconnected
   */
  startFallbackPolling() {
    if (this.fallbackPollTimer) return;
    this.fallbackPollTimer = setInterval(() => {
      this.triggerFallbackSync();
    }, 8000); // 8-second interval
  }

  stopFallbackPolling() {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
  }

  async triggerFallbackSync() {
    if (!this.token) return;
    try {
      const res = await fetchGamificationSyncState(this.lastSyncTimestamp);
      if (res && res.success && res.data) {
        const { hasChanged, profile, rank, serverTime } = res.data;
        if (hasChanged && profile) {
          this.lastSyncTimestamp = serverTime || new Date().toISOString();
          this.notifySubscribers('xp_updated', {
            userId: this.currentUser?.id,
            totalXP: profile.totalXP,
            currentLevel: profile.currentLevel,
            levelName: profile.levelName,
            icon: profile.icon,
            progressPercentage: profile.progressPercentage,
            xpRemaining: profile.xpRemaining,
            rank: rank?.rank,
            recentXP: profile.recentXP,
            timestamp: this.lastSyncTimestamp,
            isFallback: true
          });
        }
      }
    } catch (err) {
      // Non-fatal fallback poll error
    }
  }

  disconnect(clearToken = true) {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.stopFallbackPolling();
    this.isConnected = false;
    if (clearToken) {
      this.token = null;
      this.currentUser = null;
    }
  }
}

// Global Singleton Instance
export const gamificationRealtimeClient = new GamificationRealtimeClient();

export default gamificationRealtimeClient;
