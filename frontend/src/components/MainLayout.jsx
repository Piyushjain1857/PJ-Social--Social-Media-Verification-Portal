import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllSubmissions,
  fetchNotifications,
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchHealth,
  fetchMyPoints
} from '../services/api';
import LevelUpModal from './gamification/LevelUpModal';
import LevelProgressCard from './gamification/LevelProgressCard';

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
import LevelManagementView from './views/LevelManagementView';
import GlobalSearchModal from './common/GlobalSearchModal';
import GamificationSummary from './gamification/GamificationSummary';
import PointsSummary from './common/PointsSummary';
import GamePointsView from './views/GamePointsView';
import SuperAdminGamificationCenter from './views/SuperAdminGamificationCenter';
import { fetchMyGamification } from '../services/gamificationApi';
import { gamificationRealtimeClient } from '../services/gamificationRealtimeClient';
import UserSpace from '../pages/UserSpace';
import SuperAdminEmailCenter from './views/SuperAdminEmailCenter';


/**
 * Role-Based Navigation Definitions strictly enforced from authenticated role data:
 * 
 * SUPER_ADMIN:
 * - Dashboard, Game Points, Levels, Users, Admins, Submissions, Social Accounts, Settings, Profile
 * 
 * ADMIN:
 * - Dashboard, Game Points, Review Submissions, Submissions, Profile
 * 
 * USER:
 * - Dashboard, Game Points, Submit Activity, My Submissions, Notifications, Profile
 */
export const ROLE_NAVIGATION = {
  SUPER_ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Platform analytics & system overview' },
    { id: 'email-management', label: 'Email Management', icon: '📧', description: 'Transactional email control center, logs & analytics' },
    { id: 'game-points', label: 'Game Points', icon: '🎮', description: 'Gamification engine, XP progression & leaderboard' },
    { id: 'levels', label: 'Levels', icon: '⚡', description: 'Level progression & XP engine manager' },
    { id: 'users', label: 'Users', icon: '👥', description: 'User directory & RBAC assignment' },
    { id: 'admins', label: 'Admins', icon: '🛡️', description: 'Administrator directory & governance' },
    { id: 'submissions', label: 'Submissions', icon: '📋', description: 'Verification submissions repository' },
    { id: 'social-accounts', label: 'Official Accounts', icon: '🏛️', description: 'Official college social media accounts' },
    { id: 'settings', label: 'Settings', icon: '⚙️', description: 'Platform security & verification rules' },
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Authenticated Super Admin credentials' },
  ],
  ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Moderator workload & statistics' },
    { id: 'game-points', label: 'Game Points', icon: '🎮', description: 'Gamification engine, XP progression & leaderboard' },
    { id: 'review-submissions', label: 'Review Submissions', icon: '⚖️', description: 'Moderation review queue', isUrgentBadge: true },
    { id: 'submissions', label: 'Submissions', icon: '📋', description: 'Browse and inspect platform submissions' },
    { id: 'users', label: 'Users', icon: '👥', description: 'User directory & platform creators' },
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Moderator profile & credentials' },
  ],
  USER: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Creator dashboard & activity score' },
    { id: 'user-space', label: 'Creator Studio', icon: '🚀', description: 'All-in-one submission studio & RBAC defense probe' },
    { id: 'game-points', label: 'Game Points', icon: '🎮', description: 'My XP level, progression graph & ranking' },
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

  // Helper to determine initial nav for MainLayout on load / reload
  const getInitialNav = () => {
    let hash = window.location.hash.replace('#', '').split('?')[0];
    const pathname = window.location.pathname;
    const role = user?.role || 'USER';

    if (hash === 'super-admin/levels' || pathname === '/super-admin/levels') {
      hash = 'levels';
    }

    if (hash === 'super-admin/email' || pathname === '/super-admin/email' || hash === 'email-management' || pathname === '/email-management') {
      if (role === 'SUPER_ADMIN') {
        return 'email-management';
      }
    }

    // Handle any game-points route
    if (
      hash === 'game-points' || pathname === '/game-points' ||
      hash === 'admin/game-points' || pathname === '/admin/game-points' ||
      hash.startsWith('admin/game-points') || pathname.startsWith('/admin/game-points') ||
      hash === 'super-admin/game-points' || pathname === '/super-admin/game-points' ||
      hash.startsWith('super-admin/game-points') || pathname.startsWith('/super-admin/game-points') ||
      hash === 'gamification'
    ) {
      return 'game-points';
    }

    const roleItems = ROLE_NAVIGATION[role] || ROLE_NAVIGATION.USER;

    // 1. If URL hash matches permitted navigation item for this role, prioritize it
    if (hash && roleItems.some(item => item.id === hash)) {
      return hash;
    }

    // 2. Otherwise check localStorage for previously active navigation
    try {
      const savedNav = localStorage.getItem('active_portal_nav');
      if (savedNav && savedNav !== 'gamification' && (roleItems.some(item => item.id === savedNav) || savedNav === 'game-points')) {
        return savedNav;
      }
    } catch (e) {}

    // 3. Fallback to dashboard
    return 'dashboard';
  };

  // Internal active navigation state if not controlled
  const [internalNav, setInternalNav] = useState(getInitialNav);
  const activeNav = controlledActiveNav || internalNav;

  const handleNavChange = (navId) => {
    const role = user?.role || 'USER';
    const roleItems = ROLE_NAVIGATION[role] || ROLE_NAVIGATION.USER;
    const isValid = roleItems.some(item => item.id === navId) ||
                    navId === 'game-points' ||
                    navId === 'admin/game-points' ||
                    navId === 'super-admin/game-points';
    const targetNav = isValid ? (navId.includes('game-points') ? 'game-points' : navId) : 'dashboard';

    if (controlledOnNavChange) {
      controlledOnNavChange(targetNav);
    } else {
      setInternalNav(targetNav);
    }

    // Keep URL hash and localStorage in sync so reload keeps the exact page!
    let targetHash = targetNav;
    if (targetNav === 'game-points') {
      if (role === 'SUPER_ADMIN') targetHash = 'super-admin/game-points';
      else if (role === 'ADMIN') targetHash = 'admin/game-points';
    }

    const currentHash = window.location.hash.replace('#', '');
    if (currentHash !== targetHash && !currentHash.includes('game-points/user/')) {
      window.location.hash = targetHash;
    }
    try {
      localStorage.setItem('active_portal_nav', targetNav);
    } catch (e) {}

    // Close mobile drawer when an item is selected
    setIsMobileDrawerOpen(false);
  };

  // Keep URL hash and localStorage updated with activeNav
  useEffect(() => {
    const role = user?.role || 'USER';
    const currentHash = window.location.hash.replace('#', '');
    const cleanHash = currentHash.split('?')[0];

    if (activeNav === 'game-points') {
      if (role === 'SUPER_ADMIN') {
        if (cleanHash === 'super-admin/game-points' || cleanHash.startsWith('super-admin/game-points/')) {
          return;
        }
        window.location.hash = 'super-admin/game-points';
      } else if (role === 'ADMIN') {
        if (cleanHash === 'admin/game-points' || cleanHash.startsWith('admin/game-points/')) {
          return;
        }
        window.location.hash = 'admin/game-points';
      } else {
        if (cleanHash === 'game-points') {
          return;
        }
        window.location.hash = 'game-points';
      }
      try {
        localStorage.setItem('active_portal_nav', 'game-points');
      } catch (e) {}
      return;
    }

    if (activeNav === 'email-management') {
      if (role === 'SUPER_ADMIN') {
        if (cleanHash !== 'super-admin/email') {
          window.location.hash = 'super-admin/email';
        }
      }
      try {
        localStorage.setItem('active_portal_nav', 'email-management');
      } catch (e) {}
      return;
    }

    let targetHash = activeNav;
    if (currentHash !== targetHash) {
      window.location.hash = targetHash;
    }
    try {
      localStorage.setItem('active_portal_nav', activeNav);
    } catch (e) {}
  }, [activeNav, user?.role]);

  // Synchronize view on browser back / forward navigation (hashchange)
  useEffect(() => {
    const handleHashChange = () => {
      const fullHash = window.location.hash.replace('#', '');
      const hash = fullHash.split('?')[0];

      if (hash === 'gamification') {
        window.location.hash = 'dashboard';
        return;
      }

      if (hash === 'super-admin/email' || hash === 'email-management') {
        if (role === 'SUPER_ADMIN') {
          if (controlledOnNavChange) {
            controlledOnNavChange('email-management');
          } else {
            setInternalNav('email-management');
          }
          return;
        } else {
          window.location.hash = 'dashboard';
          return;
        }
      }

      const role = user?.role || 'USER';
      const roleItems = ROLE_NAVIGATION[role] || ROLE_NAVIGATION.USER;

      // Handle game points navigation for all roles
      if (
        hash === 'game-points' ||
        hash.startsWith('game-points/') ||
        hash === 'admin/game-points' ||
        hash.startsWith('admin/game-points/') ||
        hash === 'super-admin/game-points' ||
        hash.startsWith('super-admin/game-points/')
      ) {
        // Enforce role consistency
        if (role === 'SUPER_ADMIN') {
          if (!fullHash.startsWith('super-admin/game-points')) {
            window.location.hash = 'super-admin/game-points';
            return;
          }
        } else if (role === 'ADMIN') {
          if (!fullHash.startsWith('admin/game-points')) {
            window.location.hash = 'admin/game-points';
            return;
          }
        } else {
          if (fullHash !== 'game-points') {
            window.location.hash = 'game-points';
            return;
          }
        }

        if (controlledOnNavChange) {
          controlledOnNavChange('game-points');
        } else {
          setInternalNav('game-points');
        }
        try {
          localStorage.setItem('active_portal_nav', 'game-points');
        } catch (e) {}
        return;
      }

      if (hash === 'super-admin/levels') {
        if (controlledOnNavChange) {
          controlledOnNavChange('levels');
        } else {
          setInternalNav('levels');
        }
        return;
      }

      if (hash && roleItems.some(item => item.id === hash)) {
        if (controlledOnNavChange) {
          controlledOnNavChange(hash);
        } else {
          setInternalNav(hash);
        }
        try {
          localStorage.setItem('active_portal_nav', hash);
        } catch (e) {}
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user?.role, controlledOnNavChange]);

  // Validate activeNav when user role changes
  useEffect(() => {
    if (!user) return;
    const roleItems = ROLE_NAVIGATION[user.role] || ROLE_NAVIGATION.USER;
    if (!roleItems.some(item => item.id === activeNav)) {
      handleNavChange('dashboard');
    }
  }, [user?.role]);

  // Ensure views open at the top without unwanted scrolling
  useEffect(() => {
    const mainCol = document.querySelector('.layout-main-column');
    if (mainCol) {
      mainCol.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeNav]);

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
  const [userPoints, setUserPoints] = useState(0);
  const [gamificationData, setGamificationData] = useState(null);
  const [prevGamificationLevel, setPrevGamificationLevel] = useState(null);
  const [levelUpModalData, setLevelUpModalData] = useState(null);
  const [apiLatency, setApiLatency] = useState(null);
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Close dropdowns on Escape key and handle ⌘K / Ctrl+K global search shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      } else if (event.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsProfileMenuOpen(false);
        setIsNotifMenuOpen(false);
        setIsGlobalSearchOpen(false);
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

        if (user?.role === 'USER') {
          try {
            const ptRes = await fetchMyPoints();
            if (ptRes && ptRes.success && ptRes.data) {
              setUserPoints(ptRes.data.totalPoints ?? 0);
            }
          } catch (ptE) {
            // silent fallback
          }

          try {
            const gamRes = await fetchMyGamification();
            if (gamRes && gamRes.success && gamRes.data) {
              const newGamData = gamRes.data;
              setGamificationData(newGamData);
              // Level-up detection: compare previous level with new level
              setPrevGamificationLevel(prevLevel => {
                if (prevLevel !== null && newGamData.currentLevel > prevLevel) {
                  // Trigger level-up modal
                  setLevelUpModalData({
                    currentLevel: newGamData.currentLevel,
                    levelName: newGamData.levelName,
                    icon: newGamData.icon,
                    totalXP: newGamData.totalXP,
                    nextLevel: newGamData.nextLevel,
                    nextLevelName: newGamData.nextLevelName,
                  });
                }
                return newGamData.currentLevel;
              });
            }
          } catch (gE) {
            // silent fallback
          }
        }
      }
    } catch (e) {
      console.warn('Metrics refresh error:', e.message);
    }
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshMetrics();
    } finally {
      setTimeout(() => setIsRefreshing(false), 650);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, [user?.role, user?.id]);

  // Connect to real-time events for instant XP, level-up celebrations, and live updates
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token || !user?.id) return;

    gamificationRealtimeClient.connect(token, user);

    const unsubscribe = gamificationRealtimeClient.subscribe((event, data) => {
      // 1. XP Updated for current user
      if (event === 'xp_updated' && data.userId === user?.id) {
        setUserPoints(data.totalXP);
        setGamificationData(prev => ({
          ...(prev || {}),
          totalXP: data.totalXP,
          currentLevel: data.currentLevel ?? prev?.currentLevel,
          levelName: data.levelName ?? prev?.levelName,
          icon: data.icon ?? prev?.icon,
          progressPercentage: data.progressPercentage ?? prev?.progressPercentage,
          xpRemaining: data.xpRemaining ?? prev?.xpRemaining,
          rank: data.rank ?? prev?.rank
        }));

        // Refresh notifications list to immediately show the approval/adjustment notice
        fetchNotifications().then(notifRes => {
          if (notifRes?.success && notifRes.data) {
            setNotificationsList(notifRes.data);
            const unread = notifRes.unreadCount ?? notifRes.data.filter(n => !n.isRead).length;
            setUnreadNotifCount(unread);
            setNotificationCount(unread);
          }
        }).catch(() => {});
      }

      // 2. 🎉 Level Up! celebration for current user
      if (event === 'level_up' && data.userId === user?.id) {
        setLevelUpModalData({
          currentLevel: data.currentLevel,
          levelName: data.levelName,
          icon: data.icon || '🏆',
          totalXP: data.totalXP,
          nextLevel: data.nextLevel,
          nextLevelName: data.nextLevelName
        });
      }

      // 3. Admin / Super Admin live updates
      if (event === 'admin_user_xp_updated' && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
        // Refreshes pending review counts or notification count
        fetchAllSubmissions().then(subsRes => {
          if (subsRes.success && subsRes.data) {
            const pending = subsRes.data.filter(s => s.status === 'PENDING').length;
            setPendingReviewCount(pending);
          }
        }).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, user?.role]);


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
      case 'email-management':
      case 'super-admin/email':
      case 'email':
        if (currentRole === 'SUPER_ADMIN') {
          return <SuperAdminEmailCenter />;
        }
        return <DashboardView onNavigateToNav={handleNavChange} />;
      case 'user-space':
        return <UserSpace onNavigate={onNavigate} onNavigateToNav={handleNavChange} />;
      case 'game-points':
      case 'points':
      case 'gamification':
        if (currentRole === 'SUPER_ADMIN') {
          return <SuperAdminGamificationCenter onNavigateToNav={handleNavChange} />;
        }
        return <GamePointsView onNavigateToNav={handleNavChange} />;
      case 'levels':
      case 'super-admin/levels':
        return <LevelManagementView />;
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

  // Personalization settings synced from localStorage & custom events
  const [personalization, setPersonalization] = useState(() => {
    try {
      const saved = localStorage.getItem('user_portal_personalization');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    const handlePersonalizationUpdate = () => {
      try {
        const saved = localStorage.getItem('user_portal_personalization');
        if (saved) setPersonalization(JSON.parse(saved));
      } catch (err) {}
    };
    window.addEventListener('portal-personalization-updated', handlePersonalizationUpdate);
    window.addEventListener('storage', handlePersonalizationUpdate);
    return () => {
      window.removeEventListener('portal-personalization-updated', handlePersonalizationUpdate);
      window.removeEventListener('storage', handlePersonalizationUpdate);
    };
  }, []);

  const AVATAR_GRADIENTS_MAP = {
    indigo: 'linear-gradient(135deg, #6366f1, #06b6d4)',
    sunset: 'linear-gradient(135deg, #f43f5e, #fb923c)',
    emerald: 'linear-gradient(135deg, #10b981, #06b6d4)',
    amethyst: 'linear-gradient(135deg, #a855f7, #6366f1)',
    gold: 'linear-gradient(135deg, #f59e0b, #d97706)',
    obsidian: 'linear-gradient(135deg, #334155, #0f172a)'
  };

  const activeAvatarGradient = (personalization?.avatarGradient && AVATAR_GRADIENTS_MAP[personalization.avatarGradient])
    ? AVATAR_GRADIENTS_MAP[personalization.avatarGradient]
    : (currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : currentRole === 'ADMIN' ? 'var(--role-admin)' : 'var(--role-user)');
  const activeAvatarEmblem = personalization?.avatarIcon || null;


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
              <span className="sidebar-brand-title">PJ <span>Social</span></span>
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
          <div
            className="sidebar-user-card"
            onClick={() => handleNavChange('profile')}
            title="Open Profile & Personalization"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavChange('profile'); }}
          >
            <div
              className="sidebar-user-avatar"
              style={{
                background: activeAvatarGradient,
                boxShadow: personalization?.accentColorGlow ? `0 0 10px ${personalization.accentColorGlow}` : undefined,
                position: 'relative'
              }}
            >
              {personalization?.avatarPhoto ? (
                <img
                  src={personalization.avatarPhoto}
                  alt={user?.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                />
              ) : (
                avatarInitial
              )}
              {activeAvatarEmblem && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-4px',
                    fontSize: '0.72rem',
                    lineHeight: 1,
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                  }}
                >
                  {activeAvatarEmblem}
                </span>
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={user?.name}>{user?.name}</span>
              <span className="sidebar-user-role">{user?.email}</span>
            </div>
          </div>

          {/* Compact Level Card for USER Role */}
          {user?.role === 'USER' && gamificationData && (
            <div
              style={{ cursor: 'pointer', marginBottom: '0.65rem' }}
              onClick={() => handleNavChange('game-points')}
              title="View Level Journey & Gamification"
            >
              <LevelProgressCard
                compact
                totalXP={gamificationData.totalXP || 0}
                currentLevel={gamificationData.currentLevel || 1}
                levelName={gamificationData.levelName || 'Novice'}
                icon={gamificationData.icon || '🌱'}
              />
            </div>
          )}

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={async () => {
              await logout();
              if (onNavigate) {
                onNavigate('portal');
              } else {
                try {
                  window.history.replaceState(null, '', window.location.pathname);
                } catch (e) {
                  window.location.hash = '';
                }
              }
            }}
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
              <span className="sidebar-brand-title">PJ <span>Social</span></span>
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
                onClick={() => { handleNavChange(item.id); setIsMobileDrawerOpen(false); }}
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
          <div
            className="sidebar-user-card"
            onClick={() => { handleNavChange('profile'); setIsMobileDrawerOpen(false); }}
            title="Open Profile & Personalization"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { handleNavChange('profile'); setIsMobileDrawerOpen(false); } }}
          >
            <div
              className="sidebar-user-avatar"
              style={{
                background: activeAvatarGradient,
                boxShadow: personalization?.accentColorGlow ? `0 0 10px ${personalization.accentColorGlow}` : undefined,
                position: 'relative'
              }}
            >
              {personalization?.avatarPhoto ? (
                <img
                  src={personalization.avatarPhoto}
                  alt={user?.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                />
              ) : (
                avatarInitial
              )}
              {activeAvatarEmblem && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-4px',
                    fontSize: '0.72rem',
                    lineHeight: 1,
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                  }}
                >
                  {activeAvatarEmblem}
                </span>
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{currentRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={async () => {
              setIsMobileDrawerOpen(false);
              await logout();
              if (onNavigate) {
                onNavigate('portal');
              } else {
                try {
                  window.history.replaceState(null, '', window.location.pathname);
                } catch (e) {
                  window.location.hash = '';
                }
              }
            }}
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
              <span
                className="breadcrumb-root"
                onClick={() => handleNavChange('dashboard')}
                title="Go to Dashboard"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavChange('dashboard'); }}
                style={{ cursor: 'pointer' }}
              >
                <span>{getRoleBadgeIcon(currentRole)}</span>
                <span>{getRoleLabel(currentRole)}</span>
              </span>
              <span className="breadcrumb-separator">/</span>
              <span
                className="breadcrumb-current"
                onClick={() => handleNavChange(activeNav)}
                title={`Current: ${currentItem?.label || activeNav}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavChange(activeNav); }}
                style={{ cursor: 'pointer' }}
              >
                {currentItem?.label}
              </span>
            </div>
          </div>

          {/* Global Search Quick Trigger */}
          <div className="layout-navbar-center" style={{ flex: 1, maxWidth: '380px', margin: '0 1rem' }}>
            <button
              type="button"
              className="navbar-search-btn"
              onClick={() => setIsGlobalSearchOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.42rem 0.85rem',
                fontSize: '0.84rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Search submissions, users, accounts, notifications... (⌘K / Ctrl+K)"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.95rem' }}>🔍</span>
                <span className="navbar-search-placeholder">Quick search portal...</span>
              </span>
              <kbd style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '0.12rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1'
              }}>⌘K</kbd>
            </button>
          </div>

          {/* Navbar Right Actions */}
          <div className="layout-navbar-right">
            {/* API Health & Latency indicator - Hidden for normal USER, visible for ADMIN and SUPER_ADMIN */}
            {currentRole !== 'USER' && (
              <>
                <div className="api-status-pill" title="API Gateway Status">
                  <span className={`status-dot ${isApiHealthy ? 'online' : 'offline'}`} />
                  <span>{isApiHealthy ? `API :5001 (${apiLatency || 12}ms)` : 'Offline'}</span>
                </div>
                <a
                  href="http://localhost:5001/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="api-status-pill"
                  style={{ textDecoration: 'none', color: '#93c5fd', cursor: 'pointer' }}
                  title="Open Interactive Swagger UI & OpenAPI Specification"
                >
                  <span>📖</span>
                  <span>Swagger Docs</span>
                </a>
              </>
            )}

            {/* Creator Verified Points Pill */}
            {currentRole === 'USER' && (
              <button
                type="button"
                className="navbar-points-pill"
                title="Your Total Verified Points — View Points on Dashboard"
                onClick={() => handleNavChange('dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.32rem 0.75rem',
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.16), rgba(249, 115, 22, 0.16))',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  borderRadius: '20px',
                  color: '#facc15',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span>🏆</span>
                <span>{userPoints} Pts</span>
              </button>
            )}

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
                    background: activeAvatarGradient,
                    boxShadow: personalization?.accentColorGlow ? `0 0 10px ${personalization.accentColorGlow}` : undefined,
                    position: 'relative'
                  }}
                >
                  {personalization?.avatarPhoto ? (
                    <img
                      src={personalization.avatarPhoto}
                      alt={user?.name || 'User'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                    />
                  ) : (
                    avatarInitial
                  )}
                  {activeAvatarEmblem && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-4px',
                        fontSize: '0.65rem',
                        lineHeight: 1,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                      }}
                    >
                      {activeAvatarEmblem}
                    </span>
                  )}
                </div>
                <span className="navbar-user-name">{user?.name ? user.name.split(' ')[0] : 'User'}</span>
                <span className="navbar-chevron">▾</span>
              </button>

              {/* Profile Dropdown Card */}
              {isProfileMenuOpen && (
                <div className="profile-dropdown-menu" role="menu">
                  {/* Dropdown Header */}
                  <div className="profile-dropdown-header">
                    <div
                      className="profile-dropdown-user"
                      onClick={() => { handleNavChange('profile'); setIsProfileMenuOpen(false); }}
                      style={{ cursor: 'pointer' }}
                      title="Open Profile & Settings"
                      role="button"
                      tabIndex={0}
                    >
                      <div
                        className="navbar-avatar"
                        style={{
                          width: '38px',
                          height: '38px',
                          background: activeAvatarGradient,
                          boxShadow: personalization?.accentColorGlow ? `0 0 12px ${personalization.accentColorGlow}` : undefined,
                          position: 'relative'
                        }}
                      >
                        {personalization?.avatarPhoto ? (
                          <img
                            src={personalization.avatarPhoto}
                            alt={user?.name || 'User'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                          />
                        ) : (
                          avatarInitial
                        )}
                        {activeAvatarEmblem && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-4px',
                              fontSize: '0.72rem',
                              lineHeight: 1,
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                            }}
                          >
                            {activeAvatarEmblem}
                          </span>
                        )}
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
                      onClick={async () => {
                        setIsProfileMenuOpen(false);
                        await logout();
                        if (onNavigate) {
                          onNavigate('portal');
                        } else {
                          try {
                            window.history.replaceState(null, '', window.location.pathname);
                          } catch (e) {
                            window.location.hash = '';
                          }
                        }
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
          {/* Page Header (hidden when view has its own dedicated hero banner) */}
          {!(
            (currentRole === 'SUPER_ADMIN' && [
              'dashboard', 'game-points', 'points', 'gamification',
              'levels', 'super-admin/levels',
              'users', 'admins', 'submissions', 'social-accounts'
            ].includes(activeNav)) ||
            (currentRole === 'ADMIN' && [
              'dashboard', 'game-points', 'points', 'gamification',
              'review-submissions', 'submissions', 'users'
            ].includes(activeNav)) ||
            (currentRole === 'USER' && [
              'user-space', 'game-points', 'points', 'gamification'
            ].includes(activeNav))
          ) && (
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
                      className="btn-refresh-pill"
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      title="Refresh telemetry, badge alerts, and server data"
                    >
                      <svg
                        className={`refresh-icon-svg ${isRefreshing ? 'spinning' : ''}`}
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
                      <span>{isRefreshing ? 'Refreshing…' : 'Refresh Data'}</span>
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

                    {currentRole === 'ADMIN' && activeNav !== 'review-submissions' && activeNav !== 'dashboard' && (
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
          )}

          {/* Active View Content */}
          <div className="layout-view-body">
            {renderViewContent()}
          </div>

          {/* Internal Dashboard Workspace Footer */}
          <footer className="layout-workspace-footer">
            <span className="footer-copyright-text">
              © {new Date().getFullYear()} PJ Social : Social Media Activity Verification Portal. Built by{' '}
              <a
                href="https://linkedin.com/in/piyushjain1857"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-credit-link"
              >
                Piyush Jain
              </a>
              . All rights reserved.
            </span>
          </footer>
        </main>
      </div>

      {/* Global Search Modal (⌘K / Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigateToNav={handleNavChange}
      />

      {/* Level-Up Celebration Modal */}
      {levelUpModalData && (
        <LevelUpModal
          levelData={levelUpModalData}
          onClose={() => setLevelUpModalData(null)}
        />
      )}
    </div>
  );
}
