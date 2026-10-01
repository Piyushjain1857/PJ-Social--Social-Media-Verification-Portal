import React from 'react';
import LevelBadge from './LevelBadge';

/**
 * PointsCard Component
 * Displays user's total points, weekly/monthly earnings, and breakdown by activity type.
 * 
 * Shows:
 * ⭐ Total Points
 * 📈 Points earned this week
 * 📊 Points earned this month
 * ❤️ Likes
 * 💬 Comments
 * 📱 Stories
 * 
 * @param {Object} props
 * @param {Object} props.summary - Points summary from API
 * @param {boolean} [props.isLoading=false]
 * @param {Function} [props.onViewHistory]
 */
export default function PointsCard({
  summary,
  isLoading = false,
  onViewHistory = null
}) {
  if (isLoading) {
    return (
      <div className="glass-panel points-card" style={{ padding: '1.25rem' }}>
        <div className="skeleton" style={{ width: '40%', height: '24px', marginBottom: '1rem' }} />
        <div className="points-card-stats-grid">
          <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  const totalPoints = summary?.totalPoints ?? 0;
  const pointsThisWeek = summary?.pointsThisWeek ?? 0;
  const pointsThisMonth = summary?.pointsThisMonth ?? 0;
  const breakdown = summary?.breakdown || {};
  const level = summary?.level;

  const likeCount = breakdown.LIKE?.count ?? 0;
  const commentCount = breakdown.COMMENT?.count ?? 0;
  const storyCount = breakdown.STORY?.count ?? 0;

  return (
    <div className="glass-panel points-card" style={{ padding: '1.35rem' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.4rem' }}>⭐</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
              Points & Engagement
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              Verified activity earnings across portal social accounts
            </p>
          </div>
        </div>

        {level && <LevelBadge level={level} size="md" />}
      </div>

      {/* Main Metric Boxes */}
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

      {/* Action Breakdown */}
      <div>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
          Activity Breakdown
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

          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="btn-ghost"
              style={{
                fontSize: '0.74rem',
                padding: '0.25rem 0.6rem',
                marginLeft: 'auto',
                color: 'var(--primary-light)'
              }}
            >
              View Full History →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
