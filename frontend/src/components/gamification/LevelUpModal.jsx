import React, { useEffect, useRef, useCallback } from 'react';

/**
 * LevelUpModal
 * Fires when the user reaches a new level.
 * Shows animated celebration with new level name, icon, and confetti burst.
 */
export default function LevelUpModal({ levelData, onClose }) {
  const modalRef = useRef(null);

  // Trap focus and close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Auto-close after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!levelData) return null;

  const {
    currentLevel = 1,
    levelName = 'Explorer',
    icon = '🏆',
    totalXP = 0,
    nextLevel = null,
    nextLevelName = null,
  } = levelData;

  const getLevelColor = (lvl) => {
    if (lvl >= 40) return '#facc15';
    if (lvl >= 25) return '#a855f7';
    if (lvl >= 10) return '#38bdf8';
    return '#34d399';
  };
  const color = getLevelColor(currentLevel);

  return (
    <div
      className="portal-modal-backdrop level-up-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Level Up! You reached Level ${currentLevel}`}
    >
      <div
        ref={modalRef}
        className="level-up-modal"
        onClick={e => e.stopPropagation()}
        style={{ '--level-color': color }}
      >
        {/* Animated background rays */}
        <div className="level-up-rays" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="level-up-ray" style={{ transform: `rotate(${i * 45}deg)` }} />
          ))}
        </div>

        {/* Floating particles */}
        <div className="level-up-particles" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="level-up-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                background: color,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="level-up-content">
          {/* Trophy icon with pulse ring */}
          <div className="level-up-icon-wrapper" style={{ '--color': color }}>
            <div className="level-up-ring level-up-ring--outer" />
            <div className="level-up-ring level-up-ring--inner" />
            <div className="level-up-icon-circle" style={{ background: `${color}1a`, border: `2px solid ${color}60` }}>
              <span className="level-up-icon">{icon}</span>
            </div>
          </div>

          {/* Main text */}
          <div className="level-up-badge" style={{ color, border: `1px solid ${color}50`, background: `${color}12` }}>
            ⚡ LEVEL UP!
          </div>

          <div className="level-up-level-number" style={{ color }}>
            LEVEL {currentLevel}
          </div>

          <div className="level-up-level-name">{levelName}</div>

          <div className="level-up-xp-pill">
            <span style={{ color: '#facc15', fontWeight: 800 }}>{totalXP.toLocaleString()}</span>
            <span style={{ color: 'var(--text-muted)' }}> XP Total</span>
          </div>

          {nextLevel && (
            <div className="level-up-next">
              Next: Level {nextLevel}{nextLevelName ? ` — ${nextLevelName}` : ''}
            </div>
          )}

          <button
            type="button"
            className="level-up-close-btn"
            onClick={onClose}
            style={{ background: color, color: '#07090e' }}
          >
            🎉 Awesome!
          </button>

          <div className="level-up-dismiss">Auto-closes in a moment...</div>
        </div>
      </div>
    </div>
  );
}
