import React, { useState, useEffect, useRef } from 'react';
import { fetchMyLevelJourney, fetchUserLevelJourney } from '../../services/gamificationApi';

export default function DynamicLevelTimeline({ userId = null }) {
  const [journeyData, setJourneyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const currentRef = useRef(null);

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

  // Scroll current level into center view once loaded
  useEffect(() => {
    if (!isLoading && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="gamepoints-levels-timeline-card glass-panel">
        <div className="skeleton" style={{ height: '24px', width: '200px', borderRadius: '4px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '8px' }} />
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

  const { journey = [], totalLevels = 0, currentLevel = 1, totalXP = 0, isMaxLevel = false } = journeyData || {};

  // Dynamically generated from the database!
  // If journey is large, optionally focus around current level
  const WINDOW = 4;
  const currentIdx = journey.findIndex(l => l.status === 'current');
  let displayedLevels = journey;
  if (!showAll && journey.length > 12) {
    const start = Math.max(0, currentIdx - WINDOW);
    const end = Math.min(journey.length, currentIdx + WINDOW + 4);
    displayedLevels = journey.slice(start, end);
  }

  const completedCount = journey.filter(l => l.status === 'completed').length;

  return (
    <div className="gamepoints-levels-timeline-card glass-panel" id="level-timeline-section">
      {/* Header */}
      <div className="gamepoints-timeline-header">
        <div>
          <div className="gamepoints-timeline-title-wrap">
            <span className="gamepoints-timeline-icon">🏆</span>
            <h3 className="gamepoints-timeline-title">Level Journey &amp; Milestones</h3>
            <span className="gamepoints-badge-dyn">
              {totalLevels} Configured Tiers (Live DB)
            </span>
          </div>
          <p className="gamepoints-timeline-subtitle">
            Progress dynamically driven by verified social activities ({completedCount} achieved, Level {currentLevel} current)
          </p>
        </div>

        {/* View Toggle */}
        {journey.length > 12 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAll(!showAll)}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            {showAll ? 'Focus Current Level' : `View All (${totalLevels} Levels)`}
          </button>
        )}
      </div>

      {/* Level Journey Grid / Track */}
      <div className="gamepoints-level-journey-grid">
        {displayedLevels.map((lvl) => {
          const isCompleted = lvl.status === 'completed';
          const isCurrent = lvl.status === 'current';
          const isLocked = lvl.status === 'locked';

          return (
            <div
              key={lvl.levelNumber}
              ref={isCurrent ? currentRef : null}
              className={`gamepoints-level-node-box ${lvl.status}`}
            >
              {/* Status Header Badge */}
              <div className="gamepoints-level-node-status">
                {isCompleted && <span className="status-tag completed">Level {lvl.levelNumber} ✓</span>}
                {isCurrent && <span className="status-tag current">Level {lvl.levelNumber} 🔥 CURRENT</span>}
                {isLocked && <span className="status-tag locked">Level {lvl.levelNumber} 🔒</span>}
              </div>

              {/* Tier Icon & Name */}
              <div className="gamepoints-level-node-body">
                <div className="gamepoints-level-icon">{lvl.icon || '⭐'}</div>
                <div className="gamepoints-level-name">{lvl.name}</div>
                <div className="gamepoints-level-xp-req">
                  {lvl.cumulativeStartXP != null
                    ? `${lvl.cumulativeStartXP.toLocaleString()} XP`
                    : `${lvl.xpRequired} XP required`}
                </div>
              </div>

              {/* Progress Footer */}
              <div className="gamepoints-level-node-footer">
                {isCompleted && (
                  <span className="footer-completed-label">Achieved ✓</span>
                )}
                {isCurrent && (
                  <div className="footer-current-progress">
                    <span className="footer-current-text">Active Tier</span>
                    <div className="footer-progress-bar">
                      <div
                        className="footer-progress-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, journeyData?.progressPercentage || 50))}%`
                        }}
                      />
                    </div>
                  </div>
                )}
                {isLocked && (
                  <span className="footer-locked-label">
                    {lvl.cumulativeStartXP != null
                      ? `Unlocks at ${lvl.cumulativeStartXP.toLocaleString()} XP`
                      : 'Locked'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
