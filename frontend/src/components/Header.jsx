import React from 'react';

export default function Header({ apiStatus, currentView, onToggleView }) {
  const getDotClass = () => {
    if (apiStatus.loading) return 'checking';
    return apiStatus.healthy ? 'online' : 'offline';
  };

  const getStatusText = () => {
    if (apiStatus.loading) return 'Checking...';
    return apiStatus.healthy ? `API :5001 (${apiStatus.latency}ms)` : 'API Offline';
  };

  const isDbConnected = apiStatus.data?.database?.isConnected;

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
            <a href="#roles" className="nav-link" onClick={() => onToggleView('portal')}>3-Tier Roles</a>
            <a href="#health-check" className="nav-link" onClick={() => onToggleView('portal')}>Diagnostics</a>
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
              <span>{isDbConnected ? 'PostgreSQL Active' : 'DB Schema Ready'}</span>
            </div>

            {/* Switch view CTA */}
            <button
              type="button"
              className={currentView === 'dev-dashboard' ? 'btn-secondary' : 'btn-primary'}
              onClick={() => onToggleView(currentView === 'dev-dashboard' ? 'portal' : 'dev-dashboard')}
              style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem' }}
            >
              {currentView === 'dev-dashboard' ? 'View Landing' : 'Dev Dashboard'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
