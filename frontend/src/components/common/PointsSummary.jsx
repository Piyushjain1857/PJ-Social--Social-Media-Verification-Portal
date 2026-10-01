import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyPoints, fetchUserPoints } from '../../services/api';
import LevelBadge from '../gamification/LevelBadge';
import LevelProgress from '../gamification/LevelProgress';
import Leaderboard from '../gamification/Leaderboard';
import PointHistory from '../gamification/PointHistory';

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
 * PointsSummary Component
 * Upgraded User Dashboard Gamification section.
 * 
 * Shows:
 * ⭐ Total Points
 * 📈 Points earned this week
 * 📊 Points earned this month
 * ❤️ Likes, 💬 Comments, 📱 Stories
 * - Recent point activity
 * - Latest approved activities
 * - Current level
 * - Progress to next level (e.g. Level 3 — Contributor, 320 / 500 points, progress bar, 180 points remaining)
 */
export default function PointsSummary({ userId = null, compact = false, onNavigateToNav = null }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const loadPoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = userId ? await fetchUserPoints(userId) : await fetchMyPoints();
      if (res && res.success) {
        setData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load points data.');
      }
    } catch (err) {
      setError(err.message || 'Error loading points balance.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div className="skeleton" style={{ width: '160px', height: '24px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '12px' }} />
        </div>
        <div className="skeleton" style={{ height: '70px', borderRadius: '8px', marginBottom: '0.75rem' }} />
        <div className="skeleton" style={{ height: '110px', borderRadius: '8px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-error)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--status-error)', fontSize: '0.9rem' }}>⚠️ Unable to load points</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{error}</div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadPoints}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalPoints = data?.totalPoints ?? 0;
  const pointsThisWeek = data?.pointsThisWeek ?? 0;
  const pointsThisMonth = data?.pointsThisMonth ?? 0;
  const recentTransactions = data?.recentTransactions || [];
  const latestApprovedActivities = data?.latestApprovedActivities || [];
  const breakdown = data?.breakdown || {};
  const level = data?.level;

  const likeCount = breakdown.LIKE?.count ?? 0;
  const commentCount = breakdown.COMMENT?.count ?? 0;
  const storyCount = breakdown.STORY?.count ?? 0;

  return (
    <div
      className="glass-panel"
      style={{
        padding: compact ? '1rem' : '1.35rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.15rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header & Level Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🏆</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                Verification Points & Progress
              </h3>
              {level && <LevelBadge level={level} size="sm" />}
            </div>
            <p style={{ margin: '0.15rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
              Institutional points awarded upon admin verification: <strong>Like (+1)</strong>, <strong>Comment (+2)</strong>, <strong>Story (+2)</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLeaderboardModal(true)}
          className="btn-secondary"
          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
        >
          <span>🥇</span> Leaderboard & Ranks
        </button>
      </div>

      {/* Level Progress Bar */}
      {level && (
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <LevelProgress level={level} showBadge={false} />
        </div>
      )}

      {/* 3 Main Metric Boxes: Total, Week, Month */}
      <div className="points-card-stats-grid">
        <div className="points-stat-box" style={{ borderLeft: '3px solid #facc15' }}>
          <div className="points-stat-box-label">
            <span>⭐</span> Total Points
          </div>
          <div className="points-stat-box-value" style={{ color: '#fef08a' }}>
            {totalPoints.toLocaleString()}
          </div>
        </div>

        <div className="points-stat-box" style={{ borderLeft: '3px solid #38bdf8' }}>
          <div className="points-stat-box-label">
            <span>📈</span> This Week
          </div>
          <div className="points-stat-box-value" style={{ color: '#7dd3fc' }}>
            +{pointsThisWeek.toLocaleString()}
          </div>
        </div>

        <div className="points-stat-box" style={{ borderLeft: '3px solid #a855f7' }}>
          <div className="points-stat-box-label">
            <span>📊</span> This Month
          </div>
          <div className="points-stat-box-value" style={{ color: '#d8b4fe' }}>
            +{pointsThisMonth.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Action Breakdown: ❤️ Likes, 💬 Comments, 📱 Stories */}
      <div>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
          Approved Action Breakdown
        </div>
        <div className="points-breakdown-row">
          <div className="points-action-pill" title="1 point per verified like">
            <span>❤️</span>
            <span style={{ color: 'var(--text-secondary)' }}>Likes:</span>
            <strong>{likeCount}</strong>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({likeCount * 1} pts)</span>
          </div>

          <div className="points-action-pill" title="2 points per verified comment">
            <span>💬</span>
            <span style={{ color: 'var(--text-secondary)' }}>Comments:</span>
            <strong>{commentCount}</strong>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({commentCount * 2} pts)</span>
          </div>

          <div className="points-action-pill" title="2 points per verified story">
            <span>📱</span>
            <span style={{ color: 'var(--text-secondary)' }}>Stories:</span>
            <strong>{storyCount}</strong>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({storyCount * 2} pts)</span>
          </div>
        </div>
      </div>

      {/* Activity Feeds: Recent Point Awards & Latest Approved Activities */}
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.25rem' }}>
          {/* Recent Point Activity */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                ⚡ Recent Point Activity
              </span>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--primary-light)' }}
              >
                History →
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No points awarded yet. Submit proofs to earn!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {recentTransactions.slice(0, 3).map((tx) => {
                  const icon = ACTION_ICONS[tx.actionType] || '⭐';
                  const color = ACTION_COLORS[tx.actionType] || '#facc15';
                  const isPositive = tx.points >= 0;

                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span>{icon}</span>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          <span style={{ color: 'var(--text-highlight)', fontWeight: 600 }}>{tx.actionType}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '0.35rem' }}>{formatDate(tx.createdAt)}</span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: isPositive ? '#34d399' : '#f43f5e' }}>
                        {isPositive ? `+${tx.points}` : tx.points} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latest Approved Activities */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                ✅ Latest Approved Activities
              </span>
              {onNavigateToNav && (
                <button
                  type="button"
                  onClick={() => onNavigateToNav('my-submissions')}
                  className="btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--primary-light)' }}
                >
                  Submissions →
                </button>
              )}
            </div>

            {latestApprovedActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No approved activities yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {latestApprovedActivities.slice(0, 3).map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      <span style={{ color: 'var(--text-highlight)', fontWeight: 600 }}>{sub.platform} {sub.actionType}</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Verified {formatDate(sub.updatedAt || sub.createdAt)}
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.64rem', padding: '0.1rem 0.35rem' }}>
                      APPROVED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Leaderboard Modal ─── */}
      {showLeaderboardModal && (
        <div className="points-adjust-modal-overlay" onClick={() => setShowLeaderboardModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.5rem',
              position: 'relative',
              borderRadius: 'var(--radius-lg)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowLeaderboardModal(false)}
                style={{ fontSize: '1.2rem', padding: '0.2rem 0.6rem' }}
              >
                ✕
              </button>
            </div>
            <Leaderboard />
          </div>
        </div>
      )}

      {/* ─── Point History Modal ─── */}
      {showHistoryModal && (
        <div className="points-adjust-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.5rem',
              position: 'relative',
              borderRadius: 'var(--radius-lg)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowHistoryModal(false)}
                style={{ fontSize: '1.2rem', padding: '0.2rem 0.6rem' }}
              >
                ✕
              </button>
            </div>
            <PointHistory />
          </div>
        </div>
      )}
    </div>
  );
}
