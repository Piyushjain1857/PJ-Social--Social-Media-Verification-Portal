import React, { useState, useEffect } from 'react';
import { fetchAllSubmissions, reviewSubmission } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ScreenshotImage from '../ScreenshotImage';

export default function SubmissionsView() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: 'APPROVE',
    feedback: '',
    error: null,
    isSubmitting: false,
  });

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllSubmissions();
      if (res.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      console.warn('Submissions load warning:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const openConfirmModal = (action) => {
    setConfirmModal({
      isOpen: true,
      action,
      feedback: action === 'APPROVE' ? 'Verified engagement matches requirements.' : '',
      error: null,
      isSubmitting: false,
    });
  };

  const closeConfirmModal = () => {
    if (confirmModal.isSubmitting) return;
    setConfirmModal({
      isOpen: false,
      action: 'APPROVE',
      feedback: '',
      error: null,
      isSubmitting: false,
    });
  };

  const handleExecuteDecision = async () => {
    if (!selectedSub || !confirmModal.isOpen) return;

    const action = confirmModal.action;
    const cleanFeedback = confirmModal.feedback.trim();

    if (action === 'REJECT' && !cleanFeedback) {
      setConfirmModal((prev) => ({
        ...prev,
        error: 'Please enter a rejection reason so the creator knows what was missing or incorrect.',
      }));
      return;
    }

    setConfirmModal((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const res = await reviewSubmission(selectedSub.id, action, cleanFeedback);
      if (res.success) {
        setActionSuccess(`Submission marked as ${action}! Creator has been notified.`);
        setTimeout(() => setActionSuccess(null), 5000);

        // Update selected sub
        setSelectedSub((prev) =>
          prev
            ? {
                ...prev,
                status: action,
                reviews: [
                  {
                    id: `rev-${Date.now()}`,
                    status: action,
                    feedback: cleanFeedback,
                    adminName: user?.name || 'Admin',
                    createdAt: new Date().toISOString(),
                  },
                  ...(prev.reviews || []),
                ],
              }
            : null
        );

        // Update local list
        setSubmissions((prevList) =>
          prevList.map((item) =>
            item.id === selectedSub.id ? { ...item, status: action } : item
          )
        );

        closeConfirmModal();
        loadSubmissions();
      } else {
        setConfirmModal((prev) => ({
          ...prev,
          error: res.message || `Failed to ${action.toLowerCase()} submission.`,
          isSubmitting: false,
        }));
      }
    } catch (err) {
      setConfirmModal((prev) => ({
        ...prev,
        error: err.message || 'Network error processing review.',
        isSubmitting: false,
      }));
    }
  };

  const isStaff = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

  const filtered = submissions.filter(sub => {
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    const matchesPlatform = platformFilter === 'ALL' || sub.platform === platformFilter;
    const matchesSearch = (sub.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (sub.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (sub.postUrl || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPlatform && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Action Success Toast */}
      {actionSuccess && (
        <div
          className="glass-panel"
          style={{
            padding: '0.85rem 1.25rem',
            borderLeft: '4px solid var(--status-success)',
            color: 'var(--status-success)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search creator, email or post URL..."
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
            <option value="ALL">All Statuses ({submissions.length})</option>
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
            <option value="ALL">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="TWITTER">X / Twitter</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadSubmissions}
          disabled={isLoading}
          style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
        >
          {isLoading ? 'Loading...' : '🔄 Refresh List'}
        </button>
      </div>

      {/* Submissions Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem' }}>Creator</th>
              <th style={{ padding: '0.75rem' }}>Platform & Action</th>
              <th style={{ padding: '0.75rem' }}>Proof / URL</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Submitted</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No submissions found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>
                      {sub.userName || sub.user?.name || 'Creator User'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {sub.userEmail || sub.user?.email || 'user@portal.com'}
                    </div>
                  </td>
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
                      Inspect 🔍
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspection Modal */}
      {selectedSub && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(6px)',
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
            style={{ maxWidth: '640px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-highlight)' }}>Submission Details</h3>
                <span className={`badge ${selectedSub.status === 'APPROVED' ? 'badge-success' : selectedSub.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                  {selectedSub.status}
                </span>
              </div>
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
              <div><strong>ID:</strong> <code>{selectedSub.id}</code></div>
              <div><strong>Creator:</strong> {selectedSub.userName || selectedSub.user?.name} ({selectedSub.userEmail || selectedSub.user?.email})</div>
              <div><strong>Platform:</strong> {selectedSub.platform} • {selectedSub.actionType}</div>
              <div><strong>Post URL:</strong> <a href={selectedSub.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>{selectedSub.postUrl}</a></div>
              {selectedSub.description && <div><strong>Description:</strong> {selectedSub.description}</div>}
              {selectedSub.screenshotUrl && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Proof Screenshot (Click to zoom):</strong>
                  <ScreenshotImage
                    screenshotUrl={selectedSub.screenshotUrl}
                    alt="Submission Proof Screenshot"
                    thumbnailStyle={{ maxHeight: '350px', width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              )}

              {/* Review History */}
              {selectedSub.reviews && selectedSub.reviews.length > 0 && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <strong>Moderator Feedback:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {selectedSub.reviews[0].feedback}
                  </div>
                </div>
              )}

              {/* Action Buttons for Staff if PENDING */}
              {isStaff && selectedSub.status === 'PENDING' && (
                <div style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                    Review Decision
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      id="btn-submissions-approve"
                      onClick={() => openConfirmModal('APPROVE')}
                      style={{
                        padding: '0.65rem 1rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      ✓ Approve Submission
                    </button>
                    <button
                      type="button"
                      id="btn-submissions-reject"
                      onClick={() => openConfirmModal('REJECT')}
                      style={{
                        padding: '0.65rem 1rem',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)',
                      }}
                    >
                      ✕ Reject Submission
                    </button>
                  </div>
                </div>
              )}

              {/* Status Locked Notice if already decided */}
              {isStaff && selectedSub.status !== 'PENDING' && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedSub.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${selectedSub.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  fontSize: '0.82rem',
                  color: selectedSub.status === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)',
                  fontWeight: 600
                }}>
                  {selectedSub.status === 'APPROVED' ? '✓' : '✕'} This submission is {selectedSub.status}. Modifications locked to prevent invalid state transitions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: '1.25rem',
          }}
          onClick={() => !confirmModal.isSubmitting && closeConfirmModal()}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
              border: confirmModal.action === 'APPROVE'
                ? '1px solid rgba(16, 185, 129, 0.4)'
                : '1px solid rgba(239, 68, 68, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  background: confirmModal.action === 'APPROVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: confirmModal.action === 'APPROVE' ? 'var(--status-success)' : 'var(--status-error)',
                  border: `1px solid ${confirmModal.action === 'APPROVE' ? 'var(--status-success)' : 'var(--status-error)'}`,
                  flexShrink: 0,
                }}
              >
                {confirmModal.action === 'APPROVE' ? '✓' : '✕'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  {confirmModal.action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {confirmModal.action === 'APPROVE'
                    ? 'Verify this submission and record your approval.'
                    : 'Reject this submission and provide required feedback.'}
                </p>
              </div>
            </div>

            {confirmModal.error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderLeft: '4px solid var(--status-error)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--status-error)',
                  fontSize: '0.84rem',
                  marginBottom: '1rem',
                }}
              >
                ⚠️ {confirmModal.error}
              </div>
            )}

            {confirmModal.action === 'APPROVE' ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.4rem' }}>
                  Approval Note (Optional):
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={confirmModal.feedback}
                  onChange={(e) => setConfirmModal((prev) => ({ ...prev, feedback: e.target.value, error: null }))}
                  placeholder="Optional remark for creator..."
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  disabled={confirmModal.isSubmitting}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.4rem' }}>
                  Rejection Reason <span style={{ color: 'var(--status-error)' }}>* (Required)</span>:
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={confirmModal.feedback}
                  onChange={(e) => setConfirmModal((prev) => ({ ...prev, feedback: e.target.value, error: null }))}
                  placeholder="Detail reason for rejection..."
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  disabled={confirmModal.isSubmitting}
                  autoFocus
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeConfirmModal}
                disabled={confirmModal.isSubmitting}
                style={{ fontSize: '0.85rem', padding: '0.55rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDecision}
                disabled={confirmModal.isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  padding: '0.55rem 1.25rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: confirmModal.isSubmitting ? 'not-allowed' : 'pointer',
                  background: confirmModal.action === 'APPROVE'
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                }}
              >
                {confirmModal.isSubmitting
                  ? (confirmModal.action === 'APPROVE' ? 'Approving…' : 'Rejecting…')
                  : (confirmModal.action === 'APPROVE' ? '✓ Confirm Approval' : '✕ Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
