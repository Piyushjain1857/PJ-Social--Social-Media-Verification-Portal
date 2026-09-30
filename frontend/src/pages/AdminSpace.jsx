import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminSpace({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--role-admin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-admin">ROLE: ADMIN MODERATOR</span>
              <span className="badge badge-success">VERIFIED REVIEWER</span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>🛡️ Admin Verification Workspace</h2>
            <p style={{ margin: 0 }}>
              Welcome back, <strong>{user?.name}</strong> ({user?.email}). You have review and moderation access.
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
          Reviewer Session Credentials
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="detail-tile">
            <div className="detail-label">Moderator ID</div>
            <div className="detail-value" style={{ fontSize: '0.82rem' }}>{user?.id}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Role Privilege</div>
            <div className="detail-value" style={{ color: 'var(--role-admin)' }}>{user?.role}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Reviewer Email</div>
            <div className="detail-value" style={{ fontSize: '0.88rem' }}>{user?.email}</div>
          </div>
          <div className="detail-tile">
            <div className="detail-label">Queue Authority</div>
            <div className="detail-value" style={{ color: 'var(--status-success)' }}>Approve / Reject Submissions</div>
          </div>
        </div>
      </div>

      {/* Moderator Queue Placeholders */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Verification Workstream Modules (Foundation)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📥</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Pending Verification Queue</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Inspect incoming Instagram, LinkedIn, and Facebook activity links awaiting review.
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>Queue Integration Ready</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔍</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Evidence Inspection Engine</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Compare screenshots, engagement post URLs, and action types (Like, Comment, Story).
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>Verification Model Bound</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>💬</div>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Moderation Decisions & Feedback</h4>
          <p style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
            Submit APPROVED or REJECTED statuses with official reviewer feedback notes.
          </p>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>Audit Trail Ready</span>
        </div>
      </div>
    </div>
  );
}
