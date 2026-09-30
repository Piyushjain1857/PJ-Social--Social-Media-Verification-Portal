import React, { useState, useEffect } from 'react';
import { fetchMySubmissions } from '../../services/api';

export default function MySubmissionsView({ onNavigateToNav }) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadMySubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetchMySubmissions();
      if (res.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      console.warn('My submissions load warning:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMySubmissions();
  }, []);

  const filtered = submissions.filter(
    s => statusFilter === 'ALL' || s.status === statusFilter
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-secondary ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            All Submissions ({submissions.length})
          </button>
          <button
            type="button"
            className={`btn-secondary ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            Pending ({submissions.filter(s => s.status === 'PENDING').length})
          </button>
          <button
            type="button"
            className={`btn-secondary ${statusFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('APPROVED')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            Approved ({submissions.filter(s => s.status === 'APPROVED').length})
          </button>
          <button
            type="button"
            className={`btn-secondary ${statusFilter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('REJECTED')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            Rejected ({submissions.filter(s => s.status === 'REJECTED').length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadMySubmissions}
            disabled={isLoading}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            {isLoading ? 'Loading...' : '🔄 Refresh'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigateToNav('submit-activity')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', background: 'var(--role-user)', color: '#07090e', fontWeight: 700 }}
          >
            ➕ New Activity
          </button>
        </div>
      </div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-highlight)' }}>No Submissions Found</h3>
          <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            {statusFilter === 'ALL'
              ? 'You have not submitted any activity proof yet.'
              : `No submissions matching status "${statusFilter}".`}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigateToNav('submit-activity')}
            style={{ background: 'var(--role-user)', color: '#07090e', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Submit Activity Proof Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((sub) => (
            <div key={sub.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>
                    {sub.platform === 'INSTAGRAM' ? '📸' : sub.platform === 'LINKEDIN' ? '💼' : sub.platform === 'FACEBOOK' ? '👥' : '🌐'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-highlight)' }}>
                      {sub.platform} • {sub.actionType}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Submitted on {new Date(sub.createdAt).toLocaleDateString()} at {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div>
                  {sub.status === 'APPROVED' && <span className="badge badge-success">✓ APPROVED & VERIFIED</span>}
                  {sub.status === 'REJECTED' && <span className="badge badge-error">✕ REJECTED</span>}
                  {sub.status === 'PENDING' && <span className="badge badge-warning">⏳ AWAITING ADMIN REVIEW</span>}
                </div>
              </div>

              {sub.description && (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  {sub.description}
                </div>
              )}

              {/* Screenshot Evidence Display */}
              {sub.screenshotUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#000', border: '1px solid var(--border-subtle)' }}>
                    <img src={sub.screenshotUrl} alt="Evidence thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                      Attached Proof Evidence
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Submitted for moderator review
                    </div>
                  </div>
                  <a
                    href={sub.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    🔍 View Full
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <div>
                  <strong>Post URL: </strong>
                  <a href={sub.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>
                    {sub.postUrl}
                  </a>
                </div>
              </div>

              {/* Moderator Feedback */}
              {sub.reviews && sub.reviews.length > 0 && (
                <div style={{ background: sub.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)', border: `1px solid ${sub.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`, padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: sub.status === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)', marginBottom: '0.25rem' }}>
                    Admin Reviewer Feedback ({sub.reviews[0].adminName}):
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {sub.reviews[0].feedback}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
