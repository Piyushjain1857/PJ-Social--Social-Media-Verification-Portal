import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMyLevelJourney } from '../../services/gamificationApi';

/**
 * LevelJourneySection
 * Fetches and renders the user's full level journey grid.
 * Levels are marked: completed (✓) | current (→) | locked (🔒)
 */
export default function LevelJourneySection({ userId = null }) {
  const [journeyData, setJourneyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const currentRef = useRef(null);

  const loadJourney = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchMyLevelJourney();
      if (res && res.success) {
        setJourneyData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load level journey.');
      }
    } catch (err) {
      setError(err.message || 'Error loading level journey.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJourney();
  }, [loadJourney]);

  // Scroll current level into view within its container only (preventing page scroll)
  useEffect(() => {
    if (!isLoading && currentRef.current) {
      const container = currentRef.current.parentElement;
      if (container && container.scrollWidth > container.clientWidth) {
        const offset = currentRef.current.offsetLeft - (container.clientWidth / 2) + (currentRef.current.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
      }
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="skeleton" style={{ height: '20px', width: '200px', borderRadius: '4px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.65rem' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-error)' }}>
        <div style={{ color: 'var(--status-error)', fontSize: '0.88rem' }}>⚠️ {error}</div>
        <button type="button" className="btn-secondary" onClick={loadJourney} style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Retry</button>
      </div>
    );
  }

  if (!journeyData) return null;

  const { journey = [], totalLevels = 0, currentLevel = 1, totalXP = 0, isMaxLevel = false } = journeyData;

  // Determine visible levels (show up to 10 around current if not showing all)
  const WINDOW = 5;
  const currentIdx = journey.findIndex(l => l.status === 'current');
  let visibleLevels = journey;
  if (!showAll && journey.length > 20) {
    const start = Math.max(0, currentIdx - WINDOW);
    const end = Math.min(journey.length, currentIdx + WINDOW + 5);
    visibleLevels = journey.slice(start, end);
  }

  const completedCount = journey.filter(l => l.status === 'completed').length;

  const getLevelCardStyle = (status) => {
    if (status === 'completed') return {
      background: 'rgba(52, 211, 153, 0.06)',
      border: '1px solid rgba(52, 211, 153, 0.3)',
      opacity: 0.85,
    };
    if (status === 'current') return {
      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(168, 85, 247, 0.1) 100%)',
      border: '2px solid rgba(56, 189, 248, 0.55)',
      boxShadow: '0 0 18px rgba(56, 189, 248, 0.2)',
    };
    return {
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      opacity: 0.45,
    };
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
              🗺️ Level Journey
            </h3>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
              padding: '0.15rem 0.55rem', borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)'
            }}>
              {totalLevels} LEVELS
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {completedCount} of {totalLevels} levels completed &nbsp;·&nbsp; Total XP: {totalXP.toLocaleString()}
          </div>
        </div>

        {journey.length > 20 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAll(v => !v)}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
          >
            {showAll ? '🔼 Collapse' : `🔽 Show All ${totalLevels}`}
          </button>
        )}
      </div>

      {/* Journey Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {visibleLevels.map((level) => {
          const isCurrent = level.status === 'current';
          const isCompleted = level.status === 'completed';

          return (
            <div
              key={level.levelNumber}
              ref={isCurrent ? currentRef : null}
              title={`Level ${level.levelNumber}: ${level.name}\n${level.xpRequired.toLocaleString()} XP required`}
              style={{
                ...getLevelCardStyle(level.status),
                borderRadius: '10px',
                padding: '0.6rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              {/* Status indicator */}
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: '#38bdf8', border: '2px solid #0f172a',
                  animation: 'pulse-dot 2s infinite'
                }} />
              )}
              {isCompleted && (
                <div style={{
                  position: 'absolute', top: '-5px', right: '-5px',
                  fontSize: '0.62rem', fontWeight: 800, color: '#34d399',
                  background: '#0f172a', border: '1px solid rgba(52,211,153,0.4)',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>✓</div>
              )}

              <div style={{ fontSize: '1.3rem', lineHeight: 1 }}>{level.icon}</div>
              <div style={{
                fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
                color: isCurrent ? '#38bdf8' : isCompleted ? '#34d399' : 'var(--text-muted)',
                textTransform: 'uppercase'
              }}>
                LVL {level.levelNumber}
              </div>
              <div style={{
                fontSize: '0.62rem', color: isCurrent ? '#e2e8f0' : 'var(--text-muted)',
                textAlign: 'center', lineHeight: 1.3,
                maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {level.name}
              </div>
              <div style={{
                fontSize: '0.58rem', color: 'var(--text-muted)',
                marginTop: '0.1rem'
              }}>
                {level.xpRequired.toLocaleString()} XP
              </div>
            </div>
          );
        })}
      </div>

      {/* Truncation notice */}
      {!showAll && journey.length > 20 && (
        <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Showing levels around current. {journey.length - visibleLevels.length} more hidden.
        </div>
      )}

      {isMaxLevel && (
        <div style={{
          marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px',
          background: 'rgba(250, 204, 21, 0.08)', border: '1px solid rgba(250, 204, 21, 0.25)',
          color: '#facc15', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center'
        }}>
          👑 Maximum Level Achieved — You have mastered the PJ Social platform!
        </div>
      )}
    </div>
  );
}
