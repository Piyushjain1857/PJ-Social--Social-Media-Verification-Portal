import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchLeaderboard } from '../../services/api';
import LevelBadge from './LevelBadge';

const MEDALS = {
  1: '🥇',
  2: '🥈',
  3: '🥉'
};

/**
 * Leaderboard Component
 * Portal-wide leaderboard with timeframe filters, podium display for top 3, and paginated table.
 */
export default function Leaderboard({ onSelectUser = null }) {
  const { user: currentUser } = useAuth();
  const [timeframe, setTimeframe] = useState('all_time');
  const [leaderboard, setLeaderboard] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalUsers: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchLeaderboard({
        timeframe,
        page: pagination.page,
        limit: 15
      });

      if (res && res.success) {
        // Support res.data as array or res.data.leaderboard
        const list = Array.isArray(res.data) ? res.data : (res.data?.leaderboard || []);
        setLeaderboard(list);
        if (res.pagination) {
          setPagination(res.pagination);
        } else if (res.data?.pagination) {
          setPagination(res.data.pagination);
        }
      } else {
        throw new Error(res?.message || 'Failed to retrieve portal leaderboard.');
      }
    } catch (err) {
      setError(err.message || 'Error loading leaderboard rankings.');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, pagination.page]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleTimeframeChange = (newTf) => {
    setTimeframe(newTf);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const topThree = pagination.page === 1 ? leaderboard.slice(0, 3) : [];
  const firstPlace = topThree.find(u => u.rank === 1);
  const secondPlace = topThree.find(u => u.rank === 2);
  const thirdPlace = topThree.find(u => u.rank === 3);

  return (
    <div className="leaderboard-container">
      {/* Top Header & Timeframe Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
            🏆 Portal Leaderboard
          </h3>
          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Ranked community creators by approved institutional activity points
          </p>
        </div>

        {/* Timeframe Tabs */}
        <div className="leaderboard-timeframe-tabs" role="tablist" aria-label="Leaderboard timeframe">
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'all_time'}
            className={`leaderboard-timeframe-tab ${timeframe === 'all_time' ? 'active' : ''}`}
            onClick={() => handleTimeframeChange('all_time')}
          >
            All Time
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'this_month'}
            className={`leaderboard-timeframe-tab ${timeframe === 'this_month' ? 'active' : ''}`}
            onClick={() => handleTimeframeChange('this_month')}
          >
            This Month
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'this_week'}
            className={`leaderboard-timeframe-tab ${timeframe === 'this_week' ? 'active' : ''}`}
            onClick={() => handleTimeframeChange('this_week')}
          >
            This Week
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: 'var(--status-error-bg)', border: '1px solid var(--status-error)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.84rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Podium for Top 3 (Only shown on Page 1 when top users exist) */}
      {!isLoading && topThree.length >= 2 && pagination.page === 1 && (
        <div className="leaderboard-podium">
          {/* 2nd Place */}
          {secondPlace && (
            <div className="podium-card second">
              <div className="podium-avatar">
                {secondPlace.name?.charAt(0).toUpperCase() || 'U'}
                <span className="podium-medal">🥈</span>
              </div>
              <div className="podium-name" title={secondPlace.name}>
                {secondPlace.name}
              </div>
              <div className="podium-points">
                {(timeframe === 'all_time' ? secondPlace.totalPoints : secondPlace.periodPoints).toLocaleString()} pts
              </div>
              <LevelBadge level={secondPlace.level} size="sm" showNumber={false} />
            </div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <div className="podium-card first">
              <div className="podium-avatar">
                {firstPlace.name?.charAt(0).toUpperCase() || 'U'}
                <span className="podium-medal">🥇</span>
              </div>
              <div className="podium-name" title={firstPlace.name}>
                {firstPlace.name}
              </div>
              <div className="podium-points">
                {(timeframe === 'all_time' ? firstPlace.totalPoints : firstPlace.periodPoints).toLocaleString()} pts
              </div>
              <LevelBadge level={firstPlace.level} size="sm" showNumber={false} />
            </div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <div className="podium-card third">
              <div className="podium-avatar">
                {thirdPlace.name?.charAt(0).toUpperCase() || 'U'}
                <span className="podium-medal">🥉</span>
              </div>
              <div className="podium-name" title={thirdPlace.name}>
                {thirdPlace.name}
              </div>
              <div className="podium-points">
                {(timeframe === 'all_time' ? thirdPlace.totalPoints : thirdPlace.periodPoints).toLocaleString()} pts
              </div>
              <LevelBadge level={thirdPlace.level} size="sm" showNumber={false} />
            </div>
          )}
        </div>
      )}

      {/* Main Leaderboard Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '8px' }} />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏅</div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            No ranked creators for this timeframe
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
            Be the first to submit approved social engagement to lead the board!
          </p>
        </div>
      ) : (
        <div className="leaderboard-table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                <th>Creator</th>
                <th>Level</th>
                <th style={{ textAlign: 'center' }}>Approved Tasks</th>
                <th style={{ textAlign: 'right' }}>
                  {timeframe === 'all_time' ? 'Total Points' : 'Period Points'}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => {
                const isCurrent = currentUser && currentUser.id === row.userId;
                const points = (timeframe === 'all_time' ? row.totalPoints : row.periodPoints) ?? 0;
                const medal = MEDALS[row.rank];

                return (
                  <tr
                    key={row.userId}
                    className={isCurrent ? 'current-user-row' : ''}
                    style={{ cursor: onSelectUser ? 'pointer' : 'default' }}
                    onClick={() => onSelectUser && onSelectUser(row.userId)}
                  >
                    <td className={`leaderboard-rank-col rank-${row.rank}`} style={{ textAlign: 'center' }}>
                      {medal ? (
                        <span style={{ fontSize: '1.25rem' }} title={`Rank #${row.rank}`}>{medal}</span>
                      ) : (
                        `#${row.rank}`
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isCurrent ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700
                          }}
                        >
                          {row.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{row.name}</span>
                            {isCurrent && (
                              <span className="badge badge-primary" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <LevelBadge level={row.level} size="sm" />
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                      {row.approvedSubmissionsCount ?? '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#facc15' }}>
                      {points.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalUsers} total)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
