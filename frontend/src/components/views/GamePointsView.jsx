import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import PersonalGamificationDashboard from '../gamification/PersonalGamificationDashboard';
import Leaderboard from '../gamification/Leaderboard';
import DynamicLevelTimeline from '../gamification/DynamicLevelTimeline';
import AdminGamificationAnalytics from '../admin/gamification/AdminGamificationAnalytics';
import AdminUsersPointsTable from '../admin/gamification/AdminUsersPointsTable';
import AdminUserGamificationDossier from '../admin/gamification/AdminUserGamificationDossier';
import AdminXPAdjustmentModal from '../admin/gamification/AdminXPAdjustmentModal';
import {
  fetchAdminGamificationUsers,
  fetchAdminGamificationAnalytics
} from '../../services/adminGamificationApi';
import { gamificationRealtimeClient } from '../../services/gamificationRealtimeClient';


export default function GamePointsView({ onNavigateToNav = null }) {
  const { user } = useAuth();
  const currentRole = user?.role || 'USER';

  // Role-tailored tabs: 'users' | 'analytics' | 'leaderboard' | 'engine'
  const [adminTab, setAdminTab] = useState('users');

  // Selected user for full dossier view (/admin/game-points/user/:id)
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Users Points Table State
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalUsers: 0 });
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('highest_xp');
  const [minXP, setMinXP] = useState('');
  const [maxXP, setMaxXP] = useState('');

  // Admin Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  // XP Adjustment Modal State
  const [adjustModalUser, setAdjustModalUser] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [dossierRefreshKey, setDossierRefreshKey] = useState(0);

  // ============================================================================
  // URL Hash/Path Synchronization for /admin/game-points/user/:id
  // ============================================================================
  useEffect(() => {
    const parseUrlUser = () => {
      const hash = window.location.hash.replace('#', '');
      const pathname = window.location.pathname;
      const match = hash.match(/admin\/game-points\/user\/([a-zA-Z0-9_-]+)/) ||
                    pathname.match(/admin\/game-points\/user\/([a-zA-Z0-9_-]+)/) ||
                    hash.match(/game-points\/user\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setSelectedUserId(match[1]);
      } else if (!hash.includes('user/')) {
        setSelectedUserId(null);
      }
    };
    parseUrlUser();
    window.addEventListener('hashchange', parseUrlUser);
    return () => window.removeEventListener('hashchange', parseUrlUser);
  }, []);

  // ============================================================================
  // Fetch Admin Gamification Users (Server-side filtering & pagination)
  // ============================================================================
  const loadUsers = useCallback(async (pageToLoad = 1, overrideFilters = {}) => {
    if (currentRole === 'USER') return;
    setIsUsersLoading(true);
    try {
      const params = {
        page: pageToLoad,
        limit: 10,
        search: overrideFilters.search !== undefined ? overrideFilters.search : search,
        level: overrideFilters.levelFilter !== undefined ? overrideFilters.levelFilter : levelFilter,
        status: overrideFilters.statusFilter !== undefined ? overrideFilters.statusFilter : statusFilter,
        sortBy: overrideFilters.sortBy !== undefined ? overrideFilters.sortBy : sortBy,
        minXP: overrideFilters.minXP !== undefined ? overrideFilters.minXP : minXP,
        maxXP: overrideFilters.maxXP !== undefined ? overrideFilters.maxXP : maxXP,
      };

      // Strip empty values
      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const res = await fetchAdminGamificationUsers(params);
      if (res && res.success) {
        setUsers(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Could not load gamification users:', err.message);
    } finally {
      setIsUsersLoading(false);
    }
  }, [currentRole, search, levelFilter, statusFilter, sortBy, minXP, maxXP]);

  // ============================================================================
  // Fetch Admin Analytics
  // ============================================================================
  const loadAnalytics = useCallback(async () => {
    if (currentRole === 'USER') return;
    setIsAnalyticsLoading(true);
    try {
      const res = await fetchAdminGamificationAnalytics();
      if (res && res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.warn('Could not load gamification analytics:', err.message);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [currentRole]);

  // Initial load
  useEffect(() => {
    if (currentRole !== 'USER') {
      loadUsers(1);
      loadAnalytics();
    }
  }, [currentRole]);

  // Real-time synchronization for Admin points table, dossier, and telemetry
  useEffect(() => {
    if (currentRole === 'USER') return;

    const unsubscribe = gamificationRealtimeClient.subscribe((event, data) => {
      if (event === 'admin_user_xp_updated' || event === 'xp_updated') {
        // 1. Live update the user row in the table in place
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === data.userId) {
              return {
                ...u,
                totalXP: data.totalXP,
                currentLevel: data.currentLevel ?? u.currentLevel,
                level: data.currentLevel ?? u.level,
                levelName: data.levelName ?? u.levelName,
                icon: data.icon ?? u.icon
              };
            }
            return u;
          })
        );

        // 2. If the user's dossier is open, trigger full fresh refresh
        if (selectedUserId === data.userId) {
          setDossierRefreshKey((k) => k + 1);
        }

        // 3. Refresh admin analytics in the background
        loadAnalytics();

        // 4. Subtle non-intrusive toast notice
        if (data.deltaXP) {
          const deltaSign = data.deltaXP > 0 ? '+' : '';
          showToast(`⚡ Real-time update: ${data.userName || 'User'} ${deltaSign}${data.deltaXP} XP (Now ${data.totalXP.toLocaleString()} XP)`, 'info');
        }
      }

      if (event === 'leaderboard_updated') {
        loadAnalytics();
      }
    });

    return () => unsubscribe();
  }, [currentRole, selectedUserId, loadAnalytics]);


  // Debounced search handling
  useEffect(() => {
    if (currentRole === 'USER') return;
    const timer = setTimeout(() => {
      loadUsers(1, { search });
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle Filter & Sort Changes
  const handleLevelFilterChange = (val) => {
    setLevelFilter(val);
    loadUsers(1, { levelFilter: val });
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    loadUsers(1, { statusFilter: val });
  };

  const handleSortByChange = (val) => {
    setSortBy(val);
    loadUsers(1, { sortBy: val });
  };

  const handleMinXPChange = (val) => {
    setMinXP(val);
    loadUsers(1, { minXP: val });
  };

  const handleMaxXPChange = (val) => {
    setMaxXP(val);
    loadUsers(1, { maxXP: val });
  };

  const handleClearFilters = () => {
    setSearch('');
    setLevelFilter('');
    setStatusFilter('');
    setSortBy('highest_xp');
    setMinXP('');
    setMaxXP('');
    loadUsers(1, {
      search: '',
      levelFilter: '',
      statusFilter: '',
      sortBy: 'highest_xp',
      minXP: '',
      maxXP: ''
    });
  };

  const handlePageChange = (newPage) => {
    loadUsers(newPage);
  };

  // ============================================================================
  // Dossier Navigation
  // ============================================================================
  const handleViewUser = (userId) => {
    setSelectedUserId(userId);
    window.location.hash = `admin/game-points/user/${userId}`;
  };

  const handleViewProgress = (userId) => {
    handleViewUser(userId);
  };

  const handleBackFromDossier = () => {
    setSelectedUserId(null);
    window.location.hash = 'admin/game-points';
  };

  // ============================================================================
  // XP Adjustment Modal & Handlers
  // ============================================================================
  const handleOpenAdjustModal = (targetUser) => {
    setAdjustModalUser(targetUser);
    setShowAdjustModal(true);
  };

  const handleAdjustmentSuccess = (result) => {
    const deltaStr = (result.deltaXP > 0 ? '+' : '') + result.deltaXP + ' XP';
    const userName = adjustModalUser?.name || 'Creator';
    const newBal = result.newBalance !== undefined ? result.newBalance.toLocaleString() : (result.newXP !== undefined ? result.newXP.toLocaleString() : '');

    setToast({
      type: 'success',
      text: `✅ Successfully applied ${deltaStr} adjustment to ${userName}. New Balance: ${newBal} XP.${result.leveledUp ? ' 🏆 User LEVELED UP!' : ''}${result.levelDemoted ? ' ⚠️ User level adjusted.' : ''}`
    });
    setTimeout(() => setToast(null), 4500);

    // Refresh active data, graphs, rankings, and user dossier
    setDossierRefreshKey((prev) => prev + 1);
    loadUsers(pagination.page);
    loadAnalytics();
  };

  // ============================================================================
  // 1. NORMAL USER: Renders Personal Gamification Dashboard
  // ============================================================================
  if (currentRole === 'USER') {
    return <PersonalGamificationDashboard onNavigateToNav={onNavigateToNav} />;
  }

  // ============================================================================
  // 2. ADMIN & SUPER ADMIN: Full Governance & Points Management Suite
  // ============================================================================
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';

  // If viewing a specific user dossier (/admin/game-points/user/:id)
  if (selectedUserId) {
    return (
      <div className="layout-content-area gamepoints-admin-container">
        {toast && (
          <div className={`admin-gamification-toast ${toast.type}`}>
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>
        )}

        <AdminUserGamificationDossier
          key={dossierRefreshKey}
          userId={selectedUserId}
          onBack={handleBackFromDossier}
          onAdjustXP={(userData) => handleOpenAdjustModal(userData)}
        />

        {showAdjustModal && adjustModalUser && (
          <AdminXPAdjustmentModal
            user={adjustModalUser}
            isOpen={showAdjustModal}
            onClose={() => setShowAdjustModal(false)}
            onSuccess={handleAdjustmentSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="layout-content-area gamepoints-admin-container">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`admin-gamification-toast ${toast.type}`}>
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="gamepoints-dashboard-banner glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
        {/* Top Row: Title & Badges on left, Refresh Data button at top right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div className="gamepoints-banner-content" style={{ maxWidth: '720px' }}>
            <div className="gamepoints-banner-badge admin">
              <span className="gamepoints-banner-dot" />
              <span>{isSuperAdmin ? '👑 Super Administrator Governance' : '🛡️ Admin Points Oversight'}</span>
            </div>
            <h1 className="gamepoints-banner-title" style={{ margin: '0.35rem 0' }}>
              <span className="gamepoints-banner-icon">🎮</span> Game Points Governance &amp; Administration
            </h1>
            <p className="gamepoints-banner-description" style={{ margin: 0 }}>
              {isSuperAdmin
                ? 'Manage creator XP balances, audit adjustments, configure dynamic level tiers, and monitor global gamification analytics.'
                : 'Monitor community rankings, adjust creator XP with verified compliance audits, and inspect participant progression curves.'}
            </p>
          </div>

          {/* Top Right Refresh Button */}
          <button
            type="button"
            className="btn-refresh-pill"
            onClick={() => { loadUsers(pagination.page); loadAnalytics(); }}
            disabled={isUsersLoading || isAnalyticsLoading}
            title="Refresh XP metrics, user rankings, and analytics"
            style={{ flexShrink: 0, marginTop: '0.25rem' }}
          >
            <svg
              className={`refresh-icon-svg ${(isUsersLoading || isAnalyticsLoading) ? 'spinning' : ''}`}
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>{(isUsersLoading || isAnalyticsLoading) ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Bottom Row: Role Sub-Navigation Tabs */}
        <div className="gamepoints-banner-actions" style={{ display: 'flex', alignItems: 'center', width: '100%', marginTop: '0.25rem' }}>
          <div className="gamepoints-subnav-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={adminTab === 'users'}
              className={`gamepoints-subnav-btn ${adminTab === 'users' ? 'active' : ''}`}
              onClick={() => setAdminTab('users')}
            >
              <span>👥</span> Users Points Table
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={adminTab === 'analytics'}
              className={`gamepoints-subnav-btn ${adminTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setAdminTab('analytics')}
            >
              <span>📊</span> Analytics Dashboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={adminTab === 'leaderboard'}
              className={`gamepoints-subnav-btn ${adminTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setAdminTab('leaderboard')}
            >
              <span>🏆</span> Community Leaderboard
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                role="tab"
                aria-selected={adminTab === 'engine'}
                className={`gamepoints-subnav-btn ${adminTab === 'engine' ? 'active' : ''}`}
                onClick={() => setAdminTab('engine')}
              >
                <span>⚡</span> Level Engine
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Governance Advisory Notice */}
      <div style={{
        margin: '1.25rem 0',
        padding: '0.85rem 1.25rem',
        borderRadius: '12px',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        fontSize: '0.88rem'
      }}>
        <span style={{ fontSize: '1.25rem' }}>🛡️</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-highlight)' }}>Administrative Account:</strong> Administrators oversee and adjust game points for platform creators. Administrative accounts manage the ecosystem and do not hold personal player points or compete on the leaderboard.
        </span>
      </div>

      {/* TAB 1: USERS POINTS TABLE (Default View) */}
      {adminTab === 'users' && (
        <div style={{ marginTop: '1.5rem' }}>
          {/* Top 6 KPI summary cards on users page for fast telemetry */}
          {analytics?.metrics && (
            <div className="admin-gamification-kpi-grid">
              <div className="admin-gamification-kpi-card users">
                <span className="admin-gamification-kpi-label">Total Users</span>
                <span className="admin-gamification-kpi-value" style={{ color: '#38bdf8' }}>
                  {(analytics.metrics.totalUsers || 0).toLocaleString()}
                </span>
                <span className="admin-gamification-kpi-sub">Registered accounts</span>
              </div>
              <div className="admin-gamification-kpi-card xp">
                <span className="admin-gamification-kpi-label">Total XP Distributed</span>
                <span className="admin-gamification-kpi-value" style={{ color: '#818cf8' }}>
                  {(analytics.metrics.totalXPDistributed || 0).toLocaleString()}
                </span>
                <span className="admin-gamification-kpi-sub">Ecosystem XP sum</span>
              </div>
              <div className="admin-gamification-kpi-card avg">
                <span className="admin-gamification-kpi-label">Average User XP</span>
                <span className="admin-gamification-kpi-value" style={{ color: '#a855f7' }}>
                  {(analytics.metrics.averageUserXP || 0).toLocaleString()}
                </span>
                <span className="admin-gamification-kpi-sub">Mean XP per creator</span>
              </div>
              <div className="admin-gamification-kpi-card high-xp">
                <span className="admin-gamification-kpi-label">Highest XP</span>
                <span className="admin-gamification-kpi-value" style={{ color: '#facc15' }}>
                  {(analytics.metrics.highestXP || 0).toLocaleString()}
                </span>
                <span className="admin-gamification-kpi-sub">Top earner record</span>
              </div>
              <div className="admin-gamification-kpi-card level">
                <span className="admin-gamification-kpi-label">Highest Level</span>
                <span className="admin-gamification-kpi-value" style={{ color: '#ec4899' }}>
                  Level {analytics.metrics.highestLevel || 1}
                </span>
                <span className="admin-gamification-kpi-sub">Platform tier peak</span>
              </div>
              <div className="admin-gamification-kpi-card active-users">
                <span className="admin-gamification-kpi-label">Active Creators</span>
                <span className="admin-gamification-kpi-value" style={{ color: '#10b981' }}>
                  {(analytics.metrics.activeUsers || 0).toLocaleString()}
                </span>
                <span className="admin-gamification-kpi-sub">Engaged participants</span>
              </div>
            </div>
          )}

          <AdminUsersPointsTable
            users={users}
            pagination={pagination}
            isLoading={isUsersLoading}
            search={search}
            onSearchChange={setSearch}
            levelFilter={levelFilter}
            onLevelFilterChange={handleLevelFilterChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            sortBy={sortBy}
            onSortByChange={handleSortByChange}
            minXP={minXP}
            onMinXPChange={handleMinXPChange}
            maxXP={maxXP}
            onMaxXPChange={handleMaxXPChange}
            onClearFilters={handleClearFilters}
            onPageChange={handlePageChange}
            onViewUser={handleViewUser}
            onAdjustXP={handleOpenAdjustModal}
            onViewProgress={handleViewProgress}
          />
        </div>
      )}

      {/* TAB 2: ANALYTICS DASHBOARD */}
      {adminTab === 'analytics' && (
        <div style={{ marginTop: '1.5rem' }}>
          <AdminGamificationAnalytics
            analytics={analytics}
            isLoading={isAnalyticsLoading}
            onRefresh={loadAnalytics}
          />
        </div>
      )}

      {/* TAB 3: COMMUNITY LEADERBOARD */}
      {adminTab === 'leaderboard' && (
        <div style={{ marginTop: '1.5rem' }}>
          <Leaderboard onSelectUser={(uId) => handleViewUser(uId)} />
        </div>
      )}

      {/* TAB 4: SUPER ADMIN LEVEL ENGINE */}
      {adminTab === 'engine' && isSuperAdmin && (
        <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.25rem' }}>
                ⚡ Super Admin Level Engine Configuration
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Configure active level tiers, XP step requirements, and global progression formulas
              </p>
            </div>
            {onNavigateToNav && (
              <button
                type="button"
                className="btn-portal-primary"
                onClick={() => onNavigateToNav('levels')}
              >
                ⚡ Open Dedicated Level Manager
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Configured Tiers</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>50+ Levels</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--status-success)', marginTop: '0.25rem' }}>Dynamic Database Config</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Earning Rules</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-highlight)', marginTop: '0.25rem' }}>
                Like: +1 | Comment: +2 | Story: +2
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Strict Idempotency Guardrails</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Audit Log Guard</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>100%</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Immutable Transaction Ledger</div>
            </div>
          </div>

          <DynamicLevelTimeline />
        </div>
      )}

      {/* XP Adjustment Modal */}
      {showAdjustModal && adjustModalUser && (
        <AdminXPAdjustmentModal
          user={adjustModalUser}
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  );
}
