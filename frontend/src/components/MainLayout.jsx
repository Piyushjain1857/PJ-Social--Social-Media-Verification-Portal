import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllSubmissions,
  fetchNotifications,
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchHealth
} from '../services/api';

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getNotificationIcon = (notif) => {
  const isApproved = notif.title?.toLowerCase().includes('approved') || notif.message?.toLowerCase().includes('approved');
  const isRejected = notif.title?.toLowerCase().includes('rejected') || notif.message?.toLowerCase().includes('rejected');
  const isAccount = notif.type === 'ACCOUNT_ALERT' || notif.title?.toLowerCase().includes('role') || notif.message?.toLowerCase().includes('role');

  if (notif.type === 'APPROVAL' || isApproved) return '🎉';
  if (notif.type === 'REJECTION' || isRejected) return '❌';
  if (isAccount) return '🛡️';
  return '📢';
};

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

  // Notifications dropdown state
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const notifMenuRef = useRef(null);
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [markingIds, setMarkingIds] = useState(new Set());

  // Live badges and telemetry state
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [apiLatency, setApiLatency] = useState(null);
  const [isApiHealthy, setIsApiHealthy] = useState(true);

  // Close profile and notification dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setIsNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsProfileMenuOpen(false);
        setIsNotifMenuOpen(false);
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

      // Fetch user notifications for all authenticated accounts
      if (user?.id) {
        const notifRes = await fetchNotifications();
        if (notifRes.success && notifRes.data) {
          setNotificationsList(notifRes.data);
          const unread = notifRes.unreadCount ?? notifRes.data.filter(n => !n.isRead).length;
          setUnreadNotifCount(unread);
          setNotificationCount(unread);
        }
      }
    } catch (e) {
      console.warn('Metrics refresh error:', e.message);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, [user?.role, user?.id]);

  // Mark a single notification as read
  const handleMarkSingleRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    if (markingIds.has(notifId)) return;

    setMarkingIds(prev => new Set(prev).add(notifId));
    // Optimistic UI update
    setNotificationsList(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
    setUnreadNotifCount(prev => Math.max(0, prev - 1));
    setNotificationCount(prev => Math.max(0, prev - 1));

    try {
      await markNotificationRead(notifId);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err.message);
      refreshMetrics();
    } finally {
      setMarkingIds(prev => {
        const next = new Set(prev);
        next.delete(notifId);
        return next;
      });
    }
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsAsRead = async (e) => {
    if (e) e.stopPropagation();
    if (isMarkingAllRead || unreadNotifCount === 0) return;

    setIsMarkingAllRead(true);
    // Optimistic UI update
    setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadNotifCount(0);
    setNotificationCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err.message);
      refreshMetrics();
    } finally {
      setIsMarkingAllRead(false);
    }
  };

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
        return (
          <NotificationsView
            onNavigateToNav={handleNavChange}
            onNotificationUpdated={refreshMetrics}
          />
        );
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

            {/* Notification Bell Dropdown Menu */}
            <div className="navbar-notif-menu" ref={notifMenuRef}>
              <button
                type="button"
                className="navbar-notif-trigger"
                onClick={() => {
                  setIsNotifMenuOpen(!isNotifMenuOpen);
                  setIsProfileMenuOpen(false);
                }}
                aria-expanded={isNotifMenuOpen}
                aria-haspopup="true"
                aria-label={`Notifications (${unreadNotifCount} unread)`}
                title="Notifications"
              >
                <span>🔔</span>
                {unreadNotifCount > 0 && (
                  <span className="navbar-notif-badge">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Card */}
              {isNotifMenuOpen && (
                <div className="notif-dropdown-menu" role="menu">
                  <div className="notif-dropdown-header">
                    <div className="notif-dropdown-title-wrap">
                      <span className="notif-dropdown-title">Notifications</span>
                      {unreadNotifCount > 0 && (
                        <span className="notif-pill-count">{unreadNotifCount} unread</span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        className="notif-mark-all-btn"
                        onClick={handleMarkAllNotificationsAsRead}
                        disabled={isMarkingAllRead}
                      >
                        {isMarkingAllRead ? 'Marking...' : '✓ Mark all read'}
                      </button>
                    )}
                  </div>

                  <div className="notif-dropdown-body">
                    {notificationsList.length === 0 ? (
                      <div className="notif-empty-state">
                        <div className="notif-empty-icon">🔕</div>
                        <div className="notif-empty-title">All caught up!</div>
                        <div className="notif-empty-desc">You have no verification or account notifications.</div>
                      </div>
                    ) : (
                      notificationsList.slice(0, 6).map((notif) => (
                        <div
                          key={notif.id}
                          className={`notif-item ${notif.isRead ? 'read' : 'unread'}`}
                        >
                          <div className="notif-item-icon">
                            {getNotificationIcon(notif)}
                          </div>
                          <div className="notif-item-content">
                            <div className="notif-item-top">
                              <span className="notif-item-title" title={notif.title}>
                                {notif.title}
                              </span>
                              <span className="notif-item-time">
                                {formatTimeAgo(notif.createdAt)}
                              </span>
                            </div>
                            <div className="notif-item-msg">
                              {notif.message}
                            </div>
                            <div className="notif-item-actions">
                              {notif.submissionId && (
                                <button
                                  type="button"
                                  className="notif-link-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsNotifMenuOpen(false);
                                    if (currentRole === 'USER') {
                                      handleNavChange('my-submissions');
                                    } else {
                                      handleNavChange('review-submissions');
                                    }
                                  }}
                                >
                                  View submission →
                                </button>
                              )}
                              {!notif.isRead && (
                                <button
                                  type="button"
                                  className="notif-single-read-btn"
                                  onClick={(e) => handleMarkSingleRead(notif.id, e)}
                                  disabled={markingIds.has(notif.id)}
                                >
                                  {markingIds.has(notif.id) ? '...' : 'Mark read'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="notif-dropdown-footer">
                    <button
                      type="button"
                      className="notif-dropdown-footer-btn"
                      onClick={() => {
                        setIsNotifMenuOpen(false);
                        handleNavChange('notifications');
                      }}
                    >
                      <span>View all notifications</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
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
