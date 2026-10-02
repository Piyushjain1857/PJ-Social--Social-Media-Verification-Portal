import React from 'react';

export default function SuperAdminGamificationOverview({
  overview,
  isLoading,
  onNavigateTab
}) {
  if (isLoading) {
    return (
      <div className="superadmin-kpi-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="superadmin-kpi-card"
            style={{ minHeight: '110px', opacity: 0.6 }}
          >
            <div className="superadmin-kpi-icon-box" style={{ background: 'rgba(255,255,255,0.05)' }}>
              ⏳
            </div>
            <div className="superadmin-kpi-info" style={{ width: '100%' }}>
              <div style={{ width: '60%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ width: '40%', height: '24px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="superadmin-gamification-overview">
      {/* 9 Core Key Performance Metric HUD Cards */}
      <div className="superadmin-kpi-grid" style={{ marginBottom: '1.75rem' }}>
        {/* Total XP Distributed */}
        <div
          className="superadmin-kpi-card xp"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('transactions')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('transactions'); } }}
          title="Click to view all verified transactions"
        >
          <div className="superadmin-kpi-icon-box xp">
            ⚡
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Total XP Distributed</span>
            <span className="superadmin-kpi-value" style={{ color: '#38bdf8' }}>
              {(overview.totalXPDistributed || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Across all verified activities →</span>
          </div>
        </div>

        {/* Total Creators */}
        <div
          className="superadmin-kpi-card creators"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('users')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('users'); } }}
          title="Click to open creator user directory"
        >
          <div className="superadmin-kpi-icon-box creators">
            👥
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Total Creators</span>
            <span className="superadmin-kpi-value" style={{ color: '#10b981' }}>
              {(overview.totalUsers || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Registered platform creators →</span>
          </div>
        </div>

        {/* Active Creators */}
        <div
          className="superadmin-kpi-card active-users"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('users')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('users'); } }}
          title="Click to view active creators"
        >
          <div className="superadmin-kpi-icon-box active-users">
            🔥
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Active Creators</span>
            <span className="superadmin-kpi-value" style={{ color: '#f59e0b' }}>
              {(overview.activeUsers || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Creators with earned XP →</span>
          </div>
        </div>

        {/* Average XP */}
        <div
          className="superadmin-kpi-card avg-xp"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('analytics')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('analytics'); } }}
          title="Click to open gamification analytics"
        >
          <div className="superadmin-kpi-icon-box avg-xp">
            📊
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Average XP</span>
            <span className="superadmin-kpi-value" style={{ color: '#a855f7' }}>
              {(overview.averageXP || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#c084fc' }}>XP</span>
            </span>
            <span className="superadmin-kpi-subtext">Mean balance per creator →</span>
          </div>
        </div>

        {/* Highest XP */}
        <div
          className="superadmin-kpi-card highest-xp"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('leaderboard')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('leaderboard'); } }}
          title="Click to open leaderboard"
        >
          <div className="superadmin-kpi-icon-box highest-xp">
            👑
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Highest XP</span>
            <span className="superadmin-kpi-value" style={{ color: '#facc15' }}>
              {(overview.highestXP || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#fde047' }}>XP</span>
            </span>
            <span className="superadmin-kpi-subtext">Platform record holder →</span>
          </div>
        </div>

        {/* Highest Level Reached */}
        <div
          className="superadmin-kpi-card highest-lvl"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('levels')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('levels'); } }}
          title="Click to manage progression levels"
        >
          <div className="superadmin-kpi-icon-box highest-lvl">
            🏆
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Highest Level</span>
            <span className="superadmin-kpi-value" style={{ color: '#ec4899' }}>
              Level {overview.highestLevelReached || 1}
            </span>
            <span className="superadmin-kpi-subtext">Peak creator milestone →</span>
          </div>
        </div>

        {/* Total XP Transactions */}
        <div
          className="superadmin-kpi-card tx"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('transactions')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('transactions'); } }}
          title="Click to inspect all transactions"
        >
          <div className="superadmin-kpi-icon-box tx">
            🧾
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Total Transactions</span>
            <span className="superadmin-kpi-value" style={{ color: '#818cf8' }}>
              {(overview.totalXPTransactions || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Immutable ledger records →</span>
          </div>
        </div>

        {/* Manual Adjustments */}
        <div
          className="superadmin-kpi-card manual"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('transactions')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('transactions'); } }}
          title="Click to filter manual admin adjustments"
        >
          <div className="superadmin-kpi-icon-box manual">
            ✏️
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Manual Adjustments</span>
            <span className="superadmin-kpi-value" style={{ color: '#f87171' }}>
              {(overview.manualAdjustments || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Admin overrides applied →</span>
          </div>
        </div>

        {/* Active Levels */}
        <div
          className="superadmin-kpi-card levels"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('levels')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('levels'); } }}
          title="Click to manage progression tiers"
        >
          <div className="superadmin-kpi-icon-box levels">
            ⚡
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Active Levels</span>
            <span className="superadmin-kpi-value" style={{ color: '#14b8a6' }}>
              {(overview.activeLevels || 0).toLocaleString()}
            </span>
            <span className="superadmin-kpi-subtext">Milestone tiers online →</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Mission Control Modules */}
      <div className="admin-dash-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🚀</span>
          <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontSize: '1.15rem', fontWeight: 800 }}>
            Institutional Command Modules
          </h3>
        </div>
        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Direct access to critical administrative subsystems, ledger audits, and XP policy engine configurations.
        </p>

        <div className="superadmin-mission-grid">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTab('users')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('users'); } }}
            className="superadmin-mission-card"
          >
            <div className="superadmin-mission-icon-box" style={{ color: '#10b981' }}>
              👥
            </div>
            <div className="superadmin-mission-title">All Users Directory</div>
            <div className="superadmin-mission-desc">
              Inspect creator levels, weekly XP velocity, and apply manual balances with full audit trails.
            </div>
            <div className="superadmin-mission-action">Open Directory →</div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTab('transactions')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('transactions'); } }}
            className="superadmin-mission-card"
          >
            <div className="superadmin-mission-icon-box" style={{ color: '#38bdf8' }}>
              🧾
            </div>
            <div className="superadmin-mission-title">Transaction Explorer</div>
            <div className="superadmin-mission-desc">
              Audit every Like, Comment, Story, and Admin Adjustment transaction in real-time.
            </div>
            <div className="superadmin-mission-action">Explore Ledgers →</div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTab('settings')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('settings'); } }}
            className="superadmin-mission-card"
          >
            <div className="superadmin-mission-icon-box" style={{ color: '#f59e0b' }}>
              ⚙️
            </div>
            <div className="superadmin-mission-title">Gamification Settings</div>
            <div className="superadmin-mission-desc">
              Configure dynamic point rules for Like, Comment, and Story activity verifications.
            </div>
            <div className="superadmin-mission-action">Configure Rules →</div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTab('levels')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('levels'); } }}
            className="superadmin-mission-card"
          >
            <div className="superadmin-mission-icon-box" style={{ color: '#14b8a6' }}>
              ⚡
            </div>
            <div className="superadmin-mission-title">Level Engine Manager</div>
            <div className="superadmin-mission-desc">
              Create, edit, or regenerate progression tiers and cumulative XP thresholds.
            </div>
            <div className="superadmin-mission-action">Manage Levels →</div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTab('admins')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('admins'); } }}
            className="superadmin-mission-card"
          >
            <div className="superadmin-mission-icon-box" style={{ color: '#a855f7' }}>
              🛡️
            </div>
            <div className="superadmin-mission-title">Admin Activity Oversight</div>
            <div className="superadmin-mission-desc">
              Inspect moderator reviews, manual adjustments, and individual moderation volumes.
            </div>
            <div className="superadmin-mission-action">Audit Admins →</div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTab('audit-logs')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('audit-logs'); } }}
            className="superadmin-mission-card"
          >
            <div className="superadmin-mission-icon-box" style={{ color: '#ec4899' }}>
              📜
            </div>
            <div className="superadmin-mission-title">System Audit Logs</div>
            <div className="superadmin-mission-desc">
              Trace all policy adjustments, rule changes, security events, and administrative actions.
            </div>
            <div className="superadmin-mission-action">View Logs →</div>
          </div>
        </div>
      </div>
    </div>
  );
}

