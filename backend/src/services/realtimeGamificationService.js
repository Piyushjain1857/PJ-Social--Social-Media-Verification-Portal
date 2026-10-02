/**
 * Real-Time Gamification Event Service
 * 
 * Manages Server-Sent Events (SSE) connections for real-time updates across:
 * - USER: Live XP progression, Level Up celebrations, rank updates, and history refresh
 * - ADMIN: Real-time user points table updates and dossier synchronization
 * - SUPER ADMIN: Global telemetry, rule propagation, and live audit tracking
 * 
 * Includes heartbeat ping, client registry, auto-cleanup on disconnect,
 * and seamless fallback polling synchronization.
 */

class RealtimeGamificationService {
  constructor() {
    // Map of connectionId -> { id, userId, role, res, connectedAt }
    this.clients = new Map();
    this.connectionCounter = 0;
    this.heartbeatInterval = null;

    // Start heartbeat to keep SSE connections alive across reverse proxies / browsers
    this.startHeartbeat();
  }

  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        try {
          client.res.write(':keepalive-ping\n\n');
        } catch (err) {
          this.removeClient(client.id);
        }
      });
    }, 25000); // 25s keepalive
  }

  /**
   * Register a new SSE client
   */
  addClient(req, res, user) {
    this.connectionCounter += 1;
    const connectionId = `conn_${Date.now()}_${this.connectionCounter}`;

    const client = {
      id: connectionId,
      userId: user.id,
      role: user.role,
      res,
      connectedAt: new Date().toISOString()
    };

    this.clients.set(connectionId, client);

    // Initial connection event with handshake and reconnection directive
    res.write('retry: 3000\n');
    res.write(`event: connected\ndata: ${JSON.stringify({
      connectionId,
      userId: user.id,
      role: user.role,
      status: 'CONNECTED',
      serverTime: new Date().toISOString()
    })}\n\n`);

    // Clean up when client disconnects
    req.on('close', () => {
      this.removeClient(connectionId);
    });

    return connectionId;
  }

  removeClient(connectionId) {
    if (this.clients.has(connectionId)) {
      this.clients.delete(connectionId);
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  /**
   * Send SSE payload to a specific connection
   */
  sendToClient(client, eventType, data) {
    try {
      client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      this.removeClient(client.id);
    }
  }

  /**
   * Broadcast XP update event to:
   * 1. The specific user (all their active sessions)
   * 2. All connected ADMIN and SUPER_ADMIN sessions (so their tables/dashboards update live)
   */
  broadcastUserXPUpdated(userId, payload) {
    const eventData = {
      ...payload,
      userId,
      type: 'XP_UPDATED',
      timestamp: payload.timestamp || new Date().toISOString()
    };

    this.clients.forEach((client) => {
      // Direct recipient user
      if (client.userId === userId) {
        this.sendToClient(client, 'xp_updated', eventData);
      }
      // Admins and Super Admins tracking users
      if (client.role === 'ADMIN' || client.role === 'SUPER_ADMIN') {
        this.sendToClient(client, 'admin_user_xp_updated', eventData);
      }
    });
  }

  /**
   * Broadcast Level-Up celebration event directly to the recipient user
   */
  broadcastLevelUp(userId, payload) {
    const eventData = {
      ...payload,
      userId,
      type: 'LEVEL_UP',
      celebrationTitle: '🎉 Level Up!',
      timestamp: payload.timestamp || new Date().toISOString()
    };

    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.sendToClient(client, 'level_up', eventData);
      }
    });
  }

  /**
   * Broadcast XP rule configuration change
   * Notifies all roles (User, Admin, Super Admin)
   */
  broadcastRulesUpdated(payload) {
    const eventData = {
      ...payload,
      type: 'XP_RULES_UPDATED',
      timestamp: payload.timestamp || new Date().toISOString()
    };

    this.clients.forEach((client) => {
      this.sendToClient(client, 'rules_updated', eventData);
    });
  }

  /**
   * Broadcast leaderboard refresh event to all connected clients
   */
  broadcastLeaderboardUpdated() {
    const eventData = {
      type: 'LEADERBOARD_UPDATED',
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client) => {
      this.sendToClient(client, 'leaderboard_updated', eventData);
    });
  }
}

// Singleton instance
const realtimeGamificationService = new RealtimeGamificationService();

module.exports = realtimeGamificationService;
