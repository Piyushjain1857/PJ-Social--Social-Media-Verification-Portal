import React, { useState, useEffect } from 'react';
import { fetchMySubmissions, getScreenshotUrl } from '../../services/api';
import ScreenshotImage from '../ScreenshotImage';

export default function MySubmissionsView({ onNavigateToNav }) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });

  const loadSubmissions = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchMySubmissions({
        page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter,
        platform: platformFilter
      });
      if (res.success) {
        setSubmissions(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('My Submissions load warning:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, platformFilter, searchTerm]);

  // Dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedSub) {
        setSelectedSub(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSub]);

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      loadSubmissions(pagination.page + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      loadSubmissions(pagination.page - 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search URL or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: '1 1 min(100%, 220px)', minWidth: '180px', padding: '0.55rem 0.85rem' }}
          />

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ flex: '1 1 min(100%, 140px)', padding: '0.55rem 0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            className="input-field"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            style={{ flex: '1 1 min(100%, 140px)', padding: '0.55rem 0.85rem' }}
          >
            <option value="">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="TWITTER">X / Twitter</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadSubmissions(pagination.page)}
            disabled={isLoading}
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            {isLoading ? 'Loading...' : '🔄 Refresh'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigateToNav('submit-activity')}
            style={{ fontSize: '0.82rem', padding: '0.55rem 1rem', background: 'var(--role-user)', color: '#07090e', fontWeight: 700 }}
          >
            ➕ New Activity
          </button>
        </div>
      </div>

      {/* Submissions Table / Cards for Mobile Responsive */}
      <div className="table-responsive-wrapper">
        <table className="portal-table" style={{ minWidth: '680px' }}>
          <thead>
            <tr>
              <th>Platform & Action</th>
              <th>Proof / URL</th>
              <th>Status</th>
              <th>Submitted</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No submissions found matching criteria.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ fontWeight: 600 }}>{sub.platform}</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{sub.actionType}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <a
                      href={sub.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', textDecoration: 'none', display: 'block', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      🔗 {sub.postUrl}
                    </a>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {sub.status === 'APPROVED' && <span className="badge badge-success">✓ APPROVED</span>}
                    {sub.status === 'REJECTED' && <span className="badge badge-error">✕ REJECTED</span>}
                    {sub.status === 'PENDING' && <span className="badge badge-warning">⏳ PENDING</span>}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedSub(sub)}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      View Details 🔍
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing Page {pagination.page} of {pagination.totalPages} (Total: {pagination.totalCount})
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                disabled={pagination.page <= 1}
                onClick={handlePrevPage}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                ← Prev
              </button>
              <button
                className="btn-secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={handleNextPage}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspection Modal */}
      {selectedSub && (
        <div
          className="portal-modal-backdrop"
          onClick={() => setSelectedSub(null)}
          role="dialog"
          aria-modal="true"
          aria-label="My Submission Details"
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '620px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div className="portal-modal-title-group">
                <h3>My Submission Details</h3>
                <p>Activity verification dossier and review history</p>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setSelectedSub(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="portal-modal-body" style={{ fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div><strong>Status:</strong> {
                  selectedSub.status === 'APPROVED' ? <span className="badge badge-success">APPROVED</span> :
                  selectedSub.status === 'REJECTED' ? <span className="badge badge-error">REJECTED</span> :
                  <span className="badge badge-warning">PENDING</span>
                }</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: <code>{selectedSub.id}</code></div>
              </div>

              <div><strong>Submitted:</strong> {new Date(selectedSub.createdAt).toLocaleString()}</div>
              {selectedSub.updatedAt !== selectedSub.createdAt && (
                 <div><strong>Reviewed On:</strong> {new Date(selectedSub.updatedAt).toLocaleString()}</div>
              )}
              <div><strong>Platform:</strong> {selectedSub.platform} • {selectedSub.actionType}</div>
              <div><strong>Post URL:</strong> <a href={selectedSub.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>{selectedSub.postUrl}</a></div>
              {selectedSub.description && <div><strong>Description:</strong> {selectedSub.description}</div>}
              {selectedSub.screenshotUrl && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Proof Screenshot (Click to zoom):</strong>
                  <ScreenshotImage
                    screenshotUrl={selectedSub.screenshotUrl}
                    alt="Submission Proof Screenshot"
                    thumbnailStyle={{ maxHeight: '350px', width: '100%', background: 'rgba(0,0,0,0.4)' }}
                  />
                </div>
              )}
              
              {selectedSub.reviews && selectedSub.reviews.length > 0 && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginTop: '0.5rem' }}>
                  <strong>{selectedSub.status === 'REJECTED' ? 'Rejection Reason / Feedback:' : 'Moderator Feedback:'}</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {selectedSub.reviews[0].feedback || "No feedback provided."}
                  </div>
                </div>
              )}
            </div>

            <div className="portal-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedSub(null)}
                style={{ minWidth: '100px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
