import React from 'react';

/**
 * RankCard Component
 * Displays user's rank, total/period points, and distance to next rank.
 * 
 * Example display:
 * Your Rank
 * #14
 * 1,245 Points
 * You are 35 points away from #13.
 * 
 * @param {Object} props
 * @param {Object} props.rankData - { rank, totalPoints, periodPoints, nextRank, pointsToNextRank, totalParticipants, timeframe }
 * @param {boolean} [props.isLoading=false]
 * @param {Function} [props.onOpenLeaderboard]
 * @param {string} [props.timeframe='all_time']
 * @param {Function} [props.onTimeframeChange]
 */
export default function RankCard({
  rankData,
  isLoading = false,
  onOpenLeaderboard = null,
  timeframe = 'all_time',
  onTimeframeChange = null
}) {
  if (isLoading) {
    return (
      <div className="rank-card">
        <div className="skeleton" style={{ width: '50%', height: '20px' }} />
        <div className="skeleton" style={{ width: '70%', height: '48px', margin: '0.5rem 0' }} />
        <div className="skeleton" style={{ width: '90%', height: '20px' }} />
      </div>
    );
  }

  const rank = rankData?.rank ?? '—';
  const points = (timeframe === 'all_time' ? rankData?.totalPoints : rankData?.periodPoints) ?? 0;
  const nextRank = rankData?.nextRank;
  const pointsToNextRank = rankData?.pointsToNextRank ?? 0;
  const totalParticipants = rankData?.totalParticipants ?? 0;

  let rankClass = '';
  if (rank === 1) rankClass = 'top-1';
  else if (rank === 2) rankClass = 'top-2';
  else if (rank === 3) rankClass = 'top-3';

  return (
    <div className="rank-card">
      {/* Header */}
      <div className="rank-card-header">
        <div className="rank-card-title">
          🏆 Your Ranking
        </div>
        {onTimeframeChange && (
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className="history-select"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
          >
            <option value="all_time">All Time</option>
            <option value="this_month">This Month</option>
            <option value="this_week">This Week</option>
          </select>
        )}
      </div>

      {/* Big Rank Number & Points */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="rank-badge-display">
          <span className={`rank-number ${rankClass}`}>
            #{rank}
          </span>
          {totalParticipants > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              of {totalParticipants}
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-highlight)' }}>
            {points.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {timeframe === 'this_week' ? 'Weekly Points' : timeframe === 'this_month' ? 'Monthly Points' : 'Total Points'}
          </div>
        </div>
      </div>

      {/* Comparison Text */}
      <div className="rank-comparison-text">
        {rank === 1 ? (
          <span>🥇 Outstanding! You are currently leading the portal in <strong>#1 place</strong>!</span>
        ) : nextRank ? (
          <span>
            You are <strong>{pointsToNextRank.toLocaleString()} points</strong> away from <strong>#{nextRank}</strong>.
          </span>
        ) : (
          <span>Complete and verify more social media tasks to climb the ranks!</span>
        )}
      </div>

      {/* Button to view full leaderboard */}
      {onOpenLeaderboard && (
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="btn-secondary"
          style={{
            width: '100%',
            fontSize: '0.8rem',
            padding: '0.45rem',
            justifyContent: 'center'
          }}
        >
          View Full Leaderboard 🥇
        </button>
      )}
    </div>
  );
}
