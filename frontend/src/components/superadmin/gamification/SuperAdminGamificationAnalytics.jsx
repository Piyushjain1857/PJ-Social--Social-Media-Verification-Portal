import React, { useState, useEffect } from 'react';
import { fetchSuperAdminAnalytics } from '../../../services/superAdminGamificationApi';

export default function SuperAdminGamificationAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetchSuperAdminAnalytics();
      if (res && res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.warn('Could not load Super Admin analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
        <div>Loading Super Admin advanced gamification analytics...</div>
      </div>
    );
  }

  if (!analytics) return null;

  const {
    xpOverTime = [],
    activityContribution = [],
    xpDistribution = [],
    usersByLevel = [],
    topUsers = [],
    fastestProgressingUsers = [],
    totalXPDistributed = 1
  } = analytics;

  // Compute maximum daily XP for 30-day SVG chart
  const maxDailyXP = Math.max(1, ...xpOverTime.map(d => d.xp));

  return (
    <div className="superadmin-gamification-analytics">
      {/* Top 30-Day Velocity Chart */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.15rem' }}>
              📈 30-Day Platform XP Distributed Velocity
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Daily cumulative points awarded across verified activities and manual bonus events
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
            Peak Day: {maxDailyXP.toLocaleString()} XP
          </span>
        </div>

        {/* Dynamic SVG / Bar Visualizer */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '4px', paddingTop: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {xpOverTime.map((day) => {
            const heightPercent = Math.max(4, Math.round((day.xp / maxDailyXP) * 100));
            return (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end'
                }}
                title={`${day.date}: ${day.xp} XP (${day.transactions} transactions)`}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${heightPercent}%`,
                    background: day.xp > 0 ? 'linear-gradient(180deg, #38bdf8 0%, #6366f1 100%)' : 'rgba(255,255,255,0.04)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.3s'
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>30 Days Ago</span>
          <span>15 Days Ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Grid: Activity Contribution & XP Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Activity Contribution Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-highlight)', fontWeight: 800 }}>
            🎯 Activity Contribution Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activityContribution.map((act) => (
              <div key={act.activity}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>
                    {act.activity === 'LIKE' ? '👍 LIKE' : (act.activity === 'COMMENT' ? '💬 COMMENT' : (act.activity === 'STORY' ? '📱 STORY' : '✏️ MANUAL ADJUSTMENT'))}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>{act.totalXP.toLocaleString()} XP</strong> ({act.percentage}%)
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(2, act.percentage))}%`,
                      background: act.activity === 'LIKE' ? '#38bdf8' : (act.activity === 'COMMENT' ? '#a855f7' : (act.activity === 'STORY' ? '#ec4899' : '#f59e0b')),
                      borderRadius: '999px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* XP Distribution Tiers */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-highlight)', fontWeight: 800 }}>
            👥 Creator XP Distribution Buckets
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {xpDistribution.map((tier) => (
              <div
                key={tier.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {tier.label}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>
                  {tier.count} creators
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Top 10 Creators & Fastest Progressing Creators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Top 10 Creators */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-highlight)', fontWeight: 800 }}>
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
                  borderRadius: '8px',
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

        {/* Fastest Progressing Users */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-highlight)', fontWeight: 800 }}>
            🚀 Fastest Weekly XP Velocity Gainers
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
                  borderRadius: '8px',
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
