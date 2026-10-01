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

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    const hasToken = !!localStorage.getItem('auth_token');

    // Any authenticated workspace views map to 'dashboard' container layout
    if (AUTHENTICATED_SUB_VIEWS.includes(hash)) {
      return hasToken ? 'dashboard' : 'login';
    }

    if (hasToken && (hash === 'login' || hash === '')) {
      const savedNav = localStorage.getItem('active_portal_nav');
      if (savedNav && AUTHENTICATED_SUB_VIEWS.includes(savedNav)) {
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
      if (AUTHENTICATED_SUB_VIEWS.includes(hash)) {
        targetNav = hash;
      } else {
        const savedNav = localStorage.getItem('active_portal_nav');
        if (savedNav && AUTHENTICATED_SUB_VIEWS.includes(savedNav)) {
          targetNav = savedNav;
        }
      }
      setCurrentView('dashboard');
      window.location.hash = targetNav;
    }
  }, [isAuthenticated, currentView]);

  const handleNavigate = (view) => {
    const isAuthed = isAuthenticated || !!localStorage.getItem('auth_token');
    if (AUTHENTICATED_SUB_VIEWS.includes(view)) {
      const normalizedNav = (view === 'role-space' || view.endsWith('-space')) ? 'dashboard' : view;
      if (isAuthed) {
        setCurrentView('dashboard');
        window.location.hash = normalizedNav;
        try {
          localStorage.setItem('active_portal_nav', normalizedNav);
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
          <h3>Initializing VeriSocial Portal…</h3>
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
