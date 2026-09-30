import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function SuperAdminSpace({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-superadmin">ROLE: SUPER ADMIN</span>
              <span className="badge badge-success">ACCOUNT ACTIVE</span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>👑 Super Admin Governance Console</h2>
            <p style={{ margin: 0 }}>
              Welcome back, <strong>{user?.name}</strong> ({user?.email}). You have full system-level administrative authority.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('portal')}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              Public Landing
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={logout}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'var(--status-error)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Identity Profile Details */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-highlight)' }}>
          Verified Identity Token Payload
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="detail-tile">
            <div className="detail-label">User ID</div>
            <div className="detail-value" style={{ fontSize: '0.82rem' }}>{user?.id}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Assigned Role</div>
            <div className="detail-value" style={{ color: 'var(--role-superadmin)' }}>{user?.role}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Account Email</div>
            <div className="detail-value" style={{ fontSize: '0.88rem' }}>{user?.email}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Session Status</div>
            <div className="detail-value" style={{ color: 'var(--status-success)' }}>Authenticated via JWT</div>
          </div>
        </div>
      </div>

      {/* Governance Placeholders */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Super Admin Governance Modules (Foundation)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>👥</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Admin Management</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Provision, inspect, and elevate platform moderators and review privileges.
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>Module Scheduled for Next Phase</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📜</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Platform Policy Rules</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Verification criteria for Instagram, LinkedIn, and Facebook submission evidence.
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>Module Scheduled for Next Phase</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🗄️</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>PostgreSQL & Telemetry</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Inspect schema migrations, connected pools, and relational constraints.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('dev-dashboard')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            Open DB Console →
          </button>
        </div>
      </div>
    </div>
  );
}
