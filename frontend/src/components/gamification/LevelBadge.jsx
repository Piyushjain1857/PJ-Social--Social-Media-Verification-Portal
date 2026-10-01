import React from 'react';

const TIER_MAP = {
  1: { name: 'Beginner', badge: '🌱', className: 'tier-beginner', range: '0–99 pts' },
  2: { name: 'Active', badge: '⚡', className: 'tier-active', range: '100–249 pts' },
  3: { name: 'Contributor', badge: '🚀', className: 'tier-contributor', range: '250–499 pts' },
  4: { name: 'Elite', badge: '💎', className: 'tier-elite', range: '500–999 pts' },
  5: { name: 'Champion', badge: '👑', className: 'tier-champion', range: '1000+ pts' }
};

/**
 * LevelBadge Component
 * Displays a tier badge with icon, level title, and tier-specific styling.
 * 
 * @param {Object} props
 * @param {Object|number|string} props.level - Level object { level, name, badge } or level number
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Badge size
 * @param {boolean} [props.showNumber=true] - Whether to show "Lvl X"
 * @param {boolean} [props.showIcon=true] - Whether to show emoji badge icon
 */
export default function LevelBadge({
  level,
  size = 'md',
  showNumber = true,
  showIcon = true,
  className = ''
}) {
  let levelNum = 1;
  let levelName = 'Beginner';
  let levelIcon = '🌱';

  if (typeof level === 'object' && level !== null) {
    levelNum = level.level || 1;
    levelName = level.name || 'Beginner';
    levelIcon = level.badge || '🌱';
  } else if (typeof level === 'number') {
    levelNum = Math.max(1, Math.min(5, level));
    const tier = TIER_MAP[levelNum] || TIER_MAP[1];
    levelName = tier.name;
    levelIcon = tier.badge;
  } else if (typeof level === 'string') {
    const foundEntry = Object.entries(TIER_MAP).find(
      ([, t]) => t.name.toLowerCase() === level.toLowerCase()
    );
    if (foundEntry) {
      levelNum = parseInt(foundEntry[0], 10);
      levelName = foundEntry[1].name;
      levelIcon = foundEntry[1].badge;
    }
  }

  const tierInfo = TIER_MAP[levelNum] || TIER_MAP[1];
  const sizeClass = size === 'sm' ? 'level-badge-sm' : size === 'lg' ? 'level-badge-lg' : 'level-badge-md';

  return (
    <span
      className={`level-badge ${tierInfo.className} ${sizeClass} ${className}`}
      title={`Level ${levelNum}: ${levelName} (${tierInfo.range})`}
    >
      {showIcon && <span className="level-badge-icon" aria-hidden="true">{levelIcon}</span>}
      <span className="level-badge-name">{levelName}</span>
      {showNumber && (
        <span style={{ opacity: 0.75, fontSize: '0.9em', fontWeight: 600 }}>
          Lvl {levelNum}
        </span>
      )}
    </span>
  );
}
