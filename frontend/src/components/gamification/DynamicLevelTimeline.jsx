import React, { useState, useEffect, useRef } from 'react';
import { fetchMyLevelJourney, fetchUserLevelJourney } from '../../services/gamificationApi';

export default function DynamicLevelTimeline({ userId = null, userXP = null, currentLevel = null }) {
  const [journeyData, setJourneyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const currentRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const loadJourney = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = userId
          ? await fetchUserLevelJourney(userId)
          : await fetchMyLevelJourney();
        if (isMounted) {
          if (res && res.success) {
            setJourneyData(res.data);
          } else {
            throw new Error(res?.message || 'Failed to load dynamic level journey.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error loading level timeline.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadJourney();
    return () => { isMounted = false; };
  }, [userId]);

  // Center current level in horizontal track (container-only, never scrolling the parent page)
  useEffect(() => {
    if (!isLoading && currentRef.current && trackRef.current) {
      const container = trackRef.current;
      const card = currentRef.current;
      if (container.scrollWidth > container.clientWidth) {
        const targetScroll = card.offsetLeft - (container.clientWidth / 2) + (card.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }
  }, [isLoading, showAll]);

  const handleScrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  const handleJumpToCurrent = () => {
    if (trackRef.current && currentRef.current) {
      const container = trackRef.current;
      const card = currentRef.current;
      const targetScroll = card.offsetLeft - (container.clientWidth / 2) + (card.clientWidth / 2);
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="gamepoints-levels-timeline-card glass-panel">
        <div className="skeleton" style={{ height: '28px', width: '240px', borderRadius: '6px', marginBottom: '0.75rem' }} />
        <div className="skeleton" style={{ height: '56px', width: '100%', borderRadius: '12px', marginBottom: '1.25rem' }} />
        <div style={{ display: 'flex', gap: '1rem', overflow: 'hidden' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '220px', width: '170px', flex: '0 0 170px', borderRadius: '14px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gamepoints-levels-timeline-card glass-panel" style={{ borderLeft: '4px solid var(--status-error)' }}>
        <div style={{ color: 'var(--status-error)', fontSize: '0.9rem' }}>⚠️ {error}</div>
      </div>
    );
  }

  const { journey = [], totalLevels = 0, isMaxLevel = false } = journeyData || {};
  const effectiveXP = userXP != null ? userXP : (journeyData?.totalXP || 0);
  const effectiveLevel = currentLevel != null ? currentLevel : (journeyData?.currentLevel || 1);

  // Focus window around current tier if large and not showing all
  const WINDOW = 4;
  const currentIdx = journey.findIndex(l => l.status === 'current');
  const validCurrentIdx = currentIdx >= 0 ? currentIdx : 0;
  
  let displayedLevels = journey;
  if (!showAll && journey.length > 10) {
    const start = Math.max(0, validCurrentIdx - WINDOW);
    const end = Math.min(journey.length, validCurrentIdx + WINDOW + 5);
    displayedLevels = journey.slice(start, end);
  }

  const completedCount = journey.filter(l => l.status === 'completed').length;
  const currentLevelObj = journey[validCurrentIdx] || journey[0];
  const nextLevelObj = journey[validCurrentIdx + 1] || null;

  // Next milestone calculation
  const nextThreshold = nextLevelObj
    ? (nextLevelObj.cumulativeStartXP != null ? nextLevelObj.cumulativeStartXP : (currentLevelObj?.cumulativeEndXP || 0))
    : 0;
  const xpNeededForNext = Math.max(0, nextThreshold - effectiveXP);
  const currentTierFloor = currentLevelObj?.cumulativeStartXP || 0;
  const tierSpan = Math.max(1, nextThreshold - currentTierFloor);
  const tierProgressPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round(((effectiveXP - currentTierFloor) / tierSpan) * 100)));

  return (
    <div className="gamepoints-levels-timeline-card glass-panel" id="level-timeline-section">
      {/* Header */}
      <div className="gamepoints-timeline-header">
        <div className="gamepoints-timeline-header-left">
          <div className="gamepoints-timeline-title-wrap">
            <span className="gamepoints-timeline-icon">🏆</span>
            <h3 className="gamepoints-timeline-title">Level Journey &amp; Milestones</h3>
            <span className="gamepoints-badge-dyn">
              {totalLevels} Configured Tiers (Live DB)
            </span>
          </div>
          <p className="gamepoints-timeline-subtitle">
            Progress dynamically driven by verified social activities ({completedCount} achieved, Level {effectiveLevel} current)
          </p>
        </div>

        {/* Action Controls */}
        <div className="gamepoints-timeline-actions">
          <div className="gamepoints-track-nav-btns">
            <button
              type="button"
              className="gamepoints-nav-arrow-btn"
              onClick={handleScrollLeft}
              title="Scroll Left"
              aria-label="Previous Milestones"
            >
              ‹
            </button>
            <button
              type="button"
              className="gamepoints-nav-arrow-btn"
              onClick={handleScrollRight}
              title="Scroll Right"
              aria-label="Next Milestones"
            >
              ›
            </button>
          </div>

          <button
            type="button"
            className="gamepoints-focus-current-btn"
            onClick={handleJumpToCurrent}
            title="Jump to current level"
          >
            🎯 Focus Current
          </button>

          {journey.length > 10 && (
            <button
              type="button"
              className="btn-secondary gamepoints-toggle-view-btn"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Focused (Next 8)' : `View All (${totalLevels} Tiers)`}
            </button>
          )}
        </div>
      </div>

      {/* Mini HUD Stats Strip */}
      <div className="gamepoints-timeline-hud-strip">
        <div className="hud-metric-item">
          <span className="hud-metric-label">CURRENT RANK</span>
          <span className="hud-metric-value">
            <span className="hud-rank-icon">{currentLevelObj?.icon || '⭐'}</span>
            Level {effectiveLevel} • {currentLevelObj?.name || 'Novice'}
          </span>
        </div>

        <div className="hud-metric-divider" />

        <div className="hud-metric-item">
          <span className="hud-metric-label">TOTAL EARNED XP</span>
          <span className="hud-metric-value xp-glow">
            {effectiveXP.toLocaleString()} XP
          </span>
        </div>

        <div className="hud-metric-divider" />

        <div className="hud-metric-item">
          <span className="hud-metric-label">NEXT MILESTONE</span>
          <span className="hud-metric-value">
            {isMaxLevel ? (
              <span className="hud-max-tier">👑 Max Level Reached!</span>
            ) : (
              <span>
                {nextLevelObj?.name || 'Next Tier'} <span className="hud-needed-chip">+{xpNeededForNext.toLocaleString()} XP needed</span>
              </span>
            )}
          </span>
        </div>

        <div className="hud-metric-divider" />

        <div className="hud-metric-item">
          <span className="hud-metric-label">TIERS COMPLETED</span>
          <div className="hud-completion-bar-wrap">
            <span className="hud-metric-value">{completedCount} / {totalLevels}</span>
            <div className="hud-completion-track">
              <div
                className="hud-completion-fill"
                style={{ width: `${Math.round((completedCount / (totalLevels || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Milestone Roadmap Track */}
      <div className="gamepoints-track-container-relative">
        <div className="gamepoints-level-journey-track" ref={trackRef}>
          {displayedLevels.map((lvl) => {
            const isCompleted = lvl.status === 'completed';
            const isCurrent = lvl.status === 'current';
            const isLocked = lvl.status === 'locked';

            const milestoneXP = lvl.cumulativeStartXP != null
              ? lvl.cumulativeStartXP
              : (lvl.xpRequired || 0);

            const xpRemainingForCard = Math.max(0, milestoneXP - effectiveXP);

            return (
              <div
                key={lvl.levelNumber}
                ref={isCurrent ? currentRef : null}
                className={`gamepoints-level-node-card ${lvl.status}`}
              >
                {/* Status Badge Header */}
                <div className="gamepoints-node-status-badge">
                  {isCompleted && <span className="node-status-pill completed">✓ Level {lvl.levelNumber}</span>}
                  {isCurrent && <span className="node-status-pill current">🔥 Level {lvl.levelNumber} CURRENT</span>}
                  {isLocked && <span className="node-status-pill locked">🔒 Level {lvl.levelNumber}</span>}
                </div>

                {/* Tier Icon with Aura */}
                <div className="gamepoints-node-icon-zone">
                  <div className={`gamepoints-node-icon-aura ${lvl.status}`}>
                    <span className="node-icon-glyph">{lvl.icon || '⭐'}</span>
                  </div>
                </div>

                {/* Level Title */}
                <div className="gamepoints-node-info">
                  <div className="gamepoints-node-title" title={lvl.name}>{lvl.name}</div>
                  <div className="gamepoints-node-req-label">
                    {milestoneXP.toLocaleString()} XP Milestone
                  </div>
                </div>

                {/* Dynamic Footer Card Section */}
                <div className="gamepoints-node-footer">
                  {isCompleted && (
                    <div className="node-completed-indicator">
                      <span className="node-achieved-chip">Achieved ✓</span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="node-current-progress-box">
                      <div className="node-progress-labels">
                        <span className="node-progress-title">Active Progress</span>
                        <span className="node-progress-percent">{tierProgressPercent}%</span>
                      </div>
                      <div className="node-progress-rail">
                        <div
                          className="node-progress-glow-fill"
                          style={{ width: `${tierProgressPercent}%` }}
                        />
                      </div>
                      <div className="node-progress-subtext">
                        {isMaxLevel ? 'Mastered Tier' : `${xpNeededForNext.toLocaleString()} XP to Level ${lvl.levelNumber + 1}`}
                      </div>
                    </div>
                  )}

                  {isLocked && (
                    <div className="node-locked-indicator">
                      <span className="node-locked-xp-chip">
                        +{xpRemainingForCard.toLocaleString()} XP needed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
