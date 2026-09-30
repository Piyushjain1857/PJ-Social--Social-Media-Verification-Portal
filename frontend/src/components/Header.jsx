import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ apiStatus, currentView, onToggleView }) {
  const { user, isAuthenticated, logout, login } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const getDotClass = () => {
    if (apiStatus.loading) return 'checking';
    return apiStatus.healthy ? 'online' : 'offline';
  };

  const getStatusText = () => {
    if (apiStatus.loading) return 'Checking...';
    return apiStatus.healthy ? `API :5001 (${apiStatus.latency}ms)` : 'API Offline';
  };

  const isDbConnected = apiStatus.data?.database?.isConnected;

  const getRoleBadgeClass = (role) => {
    if (role === 'SUPER_ADMIN') return 'badge-superadmin';
    if (role === 'ADMIN') return 'badge-admin';
    return 'badge-user';
  };

  const navigateToRoleSpace = () => {
    if (!user) return;
    if (user.role === 'SUPER_ADMIN') onToggleView('super-admin-space');
    else if (user.role === 'ADMIN') onToggleView('admin-space');
    else onToggleView('user-space');
  };

  const handleQuickSwitch = async (email, password, targetView) => {
    setShowRoleSwitcher(false);
    const res = await login(email, password);
    if (res.success) {
      onToggleView(targetView);
    }
  };

  return (
    <header className="site-header" id="site-header">
      <div className="container">
        <div className="header-inner">
          <div 
            className="brand-wrapper" 
            style={{ cursor: 'pointer' }}
            onClick={() => onToggleView('portal')}
          >
            <div className="brand-logo-icon" aria-label="Portal Icon">
              🛡️
            </div>
            <div className="brand-title">
              Veri<span>Social</span>
            </div>
          </div>

          {/* Role-Aware Navigation: Items hidden if role does not have permission */}
          <nav className="header-nav" aria-label="Main Navigation">
            <button 
              type="button" 
              className={`nav-link ${currentView === 'portal' ? 'active' : ''}`}
              onClick={() => onToggleView('portal')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Portal Landing
            </button>

            {/* Normal USER: Only sees Creator Space */}
            {isAuthenticated && user?.role === 'USER' && (
              <button 
                type="button" 
                className={`nav-link ${currentView === 'user-space' ? 'active' : ''}`}
                onClick={() => onToggleView('user-space')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                🚀 My Creator Space
              </button>
            )}

            {/* ADMIN: Sees Admin Workspace; HIDES Super Admin Console */}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <button 
                type="button" 
                className={`nav-link ${currentView === 'admin-space' ? 'active' : ''}`}
                onClick={() => onToggleView('admin-space')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                🛡️ Admin Review Queue
              </button>
            )}

            {/* SUPER_ADMIN: Full system access - sees Super Admin Console AND Admin Workspace */}
            {isAuthenticated && user?.role === 'SUPER_ADMIN' && (
              <>
                <button 
                  type="button" 
                  className={`nav-link ${currentView === 'super-admin-space' ? 'active' : ''}`}
                  onClick={() => onToggleView('super-admin-space')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  👑 Super Admin Console
                </button>
                <button 
                  type="button" 
                  className={`nav-link ${currentView === 'admin-space' ? 'active' : ''}`}
                  onClick={() => onToggleView('admin-space')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  🛡️ Admin Queue
                </button>
              </>
            )}

            {/* Developer DB Console: Available to Super Admin and public demo */}
            <button 
              type="button" 
              className={`nav-link ${currentView === 'dev-dashboard' ? 'active' : ''}`}
              onClick={() => onToggleView('dev-dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Dev DB
            </button>

            <a href="#roles" className="nav-link" onClick={() => onToggleView('portal')}>Role Specs</a>
          </nav>

          <div className="header-actions">
            {/* API Status Pill */}
            <div className="api-status-pill" title="Express.js API Connection Status">
              <span className={`status-dot ${getDotClass()}`} />
              <span>{getStatusText()}</span>
            </div>

            {/* Authentication State / Action */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
                <div 
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Click to toggle quick role switch simulation"
                >
                  <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                    {user.role}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                    {user.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>▾</span>
                </div>

                {/* Quick Role Switcher Dropdown */}
                {showRoleSwitcher && (
                  <div
                    className="glass-panel"
                    style={{
                      position: 'absolute',
                      top: '115%',
                      right: 0,
                      minWidth: '240px',
                      padding: '0.75rem',
                      zIndex: 1000,
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                      Switch Active Role
                    </div>
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => handleQuickSwitch('superadmin@portal.com', 'SuperAdmin123!', 'super-admin-space')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: user.role === 'SUPER_ADMIN' ? 'rgba(245, 158, 11, 0.15)' : 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <span>👑 Super Admin</span>
                      {user.role === 'SUPER_ADMIN' && <span style={{ fontSize: '0.7rem' }}>✓ Active</span>}
                    </button>
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => handleQuickSwitch('admin@portal.com', 'Admin123!', 'admin-space')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: user.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.15)' : 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <span>🛡️ Admin Moderator</span>
                      {user.role === 'ADMIN' && <span style={{ fontSize: '0.7rem' }}>✓ Active</span>}
                    </button>
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => handleQuickSwitch('user@portal.com', 'User123!', 'user-space')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: user.role === 'USER' ? 'rgba(16, 185, 129, 0.15)' : 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <span>🚀 Creator User</span>
                      {user.role === 'USER' && <span style={{ fontSize: '0.7rem' }}>✓ Active</span>}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { logout(); onToggleView('portal'); }}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                  title="Sign out of your session"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => onToggleView('login')}
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                Sign In →
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

