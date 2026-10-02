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
      }

      // Check if direct subtab requested: #super-admin/game-points?tab=... or similar
      if (hash.includes('tab=')) {
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
      text: `✅ Successfully adjusted ${deltaStr} for ${userName}. New Balance: ${result.newBalance?.toLocaleString() || 0} XP.`
    });
    setTimeout(() => setToast(null), 5000);

    loadOverview();
    if (activeTab === 'users') loadUsers(pagination.page);
    if (activeTab === 'admins') loadAdmins();
  };

  // If viewing specific user dossier
  if (selectedUserId) {
    return (
      <div className="layout-content-area gamepoints-admin-container">
        {toast && (
          <div className={`admin-gamification-toast ${toast.type}`}>
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
          </div>
        )}

        <AdminUserGamificationDossier
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
    <div className="layout-content-area gamepoints-admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-gamification-toast ${toast.type}`}>
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
        </div>
      )}

      {/* Super Admin Command Center Banner */}
      <div className="gamepoints-dashboard-banner glass-panel">
        <div className="gamepoints-banner-content">
          <div className="gamepoints-banner-badge admin" style={{ background: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.35)', color: '#f472b6' }}>
            <span className="gamepoints-banner-dot" style={{ background: '#ec4899' }} />
            <span>👑 Super Administrator Command Center</span>
          </div>
          <h1 className="gamepoints-banner-title">
            <span className="gamepoints-banner-icon">🎮</span> Gamification Governance &amp; Control Center
          </h1>
          <p className="gamepoints-banner-description">
            Complete institutional visibility over creators, admins, XP rules, level curves, immutable transaction ledgers, and compliance audits.
          </p>
        </div>

        {/* Master Navigation Tabs */}
        <div className="gamepoints-banner-actions">
          <div className="gamepoints-subnav-tabs" role="tablist" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              className={`gamepoints-subnav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
            >
              <span>📊</span> Overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'users'}
              className={`gamepoints-subnav-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleTabChange('users')}
            >
              <span>👥</span> All Users
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admins'}
              className={`gamepoints-subnav-btn ${activeTab === 'admins' ? 'active' : ''}`}
              onClick={() => handleTabChange('admins')}
            >
              <span>🛡️</span> All Admins
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'transactions'}
              className={`gamepoints-subnav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => handleTabChange('transactions')}
            >
              <span>🧾</span> Transactions
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'levels'}
              className={`gamepoints-subnav-btn ${activeTab === 'levels' ? 'active' : ''}`}
              onClick={() => handleTabChange('levels')}
            >
              <span>⚡</span> Levels
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              className={`gamepoints-subnav-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              <span>⚙️</span> XP Rules &amp; Settings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'leaderboard'}
              className={`gamepoints-subnav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('leaderboard')}
            >
              <span>🏆</span> Leaderboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analytics'}
              className={`gamepoints-subnav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => handleTabChange('analytics')}
            >
              <span>📈</span> Analytics
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'audit-logs'}
              className={`gamepoints-subnav-btn ${activeTab === 'audit-logs' ? 'active' : ''}`}
              onClick={() => handleTabChange('audit-logs')}
            >
              <span>📜</span> Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ marginTop: '1.5rem' }}>
          <SuperAdminGamificationOverview
            overview={overview}
            isLoading={isOverviewLoading}
            onNavigateTab={handleTabChange}
          />
        </div>
      )}

      {/* Tab 2: All Users */}
      {activeTab === 'users' && (
        <div style={{ marginTop: '1.5rem' }}>
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
        <div style={{ marginTop: '1.5rem' }}>
          <SuperAdminAdminsView
            admins={admins}
            isLoading={isAdminsLoading}
            onRefresh={loadAdmins}
          />
        </div>
      )}

      {/* Tab 4: Transactions Explorer */}
      {activeTab === 'transactions' && (
        <div style={{ marginTop: '1.5rem' }}>
          <SuperAdminTransactionsExplorer />
        </div>
      )}

      {/* Tab 5: Levels (Integrated Level Management System) */}
      {activeTab === 'levels' && (
        <div style={{ marginTop: '1.5rem' }}>
          <LevelManagementView />
        </div>
      )}

      {/* Tab 6: Gamification Settings (Dynamic Activity XP Configuration) */}
      {activeTab === 'settings' && (
        <div style={{ marginTop: '1.5rem' }}>
          <SuperAdminGamificationSettings
            onSettingsUpdated={() => {
              loadOverview();
            }}
          />
        </div>
      )}

      {/* Tab 7: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div style={{ marginTop: '1.5rem' }}>
          <Leaderboard onSelectUser={handleViewUser} />
        </div>
      )}

      {/* Tab 8: Analytics */}
      {activeTab === 'analytics' && (
        <div style={{ marginTop: '1.5rem' }}>
          <SuperAdminGamificationAnalytics />
        </div>
      )}

      {/* Tab 9: Audit Logs */}
      {activeTab === 'audit-logs' && (
        <div style={{ marginTop: '1.5rem' }}>
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
