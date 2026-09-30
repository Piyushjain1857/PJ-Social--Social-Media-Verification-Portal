import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import RoleOverview from './components/RoleOverview';
import HealthCheckWidget from './components/HealthCheckWidget';
import TechStackBadge from './components/TechStackBadge';
import DevDatabaseDashboard from './components/DevDatabaseDashboard';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import SuperAdminSpace from './pages/SuperAdminSpace';
import AdminSpace from './pages/AdminSpace';
import UserSpace from './pages/UserSpace';
import { fetchHealth } from './services/api';
import './styles/index.css';
import './styles/app.css';

/**
 * VIEWS:
 *   'portal'            - Public landing page
 *   'login'             - Login / Register page
 *   'super-admin-space' - SUPER_ADMIN dashboard (protected)
 *   'admin-space'       - ADMIN workspace (protected)
 *   'user-space'        - USER workspace (protected)
 *   'dev-dashboard'     - Developer DB telemetry console
 *   'role-space'        - Alias: redirects to role-appropriate space
 */

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState('portal');
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

  // When auth state resolves and user is logged in, redirect to their space
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const publicViews = ['portal', 'login'];
      if (publicViews.includes(currentView)) {
        navigateToRoleSpace(user.role);
      }
    }
  }, [authLoading, isAuthenticated, user]);

  const navigateToRoleSpace = (role) => {
    if (role === 'SUPER_ADMIN') setCurrentView('super-admin-space');
    else if (role === 'ADMIN') setCurrentView('admin-space');
    else setCurrentView('user-space');
  };

  // Resolve the 'role-space' alias at navigate time
  const handleNavigate = (view) => {
    if (view === 'role-space' && user) {
      navigateToRoleSpace(user.role);
    } else {
      setCurrentView(view);
    }
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
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Verifying session credentials</p>
        </div>
      </div>
    );
  }

  // ── Protected space guard ───────────────────────────────────────────────────
  const protectedViews = ['super-admin-space', 'admin-space', 'user-space'];
  if (protectedViews.includes(currentView) && !isAuthenticated) {
    return (
      <div className="app-container">
        <Header apiStatus={apiStatus} currentView="login" onToggleView={handleNavigate} />
        <main className="main-content">
          <LoginPage onNavigate={handleNavigate} />
        </main>
        <Footer />
      </div>
    );
  }

  // Role-mismatch guard for protected views
  if (currentView === 'super-admin-space' && user?.role !== 'SUPER_ADMIN') {
    navigateToRoleSpace(user.role);
    return null;
  }
  if (currentView === 'admin-space' && user?.role !== 'ADMIN') {
    navigateToRoleSpace(user.role);
    return null;
  }
  if (currentView === 'user-space' && user?.role !== 'USER') {
    navigateToRoleSpace(user.role);
    return null;
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

        {/* Role-based protected workspaces */}
        {currentView === 'super-admin-space' && (
          <SuperAdminSpace onNavigate={handleNavigate} />
        )}
        {currentView === 'admin-space' && (
          <AdminSpace onNavigate={handleNavigate} />
        )}
        {currentView === 'user-space' && (
          <UserSpace onNavigate={handleNavigate} />
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
