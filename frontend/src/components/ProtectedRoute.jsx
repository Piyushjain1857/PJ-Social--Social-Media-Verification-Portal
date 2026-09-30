import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

export default function ProtectedRoute({ allowedRoles, children, onNavigate }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
        <div className="glass-panel" style={{ display: 'inline-block', padding: '2.5rem 3.5rem' }}>
          <div className="status-dot checking" style={{ width: '16px', height: '16px', margin: '0 auto 1.5rem auto', display: 'block' }} />
          <h3>Verifying Security Credentials...</h3>
          <p style={{ margin: 0 }}>Validating session token and server-side role claims.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage onNavigate={onNavigate} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '650px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⛔</div>
          <h3 style={{ color: 'var(--status-error)', marginBottom: '0.75rem' }}>Access Restricted by Role Policy</h3>
          <p style={{ marginBottom: '1.5rem' }}>
            This resource requires one of the following roles: <strong>{allowedRoles.join(', ')}</strong>.
            Your current assigned role is <strong>{user.role}</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate('role-space')}
            >
              Go to Your Workspace ({user.role})
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('portal')}
            >
              Public Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
