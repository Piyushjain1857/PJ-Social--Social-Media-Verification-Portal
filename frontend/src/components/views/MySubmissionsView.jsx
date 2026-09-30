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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search URL or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: '220px', padding: '0.55rem 0.85rem' }}
          />

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.55rem 0.85rem', width: 'auto' }}
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
            style={{ padding: '0.55rem 0.85rem', width: 'auto' }}
          >
            <option value="">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="TWITTER">X / Twitter</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem' }}>Platform & Action</th>
              <th style={{ padding: '0.75rem' }}>Proof / URL</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Submitted</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={() => setSelectedSub(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-highlight)' }}>My Submission Details</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedSub(null)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Status:</strong> {
                selectedSub.status === 'APPROVED' ? <span className="badge badge-success">APPROVED</span> :
                selectedSub.status === 'REJECTED' ? <span className="badge badge-error">REJECTED</span> :
                <span className="badge badge-warning">PENDING</span>
              }</div>
              <div><strong>ID:</strong> <code>{selectedSub.id}</code></div>
              <div><strong>Submitted:</strong> {new Date(selectedSub.createdAt).toLocaleString()}</div>
              {selectedSub.updatedAt !== selectedSub.createdAt && (
                 <div><strong>Reviewed On:</strong> {new Date(selectedSub.updatedAt).toLocaleString()}</div>
              )}
              <div><strong>Platform:</strong> {selectedSub.platform} • {selectedSub.actionType}</div>
              <div><strong>Post URL:</strong> <a href={selectedSub.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>{selectedSub.postUrl}</a></div>
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
          </div>
        </div>
      )}
    </div>
  );
}
