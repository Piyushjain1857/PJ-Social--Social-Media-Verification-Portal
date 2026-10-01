import React, { useEffect, useRef } from 'react';

/**
 * LevelProgressCard
 * Premium card showing:
 *   - Level icon + level number badge
 *   - Level name
 *   - Total XP
 *   - Next level target
 *   - Animated progress bar with XP remaining
 *   - Max level state
 */
export default function LevelProgressCard({
  totalXP = 0,
  currentLevel = 1,
  levelName = 'Novice',
  icon = '🌱',
  nextLevel = null,
  nextLevelName = null,
  nextLevelRequiredXP = 250,
  xpIntoCurrentLevel = 0,
  xpRemaining = 250,
  progressPercentage = 0,
  isMaxLevel = false,
  currentLevelStartXP = 0,
  compact = false,
  onViewJourney = null,
}) {
  const barRef = useRef(null);

  // Animate progress bar fill on mount/update
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.width = '0%';
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = `${Math.min(100, Math.max(0, progressPercentage))}%`;
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [progressPercentage]);

  // Level color palette based on level range
  const getLevelColor = (lvl) => {
    if (lvl >= 40) return { primary: '#facc15', glow: 'rgba(250, 204, 21, 0.3)', gradient: 'linear-gradient(90deg, #f59e0b, #facc15, #fde68a)' };
    if (lvl >= 25) return { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.3)', gradient: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)' };
    if (lvl >= 10) return { primary: '#38bdf8', glow: 'rgba(56, 189, 248, 0.3)', gradient: 'linear-gradient(90deg, #0284c7, #38bdf8, #7dd3fc)' };
    return { primary: '#34d399', glow: 'rgba(52, 211, 153, 0.3)', gradient: 'linear-gradient(90deg, #059669, #34d399, #6ee7b7)' };
  };

  const colorScheme = getLevelColor(currentLevel);

  const totalXPFormatted = totalXP.toLocaleString();
  const xpIntoFormatted = xpIntoCurrentLevel.toLocaleString();
  const xpRemainingFormatted = xpRemaining.toLocaleString();
  const nextLevelXPFormatted = nextLevelRequiredXP ? nextLevelRequiredXP.toLocaleString() : '—';

  if (compact) {
    return (
      <div
        className="level-progress-card level-progress-card--compact"
        style={{ borderColor: colorScheme.primary }}
      >
        <div className="lpc-compact-icon" style={{ background: `${colorScheme.primary}22`, border: `1px solid ${colorScheme.primary}55` }}>
          {icon}
        </div>
        <div className="lpc-compact-info">
          <div className="lpc-compact-label" style={{ color: colorScheme.primary }}>
            LEVEL {currentLevel}
          </div>
          <div className="lpc-compact-name">{levelName}</div>
        </div>
        <div className="lpc-compact-xp">
          <span style={{ color: '#facc15', fontWeight: 800 }}>{totalXPFormatted}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> XP</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="level-progress-card glass-panel"
      style={{
        background: 'linear-gradient(135deg, rgba(8, 12, 24, 0.97) 0%, rgba(14, 18, 32, 0.98) 100%)',
        borderLeft: `4px solid ${colorScheme.primary}`,
        position: 'relative',
        overflow: 'hidden',
        padding: '1.75rem',
      }}
    >
      {/* Ambient glow effects */}
      <div className="lpc-glow lpc-glow--top" style={{ background: `radial-gradient(circle, ${colorScheme.glow} 0%, transparent 70%)` }} />
      <div className="lpc-glow lpc-glow--bottom" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="lpc-header">
        <div className="lpc-header-left">
          <div className="lpc-level-badge" style={{ background: `${colorScheme.primary}18`, border: `1px solid ${colorScheme.primary}45` }}>
            <span className="lpc-level-icon">{icon}</span>
          </div>
          <div className="lpc-header-text">
            <div className="lpc-level-chip" style={{ color: colorScheme.primary, background: `${colorScheme.primary}15`, border: `1px solid ${colorScheme.primary}35` }}>
              🏆 LEVEL {currentLevel}
            </div>
            <div className="lpc-level-name">{levelName}</div>
            {isMaxLevel && (
              <div className="lpc-max-badge">👑 Maximum Level Reached</div>
            )}
          </div>
        </div>

        <div className="lpc-xp-total">
          <div className="lpc-xp-number" style={{ color: '#facc15' }}>
            {totalXPFormatted}
            <span className="lpc-xp-unit">XP</span>
          </div>
          <div className="lpc-xp-label">Total Earned</div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="lpc-progress-section">
        <div className="lpc-progress-labels">
          <div className="lpc-progress-left">
            <span className="lpc-progress-current">{totalXPFormatted} XP</span>
            <span className="lpc-progress-separator"> / </span>
            <span className="lpc-progress-total">{nextLevelXPFormatted} XP</span>
          </div>
          <div className="lpc-progress-pct" style={{ color: colorScheme.primary }}>
            {progressPercentage}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="lpc-bar-track">
          <div
            ref={barRef}
            className="lpc-bar-fill"
            style={{
              background: colorScheme.gradient,
              boxShadow: `0 0 14px ${colorScheme.glow}`,
              width: '0%',
            }}
          />
          {/* Shimmer overlay */}
          <div className="lpc-bar-shimmer" />
        </div>

        {/* Next level info */}
        <div className="lpc-progress-footer">
          {isMaxLevel ? (
            <div className="lpc-max-msg">
              <span style={{ color: '#facc15' }}>✨ You have reached the highest level!</span>
            </div>
          ) : (
            <>
              <div className="lpc-remaining">
                <span className="lpc-remaining-label">Remaining: </span>
                <span className="lpc-remaining-xp" style={{ color: colorScheme.primary }}>
                  {xpRemainingFormatted} XP
                </span>
                <span className="lpc-remaining-label"> to </span>
                <span className="lpc-remaining-next">
                  Level {nextLevel}{nextLevelName ? ` (${nextLevelName})` : ''}
                </span>
              </div>
              <div className="lpc-start-xp">
                Target: {nextLevelXPFormatted} XP
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats grid matching specification */}
      <div className="lpc-stats-grid">
        <div className="lpc-stat" style={{ borderLeftColor: '#facc15' }}>
          <div className="lpc-stat-label">⚡ Current XP</div>
          <div className="lpc-stat-value" style={{ color: '#fef08a' }}>{totalXPFormatted} XP</div>
        </div>
        <div className="lpc-stat" style={{ borderLeftColor: colorScheme.primary }}>
          <div className="lpc-stat-label">🎯 Next Level</div>
          <div className="lpc-stat-value" style={{ color: colorScheme.primary }}>
            {isMaxLevel ? 'MAX' : `Level ${nextLevel}`}
          </div>
        </div>
        <div className="lpc-stat" style={{ borderLeftColor: '#a855f7' }}>
          <div className="lpc-stat-label">🎯 XP Required</div>
          <div className="lpc-stat-value" style={{ color: '#d8b4fe' }}>
            {isMaxLevel ? '—' : `${nextLevelXPFormatted} XP`}
          </div>
        </div>
        <div className="lpc-stat" style={{ borderLeftColor: '#34d399' }}>
          <div className="lpc-stat-label">⏳ Remaining</div>
          <div className="lpc-stat-value" style={{ color: '#6ee7b7' }}>
            {isMaxLevel ? '0 XP' : `${xpRemainingFormatted} XP`}
          </div>
        </div>
      </div>

      {/* View Journey CTA */}
      {onViewJourney && (
        <button
          type="button"
          className="lpc-journey-btn"
          onClick={onViewJourney}
        >
          <span>🗺️</span> View Level Journey
        </button>
      )}
    </div>
  );
}
