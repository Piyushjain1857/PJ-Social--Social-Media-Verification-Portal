import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllSubmissions, fetchMyNotifications, fetchHealth } from '../services/api';

// Sub-views for built-in views
import DashboardView from './views/DashboardView';
import UsersView from './views/UsersView';
import AdminsView from './views/AdminsView';
import SubmissionsView from './views/SubmissionsView';
import ReviewSubmissionsView from './views/ReviewSubmissionsView';
import SocialAccountsView from './views/SocialAccountsView';
import SettingsView from './views/SettingsView';
import SubmitActivityView from './views/SubmitActivityView';
import MySubmissionsView from './views/MySubmissionsView';
import NotificationsView from './views/NotificationsView';
import ProfileView from './views/ProfileView';

/**
 * Role-Based Navigation Definitions strictly enforced from authenticated role data:
 * 
 * SUPER_ADMIN:
 * - Dashboard, Users, Admins, Submissions, Social Accounts, Settings, Profile
 * 
 * ADMIN:
 * - Dashboard, Review Submissions, Submissions, Profile
 * 
 * USER:
 * - Dashboard, Submit Activity, My Submissions, Notifications, Profile
 */
export const ROLE_NAVIGATION = {
  SUPER_ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Platform analytics & system overview' },
    { id: 'users', label: 'Users', icon: '👥', description: 'User directory & RBAC assignment' },
    { id: 'admins', label: 'Admins', icon: '🛡️', description: 'Administrator directory & governance' },
    { id: 'submissions', label: 'Submissions', icon: '📋', description: 'Verification submissions repository' },
    { id: 'social-accounts', label: 'Social Accounts', icon: '🔗', description: 'Connected platforms & API connectors' },
    { id: 'settings', label: 'Settings', icon: '⚙️', description: 'Platform security & verification rules' },
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Authenticated Super Admin credentials' },
  ],
  ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Moderator workload & statistics' },
    { id: 'review-submissions', label: 'Review Submissions', icon: '⚖️', description: 'Moderation review queue', isUrgentBadge: true },
    { id: 'submissions', label: 'Submissions', icon: '📋', description: 'Browse and inspect platform submissions' },
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Moderator profile & credentials' },
  ],
  USER: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Creator dashboard & activity score' },
    { id: 'submit-activity', label: 'Submit Activity', icon: '➕', description: 'Submit social media activity proof' },
    { id: 'my-submissions', label: 'My Submissions', icon: '📋', description: 'Track your submission verification statuses' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', description: 'Verification updates & alerts', hasBadge: true },
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Creator profile & connected handles' },
  ]
};

export default function MainLayout({
  activeNav: controlledActiveNav,
  onNavChange: controlledOnNavChange,
  onNavigate,
  children,
  title: customTitle,
  subtitle: customSubtitle,
  actions: customActions
}) {
  const { user, logout, login } = useAuth();

  // Internal active navigation state if not controlled
  const [internalNav, setInternalNav] = useState('dashboard');
  const activeNav = controlledActiveNav || internalNav;

  const handleNavChange = (navId) => {
    if (controlledOnNavChange) {
      controlledOnNavChange(navId);
    } else {
      setInternalNav(navId);
    }
    // Close mobile drawer when an item is selected
    setIsMobileDrawerOpen(false);
  };

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // User profile dropdown menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Live badges and telemetry state
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [apiLatency, setApiLatency] = useState(null);
  const [isApiHealthy, setIsApiHealthy] = useState(true);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch badge metrics & API latency
  const refreshMetrics = async () => {
    try {
      const healthRes = await fetchHealth();
      setIsApiHealthy(healthRes.success);
      setApiLatency(healthRes.latency);

      if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        const subsRes = await fetchAllSubmissions();
        if (subsRes.success && subsRes.data) {
          const pending = subsRes.data.filter(s => s.status === 'PENDING').length;
          setPendingReviewCount(pending);
        }
      }

      if (user?.role === 'USER') {
        const notifRes = await fetchMyNotifications();
        if (notifRes.success && notifRes.data) {
          setNotificationCount(notifRes.data.length);
        }
      }
    } catch (e) {
      console.warn('Metrics refresh error:', e.message);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, [user?.role]);

  // Derive navigation list based strictly on verified role data
  const currentRole = user?.role || 'USER';
  const navItems = ROLE_NAVIGATION[currentRole] || ROLE_NAVIGATION.USER;

  // Active navigation metadata
  const currentItem = navItems.find(item => item.id === activeNav) || navItems[0];
  const pageTitle = customTitle || currentItem?.label || 'Dashboard';
  const pageSubtitle = customSubtitle || currentItem?.description || 'Social Media Activity Verification Portal';

  // Role pill styling helper
  const getRoleClass = (role) => {
    if (role === 'SUPER_ADMIN') return 'superadmin';
    if (role === 'ADMIN') return 'admin';
    return 'user';
  };

  const getRoleLabel = (role) => {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ADMIN') return 'Admin Moderator';
    return 'Creator User';
  };

  const getRoleBadgeIcon = (role) => {
    if (role === 'SUPER_ADMIN') return '👑';
    if (role === 'ADMIN') return '🛡️';
    return '🚀';
  };

  const handleRoleQuickSwitch = async (email, password) => {
    setIsProfileMenuOpen(false);
    const res = await login(email, password);
    if (res.success) {
      handleNavChange('dashboard');
    }
  };

  // Helper to render active view when no custom children are provided
  const renderViewContent = () => {
    if (children) return children;

    switch (activeNav) {
      case 'dashboard':
        return <DashboardView onNavigateToNav={handleNavChange} />;
      case 'users':
        return <UsersView />;
      case 'admins':
        return <AdminsView />;
      case 'submissions':
        return <SubmissionsView />;
      case 'review-submissions':
        return <ReviewSubmissionsView />;
      case 'social-accounts':
        return <SocialAccountsView />;
      case 'settings':
        return <SettingsView />;
      case 'submit-activity':
        return <SubmitActivityView onNavigateToNav={handleNavChange} />;
      case 'my-submissions':
        return <MySubmissionsView onNavigateToNav={handleNavChange} />;
      case 'notifications':
        return <NotificationsView onNavigateToNav={handleNavChange} />;
      case 'profile':
        return <ProfileView onNavigateToNav={handleNavChange} />;
      default:
        return <DashboardView onNavigateToNav={handleNavChange} />;
    }
  };

  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="app-layout-shell">
      {/* ====================================================================
          1. Desktop Responsive Sidebar (Sticky left navigation rail)
          ==================================================================== */}
      <aside className="layout-sidebar" aria-label="Desktop Sidebar Navigation">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-brand"
            onClick={() => onNavigate ? onNavigate('portal') : handleNavChange('dashboard')}
            title="Go to portal landing"
          >
            <div className="sidebar-brand-icon">🛡️</div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">Veri<span>Social</span></span>
              <span className="sidebar-brand-subtitle">Verification Engine</span>
            </div>
          </button>

          {/* Role Clearance Banner */}
          <div className="sidebar-role-banner">
            <span
              className="sidebar-role-indicator-dot"
              style={{
                background: currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : currentRole === 'ADMIN' ? 'var(--role-admin)' : 'var(--role-user)'
              }}
            />
            <span className="sidebar-role-name">
              {getRoleBadgeIcon(currentRole)} {getRoleLabel(currentRole)}
            </span>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="sidebar-nav-container">
          <div className="sidebar-section-heading">Navigation Menu</div>
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            let badge = null;
            if (item.isUrgentBadge && pendingReviewCount > 0) {
              badge = <span className="sidebar-nav-badge badge-urgent">{pendingReviewCount} PENDING</span>;
            } else if (item.hasBadge && notificationCount > 0) {
              badge = <span className="sidebar-nav-badge badge-new">{notificationCount}</span>;
            }

            return (
              <button
                key={item.id}
                type="button"
                id={`sidebar-nav-${item.id}`}
                className={`sidebar-nav-item ${isActive ? `active role-${getRoleClass(currentRole)}` : ''}`}
                onClick={() => handleNavChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="sidebar-nav-item-content">
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {badge}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div
              className="sidebar-user-avatar"
              style={{
                background: currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : currentRole === 'ADMIN' ? 'var(--role-admin)' : 'var(--role-user)'
              }}
            >
              {avatarInitial}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={user?.name}>{user?.name}</span>
              <span className="sidebar-user-role">{user?.email}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={() => { logout(); if (onNavigate) onNavigate('portal'); }}
            title="Log out of your session"
          >
            <span>⎋</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ====================================================================
          2. Mobile Menu / Drawer (Off-canvas slide-out sheet)
          ==================================================================== */}
      <div
        className={`mobile-drawer-overlay ${isMobileDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsMobileDrawerOpen(false)}
        aria-hidden={!isMobileDrawerOpen}
      />

      <div
        className={`mobile-drawer ${isMobileDrawerOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        <div className="mobile-drawer-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">🛡️</div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">Veri<span>Social</span></span>
              <span className="sidebar-brand-subtitle">{getRoleLabel(currentRole)}</span>
            </div>
          </div>

          <button
            type="button"
            className="mobile-drawer-close-btn"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Close Mobile Menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav-container">
          <div className="sidebar-section-heading">Workspace Navigation</div>
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            let badge = null;
            if (item.isUrgentBadge && pendingReviewCount > 0) {
              badge = <span className="sidebar-nav-badge badge-urgent">{pendingReviewCount}</span>;
            } else if (item.hasBadge && notificationCount > 0) {
              badge = <span className="sidebar-nav-badge badge-new">{notificationCount}</span>;
            }

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${isActive ? `active role-${getRoleClass(currentRole)}` : ''}`}
                onClick={() => handleNavChange(item.id)}
              >
                <div className="sidebar-nav-item-content">
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {badge}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div
              className="sidebar-user-avatar"
              style={{
                background: currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : currentRole === 'ADMIN' ? 'var(--role-admin)' : 'var(--role-user)'
              }}
            >
              {avatarInitial}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{currentRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={() => { setIsMobileDrawerOpen(false); logout(); if (onNavigate) onNavigate('portal'); }}
          >
            <span>⎋</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          3. Main Column: Navbar + Main Content Area
          ==================================================================== */}
      <div className="layout-main-column">
        {/* Navbar */}
        <header className="layout-navbar" aria-label="Application Header">
          <div className="layout-navbar-left">
            {/* Hamburger menu button on tablet / mobile */}
            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              aria-expanded={isMobileDrawerOpen}
            >
              ☰
            </button>

            {/* Breadcrumb Navigation */}
            <div className="navbar-breadcrumb">
              <span className="breadcrumb-root">
                <span>{getRoleBadgeIcon(currentRole)}</span>
                <span>{getRoleLabel(currentRole)}</span>
              </span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{currentItem?.label}</span>
            </div>
          </div>

          {/* Navbar Right Actions */}
          <div className="layout-navbar-right">
            {/* API Health & Latency indicator */}
            <div className="api-status-pill" title="API Gateway Status">
              <span className={`status-dot ${isApiHealthy ? 'online' : 'offline'}`} />
              <span>{isApiHealthy ? `API :5001 (${apiLatency || 12}ms)` : 'Offline'}</span>
            </div>

            {/* Prominent Role Indicator */}
            <div
              className={`navbar-role-pill ${getRoleClass(currentRole)}`}
              title={`Security Clearance: ${currentRole}`}
            >
              <span>{getRoleBadgeIcon(currentRole)}</span>
              <span>{currentRole}</span>
            </div>

            {/* User Profile Menu */}
            <div className="navbar-profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="navbar-profile-trigger"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
                aria-label="User Profile Menu"
              >
                <div
                  className="navbar-avatar"
                  style={{
                    background: currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : currentRole === 'ADMIN' ? 'var(--role-admin)' : 'var(--role-user)'
                  }}
                >
                  {avatarInitial}
                </div>
                <span className="navbar-user-name">{user?.name ? user.name.split(' ')[0] : 'User'}</span>
                <span className="navbar-chevron">▾</span>
              </button>

              {/* Profile Dropdown Card */}
              {isProfileMenuOpen && (
                <div className="profile-dropdown-menu" role="menu">
                  {/* Dropdown Header */}
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-user">
                      <div
                        className="navbar-avatar"
                        style={{
                          width: '38px',
                          height: '38px',
                          background: currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : currentRole === 'ADMIN' ? 'var(--role-admin)' : 'var(--role-user)'
                        }}
                      >
                        {avatarInitial}
                      </div>
                      <div className="dropdown-user-details">
                        <span className="dropdown-user-name">{user?.name}</span>
                        <span className="dropdown-user-email">{user?.email}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                      <span className={`badge ${currentRole === 'SUPER_ADMIN' ? 'badge-superadmin' : currentRole === 'ADMIN' ? 'badge-admin' : 'badge-user'}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                        {currentRole}
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Body */}
                  <div className="profile-dropdown-body">
                    <button
                      type="button"
                      className="dropdown-item-btn"
                      onClick={() => { setIsProfileMenuOpen(false); handleNavChange('profile'); }}
                    >
                      <span>👤</span>
                      <span>View Profile & Credentials</span>
                    </button>

                    <div className="dropdown-divider" />

                    <div className="dropdown-section-title">Quick Role Simulation</div>
                    <button
                      type="button"
                      className={`dropdown-item-btn ${currentRole === 'SUPER_ADMIN' ? 'active-role' : ''}`}
                      onClick={() => handleRoleQuickSwitch('superadmin@portal.com', 'SuperAdmin123!')}
                    >
                      <span>👑</span>
                      <span>Super Admin</span>
                    </button>
                    <button
                      type="button"
                      className={`dropdown-item-btn ${currentRole === 'ADMIN' ? 'active-role' : ''}`}
                      onClick={() => handleRoleQuickSwitch('admin@portal.com', 'Admin123!')}
                    >
                      <span>🛡️</span>
                      <span>Admin Moderator</span>
                    </button>
                    <button
                      type="button"
                      className={`dropdown-item-btn ${currentRole === 'USER' ? 'active-role' : ''}`}
                      onClick={() => handleRoleQuickSwitch('user@portal.com', 'User123!')}
                    >
                      <span>🚀</span>
                      <span>Creator User</span>
                    </button>

                    <div className="dropdown-divider" />

                    {onNavigate && (
                      <button
                        type="button"
                        className="dropdown-item-btn"
                        onClick={() => { setIsProfileMenuOpen(false); onNavigate('portal'); }}
                      >
                        <span>🌐</span>
                        <span>View Public Portal Landing</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="dropdown-logout-btn"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                        if (onNavigate) onNavigate('portal');
                      }}
                    >
                      <span>⎋</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ====================================================================
            4. Main Content Area
            ==================================================================== */}
        <main className="layout-content-area" id="main-content">
          {/* Page Header */}
          <div className="layout-page-header">
            <div className="layout-header-title-wrap">
              <h1 className="layout-header-title">
                <span>{currentItem?.icon}</span>
                <span>{pageTitle}</span>
              </h1>
              <p className="layout-header-subtitle">
                {pageSubtitle}
              </p>
            </div>

            <div className="layout-header-actions">
              {customActions ? (
                customActions
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={refreshMetrics}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                  >
                    🔄 Refresh Data
                  </button>

                  {currentRole === 'USER' && activeNav !== 'submit-activity' && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleNavChange('submit-activity')}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', background: 'var(--role-user)', color: '#07090e', fontWeight: 700 }}
                    >
                      ➕ Submit Activity Proof
                    </button>
                  )}

                  {currentRole === 'ADMIN' && activeNav !== 'review-submissions' && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleNavChange('review-submissions')}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', fontWeight: 600 }}
                    >
                      ⚖️ Moderation Queue ({pendingReviewCount})
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Active View Content */}
          <div className="layout-view-body">
            {renderViewContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
