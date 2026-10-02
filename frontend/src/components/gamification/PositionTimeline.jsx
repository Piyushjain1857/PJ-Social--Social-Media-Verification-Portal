import React, { useState, useEffect } from 'react';
import { fetchMyRankHistory, fetchUserRankHistory } from '../../services/gamificationApi';

export default function PositionTimeline({ userId = null }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadRankHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = userId
          ? await fetchUserRankHistory(userId)
          : await fetchMyRankHistory();
        if (isMounted) {
          if (res && res.success) {
            setData(res.data);
          } else {
            throw new Error(res?.message || 'Failed to load position history.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error loading position timeline.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRankHistory();
    return () => { isMounted = false; };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="gamepoints-rank-timeline-card glass-panel">
        <div className="skeleton" style={{ height: '24px', width: '220px', borderRadius: '4px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '10px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gamepoints-rank-timeline-card glass-panel" style={{ borderLeft: '4px solid var(--status-error)' }}>
        <div style={{ color: 'var(--status-error)', fontSize: '0.9rem' }}>⚠️ {error}</div>
      </div>
    );
  }

  const {
    timeline = [],
    currentRank = 1,
    initialRank = 1,
    rankChange = 0,
    trend = 'stable',
    summary = ''
  } = data || {};

  const isUpward = trend === 'upward';
  const isDownward = trend === 'downward';

  return (
    <div className="gamepoints-rank-timeline-card glass-panel" id="position-timeline-section">
      {/* Section Header */}
      <div className="gamepoints-timeline-header">
        <div>
          <div className="gamepoints-timeline-title-wrap">
            <span className="gamepoints-timeline-icon">📊</span>
            <h3 className="gamepoints-timeline-title">My Position Over Time</h3>
            <span className={`gamepoints-trend-pill ${trend}`}>
              {isUpward ? '🚀 Upward Momentum' : isDownward ? '🔻 Inactive Position' : '⚖️ Holding Steady'}
            </span>
          </div>
          <p className="gamepoints-timeline-subtitle">
            Authoritative leaderboard rank trajectory calculated from actual verified XP
          </p>
        </div>

        {/* Dynamic Trajectory Badge */}
        <div className="gamepoints-trend-stat-box">
          <div className="gamepoints-trend-stat-label">Position Change</div>
          <div className={`gamepoints-trend-stat-val ${trend}`}>
            {isUpward ? `↑ +${rankChange}` : isDownward ? `↓ -${rankChange}` : '0'} Positions
          </div>
        </div>
      </div>

      {/* "Where was I? Where am I now? Am I moving upward?" Summary Cards */}
      <div className="gamepoints-trajectory-overview-grid">
        <div className="gamepoints-trajectory-box start">
          <div className="gamepoints-trajectory-label">Where was I?</div>
          <div className="gamepoints-trajectory-rank">#{initialRank}</div>
          <div className="gamepoints-trajectory-caption">Initial Benchmark Rank</div>
        </div>

        <div className="gamepoints-trajectory-arrow">
          <div className="gamepoints-arrow-line">
            <span className="gamepoints-arrow-icon">➔</span>
          </div>
          <span className="gamepoints-arrow-trend-tag">
            {isUpward ? 'Ascending' : isDownward ? 'Descending' : 'Stable'}
          </span>
        </div>

        <div className="gamepoints-trajectory-box current">
          <div className="gamepoints-trajectory-label">Where am I now?</div>
          <div className="gamepoints-trajectory-rank highlight">#{currentRank}</div>
          <div className="gamepoints-trajectory-caption">Current Verified Standing</div>
        </div>

        <div className="gamepoints-trajectory-box answer">
          <div className="gamepoints-trajectory-label">Am I moving upward?</div>
          <div className={`gamepoints-trajectory-verdict ${trend}`}>
            {isUpward ? 'YES! 🚀' : isDownward ? 'SLIPPING ⚠️' : 'HOLDING ⚖️'}
          </div>
          <div className="gamepoints-trajectory-caption">{summary}</div>
        </div>
      </div>

      {/* Visual Timeline / Step Track */}
      {timeline.length === 0 ? (
        <div className="gamepoints-timeline-empty">
          <span>No historical rank benchmarks recorded yet. Check back next month as activities are verified!</span>
        </div>
      ) : (
        <div className="gamepoints-timeline-track">
          {timeline.map((item, idx) => {
            const isLatest = idx === timeline.length - 1;
            const prevItem = idx > 0 ? timeline[idx - 1] : null;
            const changeFromPrev = prevItem ? prevItem.rank - item.rank : 0;

            return (
              <div
                key={`${item.month}-${idx}`}
                className={`gamepoints-timeline-node ${isLatest ? 'current-node' : ''}`}
              >
                {/* Node Milestone Connector Line */}
                {idx < timeline.length - 1 && (
                  <div className="gamepoints-node-connector" />
                )}

                {/* Milestone Node Card */}
                <div className="gamepoints-node-card">
                  <div className="gamepoints-node-period">{item.period || item.month}</div>
                  <div className="gamepoints-node-rank">#{item.rank}</div>
                  <div className="gamepoints-node-xp">{item.xp.toLocaleString()} XP</div>

                  {changeFromPrev !== 0 && (
                    <div className={`gamepoints-node-delta ${changeFromPrev > 0 ? 'gain' : 'loss'}`}>
                      {changeFromPrev > 0 ? `↑ ${changeFromPrev}` : `↓ ${Math.abs(changeFromPrev)}`}
                    </div>
                  )}

                  <div className="gamepoints-node-percentile">
                    Ahead of {item.percentileAhead}%
                  </div>

                  {isLatest && (
                    <div className="gamepoints-node-current-tag">CURRENT</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
