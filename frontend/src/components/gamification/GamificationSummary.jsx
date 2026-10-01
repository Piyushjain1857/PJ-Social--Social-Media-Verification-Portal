import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyGamification, fetchUserGamification, fetchMyXPHistory } from '../../services/gamificationApi';
import LevelProgressCard from './LevelProgressCard';
import LevelJourneySection from './LevelJourneySection';

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
 * Master gamification display:
 * - Level Progress Card (premium)
 * - Level Journey Section (all levels)
 * - XP History Ledger
 */
export default function GamificationSummary({ userId = null, onNavigateToNav = null }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="skeleton" style={{ width: '220px', height: '28px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ width: '100px', height: '24px', borderRadius: '12px' }} />
          </div>
          <div className="skeleton" style={{ height: '90px', borderRadius: '10px', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '14px', borderRadius: '7px', marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ height: '12px', borderRadius: '7px', width: '65%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--status-error)' }}>
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
    nextLevelName = null,
    nextLevelRequiredXP = 250,
    xpIntoCurrentLevel = 0,
    xpRemaining = 250,
    progressPercentage = 0,
    icon = '🌱',
    isMaxLevel = false,
    currentLevelStartXP = 0,
  } = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Premium Level Progress Card */}
      <LevelProgressCard
        totalXP={totalXP}
        currentLevel={currentLevel}
        levelName={levelName}
        icon={icon}
        nextLevel={nextLevel}
        nextLevelName={nextLevelName}
        nextLevelRequiredXP={nextLevelRequiredXP}
        xpIntoCurrentLevel={xpIntoCurrentLevel}
        xpRemaining={xpRemaining}
        progressPercentage={progressPercentage}
        isMaxLevel={isMaxLevel}
        currentLevelStartXP={currentLevelStartXP}
        onViewJourney={() => setShowJourney(v => !v)}
      />

      {/* Level Journey Section (toggleable) */}
      {showJourney && !userId && (
        <LevelJourneySection />
      )}

      {/* XP Earning Rules */}
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(236, 72, 153, 0.25)', fontWeight: 600 }}>
            ❤️ LIKE: +1 XP
          </span>
          <span style={{ fontSize: '0.74rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)', fontWeight: 600 }}>
            💬 COMMENT: +2 XP
          </span>
          <span style={{ fontSize: '0.74rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.25)', fontWeight: 600 }}>
            📱 STORY: +2 XP
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowHistory(!showHistory)}
            style={{ fontSize: '0.74rem', padding: '0.2rem 0.6rem', gap: '0.3rem' }}
          >
            📜 {showHistory ? 'Hide History' : 'XP History'}
          </button>
        </div>
      </div>

      {/* Toggleable XP History View */}
      {showHistory && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
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
