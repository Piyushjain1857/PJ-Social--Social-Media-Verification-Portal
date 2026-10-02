import React, { useState, useEffect } from 'react';
import { fetchSuperAdminAnalytics } from '../../../services/superAdminGamificationApi';

export default function SuperAdminGamificationAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [velocityMode, setVelocityMode] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'growth'
  const [hoveredItem, setHoveredItem] = useState(null);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchSuperAdminAnalytics();
      if (res && res.success) {
        setAnalytics(res.data);
      } else {
        throw new Error(res?.message || 'Failed to retrieve Super Admin analytics.');
      }
    } catch (err) {
      console.warn('Could not load Super Admin analytics:', err);
      setError(err.message || 'Failed to load platform-wide analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="admin-dash-panel" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.35rem' }}>
          Aggregating Global Gamification Telemetry…
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Performing PostgreSQL group aggregations across transactions, users, and levels
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="admin-dash-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
        <h3 style={{ color: '#f87171', margin: '0 0 0.5rem 0' }}>Could Not Load Platform Analytics</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{error || 'No analytics data received.'}</p>
        <button type="button" className="btn-portal-secondary" onClick={loadAnalytics}>
          🔄 Retry Telemetry Fetch
        </button>
      </div>
    );
  }

  const {
    dailyXP = [],
    weeklyXP = [],
    monthlyXP = [],
    xpGrowth = [],
    activityContribution = [],
    xpDistribution = [],
    usersByLevel = [],
    topUsers = [],
    fastestProgressingUsers = [],
    summary = {}
  } = analytics;

  // Active dataset based on velocityMode
  let activeData = dailyXP;
  let activePeriodLabel = 'Daily XP Velocity (Last 30 Days)';
  if (velocityMode === 'weekly') {
    activeData = weeklyXP;
    activePeriodLabel = 'Weekly XP Velocity (Last 12 Weeks)';
  } else if (velocityMode === 'monthly') {
    activeData = monthlyXP;
    activePeriodLabel = 'Monthly XP Velocity (Last 12 Months)';
  } else if (velocityMode === 'growth') {
    activeData = xpGrowth;
    activePeriodLabel = 'Cumulative Platform XP Growth';
  }

  const maxVal = Math.max(1, ...activeData.map(d => velocityMode === 'growth' ? (d.cumulativeXP || 0) : (d.xp || 0)));
  const totalVolumeInView = activeData.reduce((acc, cur) => acc + (cur.xp || 0), 0);
  const totalTxsInView = activeData.reduce((acc, cur) => acc + (cur.transactions || 0), 0);

  // SVG dimensions for Growth curve
  const svgWidth = 800;
  const svgHeight = 200;
  const padding = { top: 20, right: 25, bottom: 35, left: 60 };
  const innerW = svgWidth - padding.left - padding.right;
  const innerH = svgHeight - padding.top - padding.bottom;

  let growthPointsD = '';
  let growthAreaD = '';
  if (velocityMode === 'growth' && xpGrowth.length > 0) {
    const coords = xpGrowth.map((p, idx) => {
      const x = padding.left + (idx / Math.max(1, xpGrowth.length - 1)) * innerW;
      const ratio = (p.cumulativeXP || 0) / maxVal;
      const y = padding.top + innerH - ratio * innerH;
      return { x, y, ...p };
    });

    growthPointsD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cp1x = prev.x + (cur.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (cur.x - prev.x) / 2;
      const cp2y = cur.y;
      growthPointsD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cur.x} ${cur.y}`;
    }
    const last = coords[coords.length - 1];
    const first = coords[0];
    const bottomY = padding.top + innerH;
    growthAreaD = `${growthPointsD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }

  return (
    <div className="superadmin-gamification-analytics" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Global Summary KPI Tiles */}
      <div className="superadmin-kpi-grid">
        <div className="superadmin-kpi-card xp">
          <div className="superadmin-kpi-icon-box xp">
            ⚡
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Total XP Distributed</span>
            <span className="superadmin-kpi-value" style={{ color: '#38bdf8' }}>
              {(summary.totalXPDistributed || 0).toLocaleString()} XP
            </span>
            <span className="superadmin-kpi-subtext">All-time verified points</span>
          </div>
        </div>

        <div className="superadmin-kpi-card tx">
          <div className="superadmin-kpi-icon-box tx">
            📜
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Total Transactions</span>
            <span className="superadmin-kpi-value" style={{ color: '#a855f7' }}>
              {(summary.totalTransactions || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Ledger audit records</span>
          </div>
        </div>

        <div className="superadmin-kpi-card creators">
          <div className="superadmin-kpi-icon-box creators">
            👥
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Active Creators</span>
            <span className="superadmin-kpi-value" style={{ color: '#10b981' }}>
              {(summary.totalUsers || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Participating users</span>
          </div>
        </div>

        <div className="superadmin-kpi-card highest-xp">
          <div className="superadmin-kpi-icon-box highest-xp">
            🚀
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Peak Daily Volume</span>
            <span className="superadmin-kpi-value" style={{ color: '#f59e0b' }}>
              {(summary.peakDailyXP || 0).toLocaleString()} XP
            </span>
            <span className="superadmin-kpi-subtext">Single-day platform high</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive XP Growth & Velocity Visualizer */}
      <div className="admin-dash-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.35rem' }}>📈</span>
              <h4 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.2rem' }}>
                {activePeriodLabel}
              </h4>
              <span className="gamepoints-badge-live">Real Aggregated Data</span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Period volume: <strong>{totalVolumeInView.toLocaleString()} XP</strong> across <strong>{totalTxsInView.toLocaleString()} transactions</strong>
            </p>
          </div>

          {/* Timeframe Mode Selector */}
          <div className="gamepoints-timeframe-btn-group" role="group" aria-label="Velocity timeframe">
            <button
              type="button"
              className={`gamepoints-timeframe-btn ${velocityMode === 'daily' ? 'active' : ''}`}
              onClick={() => { setVelocityMode('daily'); setHoveredItem(null); }}
            >
              📅 Daily (30d)
            </button>
            <button
              type="button"
              className={`gamepoints-timeframe-btn ${velocityMode === 'weekly' ? 'active' : ''}`}
              onClick={() => { setVelocityMode('weekly'); setHoveredItem(null); }}
            >
              📊 Weekly (12w)
            </button>
            <button
              type="button"
              className={`gamepoints-timeframe-btn ${velocityMode === 'monthly' ? 'active' : ''}`}
              onClick={() => { setVelocityMode('monthly'); setHoveredItem(null); }}
            >
              🗓️ Monthly (12m)
            </button>
            <button
              type="button"
              className={`gamepoints-timeframe-btn ${velocityMode === 'growth' ? 'active' : ''}`}
              onClick={() => { setVelocityMode('growth'); setHoveredItem(null); }}
            >
              📈 XP Growth
            </button>
          </div>
        </div>

        {/* Chart Canvas Area */}
        {activeData.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transaction records found for this period.
          </div>
        ) : velocityMode === 'growth' ? (
          /* SVG Line / Area Growth Chart */
          <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', minWidth: '600px' }}>
              <defs>
                <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#6366f1" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="growthStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>

              {/* Y Grid */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = padding.top + innerH - ratio * innerH;
                const val = Math.round(ratio * maxVal);
                return (
                  <g key={`ygrid-${idx}`}>
                    <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                    <text x={padding.left - 10} y={y + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">
                      {val.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {growthAreaD && <path d={growthAreaD} fill="url(#growthAreaGrad)" />}
              {growthPointsD && <path d={growthPointsD} fill="none" stroke="url(#growthStrokeGrad)" strokeWidth="3" strokeLinecap="round" />}

              {/* X Axis Labels */}
              {xpGrowth.map((pt, idx) => {
                if (idx % Math.ceil(xpGrowth.length / 6) !== 0 && idx !== xpGrowth.length - 1) return null;
                const x = padding.left + (idx / Math.max(1, xpGrowth.length - 1)) * innerW;
                return (
                  <text key={`xlbl-${idx}`} x={x} y={padding.top + innerH + 20} fill="var(--text-muted)" fontSize="11" textAnchor="middle">
                    {pt.label}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : (
          /* Responsive Column / Bar Velocity Visualizer */
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                height: '170px',
                gap: activeData.length > 20 ? '4px' : '10px',
                paddingTop: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {activeData.map((item, idx) => {
                const val = item.xp || 0;
                const heightPct = Math.max(val > 0 ? 6 : 2, Math.round((val / maxVal) * 100));
                const isHovered = hoveredItem && (hoveredItem.date === item.date || hoveredItem.period === item.period || hoveredItem.month === item.month);

                return (
                  <div
                    key={item.date || item.period || item.month || idx}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        background: val > 0
                          ? isHovered
                            ? '#38bdf8'
                            : 'linear-gradient(180deg, #38bdf8 0%, #6366f1 100%)'
                          : 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.2s',
                        boxShadow: isHovered ? '0 0 12px rgba(56, 189, 248, 0.6)' : 'none'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis start / mid / end indicators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{activeData[0]?.label || 'Start'}</span>
              <span>{activeData[Math.floor(activeData.length / 2)]?.label || 'Mid'}</span>
              <span>{activeData[activeData.length - 1]?.label || 'Present'}</span>
            </div>

            {/* Hovered Tooltip Card */}
            {hoveredItem && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Period: </span>
                  <strong style={{ color: '#fff' }}>{hoveredItem.label || hoveredItem.date || hoveredItem.month}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>XP Awarded: </span>
                  <strong style={{ color: '#38bdf8' }}>{(hoveredItem.xp || 0).toLocaleString()} XP</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Transactions: </span>
                  <strong style={{ color: '#a855f7' }}>{(hoveredItem.transactions || 0).toLocaleString()}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Users by Level & XP Distribution Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Users by Level Distribution */}
        <div className="admin-dash-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h4 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.1rem' }}>
              ⚡ Users by Dynamic Level Tier
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Database Aggregated
            </span>
          </div>

          {usersByLevel.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No level distribution data recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
              {usersByLevel.map((lvl) => {
                const maxLevelCount = Math.max(1, ...usersByLevel.map(l => l.count));
                const barWidth = Math.max(3, Math.round((lvl.count / maxLevelCount) * 100));

                return (
                  <div
                    key={lvl.level}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{lvl.icon || '🌱'}</span>
                        <span>Level {lvl.level}: {lvl.levelName}</span>
                      </span>
                      <span style={{ color: '#38bdf8', fontWeight: 800 }}>
                        {lvl.count.toLocaleString()} creators ({lvl.percentage}%)
                      </span>
                    </div>

                    <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                          borderRadius: '999px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* XP Distribution Buckets */}
        <div className="admin-dash-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h4 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.1rem' }}>
              👥 Creator XP Distribution Buckets
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Overall Population
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {xpDistribution.map((tier) => (
              <div
                key={tier.label}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderLeft: `4px solid ${tier.color || '#38bdf8'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {tier.label}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: tier.color || '#38bdf8' }}>
                    {tier.count.toLocaleString()} creators ({tier.percentage}%)
                  </span>
                </div>

                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(2, tier.percentage)}%`,
                      background: tier.color || '#38bdf8',
                      borderRadius: '999px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Global Activity Contribution Breakdown */}
      <div className="admin-dash-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.15rem' }}>
              🎯 Platform Activity Contribution Breakdown
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              XP volume categorized by verified action channels and moderation events
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {activityContribution.map((act) => (
            <div
              key={act.activity}
              style={{
                padding: '1.1rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderLeft: `4px solid ${act.color || '#38bdf8'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>{act.icon}</span> {act.name}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: act.color || '#38bdf8'
                  }}
                >
                  {act.percentage}%
                </span>
              </div>

              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: act.color || '#38bdf8', margin: '0.35rem 0' }}>
                {act.totalXP.toLocaleString()} XP
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span>{act.count.toLocaleString()} actions</span>
                <span>Avg {act.averageXP} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Top Creators & Fastest Progressing Gainers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Top 10 Creators */}
        <div className="admin-dash-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.1rem' }}>
            👑 Top 10 Platform Record Holders
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {topUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: u.rank === 1 ? 'rgba(250, 204, 21, 0.05)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: u.rank === 1 ? '1px solid rgba(250, 204, 21, 0.25)' : '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontWeight: 800, color: u.rank === 1 ? '#facc15' : '#38bdf8', width: '24px' }}>
                    #{u.rank}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.88rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Level {u.level} • {u.levelName}</div>
                  </div>
                </div>
                <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.92rem' }}>
                  {u.totalXP.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fastest Progressing Creators */}
        <div className="admin-dash-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.1rem' }}>
            🚀 Fastest 7-Day Velocity Gainers
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {fastestProgressingUsers.map((u, idx) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>#{idx + 1}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.88rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                    +{u.weeklyXP.toLocaleString()} XP
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>past 7 days</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
