import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllSubmissions, reviewSubmission, fetchUsers } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ScreenshotImage from '../ScreenshotImage';
import FilterBar from '../common/FilterBar';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';

export default function SubmissionsView() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [actionTypeFilter, setActionTypeFilter] = useState('ALL');
  const [reviewerFilter, setReviewerFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [reviewersList, setReviewersList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Submission Detail Modal
  const [selectedSub, setSelectedSub] = useState(null);

  // Load Reviewers and Creators for filter dropdowns
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const res = await fetchUsers({ limit: 100 });
        if (res && res.success && res.data) {
          const staff = res.data.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
          const creators = res.data.filter(u => u.role === 'USER');
          setReviewersList(staff);
          setUsersList(creators);
        }
      } catch (e) {
        console.warn('Could not load user/reviewer options for filter:', e.message);
      }
    };
    loadFilterOptions();
  }, []);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: 'APPROVE',
    feedback: '',
    error: null,
    isSubmitting: false,
  });

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllSubmissions({
        page,
        limit,
        search,
        status: statusFilter,
        platform: platformFilter,
        actionType: actionTypeFilter,
        reviewerId: reviewerFilter !== 'ALL' ? reviewerFilter : undefined,
        userId: userFilter !== 'ALL' ? userFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder
      });

      if (res && res.success) {
        setSubmissions(res.data || []);
        if (res.pagination) {
          setTotalCount(res.pagination.totalCount || 0);
          setTotalPages(res.pagination.totalPages || 1);
        } else {
          setTotalCount((res.data || []).length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.warn('Submissions load warning:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter, platformFilter, actionTypeFilter, reviewerFilter, userFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Handle Search Input Change (Debounced reset page to 1)
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPlatformFilter('ALL');
    setActionTypeFilter('ALL');
    setReviewerFilter('ALL');
    setUserFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'ALL' ||
    platformFilter !== 'ALL' ||
    actionTypeFilter !== 'ALL' ||
    reviewerFilter !== 'ALL' ||
    userFilter !== 'ALL' ||
    startDate ||
    endDate ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc'
  );

  // Dismiss modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmModal.isOpen && !confirmModal.isSubmitting) {
          closeConfirmModal();
        } else if (selectedSub) {
          setSelectedSub(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal.isOpen, confirmModal.isSubmitting, selectedSub]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header Overview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-highlight)' }}>
            📁 Platform Submissions Directory
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Inspect, filter, and audit creator submissions across all connected institutional social channels.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadSubmissions}
          disabled={isLoading}
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
        >
          {isLoading ? 'Loading...' : '🔄 Refresh List'}
        </button>
      </div>

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

      {/* Reusable Search & Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search creator, email, post URL, or description..."
        totalCount={totalCount}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: (v) => { setStatusFilter(v); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'PENDING', label: '⏳ Pending Review' },
              { value: 'APPROVED', label: '✓ Approved' },
              { value: 'REJECTED', label: '✕ Rejected' }
            ]
          },
          {
            id: 'platform',
            label: 'Platform',
            value: platformFilter,
            onChange: (v) => { setPlatformFilter(v); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Platforms' },
              { value: 'INSTAGRAM', label: 'Instagram' },
              { value: 'LINKEDIN', label: 'LinkedIn' },
              { value: 'FACEBOOK', label: 'Facebook' }
            ]
          },
          {
            id: 'actionType',
            label: 'Action Type',
            value: actionTypeFilter,
            onChange: (v) => { setActionTypeFilter(v); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Actions' },
              { value: 'LIKE', label: 'Like' },
              { value: 'COMMENT', label: 'Comment' },
              { value: 'STORY', label: 'Story' }
            ]
          },
          {
            id: 'reviewer',
            label: 'Reviewer',
            value: reviewerFilter,
            onChange: (v) => { setReviewerFilter(v); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Reviewers' },
              ...reviewersList.map(r => ({ value: r.id, label: `${r.name} (${r.role === 'SUPER_ADMIN' ? '👑' : '🛡️'})` }))
            ]
          },
          {
            id: 'user',
            label: 'Creator',
            value: userFilter,
            onChange: (v) => { setUserFilter(v); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Creators' },
              ...usersList.map(u => ({ value: u.id, label: u.name }))
            ]
          }
        ]}
        dateRange={{
          startDate,
          endDate,
          onStartDateChange: (d) => { setStartDate(d); setPage(1); },
          onEndDateChange: (d) => { setEndDate(d); setPage(1); }
        }}
        sortOptions={[
          { value: 'createdAt', label: 'Submission Date' },
          { value: 'status', label: 'Status' },
          { value: 'platform', label: 'Platform' },
          { value: 'actionType', label: 'Action Type' }
        ]}
        sortBy={sortBy}
        onSortByChange={(s) => { setSortBy(s); setPage(1); }}
        sortOrder={sortOrder}
        onToggleSortOrder={() => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); setPage(1); }}
      />

      {/* Submissions Table & Data View */}
      {isLoading ? (
        <LoadingSkeleton rows={5} height="52px" />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon="📂"
          title="No submissions found"
          description="There are no activity submissions matching your active search and filter combinations."
          onClearFilters={hasActiveFilters ? handleClearFilters : null}
          clearLabel="Clear filters and reset search"
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="portal-table" style={{ minWidth: '780px' }}>
            <thead>
              <tr>
                <th>Creator</th>
                <th>Platform & Action</th>
                <th>Proof / URL</th>
                <th>Status</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
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
                      style={{
                        color: 'var(--accent-cyan)',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                        display: 'block',
                        maxWidth: '240px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Component */}
      {!isLoading && totalCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          limitOptions={[10, 20, 50]}
        />
      )}

      {/* Detail / Inspection Modal Drawer */}
      {selectedSub && (
        <div className="modal-backdrop" onClick={() => !confirmModal.isOpen && setSelectedSub(null)}>
          <div
            className="modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                🔍 Submission Inspection Dossier
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Creator info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Creator Name</span>
                  <div style={{ fontWeight: 600 }}>{selectedSub.userName || selectedSub.user?.name || 'Creator User'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Creator Email</span>
                  <div>{selectedSub.userEmail || selectedSub.user?.email || 'user@portal.com'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform</span>
                  <div style={{ fontWeight: 600 }}>{selectedSub.platform}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action</span>
                  <div style={{ fontWeight: 600 }}>{selectedSub.actionType}</div>
                </div>
              </div>

              {/* Status */}
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: </span>
                {selectedSub.status === 'APPROVED' && <span className="badge badge-success">✓ APPROVED</span>}
                {selectedSub.status === 'REJECTED' && <span className="badge badge-error">✕ REJECTED</span>}
                {selectedSub.status === 'PENDING' && <span className="badge badge-warning">⏳ PENDING</span>}
              </div>

              {/* URL */}
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Post URL</span>
                <div style={{ marginTop: '0.2rem' }}>
                  <a
                    href={selectedSub.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-cyan)', fontSize: '0.88rem', wordBreak: 'break-all' }}
                  >
                    🔗 {selectedSub.postUrl}
                  </a>
                </div>
              </div>

              {/* Screenshot */}
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Uploaded Screenshot Evidence
                </span>
                <ScreenshotImage
                  src={selectedSub.screenshotUrl}
                  alt="Submission Proof Screenshot"
                  style={{ maxHeight: '280px', borderRadius: '8px', border: '1px solid var(--border-subtle)', width: '100%', objectFit: 'contain', background: '#000' }}
                />
              </div>

              {/* Description */}
              {selectedSub.description && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Creator Notes</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    {selectedSub.description}
                  </p>
                </div>
              )}

              {/* Reviews History */}
              {selectedSub.reviews && selectedSub.reviews.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Review History
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSub.reviews.map((rev, i) => (
                      <div key={rev.id || i} style={{ padding: '0.65rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <strong>{rev.adminName || rev.admin?.name || 'Moderator'}</strong>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(rev.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ color: rev.status === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)' }}>
                          Status: {rev.status}
                        </div>
                        {rev.feedback && <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>"{rev.feedback}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              {isStaff && selectedSub.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => openConfirmModal('REJECT')}
                    style={{ padding: '0.5rem 1.25rem' }}
                  >
                    ✕ Reject
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openConfirmModal('APPROVE')}
                    style={{ padding: '0.5rem 1.25rem' }}
                  >
                    ✓ Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Decision Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="modal-backdrop" onClick={closeConfirmModal}>
          <div
            className="modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', width: '100%' }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: confirmModal.action === 'APPROVE' ? 'var(--status-success)' : 'var(--status-error)' }}>
              {confirmModal.action === 'APPROVE' ? '✓ Confirm Evidence Approval' : '✕ Confirm Evidence Rejection'}
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {confirmModal.action === 'APPROVE'
                ? 'Are you sure you want to approve this activity? The creator will be credited and receive an in-app notification.'
                : 'Please specify the exact reason for rejecting this evidence so the creator can correct their submission.'}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                {confirmModal.action === 'APPROVE' ? 'Reviewer Feedback (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={confirmModal.feedback}
                onChange={(e) => setConfirmModal(prev => ({ ...prev, feedback: e.target.value, error: null }))}
                placeholder={confirmModal.action === 'APPROVE' ? 'E.g., Verified engagement matches campaign guidelines.' : 'E.g., Screenshot timestamp does not match post date.'}
                style={{ width: '100%', resize: 'vertical' }}
              />
              {confirmModal.error && (
                <div style={{ color: 'var(--status-error)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                  ⚠️ {confirmModal.error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeConfirmModal}
                disabled={confirmModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmModal.action === 'APPROVE' ? 'btn-primary' : 'btn-danger'}
                onClick={handleExecuteDecision}
                disabled={confirmModal.isSubmitting}
              >
                {confirmModal.isSubmitting ? 'Processing...' : `Confirm ${confirmModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
