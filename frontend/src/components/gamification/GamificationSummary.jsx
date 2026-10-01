import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyGamification, fetchUserGamification, fetchMyXPHistory } from '../../services/gamificationApi';

const ACTION_ICONS = {
  LIKE: '❤️',
  COMMENT: '💬',
  STORY: '📱',
  BONUS: '🎁',
  ADJUSTMENT: '⚖️'
};

const ACTION_COLORS = {
  LIKE: '#ec4899',
  COMMENT: '#3b82f6',
  STORY: '#a855f7',
  BONUS: '#eab308',
  ADJUSTMENT: '#f97316'
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * GamificationSummary Component
 * Displays user's XP, Level progression, dynamic thresholds, and XP history.
 *
 * Shows:
 * ⭐ Total XP
 * 🏆 Current Level
 * 📈 Progress to next level
 * ⚡ XP remaining
 *
 * Example:
 * LEVEL 16
 * Contributor
 * 3,820 XP
 * ██████████████░░░░░
 * 180 XP to Level 17
 */
export default function GamificationSummary({ userId = null, onNavigateToNav = null }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });

  const loadGamification = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = userId ? await fetchUserGamification(userId) : await fetchMyGamification();
      if (res && res.success) {
        setData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load gamification data.');
      }
    } catch (err) {
      setError(err.message || 'Error loading XP & Level details.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await fetchMyXPHistory({ page, limit: 8 });
      if (res && res.success) {
        setHistory(res.data || []);
        if (res.pagination) {
          setHistoryPagination(res.pagination);
          setHistoryPage(res.pagination.page);
        }
      }
    } catch (err) {
      console.warn('Could not load XP history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGamification();
  }, [loadGamification]);

  useEffect(() => {
    if (showHistory) {
      loadHistory(historyPage);
    }
  }, [showHistory, historyPage, loadHistory]);

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="skeleton" style={{ width: '180px', height: '24px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '90px', height: '28px', borderRadius: '12px' }} />
        </div>
        <div className="skeleton" style={{ height: '80px', borderRadius: '8px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '14px', borderRadius: '7px', marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ width: '140px', height: '18px', borderRadius: '4px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--status-error)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--status-error)', fontSize: '0.95rem' }}>⚠️ Unable to load XP System</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{error}</div>
          </div>
          <button type="button" className="btn-secondary" onClick={loadGamification} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalXP = 0,
    currentLevel = 1,
    levelName = 'Novice',
    nextLevel = 2,
    nextLevelRequiredXP = 250,
    xpIntoCurrentLevel = 0,
    xpRemaining = 250,
    progressPercentage = 0,
    icon = '🌱',
    isMaxLevel = false
  } = data || {};

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.75rem 1.5rem',
        marginBottom: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(135deg, rgba(20, 24, 38, 0.95) 0%, rgba(13, 17, 28, 0.98) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
      }}
    >
      {/* Background Decorative Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-30px',
          left: '10%',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}
          >
            {icon || '🏆'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.25)'
                }}
              >
                LEVEL {currentLevel}
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
                {levelName}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Institutional Gamification & Activity Level Engine
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowHistory(!showHistory)}
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', gap: '0.35rem' }}
          >
            <span>📜</span> {showHistory ? 'Hide XP History' : 'View XP History'}
          </button>
        </div>
      </div>

      {/* Main Focus: Level, Title, XP, Progress Bar */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '12px',
          padding: '1.35rem',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
              LEVEL {currentLevel}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {levelName}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#facc15', lineHeight: 1, textShadow: '0 2px 10px rgba(250, 204, 21, 0.25)' }}>
              {totalXP.toLocaleString()} <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fef08a' }}>XP</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Verified Cumulative Activity Score
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
          <div
            style={{
              height: '14px',
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '7px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
                background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #a855f7 100%)',
                borderRadius: '7px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.45)'
              }}
            />
          </div>
        </div>

        {/* Progress Footer: 180 XP to Level 17 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.82rem' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
            {isMaxLevel ? (
              <span style={{ color: '#facc15' }}>👑 Maximum Level Reached!</span>
            ) : (
              <span>
                <strong style={{ color: '#38bdf8' }}>{xpRemaining.toLocaleString()} XP</strong> to Level {nextLevel}
              </span>
            )}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
            {xpIntoCurrentLevel.toLocaleString()} / {nextLevelRequiredXP?.toLocaleString() || 250} XP ({progressPercentage}%)
          </div>
        </div>
      </div>

      {/* 4 Stats Cards Grid: Total XP, Current Level, Progress, XP Remaining */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeft: '3px solid #facc15',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem'
          }}
        >
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
            ⭐ Total XP
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fef08a', marginTop: '0.2rem' }}>
            {totalXP.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeft: '3px solid #38bdf8',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem'
          }}
        >
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
            🏆 Current Level
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7dd3fc', marginTop: '0.2rem' }}>
            Lvl {currentLevel}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeft: '3px solid #a855f7',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem'
          }}
        >
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
            📈 Progress
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d8b4fe', marginTop: '0.2rem' }}>
            {progressPercentage}%
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeft: '3px solid #34d399',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem'
          }}
        >
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
            ⚡ XP Remaining
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#6ee7b7', marginTop: '0.2rem' }}>
            {isMaxLevel ? '0' : xpRemaining.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Rules Explainer Banner */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-highlight)' }}>XP Earning Rules:</strong> Earn XP exclusively through verified social activities approved by moderators.
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(236, 72, 153, 0.25)', fontWeight: 600 }}>
            ❤️ LIKE: +1 XP
          </span>
          <span style={{ fontSize: '0.74rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)', fontWeight: 600 }}>
            💬 COMMENT: +2 XP
          </span>
          <span style={{ fontSize: '0.74rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.25)', fontWeight: 600 }}>
            📱 STORY: +2 XP
          </span>
        </div>
      </div>

      {/* Toggleable XP History View */}
      {showHistory && (
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
              XP Transactions Ledger ({historyPagination.totalCount} total)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Page {historyPagination.page} of {historyPagination.totalPages}
            </span>
          </div>

          {historyLoading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading XP transactions...
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No XP transactions recorded yet. Submit activity proofs to begin earning XP!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.map((tx) => {
                const icon = ACTION_ICONS[tx.actionType] || '⚡';
                const color = ACTION_COLORS[tx.actionType] || '#38bdf8';
                const xpValue = tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points;

                return (
                  <div
                    key={tx.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                          {tx.description || `${tx.actionType} verified`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {formatDate(tx.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color,
                        background: `${color}18`,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        border: `1px solid ${color}35`
                      }}
                    >
                      +{xpValue} XP
                    </div>
                  </div>
                );
              })}

              {/* Pagination controls */}
              {historyPagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={historyPage >= historyPagination.totalPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
