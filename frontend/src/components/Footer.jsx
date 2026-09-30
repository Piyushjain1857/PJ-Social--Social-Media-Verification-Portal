import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="brand-wrapper">
            <div className="brand-logo-icon" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>
              🛡️
            </div>
            <div className="brand-title" style={{ fontSize: '1rem' }}>
              Veri<span>Social</span> Portal
            </div>
          </div>

          <div className="footer-copyright">
            © {new Date().getFullYear()} Social Media Verification Portal. Initial Full-Stack Foundation.
          </div>

          <div className="footer-badges">
            <span className="badge badge-outline">3 Roles Configured</span>
            <span className="badge badge-outline">Monorepo Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
