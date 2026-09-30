import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized403({
  attemptedView,
  allowedRoles = [],
  onNavigate,
  customMessage,
}) {
  const { user, login } = useAuth();

  const handleQuickSwitch = async (email, password, targetView) => {
    const res = await login(email, password);
    if (res.success) {
      onNavigate(targetView);
    }
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'SUPER_ADMIN') return 'badge-superadmin';
    if (role === 'ADMIN') return 'badge-admin';
    return 'badge-user';
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '780px' }}>
      <div
        className="glass-panel"
        style={{
          padding: '2.75rem 2rem',
          textAlign: 'center',
          borderTop: '4px solid var(--status-error)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Visual Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            fontSize: '2.4rem',
            marginBottom: '1.25rem'
          }}
        >
          🛡️🚫
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-error" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
            HTTP 403 FORBIDDEN
          </span>
          <span className="badge badge-outline" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
            RBAC ACCESS RESTRICTION
          </span>
        </div>

        <h2 style={{ color: 'var(--text-highlight)', margin: '0 0 0.75rem 0', fontSize: '1.8rem' }}>
          Access Denied: Insufficient Role Privileges
        </h2>

        <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 1.75rem auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
          {customMessage || (
            <>
              You have attempted to navigate to a protected workspace or resource that is restricted by
              the platform's 3-tier Role-Based Access Control policy.
            </>
          )}
        </p>

        {/* Role Comparison Table/Box */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '1.25rem 1.5rem',
            maxWidth: '520px',
            margin: '0 auto 2rem auto',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Attempted Resource:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--brand-primary)' }}>
              /{attemptedView || 'restricted-resource'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your Authenticated Role:</span>
            <span className={`badge ${getRoleBadgeClass(user?.role)}`} style={{ fontSize: '0.75rem' }}>
              {user?.role || 'UNAUTHENTICATED'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Authorized Required Role(s):</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {allowedRoles.length > 0 ? (
                allowedRoles.map((r) => (
                  <span key={r} className={`badge ${getRoleBadgeClass(r)}`} style={{ fontSize: '0.75rem' }}>
                    {r}
                  </span>
                ))
              ) : (
                <span className="badge badge-superadmin" style={{ fontSize: '0.75rem' }}>
                  SUPER_ADMIN
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          {user && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate('role-space')}
              style={{ padding: '0.65rem 1.4rem' }}
            >
              Go to Your Workspace ({user.role}) →
            </button>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('portal')}
            style={{ padding: '0.65rem 1.25rem' }}
          >
            Public Portal Landing
          </button>
        </div>

        {/* Quick Testing Switcher */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            ⚡ <strong>Role Testing Simulation:</strong> Quickly switch sessions to test this view with an authorized role:
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleQuickSwitch('superadmin@portal.com', 'SuperAdmin123!', 'super-admin-space')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              👑 Login as Super Admin
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleQuickSwitch('admin@portal.com', 'Admin123!', 'admin-space')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              🛡️ Login as Admin
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleQuickSwitch('user@portal.com', 'User123!', 'user-space')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              🚀 Login as Creator User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
