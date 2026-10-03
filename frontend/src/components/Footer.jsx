import React from 'react';

export default function Footer({ onNavigate, onScrollToSection, apiStatus, variant }) {
  return (
    <footer className="site-footer" id="main-site-footer">
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span className="footer-copyright-text" style={{ textAlign: 'center' }}>
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
      </div>
    </footer>
  );
}
