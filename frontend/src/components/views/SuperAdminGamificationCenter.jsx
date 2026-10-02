import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SuperAdminGamificationOverview from '../superadmin/gamification/SuperAdminGamificationOverview';
import SuperAdminUsersTable from '../superadmin/gamification/SuperAdminUsersTable';
import SuperAdminAdminsView from '../superadmin/gamification/SuperAdminAdminsView';
import SuperAdminTransactionsExplorer from '../superadmin/gamification/SuperAdminTransactionsExplorer';
import SuperAdminGamificationSettings from '../superadmin/gamification/SuperAdminGamificationSettings';
import SuperAdminGamificationAnalytics from '../superadmin/gamification/SuperAdminGamificationAnalytics';
import SuperAdminAuditLogsView from '../superadmin/gamification/SuperAdminAuditLogsView';
import SuperAdminXPAdjustmentModal from '../superadmin/gamification/SuperAdminXPAdjustmentModal';
import AdminUserGamificationDossier from '../admin/gamification/AdminUserGamificationDossier';
import Leaderboard from '../gamification/Leaderboard';
import LevelManagementView from './LevelManagementView';
import {
  fetchSuperAdminOverview,
  fetchSuperAdminUsers,
  fetchSuperAdminAdmins
} from '../../services/superAdminGamificationApi';

export default function SuperAdminGamificationCenter({ onNavigateToNav = null }) {
  const { user } = useAuth();

  // Active command center tab: 'overview' | 'users' | 'admins' | 'transactions' | 'levels' | 'settings' | 'leaderboard' | 'analytics' | 'audit-logs'
  const [activeTab, setActiveTab] = useState('overview');

  // Selected user for dossier inspection
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  // Overview state
  const [overview, setOverview] = useState(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalUsers: 0 });
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('xp');
  const [minXP, setMinXP] = useState('');
  const [maxXP, setMaxXP] = useState('');

  // Admins state
  const [admins, setAdmins] = useState([]);
  const [isAdminsLoading, setIsAdminsLoading] = useState(false);

  // Adjustment Modal state
  const [adjustTargetUser, setAdjustTargetUser] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [dossierRefreshKey, setDossierRefreshKey] = useState(0);

  // Sync hash changes
  useEffect(() => {
    const parseUrl = () => {
      const hash = window.location.hash.replace('#', '');
      const pathname = window.location.pathname;

      // Check if user dossier is requested
      const userMatch = hash.match(/(?:super-admin\/game-points\/user|admin\/game-points\/user)\/([a-zA-Z0-9_-]+)/) ||
                        pathname.match(/(?:super-admin\/game-points\/user|admin\/game-points\/user)\/([a-zA-Z0-9_-]+)/);
      if (userMatch && userMatch[1]) {
        setSelectedUserId(userMatch[1]);
        return;
      } else {
        setSelectedUserId(null);
      }

      // Check if direct subpath or tab requested
      if (hash.includes('game-points/transactions') || pathname.includes('game-points/transactions')) {
        setActiveTab('transactions');
      } else if (hash.includes('game-points/users') || pathname.includes('game-points/users')) {
        setActiveTab('users');
      } else if (hash.includes('game-points/admins') || pathname.includes('game-points/admins')) {
        setActiveTab('admins');
      } else if (hash.includes('game-points/levels') || pathname.includes('game-points/levels')) {
        setActiveTab('levels');
      } else if (hash.includes('game-points/settings') || pathname.includes('game-points/settings') || hash.includes('game-points/rules') || pathname.includes('game-points/rules')) {
        setActiveTab('settings');
      } else if (hash.includes('game-points/leaderboard') || pathname.includes('game-points/leaderboard')) {
        setActiveTab('leaderboard');
      } else if (hash.includes('game-points/analytics') || pathname.includes('game-points/analytics')) {
        setActiveTab('analytics');
      } else if (hash.includes('game-points/audit-logs') || pathname.includes('game-points/audit-logs')) {
        setActiveTab('audit-logs');
      } else if (hash.includes('tab=')) {
        const tabMatch = hash.match(/tab=([a-zA-Z0-9_-]+)/);
        if (tabMatch && tabMatch[1]) {
          setActiveTab(tabMatch[1]);
        }
      }
    };


    parseUrl();
    window.addEventListener('hashchange', parseUrl);
    return () => window.removeEventListener('hashchange', parseUrl);
  }, []);

  // Load Overview Data
  const loadOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    try {
      const res = await fetchSuperAdminOverview();
      if (res && res.success) {
        setOverview(res.data);
      }
    } catch (err) {
      console.warn('Could not load overview:', err);
    } finally {
      setIsOverviewLoading(false);
    }
  }, []);

  // Load Users Data
  const loadUsers = useCallback(async (pageToLoad = 1, overrideFilters = {}) => {
    setIsUsersLoading(true);
    try {
      const params = {
        page: pageToLoad,
        limit: 10,
        search: overrideFilters.search !== undefined ? overrideFilters.search : search,
        role: overrideFilters.roleFilter !== undefined ? overrideFilters.roleFilter : roleFilter,
        level: overrideFilters.levelFilter !== undefined ? overrideFilters.levelFilter : levelFilter,
        status: overrideFilters.statusFilter !== undefined ? overrideFilters.statusFilter : statusFilter,
        sortBy: overrideFilters.sortBy !== undefined ? overrideFilters.sortBy : sortBy,
        minXP: overrideFilters.minXP !== undefined ? overrideFilters.minXP : minXP,
        maxXP: overrideFilters.maxXP !== undefined ? overrideFilters.maxXP : maxXP
      };

      const res = await fetchSuperAdminUsers(params);
      if (res && res.success) {
        setUsers(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Could not load users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  }, [search, roleFilter, levelFilter, statusFilter, sortBy, minXP, maxXP]);

  // Load Admins Data
  const loadAdmins = useCallback(async () => {
    setIsAdminsLoading(true);
    try {
      const res = await fetchSuperAdminAdmins();
      if (res && res.success) {
        setAdmins(res.data || []);
      }
    } catch (err) {
      console.warn('Could not load admins:', err);
    } finally {
      setIsAdminsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(1);
    } else if (activeTab === 'admins') {
      loadAdmins();
    }
  }, [activeTab]);

  // Debounced search handling
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => {
      loadUsers(1, { search });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  // Tab navigation handler
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedUserId(null);
    window.location.hash = `super-admin/game-points?tab=${tabId}`;
  };

  // Dossier View Handlers
  const handleViewUser = (uId) => {
    setSelectedUserId(uId);
    window.location.hash = `super-admin/game-points/user/${uId}`;
  };

  const handleBackFromDossier = () => {
    setSelectedUserId(null);
    window.location.hash = `super-admin/game-points?tab=${activeTab}`;
  };

  // Adjustment Modal Handlers
  const handleOpenAdjustModal = (targetUser) => {
    setAdjustTargetUser(targetUser);
    setShowAdjustModal(true);
  };

  const handleAdjustmentSuccess = (result) => {
    const deltaStr = (result.deltaXP > 0 ? '+' : '') + result.deltaXP + ' XP';
    const userName = adjustTargetUser?.name || 'User';
    setToast({
      type: 'success',
      text: `✅ Successfully adjusted ${deltaStr} for ${userName}. New Balance: ${result.newBalance?.toLocaleString() || result.newXP?.toLocaleString() || 0} XP.${result.leveledUp ? ' 🏆 User LEVELED UP!' : ''}${result.levelDemoted ? ' ⚠️ User level adjusted.' : ''}`
    });
    setTimeout(() => setToast(null), 5000);

    setDossierRefreshKey((prev) => prev + 1);
    loadOverview();
    if (activeTab === 'users') loadUsers(pagination.page);
    if (activeTab === 'admins') loadAdmins();
  };

  // If viewing specific user dossier
  if (selectedUserId) {
    return (
      <div className="superadmin-gamification-root">
        {toast && (
          <div className={`admin-gamification-toast ${toast.type}`}>
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
          </div>
        )}

        <AdminUserGamificationDossier
          key={dossierRefreshKey}
          userId={selectedUserId}
          onBack={handleBackFromDossier}
          onAdjustXP={(u) => handleOpenAdjustModal(u)}
        />

        {showAdjustModal && adjustTargetUser && (
          <SuperAdminXPAdjustmentModal
            user={adjustTargetUser}
            isOpen={showAdjustModal}
            onClose={() => setShowAdjustModal(false)}
            onSuccess={handleAdjustmentSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="superadmin-gamification-root">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-gamification-toast ${toast.type}`}>
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
        </div>
      )}

      {/* Super Admin Command Center Hero Banner */}
      <div className="superadmin-gamification-hero">
        <div className="superadmin-gamification-hero-content">
          <div className="superadmin-gamification-badge-row">
            <span className="superadmin-gamification-role-badge">
              👑 SUPER ADMINISTRATOR GOVERNANCE
            </span>
            <div className="superadmin-gamification-telemetry-tag">
              <span className="superadmin-gamification-telemetry-dot" />
              <span>Telemetry Active • Progression Engines Online</span>
            </div>
          </div>
          <h2 className="superadmin-gamification-title">
            <span>🎮</span> Gamification Governance &amp; Control Center
          </h2>
          <p className="superadmin-gamification-desc">
            Complete institutional oversight over creators, admins, XP rules, level curves, immutable transaction ledgers, and compliance audits.
          </p>
        </div>

        {/* Right-side Stats HUD chips */}
        <div className="superadmin-gamification-hud-chips">
          <div className="superadmin-gamification-hud-chip" title="Total XP Distributed across all verified actions">
            <span>⚡ Distributed:</span>
            <strong>{(overview?.totalXPDistributed || 0).toLocaleString()} XP</strong>
          </div>
          <div className="superadmin-gamification-hud-chip" title="Active milestone progression tiers configured">
            <span>⚡ Milestone Tiers:</span>
            <strong>{overview?.activeLevels || 0} Levels</strong>
          </div>
          <div className="superadmin-gamification-hud-chip" title="Immutable transaction ledger records">
            <span>🧾 Ledger Records:</span>
            <strong>{(overview?.totalXPTransactions || 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Dedicated Master Navigation Tabs Bar */}
      <nav className="superadmin-gamification-nav-bar" role="tablist" aria-label="Gamification Control Modules">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`superadmin-gamification-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <span>📊</span>
          <span>Overview</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          className={`superadmin-gamification-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabChange('users')}
        >
          <span>👥</span>
          <span>All Users</span>
          {overview?.totalUsers > 0 && (
            <span className="superadmin-gamification-tab-badge">
              {overview.totalUsers}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'admins'}
          className={`superadmin-gamification-tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => handleTabChange('admins')}
        >
          <span>🛡️</span>
          <span>All Admins</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transactions'}
          className={`superadmin-gamification-tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => handleTabChange('transactions')}
        >
          <span>🧾</span>
          <span>Transactions</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'levels'}
          className={`superadmin-gamification-tab ${activeTab === 'levels' ? 'active' : ''}`}
          onClick={() => handleTabChange('levels')}
        >
          <span>⚡</span>
          <span>Levels</span>
          {overview?.activeLevels > 0 && (
            <span className="superadmin-gamification-tab-badge">
              {overview.activeLevels}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'settings'}
          className={`superadmin-gamification-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('settings')}
        >
          <span>⚙️</span>
          <span>XP Rules &amp; Settings</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'leaderboard'}
          className={`superadmin-gamification-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => handleTabChange('leaderboard')}
        >
          <span>🏆</span>
          <span>Leaderboard</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'analytics'}
          className={`superadmin-gamification-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => handleTabChange('analytics')}
        >
          <span>📈</span>
          <span>Analytics</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit-logs'}
          className={`superadmin-gamification-tab ${activeTab === 'audit-logs' ? 'active' : ''}`}
          onClick={() => handleTabChange('audit-logs')}
        >
          <span>📜</span>
          <span>Audit Logs</span>
        </button>
      </nav>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ marginTop: '0.25rem' }}>
          <SuperAdminGamificationOverview
            overview={overview}
            isLoading={isOverviewLoading}
            onNavigateTab={handleTabChange}
          />
        </div>
      )}

      {/* Tab 2: All Users */}
      {activeTab === 'users' && (
        <div style={{ marginTop: '0.25rem' }}>
          <SuperAdminUsersTable
            users={users}
            pagination={pagination}
            isLoading={isUsersLoading}
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={(r) => { setRoleFilter(r); loadUsers(1, { roleFilter: r }); }}
            levelFilter={levelFilter}
            onLevelFilterChange={(l) => { setLevelFilter(l); loadUsers(1, { levelFilter: l }); }}
            statusFilter={statusFilter}
            onStatusFilterChange={(s) => { setStatusFilter(s); loadUsers(1, { statusFilter: s }); }}
            sortBy={sortBy}
            onSortByChange={(sb) => { setSortBy(sb); loadUsers(1, { sortBy: sb }); }}
            minXP={minXP}
            onMinXPChange={(min) => { setMinXP(min); loadUsers(1, { minXP: min }); }}
            maxXP={maxXP}
            onMaxXPChange={(max) => { setMaxXP(max); loadUsers(1, { maxXP: max }); }}
            onClearFilters={() => {
              setSearch('');
              setRoleFilter('');
              setLevelFilter('');
              setStatusFilter('');
              setSortBy('xp');
              setMinXP('');
              setMaxXP('');
              loadUsers(1, { search: '', roleFilter: '', levelFilter: '', statusFilter: '', sortBy: 'xp', minXP: '', maxXP: '' });
            }}
            onPageChange={(p) => loadUsers(p)}
            onViewUser={handleViewUser}
            onAdjustXP={handleOpenAdjustModal}
          />
        </div>
      )}

      {/* Tab 3: All Admins */}
      {activeTab === 'admins' && (
        <div style={{ marginTop: '0.25rem' }}>
          <SuperAdminAdminsView
            admins={admins}
            isLoading={isAdminsLoading}
            onRefresh={loadAdmins}
          />
        </div>
      )}

      {/* Tab 4: Transactions Explorer */}
      {activeTab === 'transactions' && (
        <div style={{ marginTop: '0.25rem' }}>
          <SuperAdminTransactionsExplorer />
        </div>
      )}

      {/* Tab 5: Levels (Integrated Level Management System) */}
      {activeTab === 'levels' && (
        <div style={{ marginTop: '0.25rem' }}>
          <LevelManagementView />
        </div>
      )}

      {/* Tab 6: Gamification Settings (Dynamic Activity XP Configuration) */}
      {activeTab === 'settings' && (
        <div style={{ marginTop: '0.25rem' }}>
          <SuperAdminGamificationSettings
            onSettingsUpdated={() => {
              loadOverview();
            }}
          />
        </div>
      )}

      {/* Tab 7: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div style={{ marginTop: '0.25rem' }}>
          <Leaderboard onSelectUser={handleViewUser} />
        </div>
      )}

      {/* Tab 8: Analytics */}
      {activeTab === 'analytics' && (
        <div style={{ marginTop: '0.25rem' }}>
          <SuperAdminGamificationAnalytics />
        </div>
      )}

      {/* Tab 9: Audit Logs */}
      {activeTab === 'audit-logs' && (
        <div style={{ marginTop: '0.25rem' }}>
          <SuperAdminAuditLogsView />
        </div>
      )}

      {/* Super Admin XP Adjustment Modal */}
      {showAdjustModal && adjustTargetUser && (
        <SuperAdminXPAdjustmentModal
          user={adjustTargetUser}
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  );
}
