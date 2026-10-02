import React, { useState, useEffect, useRef } from 'react';
import { fetchMyXPChart, fetchUserXPChart } from '../../services/gamificationApi';

const TIMEFRAME_OPTIONS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '3m', label: '3 Months' },
  { id: '6m', label: '6 Months' },
  { id: 'all', label: 'All Time' }
];

export default function UserXPChart({ userId = null }) {
  const [timeframe, setTimeframe] = useState('30d');
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = userId
        ? await fetchUserXPChart(userId, timeframe)
        : await fetchMyXPChart(timeframe);
      if (res && res.success) {
        setChartData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load XP progression data.');
      }
    } catch (err) {
      setError(err.message || 'Error loading XP chart.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeframe, userId]);

  const points = chartData?.points || [];
  const summary = chartData?.summary || {};

  // Chart dimensions & math
  const width = 800;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 45, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  let minXP = 0;
  let maxXP = 100;
  if (points.length > 0) {
    const xpValues = points.map(p => p.xp);
    minXP = Math.min(0, ...xpValues);
    maxXP = Math.max(10, ...xpValues);
  }
  // Add a 10% headroom
  const xpRange = maxXP - minXP || 1;
  const upperYBound = Math.ceil((maxXP + xpRange * 0.1) / 10) * 10;

  const getX = (index) => {
    if (points.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (points.length - 1)) * innerWidth;
  };

  const getY = (xp) => {
    const ratio = (xp - minXP) / (upperYBound - minXP || 1);
    return padding.top + innerHeight - ratio * innerHeight;
  };

  // Build smooth SVG path
  let pathD = '';
  let areaD = '';
  if (points.length > 0) {
    const coords = points.map((p, i) => ({ x: getX(i), y: getY(p.xp) }));
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      // Cubic bezier control points for smooth line
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    const last = coords[coords.length - 1];
    const first = coords[0];
    const bottomY = padding.top + innerHeight;
    areaD = `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }

  // Y-axis tick intervals
  const yTicksCount = 4;
  const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) => {
    const val = Math.round(minXP + (i / yTicksCount) * (upperYBound - minXP));
    return { val, y: getY(val) };
  });

  // X-axis sampled labels (show up to 6 evenly spaced labels)
  const xLabelsCount = Math.min(6, points.length);
  const xIndices = points.length <= 1
    ? [0]
    : Array.from({ length: xLabelsCount }, (_, i) =>
        Math.round((i / (xLabelsCount - 1)) * (points.length - 1))
      );

  const handleMouseMove = (e) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = mouseX * scaleX;

    // Find nearest point
    let closestIdx = 0;
    let closestDist = Infinity;
    points.forEach((_, i) => {
      const px = getX(i);
      const dist = Math.abs(px - svgX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    const target = points[closestIdx];
    setHoveredPoint(target);
    setHoverPos({
      x: getX(closestIdx),
      y: getY(target.xp),
      clientX: (getX(closestIdx) / width) * rect.width,
      clientY: (getY(target.xp) / height) * rect.height
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="gamepoints-chart-card glass-panel" id="user-xp-graph-section">
      {/* Header with Title and Timeframe Filters */}
      <div className="gamepoints-chart-header">
        <div>
          <div className="gamepoints-chart-title-wrap">
            <span className="gamepoints-chart-title-icon">📈</span>
            <h3 className="gamepoints-chart-title">User XP Progression</h3>
            <span className="gamepoints-badge-live">Real PostgreSQL Data</span>
          </div>
          <p className="gamepoints-chart-subtitle">
            Visualizing verified XP accumulation over time with level milestones
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="gamepoints-timeframe-btn-group" role="group" aria-label="XP Chart timeframe">
          {TIMEFRAME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`gamepoints-timeframe-btn ${timeframe === opt.id ? 'active' : ''}`}
              onClick={() => setTimeframe(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Telemetry Bar */}
      <div className="gamepoints-chart-telemetry">
        <div className="gamepoints-telemetry-chip">
          <span className="gamepoints-chip-label">Starting XP</span>
          <span className="gamepoints-chip-val">{summary.startingXP ?? 0} XP</span>
        </div>
        <div className="gamepoints-telemetry-chip">
          <span className="gamepoints-chip-label">Current XP</span>
          <span className="gamepoints-chip-val highlight">{summary.endingXP ?? 0} XP</span>
        </div>
        <div className="gamepoints-telemetry-chip">
          <span className="gamepoints-chip-label">Net Gained</span>
          <span className="gamepoints-chip-val gain">+{summary.netXPGained ?? 0} XP</span>
        </div>
        <div className="gamepoints-telemetry-chip">
          <span className="gamepoints-chip-label">Level Reached</span>
          <span className="gamepoints-chip-val level">
            Lvl {summary.currentLevel ?? 1} ({summary.currentLevelName ?? 'Novice'})
          </span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        className="gamepoints-svg-wrapper"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {isLoading ? (
          <div className="gamepoints-chart-loading">
            <div className="status-dot checking" />
            <span>Calculating authoritative XP timeline from PostgreSQL ledger…</span>
          </div>
        ) : error ? (
          <div className="gamepoints-chart-error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2.5rem' }}>
            <span>⚠️ {error}</span>
            <button type="button" className="btn-portal-secondary" onClick={loadData}>
              🔄 Retry Telemetry Fetch
            </button>
          </div>
        ) : points.length === 0 ? (
          <div className="gamepoints-chart-empty">
            <span>No activity points recorded in this timeframe.</span>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%' }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="gamepoints-svg-chart"
              aria-label="XP progression line chart"
            >
              <defs>
                {/* Neon Area Gradient */}
                <linearGradient id="xpAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#a855f7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>

                {/* Stroke Gradient */}
                <linearGradient id="xpStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>

                {/* Line Glow Filter */}
                <filter id="xpGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Grid lines & Y-axis labels */}
              {yTicks.map((t, idx) => (
                <g key={`y-${idx}`}>
                  <line
                    x1={padding.left}
                    y1={t.y}
                    x2={width - padding.right}
                    y2={t.y}
                    stroke="rgba(255, 255, 255, 0.07)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={t.y + 4}
                    fill="var(--text-muted)"
                    fontSize="11"
                    fontFamily="var(--font-mono, monospace)"
                    textAnchor="end"
                  >
                    {t.val}
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {xIndices.map((idx) => {
                const p = points[idx];
                if (!p) return null;
                const px = getX(idx);
                return (
                  <g key={`x-${idx}`}>
                    <line
                      x1={px}
                      y1={padding.top + innerHeight}
                      x2={px}
                      y2={padding.top + innerHeight + 6}
                      stroke="rgba(255, 255, 255, 0.2)"
                    />
                    <text
                      x={px}
                      y={padding.top + innerHeight + 20}
                      fill="var(--text-secondary)"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}

              {/* Area Under Curve */}
              {areaD && (
                <path
                  d={areaD}
                  fill="url(#xpAreaGradient)"
                />
              )}

              {/* Main Glowing XP Curve */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#xpStrokeGradient)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#xpGlow)"
                />
              )}

              {/* Data points */}
              {points.map((p, i) => {
                const px = getX(i);
                const py = getY(p.xp);
                const isHovered = hoveredPoint && hoveredPoint.date === p.date;
                return (
                  <g key={`dot-${i}`}>
                    <circle
                      cx={px}
                      cy={py}
                      r={isHovered ? 6 : (points.length > 40 ? 2 : 3.5)}
                      fill={isHovered ? '#38bdf8' : '#fff'}
                      stroke={isHovered ? '#fff' : 'rgba(56, 189, 248, 0.8)'}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      style={{ transition: 'all 0.15s ease' }}
                    />
                  </g>
                );
              })}

              {/* Level Progression Milestones on Curve */}
              {points.map((p, i) => {
                if (i === 0) return null;
                const prevLevel = points[i - 1]?.level;
                if (p.level > prevLevel) {
                  const px = getX(i);
                  const py = getY(p.xp);
                  return (
                    <g key={`lvl-milestone-${i}`}>
                      <circle
                        cx={px}
                        cy={py}
                        r={8}
                        fill="#a855f7"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                      <text
                        x={px}
                        y={py - 12}
                        fill="#facc15"
                        fontSize="10"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        Lvl {p.level}
                      </text>
                    </g>
                  );
                }
                return null;
              })}

              {/* Interactive Hover Crosshair */}
              {hoveredPoint && (
                <g>
                  <line
                    x1={hoverPos.x}
                    y1={padding.top}
                    x2={hoverPos.x}
                    y2={padding.top + innerHeight}
                    stroke="rgba(56, 189, 248, 0.65)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={hoverPos.x}
                    cy={hoverPos.y}
                    r={7}
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                </g>
              )}
            </svg>

            {/* Floating Crosshair Tooltip */}
            {hoveredPoint && (
              <div
                className="gamepoints-chart-tooltip"
                style={{
                  left: `${Math.min(Math.max(hoverPos.clientX, 110), containerRef.current?.offsetWidth - 110)}px`,
                  top: `${Math.max(hoverPos.clientY - 85, 10)}px`
                }}
              >
                <div className="gamepoints-tooltip-date">{hoveredPoint.label} ({hoveredPoint.date})</div>
                <div className="gamepoints-tooltip-main">
                  <span className="gamepoints-tooltip-xp">{hoveredPoint.xp.toLocaleString()} XP</span>
                  {hoveredPoint.xpGained > 0 && (
                    <span className="gamepoints-tooltip-gain">+{hoveredPoint.xpGained}</span>
                  )}
                </div>
                <div className="gamepoints-tooltip-level">
                  <span>{hoveredPoint.icon || '⭐'}</span>
                  <span>Level {hoveredPoint.level}: {hoveredPoint.levelName}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
