import React from 'react';

export default function SuperAdminGamificationOverview({
  overview,
  isLoading,
  onNavigateTab
}) {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading command center metrics...</span>
          </div>
        ))}
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="superadmin-gamification-overview">
      {/* 9 Core Key Performance Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Total XP */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total XP Distributed
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8' }}>
            {(overview.totalXPDistributed || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across all verified activities
          </div>
        </div>

        {/* Total Users */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>👥</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Creators
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
            {(overview.totalUsers || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '0.25rem' }}>
            Registered platform creators
          </div>
        </div>

        {/* Active Users */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🔥</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Active Creators
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b' }}>
            {(overview.activeUsers || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Creators with earned XP
          </div>
        </div>

        {/* Average XP */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Average XP
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#a855f7' }}>
            {(overview.averageXP || 0).toLocaleString()} XP
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Mean balance per creator
          </div>
        </div>

        {/* Highest XP */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>👑</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Highest XP
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#facc15' }}>
            {(overview.highestXP || 0).toLocaleString()} XP
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Platform record holder
          </div>
        </div>

        {/* Highest Level Reached */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Highest Level
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ec4899' }}>
            Level {overview.highestLevelReached || 1}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Peak creator milestone
          </div>
        </div>

        {/* Total XP Transactions */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🧾</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Transactions
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
            {(overview.totalXPTransactions || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Immutable ledger records
          </div>
        </div>

        {/* Manual Adjustments */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✏️</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Manual Adjustments
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#6366f1' }}>
            {(overview.manualAdjustments || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Super Admin &amp; Admin overrides
          </div>
        </div>

        {/* Active Levels */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Active Levels
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
            {(overview.activeLevels || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Active milestone tiers
          </div>
        </div>
      </div>

      {/* Quick Launch Control Modules */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '14px', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-highlight)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🚀</span> Quick Command Modules
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div
            onClick={() => onNavigateTab('users')}
            style={{
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>All Users Directory</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inspect creator levels, weekly XP velocity, and apply manual balances.</div>
          </div>

          <div
            onClick={() => onNavigateTab('transactions')}
            style={{
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🧾</div>
            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>Transaction Explorer</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Audit every Like, Comment, Story, and Admin Adjustment transaction.</div>
          </div>

          <div
            onClick={() => onNavigateTab('settings')}
            style={{
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚙️</div>
            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>Gamification Settings</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Configure dynamic point rules for Like, Comment, and Story verifications.</div>
          </div>

          <div
            onClick={() => onNavigateTab('levels')}
            style={{
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>Level Engine Manager</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Create, edit, or regenerate progression tiers and cumulative thresholds.</div>
          </div>

          <div
            onClick={() => onNavigateTab('admins')}
            style={{
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🛡️</div>
            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>Admin Activity Oversight</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inspect moderator reviews, manual adjustments, and moderation volume.</div>
          </div>

          <div
            onClick={() => onNavigateTab('audit-logs')}
            style={{
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📜</div>
            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>System Audit Logs</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trace all policy adjustments, rule changes, and Super Admin actions.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
