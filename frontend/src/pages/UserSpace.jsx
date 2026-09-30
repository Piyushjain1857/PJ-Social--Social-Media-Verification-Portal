import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserSpace({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--role-user)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-user">ROLE: CREATOR USER</span>
              <span className="badge badge-success">ACCOUNT VERIFIED</span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>🚀 Creator Activity Workspace</h2>
            <p style={{ margin: 0 }}>
              Welcome, <strong>{user?.name}</strong> ({user?.email}). Manage your connected accounts and verify your social activities.
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
          Creator Profile Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="detail-tile">
            <div className="detail-label">User ID</div>
            <div className="detail-value" style={{ fontSize: '0.82rem' }}>{user?.id}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Role</div>
            <div className="detail-value" style={{ color: 'var(--role-user)' }}>{user?.role}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Email</div>
            <div className="detail-value" style={{ fontSize: '0.88rem' }}>{user?.email}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Verification Standing</div>
            <div className="detail-value" style={{ color: 'var(--status-success)' }}>Active Contributor</div>
          </div>
        </div>
      </div>

      {/* Creator Action Placeholders */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Creator Verification Modules (Foundation)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔗</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Connected Social Accounts</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Link and bind your official handles across Instagram, LinkedIn, and Facebook.
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>SocialAccount Model Ready</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📤</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Submit Activity Proof</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Submit post URL, action type (Like, Comment, Story), and verification screenshot.
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>Submission Schema Bound</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📊</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Verification Status Tracker</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Monitor your activity lifecycle across PENDING, APPROVED, and REJECTED states.
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>Review Notifications Connected</span>
        </div>
      </div>
    </div>
  );
}
