import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import RoleOverview from './components/RoleOverview';
import HealthCheckWidget from './components/HealthCheckWidget';
import TechStackBadge from './components/TechStackBadge';
import DevDatabaseDashboard from './components/DevDatabaseDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized403 from './components/Unauthorized403';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import { fetchHealth } from './services/api';
import './styles/index.css';
import './styles/app.css';
import './styles/gamification.css';

/**
 * View Routing:
 *   'portal'       - Public landing page
 *   'login'        - Login / Register page
 *   'dashboard'    - Authenticated MainLayout (all roles - SUPER_ADMIN, ADMIN, USER)
 *   'unauthorized' - 403 Forbidden screen
 *   'dev-dashboard'- Developer DB telemetry console
 *   'role-space'   - Alias: auto-routes to 'dashboard'
 */
const AUTHENTICATED_SUB_VIEWS = [
  'dashboard',
  'super-admin/game-points',
  'admin/game-points',
  'game-points',
  'points',
  'gamification',
  'levels',
  'super-admin/levels',
  'users',
  'admins',
  'submissions',
  'review-submissions',
  'social-accounts',
  'settings',
  'submit-activity',
  'my-submissions',
  'notifications',
  'profile',
  'super-admin-space',
  'admin-space',
  'user-space',
  'role-space'
];

const isAuthSubView = (target) => {
  if (!target) return false;
  const clean = target.replace(/^#/, '').split('?')[0];
  return AUTHENTICATED_SUB_VIEWS.some(item => clean === item || clean.startsWith(item + '/'));
};

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    const pathname = window.location.pathname.replace(/^\//, '');
    const hasToken = !!localStorage.getItem('auth_token');

    // Handle direct paths: /game-points, /admin/game-points, /super-admin/game-points, /super-admin/levels
    if (
      pathname === 'game-points' || pathname.startsWith('game-points/') ||
      pathname === 'admin/game-points' || pathname.startsWith('admin/game-points/') ||
      pathname === 'super-admin/game-points' || pathname.startsWith('super-admin/game-points/') ||
      pathname === 'super-admin/levels' || pathname === 'levels'
    ) {
      if (hasToken) {
        if (pathname === 'super-admin/levels' || pathname === 'levels') {
          window.location.hash = 'levels';
        } else {
          window.location.hash = pathname;
        }
        return 'dashboard';
      }
      return 'login';
    }


    // Any authenticated workspace views map to 'dashboard' container layout
    if (isAuthSubView(hash)) {
      return hasToken ? 'dashboard' : 'login';
    }

    if (hasToken && (hash === 'login' || hash === '')) {
      const savedNav = localStorage.getItem('active_portal_nav');
      if (savedNav && isAuthSubView(savedNav)) {
        window.location.hash = savedNav;
      } else {
        window.location.hash = 'dashboard';
      }
      return 'dashboard';
    }

    const validViews = ['portal', 'login', 'unauthorized', 'dev-dashboard'];
    return validViews.includes(hash) ? hash : 'portal';
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [selectedRole, setSelectedRole] = useState('SUPER_ADMIN');

  // Initialize personalized theme accent from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_portal_personalization');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accentColorPrimary) {
          document.documentElement.style.setProperty('--primary', parsed.accentColorPrimary);
          if (parsed.accentColorLight) document.documentElement.style.setProperty('--primary-light', parsed.accentColorLight);
          if (parsed.accentColorDark) document.documentElement.style.setProperty('--primary-dark', parsed.accentColorDark);
          if (parsed.accentColorGlow) {
            document.documentElement.style.setProperty('--primary-glow', parsed.accentColorGlow);
            document.documentElement.style.setProperty('--primary-glow-strong', parsed.accentColorGlow);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load theme personalization:', e);
    }
  }, []);

  const [apiStatus, setApiStatus] = useState({
    healthy: false,
    loading: true,
    latency: null,
    data: null,
    raw: null,
    error: null,
  });

  const checkHealth = async () => {
    setApiStatus((prev) => ({ ...prev, loading: true }));
    const result = await fetchHealth();
    if (result.success) {
      setApiStatus({
        healthy: true,
        loading: false,
        latency: result.latency,
        data: result.data,
        raw: result.raw,
        error: null,
      });
    } else {
      setApiStatus({
        healthy: false,
        loading: false,
        latency: result.latency,
        data: null,
        raw: null,
        error: result.error,
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Listen to browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        handleNavigate(hash);
      } else if (!localStorage.getItem('auth_token')) {
        setCurrentView('portal');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  // When user authenticates, automatically route to the active workspace sub-view
  useEffect(() => {
    if (isAuthenticated && (currentView === 'login' || currentView === 'portal')) {
      const hash = window.location.hash.replace('#', '');
      let targetNav = 'dashboard';
      if (isAuthSubView(hash)) {
        targetNav = hash;
      } else {
        const savedNav = localStorage.getItem('active_portal_nav');
        if (savedNav && isAuthSubView(savedNav)) {
          targetNav = savedNav;
        }
      }
      setCurrentView('dashboard');
      window.location.hash = targetNav;
    }
  }, [isAuthenticated, currentView]);

  const handleNavigate = (view) => {
    const isAuthed = isAuthenticated || !!localStorage.getItem('auth_token');
    if (isAuthSubView(view)) {
      const cleanView = view.replace(/^#/, '').split('?')[0];
      const normalizedNav = (cleanView === 'role-space' || cleanView.endsWith('-space')) ? 'dashboard' : view;
      if (isAuthed) {
        setCurrentView('dashboard');
        window.location.hash = normalizedNav;
        try {
          const navKey = cleanView.includes('game-points') ? 'game-points' : cleanView;
          localStorage.setItem('active_portal_nav', navKey);
        } catch (e) {}
      } else {
        setCurrentView('login');
        window.location.hash = 'login';
      }
      return;
    }

    setCurrentView(view);
    if (view === 'portal') {
      window.location.hash = '';
    } else {
      window.location.hash = view;
    }
  };

  const scrollToSection = (id) => {
    setCurrentView('portal');
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // ── Auth loading splash ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 4rem' }}>
          <div className="status-dot checking" style={{ width: '18px', height: '18px', margin: '0 auto 1.5rem auto', display: 'block' }} />
          <h3>Initializing PJ Social Portal…</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Verifying session credentials &amp; role permissions</p>
        </div>
      </div>
    );
  }

  // ── Authenticated Layout (all roles use MainLayout) ───────────────────────
  if (currentView === 'dashboard' && isAuthenticated) {
    return (
      <ProtectedRoute
        allowedRoles={['USER', 'ADMIN', 'SUPER_ADMIN']}
        attemptedView="dashboard"
        onNavigate={handleNavigate}
      >
        <MainLayout onNavigate={handleNavigate} />
      </ProtectedRoute>
    );
  }

  // ── Public / Unauthenticated Views ────────────────────────────────────────
  return (
    <div className="app-container">
      <Header apiStatus={apiStatus} currentView={currentView} onToggleView={handleNavigate} />

      <main className="main-content">
        {/* Public portal landing */}
        {currentView === 'portal' && (
          <>
            <Hero
              onRoleClick={() => scrollToSection('roles')}
              onTestHealthClick={() => scrollToSection('health-check')}
            />
            <RoleOverview selectedRole={selectedRole} onSelectRole={setSelectedRole} />
            <HealthCheckWidget apiStatus={apiStatus} onRefresh={checkHealth} />
            <TechStackBadge />
          </>
        )}

        {/* Login / Register */}
        {currentView === 'login' && (
          <LoginPage onNavigate={handleNavigate} />
        )}

        {/* Dedicated 403 Forbidden Screen */}
        {currentView === 'unauthorized' && (
          <Unauthorized403
            attemptedView="restricted-admin-portal"
            allowedRoles={['ADMIN', 'SUPER_ADMIN']}
            onNavigate={handleNavigate}
          />
        )}

        {/* Developer database console */}
        {currentView === 'dev-dashboard' && (
          <DevDatabaseDashboard onBackToPortal={() => handleNavigate('portal')} />
        )}
      </main>

      <Footer />
    </div>
  );
}
