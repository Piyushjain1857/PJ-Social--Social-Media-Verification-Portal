import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import Unauthorized403 from './Unauthorized403';

export default function ProtectedRoute({
  allowedRoles = [],
  children,
  onNavigate,
  attemptedView
}) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
        <div className="glass-panel" style={{ display: 'inline-block', padding: '2.5rem 3.5rem' }}>
          <div className="status-dot checking" style={{ width: '16px', height: '16px', margin: '0 auto 1.5rem auto', display: 'block' }} />
          <h3>Verifying Security Credentials...</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Validating session token and server-side role claims.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage onNavigate={onNavigate} />;
  }

  // Check if role is authorized
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <Unauthorized403
        attemptedView={attemptedView}
        allowedRoles={allowedRoles}
        onNavigate={onNavigate}
      />
    );
  }

  return children;
}

