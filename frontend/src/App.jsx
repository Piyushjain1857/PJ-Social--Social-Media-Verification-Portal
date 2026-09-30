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
import SuperAdminSpace from './pages/SuperAdminSpace';
import AdminSpace from './pages/AdminSpace';
import UserSpace from './pages/UserSpace';
import { fetchHealth } from './services/api';
import './styles/index.css';
import './styles/app.css';

/**
 * Role-Aware Routing & Views:
 *   'portal'            - Public landing page
 *   'login'             - Login / Register page
 *   'super-admin-space' - SUPER_ADMIN dashboard (Protected: SUPER_ADMIN only)
 *   'admin-space'       - ADMIN workspace (Protected: ADMIN & SUPER_ADMIN)
 *   'user-space'        - USER workspace (Protected: USER, ADMIN & SUPER_ADMIN)
 *   'unauthorized'      - 403 Forbidden display
 *   'dev-dashboard'     - Developer DB telemetry console
 *   'role-space'        - Alias: redirects to user's assigned workspace
 */

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Initialize view from URL hash if present, or default to 'portal'
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    const validViews = [
      'portal',
      'login',
      'super-admin-space',
      'admin-space',
      'user-space',
      'unauthorized',
      'dev-dashboard'
    ];
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

  // Listen to browser hash changes for back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        handleNavigate(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync window hash when view changes
  const handleNavigate = (view) => {
    if (view === 'role-space') {
      if (user) {
        navigateToRoleSpace(user.role);
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

  const navigateToRoleSpace = (role) => {
    let target = 'user-space';
    if (role === 'SUPER_ADMIN') target = 'super-admin-space';
    else if (role === 'ADMIN') target = 'admin-space';

    setCurrentView(target);
    window.location.hash = target;
  };

  const scrollToSection = (id) => {
    setCurrentView('portal');
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // ── Auth loading splash ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 4rem' }}>
          <div className="status-dot checking" style={{ width: '18px', height: '18px', margin: '0 auto 1.5rem auto', display: 'block' }} />
          <h3>Initializing VeriSocial Portal…</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Verifying session credentials & role permissions</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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

        {/* Role-based protected workspaces wrapped with ProtectedRoute */}
        {currentView === 'super-admin-space' && (
          <ProtectedRoute
            allowedRoles={['SUPER_ADMIN']}
            attemptedView="super-admin-space"
            onNavigate={handleNavigate}
          >
            <SuperAdminSpace onNavigate={handleNavigate} />
          </ProtectedRoute>
        )}

        {currentView === 'admin-space' && (
          <ProtectedRoute
            allowedRoles={['ADMIN', 'SUPER_ADMIN']}
            attemptedView="admin-space"
            onNavigate={handleNavigate}
          >
            <AdminSpace onNavigate={handleNavigate} />
          </ProtectedRoute>
        )}

        {currentView === 'user-space' && (
          <ProtectedRoute
            allowedRoles={['USER', 'ADMIN', 'SUPER_ADMIN']}
            attemptedView="user-space"
            onNavigate={handleNavigate}
          >
            <UserSpace onNavigate={handleNavigate} />
          </ProtectedRoute>
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

