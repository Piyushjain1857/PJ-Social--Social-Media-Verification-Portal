import React from 'react';

export default function AdminGamificationAnalytics({
  analytics,
  isLoading,
  onRefresh
}) {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="glass-panel" style={{ padding: '1.25rem', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading analytics...</span>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const { metrics, xpDistribution = [], activityDistribution = [], topUsers = [] } = analytics;
  const totalXPSum = metrics.totalXPDistributed || 1;

  return (
    <div className="admin-gamification-analytics" style={{ marginBottom: '2rem' }}>
      {/* 6 Key Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>👥</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Users
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
            {(metrics.totalUsers || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
            Eligible platform creators
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total XP Distributed
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
            {(metrics.totalXPDistributed || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Cumulative creator points
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Average User XP
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a855f7' }}>
            {(metrics.averageUserXP || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Mean engagement score
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>💎</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Highest XP
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#facc15' }}>
            {(metrics.highestXP || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Apex creator benchmark
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>👑</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Highest Level
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fb923c' }}>
            Level {metrics.highestLevel || 1}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Maximum tier reached
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🔥</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Creators
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80' }}>
            {(metrics.activeGamificationUsers || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Active in past 30 days
          </div>
        </div>
      </div>

      {/* Analytics Distributions & Breakdown Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* XP Distribution */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
            📊 Creator XP Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {xpDistribution.map((tier) => {
              const pct = metrics.totalUsers > 0 ? Math.round((tier.count / metrics.totalUsers) * 100) : 0;
              return (
                <div key={tier.range}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{tier.range}</strong> ({tier.label})
                    </span>
                    <span style={{ color: 'var(--text-highlight)', fontWeight: 700 }}>
                      {tier.count} users ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Distribution */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
            🎯 Activity Points Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {activityDistribution.map((act) => {
              const xpShare = Math.min(100, Math.round((act.totalXP / totalXPSum) * 100));
              return (
                <div key={act.action}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{act.icon}</span>
                      <strong>{act.label}</strong>
                    </span>
                    <span style={{ color: 'var(--text-highlight)', fontWeight: 700 }}>
                      {act.totalXP.toLocaleString()} XP ({act.count.toLocaleString()} actions)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${xpShare}%`,
                        background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Creators Leaderboard */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
            🥇 Top Ranked Creators
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {topUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: u.rank === 1 ? '#facc15' : u.rank === 2 ? '#cbd5e1' : u.rank === 3 ? '#d97706' : 'rgba(255, 255, 255, 0.1)',
                      color: u.rank <= 3 ? '#0f172a' : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    #{u.rank}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Level {u.level} · {u.levelName}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.92rem' }}>
                  {u.totalXP.toLocaleString()} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
