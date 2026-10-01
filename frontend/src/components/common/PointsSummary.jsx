import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyPoints, fetchUserPoints } from '../../services/api';

const ACTION_ICONS = {
  LIKE: '❤️',
  COMMENT: '💬',
  STORY: '📸',
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
 * Reusable PointsSummary Component
 * Displays total verified points, recent point awards, action breakdown, and point values.
 * Supports loading, error, and empty states.
 */
export default function PointsSummary({ userId = null, compact = false, onNavigateToNav = null }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <div style={{ width: '140px', height: '22px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
          <div style={{ width: '60px', height: '28px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
        </div>
        <div style={{ height: '70px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '0.75rem' }} />
        <div style={{ height: '110px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }} />
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
  const recentTransactions = data?.recentTransactions || [];
  const breakdown = data?.breakdown || {};

  return (
    <div
      className="glass-panel"
      style={{
        padding: compact ? '1rem' : '1.35rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header & Total Points */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🏆</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
              Verification Points
            </h3>
          </div>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            Earn points when your activity proof is approved by college administrators.
          </p>
        </div>

        {/* Total Points Big Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.35rem',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.18), rgba(249, 115, 22, 0.18))',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            padding: '0.45rem 1rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.1)'
          }}
        >
          <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#facc15', letterSpacing: '-0.02em' }}>
            {totalPoints}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fde047', textTransform: 'uppercase' }}>
            Pts
          </span>
        </div>
      </div>

      {/* Point Rules Legend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          padding: '0.65rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>❤️ Like</span>
          <span style={{ fontWeight: 700, color: '#ec4899', background: 'rgba(236, 72, 153, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>+1 pt</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>💬 Comment</span>
          <span style={{ fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>+2 pts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>📸 Story</span>
          <span style={{ fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>+2 pts</span>
        </div>
      </div>

      {/* Activity Breakdown Pills */}
      {!compact && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.entries(breakdown).map(([action, stats]) => {
            if (!stats || (stats.count === 0 && stats.points === 0)) return null;
            const icon = ACTION_ICONS[action] || '⚡';
            const color = ACTION_COLORS[action] || 'var(--text-highlight)';
            return (
              <div
                key={action}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.76rem'
                }}
              >
                <span>{icon}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{action}:</span>
                <span style={{ fontWeight: 700, color }}>{stats.points} pts</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({stats.count})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Earned Points List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-highlight)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recent Points Activity
          </span>
          <button
            type="button"
            onClick={loadPoints}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Refresh Points"
          >
            🔄 Refresh
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              border: '1px dashed rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>🪙</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              No points awarded yet
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Pending and rejected submissions do not award points. Submit activity proof to earn!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {recentTransactions.map((tx) => {
              const icon = ACTION_ICONS[tx.actionType] || '⚡';
              const color = ACTION_COLORS[tx.actionType] || '#facc15';
              const isPositive = tx.points >= 0;

              return (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span style={{ fontSize: '1rem' }}>{icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-highlight)',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: compact ? '200px' : '320px'
                        }}
                        title={tx.description}
                      >
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ color }}>{tx.actionType}</span>
                        <span>•</span>
                        <span>{formatDate(tx.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Points pill */}
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      padding: '0.15rem 0.55rem',
                      borderRadius: '4px',
                      background: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isPositive ? '#4ade80' : '#f87171',
                      border: `1px solid ${isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isPositive ? `+${tx.points}` : tx.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
