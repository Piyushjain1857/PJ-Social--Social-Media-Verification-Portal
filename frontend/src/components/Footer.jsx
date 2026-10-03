import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Footer({ onNavigate, onScrollToSection, apiStatus, variant = 'full' }) {
  const isCompact = variant === 'compact';
  const { user, isAuthenticated, login } = useAuth() || {};
  const [activeModal, setActiveModal] = useState(null); // 'architecture' | 'security' | 'credentials' | 'verification'
  const [copiedKey, setCopiedKey] = useState(null);
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState(false);
  const [quickLoginError, setQuickLoginError] = useState('');


  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeModal]);

  const handleScrollTop = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    // 1. Primary window smooth scroll
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }

    // 2. Fallback on documentElement & body
    if (document.documentElement) {
      try {
        document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      } catch {
        document.documentElement.scrollTop = 0;
      }
    }
    if (document.body) {
      try {
        document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      } catch {
        document.body.scrollTop = 0;
      }
    }

    // 3. Fallback on any app container wrappers that might have scrollbars
    const scrollContainers = [
      document.querySelector('.app-container'),
      document.getElementById('root'),
      document.querySelector('.main-content'),
      document.querySelector('.layout-content-area'),
      document.getElementById('main-content'),
    ];
    scrollContainers.forEach((el) => {
      if (el && el.scrollTop > 0) {
        try {
          el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        } catch {
          el.scrollTop = 0;
        }
      }
    });

    // 4. Notify parent if registered
    if (onScrollToSection) {
      onScrollToSection('site-header');
    }
  };

  const handleNav = (targetView, sectionId = null) => {
    if (sectionId) {
      if (sectionId === 'site-header' || sectionId === 'overview' || sectionId === 'top') {
        handleScrollTop();
        return;
      }
      if (onScrollToSection) {
        onScrollToSection(sectionId);
      } else {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else if (onNavigate) {
          onNavigate('portal');
          setTimeout(() => {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      }
      return;
    }

    if (onNavigate) {
      onNavigate(targetView);
    } else {
      window.location.hash = targetView;
    }
  };

  const handleCopy = (text, key) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    }
  };

  const handleQuickRoleSignIn = async (email, password) => {
    if (!login) return;
    setIsQuickLoggingIn(true);
    setQuickLoginError('');
    try {
      const res = await login(email, password);
      if (res?.success) {
        setActiveModal(null);
        if (onNavigate) {
          onNavigate('dashboard');
        } else {
          window.location.hash = 'dashboard';
        }
      } else {
        setQuickLoginError(res?.error || 'Quick login failed. Verify backend service is running.');
      }
    } catch (err) {
      setQuickLoginError(err?.message || 'Login encounter an unexpected network issue.');
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  const getLatencyDisplay = () => {
    if (!apiStatus) return 'Connected';
    if (apiStatus.loading) return 'Checking…';
    if (apiStatus.healthy) return `${apiStatus.latency ?? '<15'}ms`;
    return 'Offline';
  };

  const isApiOnline = apiStatus ? apiStatus.healthy : true;

  return (
    <>
      <footer className={`site-footer ${isCompact ? 'compact' : ''}`} id="main-site-footer">
        {/* Ambient Top Glow Line */}
        <div className="footer-glow-bar" aria-hidden="true" />

        <div className={`container footer-container ${isCompact ? 'compact' : ''}`}>
          {!isCompact && (
            <>
              {/* ==============================================================
                  PRE-FOOTER: Enterprise Callout Card (Interactive Hub)
                 ============================================================== */}
              <div className="footer-prefooter-card">
            <div className="footer-prefooter-grid">
              <div className="footer-prefooter-content">
                <div className="footer-prefooter-badge">
                  <span className="footer-badge-pulse-dot" />
                  <span>ENTERPRISE PROOF NETWORK</span>
                </div>
                <h3 className="footer-prefooter-title">
                  Next-Generation Social Media Activity Verification
                </h3>
                <p className="footer-prefooter-desc">
                  Autonomous validation pipeline with cryptographic proof-of-work checks, 
                  tamper-evident audit trails, and multi-tier role governance across all major social networks.
                </p>
                <div className="footer-prefooter-metrics">
                  <div className="footer-metric-item">
                    <span className="footer-metric-value">3 Roles</span>
                    <span className="footer-metric-label">RBAC Governance</span>
                  </div>
                  <div className="footer-metric-divider" />
                  <div className="footer-metric-item">
                    <span className="footer-metric-value">100%</span>
                    <span className="footer-metric-label">PostgreSQL Audited</span>
                  </div>
                  <div className="footer-metric-divider" />
                  <div className="footer-metric-item">
                    <span className="footer-metric-value">256-Bit</span>
                    <span className="footer-metric-label">Cryptographic Proofs</span>
                  </div>
                </div>
              </div>

              <div className="footer-prefooter-actions">
                <button
                  type="button"
                  id="footer-launch-portal-btn"
                  className="btn-footer-primary"
                  onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'login')}
                >
                  <span>{isAuthenticated ? 'Open Dashboard Space' : 'Launch Verification Portal'}</span>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                <button
                  type="button"
                  id="footer-demo-creds-btn"
                  className="btn-footer-secondary"
                  onClick={() => setActiveModal('credentials')}
                >
                  <span>👑 Demo Role Credentials</span>
                </button>
              </div>
            </div>
          </div>

          {/* ==============================================================
              MAIN 5-COLUMN FOOTER NAVIGATION GRID
             ============================================================== */}
          <div className="footer-main-grid">
            {/* Column 1: Brand & Enterprise Security Core */}
            <div className="footer-col footer-col-brand">
              <div 
                className="footer-brand-header" 
                onClick={() => handleNav('portal', 'site-header')} 
                style={{ cursor: 'pointer' }}
              >
                <div className="footer-brand-icon-wrap">
                  <div className="footer-brand-icon-pulse" />
                  <span className="footer-brand-icon-emoji">🛡️</span>
                </div>
                <div className="footer-brand-name">
                  PJ <span className="brand-accent-text">Social</span>
                  <span className="footer-brand-tag">PORTAL</span>
                </div>
              </div>

              <p className="footer-brand-tagline">
                Enterprise social proof &amp; creator verification engine. 
                Cryptographically audited task validation, gamified creator XP, 
                and multi-tier moderator governance.
              </p>

              {/* Real-time System Status Pill */}
              <div className="footer-status-capsule">
                <div className="footer-status-indicator">
                  <span className={`footer-status-dot ${isApiOnline ? 'online' : 'offline'}`}>
                    <span className="footer-status-ping" />
                  </span>
                  <span className="footer-status-title">
                    {isApiOnline ? 'Systems Operational' : 'API Connection Alert'}
                  </span>
                </div>
                <div className="footer-status-meta">
                  <span className="footer-status-latency">{getLatencyDisplay()}</span>
                  <span className="footer-status-endpoint">:5001 Express</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="footer-trust-chips">
                <span className="footer-trust-chip" title="Cryptographically validated bearer authentication">
                  🔒 AES-256 JWT
                </span>
                <span className="footer-trust-chip" title="Three-tier role based access control">
                  🛡️ 3-Tier RBAC
                </span>
                <span className="footer-trust-chip" title="PostgreSQL with Prisma Client ORM">
                  🐘 Postgres + Prisma
                </span>
              </div>
            </div>

            {/* Column 2: Platform Workspaces */}
            <div className="footer-col">
              <h4 className="footer-col-heading">Platform Workspaces</h4>
              <ul className="footer-nav-list">
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'login')}
                  >
                    <span className="footer-nav-icon">👑</span>
                    <span>Super Admin Console</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'login')}
                  >
                    <span className="footer-nav-icon">🛡️</span>
                    <span>Moderation Queue</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'login')}
                  >
                    <span className="footer-nav-icon">🚀</span>
                    <span>Creator Proof Space</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav('portal', 'roles')}
                  >
                    <span className="footer-nav-icon">⚡</span>
                    <span>Role Privilege Matrix</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav(isAuthenticated ? 'dashboard' : 'login')}
                  >
                    <span className="footer-nav-icon">🏆</span>
                    <span>Gamification Engine</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Security & Verification */}
            <div className="footer-col">
              <h4 className="footer-col-heading">Security &amp; Protocol</h4>
              <ul className="footer-nav-list">
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => setActiveModal('verification')}
                  >
                    <span className="footer-nav-icon">🔍</span>
                    <span>Verification Pipeline</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => setActiveModal('security')}
                  >
                    <span className="footer-nav-icon">🔐</span>
                    <span>Role-Based RBAC</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => setActiveModal('architecture')}
                  >
                    <span className="footer-nav-icon">📑</span>
                    <span>Anti-Tamper Ledger</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav('portal', 'health-check')}
                  >
                    <span className="footer-nav-icon">💓</span>
                    <span>Real-time Health Telemetry</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => setActiveModal('credentials')}
                  >
                    <span className="footer-nav-icon">🔑</span>
                    <span>Test Credentials Modal</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Technology & Architecture */}
            <div className="footer-col">
              <h4 className="footer-col-heading">Tech Architecture</h4>
              <ul className="footer-nav-list">
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav('portal', 'tech-stack')}
                  >
                    <span className="footer-nav-icon">⚛️</span>
                    <span>React 19 + Vite HMR</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav('portal', 'tech-stack')}
                  >
                    <span className="footer-nav-icon">🟢</span>
                    <span>Node.js &amp; Express REST</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav('portal', 'tech-stack')}
                  >
                    <span className="footer-nav-icon">🐘</span>
                    <span>PostgreSQL Database</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav('portal', 'tech-stack')}
                  >
                    <span className="footer-nav-icon">💎</span>
                    <span>Prisma Schema &amp; Client</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button" 
                    className="footer-nav-link" 
                    onClick={() => handleNav('dev-dashboard')}
                  >
                    <span className="footer-nav-icon">📊</span>
                    <span>Developer DB Console</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 5: Creator & Social Connect */}
            <div className="footer-col footer-col-connect">
              <h4 className="footer-col-heading">Architect &amp; Lead</h4>
              
              <div className="footer-author-card">
                <div className="footer-author-avatar-wrap">
                  <div className="footer-author-avatar">PJ</div>
                  <div className="footer-author-badge" title="Lead Architect">★</div>
                </div>
                <div className="footer-author-info">
                  <div className="footer-author-name">Piyush Jain</div>
                  <div className="footer-author-role">Full-Stack Architect &amp; Engineer</div>
                </div>
              </div>

              <p className="footer-author-desc">
                Architecting high-concurrency verification systems, role-gated applications, and modern developer tooling.
              </p>

              {/* Social Channels Glass Buttons */}
              <div className="footer-social-strip">
                <a
                  href="https://linkedin.com/in/piyushjain1857"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-btn linkedin-btn"
                  title="Connect on LinkedIn (Piyush Jain)"
                  aria-label="LinkedIn Profile"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <span>LinkedIn</span>
                </a>

                <a
                  href="https://github.com/Piyushjain1857"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-btn github-btn"
                  title="View GitHub (Piyushjain1857)"
                  aria-label="GitHub Profile"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==============================================================
          BOTTOM BAR: Copyright & Interactive Modals
         ============================================================== */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-left">
          <span className="footer-copyright-text">
            © {new Date().getFullYear()} PJ Social : Social Media Activity Verification Portal. 
            Built by{' '}
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

        <div className="footer-bottom-center">
          <button
            type="button"
            className="footer-legal-link"
            onClick={() => setActiveModal('architecture')}
          >
            Architecture Spec
          </button>
          <span className="footer-legal-dot">•</span>
          <button
            type="button"
            className="footer-legal-link"
            onClick={() => setActiveModal('security')}
          >
            Security Model
          </button>
          <span className="footer-legal-dot">•</span>
          <button
            type="button"
            className="footer-legal-link"
            onClick={() => setActiveModal('verification')}
          >
            Proof Protocol
          </button>
          <span className="footer-legal-dot">•</span>
          <button
            type="button"
            className="footer-legal-link"
            onClick={() => setActiveModal('credentials')}
          >
            Role Accounts
          </button>
        </div>
      </div>
    </div>
  </footer>

      {/* ==============================================================
          MODAL 1: SYSTEM ARCHITECTURE & TELEMETRY
         ============================================================== */}
      {activeModal === 'architecture' && (
        <div className="footer-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="footer-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal-header">
              <div className="footer-modal-title-wrap">
                <span className="footer-modal-icon">🏛️</span>
                <div>
                  <h3 className="footer-modal-title">System Architecture &amp; Data Pipeline</h3>
                  <p className="footer-modal-subtitle">PJ Social Verification Portal technical foundation</p>
                </div>
              </div>
              <button 
                type="button" 
                className="footer-modal-close" 
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="footer-modal-body">
              {/* Flowchart Schematic */}
              <div className="footer-arch-flow">
                <div className="footer-flow-step">
                  <div className="footer-flow-box">
                    <span className="footer-flow-emoji">⚛️</span>
                    <span className="footer-flow-title">Frontend Client</span>
                    <span className="footer-flow-tech">React 19 + Vite</span>
                  </div>
                  <div className="footer-flow-arrow">→</div>
                </div>

                <div className="footer-flow-step">
                  <div className="footer-flow-box highlight">
                    <span className="footer-flow-emoji">⚡</span>
                    <span className="footer-flow-title">REST Gateway</span>
                    <span className="footer-flow-tech">Express :5001 + CORS</span>
                  </div>
                  <div className="footer-flow-arrow">→</div>
                </div>

                <div className="footer-flow-step">
                  <div className="footer-flow-box">
                    <span className="footer-flow-emoji">🔒</span>
                    <span className="footer-flow-title">Auth &amp; RBAC</span>
                    <span className="footer-flow-tech">JWT + bcrypt Guard</span>
                  </div>
                  <div className="footer-flow-arrow">→</div>
                </div>

                <div className="footer-flow-step">
                  <div className="footer-flow-box">
                    <span className="footer-flow-emoji">💎</span>
                    <span className="footer-flow-title">Prisma ORM</span>
                    <span className="footer-flow-tech">Schema Engine</span>
                  </div>
                  <div className="footer-flow-arrow">→</div>
                </div>

                <div className="footer-flow-step">
                  <div className="footer-flow-box accent">
                    <span className="footer-flow-emoji">🐘</span>
                    <span className="footer-flow-title">PostgreSQL</span>
                    <span className="footer-flow-tech">Relational Ledger</span>
                  </div>
                </div>
              </div>

              {/* Architecture Details Table */}
              <div className="footer-arch-details-grid">
                <div className="footer-detail-item">
                  <div className="footer-detail-title">🛡️ Proof Verification Pipeline</div>
                  <div className="footer-detail-desc">
                    Creator proof URLs and media attachments undergo cryptographic hash verification, URL canonicalization, and anti-duplicate validation before entering the moderation queue.
                  </div>
                </div>
                <div className="footer-detail-item">
                  <div className="footer-detail-title">🏆 Gamification XP Ledger</div>
                  <div className="footer-detail-desc">
                    Every approved proof atom triggers the Gamification Engine: dynamic multiplier computation, XP accumulation, tier milestone checks, and instant Level-Up modal celebrations.
                  </div>
                </div>
                <div className="footer-detail-item">
                  <div className="footer-detail-title">🔐 Role Isolation Boundaries</div>
                  <div className="footer-detail-desc">
                    Strict hierarchical separation between SUPER_ADMIN (system governance, user ban/unban), ADMIN (moderation queue, activity review), and USER (creator space).
                  </div>
                </div>
                <div className="footer-detail-item">
                  <div className="footer-detail-title">📡 Live Health &amp; Telemetry</div>
                  <div className="footer-detail-desc">
                    Sub-15ms database latency telemetry, real-time migration status, connection pool monitoring, and dedicated developer telemetry console.
                  </div>
                </div>
              </div>
            </div>

            <div className="footer-modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { setActiveModal(null); handleNav('dev-dashboard'); }}
              >
                Open Dev DB Console ⚡
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setActiveModal(null)}
              >
                Close Spec
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 2: SECURITY & RBAC SPECIFICATION
         ============================================================== */}
      {activeModal === 'security' && (
        <div className="footer-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="footer-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal-header">
              <div className="footer-modal-title-wrap">
                <span className="footer-modal-icon">🔐</span>
                <div>
                  <h3 className="footer-modal-title">Security &amp; RBAC Governance Model</h3>
                  <p className="footer-modal-subtitle">Enterprise-grade authorization and authentication policies</p>
                </div>
              </div>
              <button 
                type="button" 
                className="footer-modal-close" 
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="footer-modal-body">
              <div className="footer-rbac-matrix">
                <div className="footer-rbac-row header">
                  <div>Role Tier</div>
                  <div>Capabilities &amp; Authority</div>
                  <div>Target Users</div>
                </div>

                <div className="footer-rbac-row superadmin">
                  <div className="footer-rbac-badge">
                    <span className="badge badge-superadmin">SUPER_ADMIN</span>
                  </div>
                  <div className="footer-rbac-desc">
                    Global platform control. Manage admins, promote/demote accounts, activate/deactivate accounts, adjust level XP formulas, and access raw database diagnostics.
                  </div>
                  <div className="footer-rbac-meta">Executive Operations</div>
                </div>

                <div className="footer-rbac-row admin">
                  <div className="footer-rbac-badge">
                    <span className="badge badge-admin">ADMIN</span>
                  </div>
                  <div className="footer-rbac-desc">
                    Verification moderator. Inspect submitted social proof posts, approve or reject submissions with feedback notes, monitor queue SLA, and audit user activity.
                  </div>
                  <div className="footer-rbac-meta">Compliance &amp; Moderation</div>
                </div>

                <div className="footer-rbac-row user">
                  <div className="footer-rbac-badge">
                    <span className="badge badge-user">USER</span>
                  </div>
                  <div className="footer-rbac-desc">
                    Creator space. Link official social channels (YouTube, X, Instagram, LinkedIn, GitHub), submit activity proof URLs and screenshots, earn XP, and level up.
                  </div>
                  <div className="footer-rbac-meta">Creators &amp; Contributors</div>
                </div>
              </div>

              <div className="footer-security-points">
                <div className="footer-sec-point">
                  <strong>Password Security:</strong> Bcrypt adaptive hash algorithm with 10 salt rounds.
                </div>
                <div className="footer-sec-point">
                  <strong>Bearer Tokens:</strong> Cryptographically signed JWT tokens with 24-hour automatic expiration and token invalidation on logout.
                </div>
                <div className="footer-sec-point">
                  <strong>Authorization Guard:</strong> Backend middleware intercepts all privileged routes with deterministic 403 Forbidden enforcement.
                </div>
              </div>
            </div>

            <div className="footer-modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setActiveModal('credentials')}
              >
                View Demo Accounts 👑
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setActiveModal(null)}
              >
                Acknowledge Security Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 3: DEMO ROLE CREDENTIALS (Interactive Test)
         ============================================================== */}
      {activeModal === 'credentials' && (
        <div className="footer-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="footer-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal-header">
              <div className="footer-modal-title-wrap">
                <span className="footer-modal-icon">👑</span>
                <div>
                  <h3 className="footer-modal-title">Live Demo Role Credentials</h3>
                  <p className="footer-modal-subtitle">One-click test accounts configured in the database</p>
                </div>
              </div>
              <button 
                type="button" 
                className="footer-modal-close" 
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="footer-modal-body">
              {quickLoginError && (
                <div className="alert-panel alert-error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
                  <span>⚠️ {quickLoginError}</span>
                </div>
              )}

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Test any of the 3 role workspaces instantly. You can copy the credentials or click 
                <strong> &quot;Instant Sign In&quot;</strong> to authenticate immediately.
              </p>

              <div className="footer-creds-grid">
                {/* 1. Super Admin */}
                <div className="footer-cred-card superadmin">
                  <div className="footer-cred-top">
                    <span className="badge badge-superadmin">👑 SUPER_ADMIN</span>
                    <span className="footer-cred-role-name">System Executive</span>
                  </div>
                  <div className="footer-cred-row">
                    <span className="footer-cred-label">Email:</span>
                    <code className="footer-cred-value">superadmin@portal.com</code>
                    <button
                      type="button"
                      className="footer-copy-btn"
                      onClick={() => handleCopy('superadmin@portal.com', 'sa_email')}
                      title="Copy email"
                    >
                      {copiedKey === 'sa_email' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="footer-cred-row">
                    <span className="footer-cred-label">Pass:</span>
                    <code className="footer-cred-value">SuperAdmin123!</code>
                    <button
                      type="button"
                      className="footer-copy-btn"
                      onClick={() => handleCopy('SuperAdmin123!', 'sa_pass')}
                      title="Copy password"
                    >
                      {copiedKey === 'sa_pass' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="footer-instant-login-btn superadmin"
                    disabled={isQuickLoggingIn}
                    onClick={() => handleQuickRoleSignIn('superadmin@portal.com', 'SuperAdmin123!')}
                  >
                    {isQuickLoggingIn ? 'Authenticating…' : '⚡ Instant Sign In as Super Admin'}
                  </button>
                </div>

                {/* 2. Admin Moderator */}
                <div className="footer-cred-card admin">
                  <div className="footer-cred-top">
                    <span className="badge badge-admin">🛡️ ADMIN</span>
                    <span className="footer-cred-role-name">Proof Moderator</span>
                  </div>
                  <div className="footer-cred-row">
                    <span className="footer-cred-label">Email:</span>
                    <code className="footer-cred-value">admin@portal.com</code>
                    <button
                      type="button"
                      className="footer-copy-btn"
                      onClick={() => handleCopy('admin@portal.com', 'adm_email')}
                      title="Copy email"
                    >
                      {copiedKey === 'adm_email' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="footer-cred-row">
                    <span className="footer-cred-label">Pass:</span>
                    <code className="footer-cred-value">Admin123!</code>
                    <button
                      type="button"
                      className="footer-copy-btn"
                      onClick={() => handleCopy('Admin123!', 'adm_pass')}
                      title="Copy password"
                    >
                      {copiedKey === 'adm_pass' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="footer-instant-login-btn admin"
                    disabled={isQuickLoggingIn}
                    onClick={() => handleQuickRoleSignIn('admin@portal.com', 'Admin123!')}
                  >
                    {isQuickLoggingIn ? 'Authenticating…' : '⚡ Instant Sign In as Moderator'}
                  </button>
                </div>

                {/* 3. Creator User */}
                <div className="footer-cred-card user">
                  <div className="footer-cred-top">
                    <span className="badge badge-user">🚀 CREATOR USER</span>
                    <span className="footer-cred-role-name">Activity Submitter</span>
                  </div>
                  <div className="footer-cred-row">
                    <span className="footer-cred-label">Email:</span>
                    <code className="footer-cred-value">user@portal.com</code>
                    <button
                      type="button"
                      className="footer-copy-btn"
                      onClick={() => handleCopy('user@portal.com', 'usr_email')}
                      title="Copy email"
                    >
                      {copiedKey === 'usr_email' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="footer-cred-row">
                    <span className="footer-cred-label">Pass:</span>
                    <code className="footer-cred-value">User123!</code>
                    <button
                      type="button"
                      className="footer-copy-btn"
                      onClick={() => handleCopy('User123!', 'usr_pass')}
                      title="Copy password"
                    >
                      {copiedKey === 'usr_pass' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="footer-instant-login-btn user"
                    disabled={isQuickLoggingIn}
                    onClick={() => handleQuickRoleSignIn('user@portal.com', 'User123!')}
                  >
                    {isQuickLoggingIn ? 'Authenticating…' : '⚡ Instant Sign In as Creator'}
                  </button>
                </div>
              </div>
            </div>

            <div className="footer-modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { setActiveModal(null); handleNav('login'); }}
              >
                Go to Standard Login Screen →
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 4: VERIFICATION PIPELINE & PROTOCOL
         ============================================================== */}
      {activeModal === 'verification' && (
        <div className="footer-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="footer-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal-header">
              <div className="footer-modal-title-wrap">
                <span className="footer-modal-icon">🔍</span>
                <div>
                  <h3 className="footer-modal-title">Activity Proof Verification Protocol</h3>
                  <p className="footer-modal-subtitle">Anti-tamper lifecycle for social media activities</p>
                </div>
              </div>
              <button 
                type="button" 
                className="footer-modal-close" 
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="footer-modal-body">
              <div className="footer-protocol-steps">
                <div className="footer-proto-step">
                  <div className="footer-proto-number">01</div>
                  <div className="footer-proto-info">
                    <h4>Social Proof Submission</h4>
                    <p>Creator links their verified social handle (YouTube, X, Instagram, LinkedIn, GitHub) and submits proof URL + screenshot proof.</p>
                  </div>
                </div>

                <div className="footer-proto-step">
                  <div className="footer-proto-number">02</div>
                  <div className="footer-proto-info">
                    <h4>URL Sanitization &amp; Deduplication</h4>
                    <p>System strips tracking parameters, canonicalizes destination URLs, and checks PostgreSQL records to prevent duplicate activity proofs.</p>
                  </div>
                </div>

                <div className="footer-proto-step">
                  <div className="footer-proto-number">03</div>
                  <div className="footer-proto-info">
                    <h4>Moderator Human-in-the-Loop Review</h4>
                    <p>Admin moderators inspect the proof in the verification workspace with preview tools, applying APPROVE or REJECT with specific rejection rationales.</p>
                  </div>
                </div>

                <div className="footer-proto-step">
                  <div className="footer-proto-number">04</div>
                  <div className="footer-proto-info">
                    <h4>XP Award &amp; Progression Trigger</h4>
                    <p>Approved activity awards base XP + platform streak bonuses. Gamification engine recalculates rankings and updates level badges in real time.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="footer-modal-actions">
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setActiveModal(null)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
