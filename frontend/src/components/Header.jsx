import React from 'react';

export default function Header({ apiStatus }) {
  const getDotClass = () => {
    if (apiStatus.loading) return 'checking';
    return apiStatus.healthy ? 'online' : 'offline';
  };

  const getStatusText = () => {
    if (apiStatus.loading) return 'Checking API...';
    return apiStatus.healthy ? `API Active (${apiStatus.latency}ms)` : 'API Offline';
  };

  return (
    <header className="site-header" id="site-header">
      <div className="container">
        <div className="header-inner">
          <div className="brand-wrapper">
            <div className="brand-logo-icon" aria-label="Portal Icon">
              🛡️
            </div>
            <div className="brand-title">
              Veri<span>Social</span>
            </div>
          </div>

          <nav className="header-nav" aria-label="Main Navigation">
            <a href="#overview" className="nav-link">Overview</a>
            <a href="#roles" className="nav-link">3-Tier Roles</a>
            <a href="#health-check" className="nav-link">Health API</a>
            <a href="#tech-stack" className="nav-link">Architecture</a>
          </nav>

          <div className="header-actions">
            <div className="api-status-pill" title="Backend Health Check Status">
              <span className={`status-dot ${getDotClass()}`} />
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
