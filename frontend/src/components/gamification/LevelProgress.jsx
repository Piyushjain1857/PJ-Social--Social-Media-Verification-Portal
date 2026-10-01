import React from 'react';
import LevelBadge from './LevelBadge';

/**
 * LevelProgress Component
 * Renders level progression with current level, next level, points required, and percentage bar.
 * 
 * Example display:
 * Level 3 — Contributor
 * 320 / 500 points
 * [████████████░░░░]
 * 180 points remaining to next level.
 * 
 * @param {Object} props
 * @param {Object} props.level - Backend level object:
 *   { level, name, badge, currentPoints, nextLevel, nextLevelName, nextLevelMinPoints, pointsToNextLevel, progressPercentage, isMaxLevel }
 * @param {boolean} [props.showBadge=true]
 */
export default function LevelProgress({ level, showBadge = true }) {
  if (!level) {
    return (
      <div className="level-progress-container">
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Level data unavailable</div>
      </div>
    );
  }

  const {
    level: levelNum = 1,
    name: levelName = 'Beginner',
    badge: levelBadge = '🌱',
    currentPoints = 0,
    nextLevel = null,
    nextLevelName = null,
    nextLevelMinPoints = 100,
    pointsToNextLevel = 0,
    progressPercentage = 0,
    isMaxLevel = false
  } = level;

  return (
    <div className="level-progress-container" aria-label={`Level ${levelNum} progress: ${progressPercentage}%`}>
      {/* Header */}
      <div className="level-progress-header">
        <div className="level-progress-title">
          <span>{levelBadge}</span>
          <span>Level {levelNum} — {levelName}</span>
          {showBadge && <LevelBadge level={level} size="sm" showNumber={false} />}
        </div>
        <div className="level-progress-points">
          <strong>{currentPoints.toLocaleString()}</strong>
          {!isMaxLevel && nextLevelMinPoints ? (
            <span> / {nextLevelMinPoints.toLocaleString()} pts</span>
          ) : (
            <span> pts (Max)</span>
          )}
        </div>
      </div>

      {/* Progress Track & Fill */}
      <div className="level-progress-track">
        <div
          className={`level-progress-fill ${isMaxLevel ? 'champion' : ''}`}
          style={{ width: `${Math.min(100, Math.max(2, progressPercentage))}%` }}
        />
      </div>

      {/* Footer Info */}
      <div className="level-progress-footer">
        {!isMaxLevel ? (
          <>
            <span className="level-progress-remaining">
              {pointsToNextLevel.toLocaleString()} point{pointsToNextLevel === 1 ? '' : 's'} remaining to next level.
            </span>
            {nextLevel && (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Next: <strong>Level {nextLevel} — {nextLevelName}</strong>
              </span>
            )}
          </>
        ) : (
          <span style={{ color: '#facc15', fontWeight: 600 }}>
            👑 Maximum tier reached! You are at the top Champion tier.
          </span>
        )}
      </div>
    </div>
  );
}
