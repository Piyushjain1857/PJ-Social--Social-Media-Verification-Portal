import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ apiStatus, currentView, onToggleView }) {
  const { user, isAuthenticated, logout } = useAuth();

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

          <nav className="header-nav" aria-label="Main Navigation">
            <button 
              type="button" 
              className={`nav-link ${currentView === 'portal' ? 'active' : ''}`}
              onClick={() => onToggleView('portal')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Portal Landing
            </button>
            <button 
              type="button" 
              className={`nav-link ${currentView === 'dev-dashboard' ? 'active' : ''}`}
              onClick={() => onToggleView('dev-dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Dev DB Console
            </button>
            {isAuthenticated && (
              <button 
                type="button" 
                className={`nav-link ${['super-admin-space', 'admin-space', 'user-space'].includes(currentView) ? 'active' : ''}`}
                onClick={navigateToRoleSpace}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                My Workspace
              </button>
            )}
            <a href="#roles" className="nav-link" onClick={() => onToggleView('portal')}>3-Tier Roles</a>
          </nav>

          <div className="header-actions">
            {/* API Status Pill */}
            <div className="api-status-pill" title="Express.js API Connection Status">
              <span className={`status-dot ${getDotClass()}`} />
              <span>{getStatusText()}</span>
            </div>

            {/* DB Status Pill */}
            <div 
              className="api-status-pill" 
              title={isDbConnected ? 'PostgreSQL Connected' : 'Database Awaiting Connection'}
              style={{ cursor: 'pointer' }}
              onClick={() => onToggleView('dev-dashboard')}
            >
              <span className={`status-dot ${isDbConnected ? 'online' : 'checking'}`} />
              <span>{isDbConnected ? 'DB Active' : 'DB Ready'}</span>
            </div>

            {/* Authentication State / Action */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div 
                  onClick={navigateToRoleSpace}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-full)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}
                  title="Click to view your role workspace"
                >
                  <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                    {user.role}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                    {user.name.split(' ')[0]}
                  </span>
                </div>
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
