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
  const [limit, setLimit] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Submission Detail Modal
  const [selectedSub, setSelectedSub] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

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
                      style={{
                        padding: '0.42rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        color: '#c7d2fe',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>🔍</span>
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Component - Options configured for 9 or 12 items */}
      {!isLoading && totalCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          limitOptions={[9, 12, 18, 24]}
        />
      )}

      {/* Detail / Inspection Modal Drawer */}
      {selectedSub && (
        <div
          className="portal-modal-backdrop"
          onClick={() => !confirmModal.isOpen && setSelectedSub(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Submission Inspection Dossier"
        >
          <div
            className="portal-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              width: '100%',
              background: 'linear-gradient(165deg, rgba(22, 27, 44, 0.98), rgba(13, 17, 28, 0.99))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(99, 102, 241, 0.15)',
              borderRadius: '18px',
              padding: '1.75rem',
              backdropFilter: 'blur(20px)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(14, 165, 233, 0.15))',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                }}>
                  🔍
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                    Submission Inspection Dossier
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Comprehensive evidence verification and audit record
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setSelectedSub(null)}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Creator & Verification Meta Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    👤 Creator
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.95rem', marginTop: '2px' }}>
                    {selectedSub.userName || selectedSub.user?.name || 'Creator User'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {selectedSub.userEmail || selectedSub.user?.email || 'user@portal.com'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    📱 Platform &amp; Action
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.95rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{selectedSub.platform === 'INSTAGRAM' ? '📸' : selectedSub.platform === 'TWITTER' ? '🐦' : selectedSub.platform === 'LINKEDIN' ? '💼' : selectedSub.platform === 'FACEBOOK' ? '👥' : '🌐'}</span>
                    <span>{selectedSub.platform}</span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{selectedSub.actionType}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                    +{selectedSub.actionType === 'LIKE' ? '1' : '2'} XP on Approval
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    📅 Date Submitted
                  </span>
                  <div style={{ fontWeight: 600, color: 'var(--text-highlight)', fontSize: '0.88rem', marginTop: '2px' }}>
                    {new Date(selectedSub.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    ⚡ Verification Status
                  </span>
                  <div style={{ marginTop: '3px' }}>
                    {selectedSub.status === 'APPROVED' && <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>✓ APPROVED</span>}
                    {selectedSub.status === 'REJECTED' && <span className="badge badge-error" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>✕ REJECTED</span>}
                    {selectedSub.status === 'PENDING' && <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>⏳ PENDING</span>}
                  </div>
                </div>
              </div>

              {/* URL Box with 1-click Copy */}
              <div style={{
                padding: '0.85rem 1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    🔗 Target Post URL
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(selectedSub.postUrl)}
                      style={{
                        background: copiedUrl ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${copiedUrl ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: copiedUrl ? '#10b981' : 'var(--text-secondary)',
                        borderRadius: '6px',
                        padding: '0.15rem 0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedUrl ? '✓ Copied' : '📋 Copy Link'}
                    </button>
                    <a
                      href={selectedSub.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#a5b4fc',
                        borderRadius: '6px',
                        padding: '0.15rem 0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>Open Post ↗</span>
                    </a>
                  </div>
                </div>
                <div style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.78rem',
                  color: 'var(--accent-cyan)',
                  wordBreak: 'break-all',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}>
                  {selectedSub.postUrl}
                </div>
              </div>

              {/* Uploaded Screenshot Proof */}
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.45rem' }}>
                  📸 Uploaded Screenshot Evidence
                </span>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  padding: '0.5rem',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <ScreenshotImage
                    src={selectedSub.screenshotUrl}
                    alt="Submission Proof Screenshot"
                    style={{
                      maxHeight: '320px',
                      borderRadius: '8px',
                      width: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* Creator Description Notes */}
              {selectedSub.description && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px'
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    📝 Creator Notes
                  </span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    "{selectedSub.description}"
                  </p>
                </div>
              )}

              {/* Reviews History */}
              {selectedSub.reviews && selectedSub.reviews.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.45rem' }}>
                    ⚖️ Review Audit History ({selectedSub.reviews.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSub.reviews.map((rev, i) => (
                      <div
                        key={rev.id || i}
                        style={{
                          padding: '0.75rem 0.9rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '8px',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>
                            🛡️ {rev.adminName || rev.admin?.name || 'Moderator'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                            {new Date(rev.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`badge ${rev.status === 'APPROVED' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                            {rev.status}
                          </span>
                          {rev.feedback && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                              "{rev.feedback}"
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '0.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.07)'
              }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedSub(null)}
                  style={{
                    padding: '0.6rem 1.15rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '10px'
                  }}
                >
                  Close Dossier
                </button>

                {isStaff && selectedSub.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => openConfirmModal('REJECT')}
                      style={{
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      ✕ Reject Submission
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => openConfirmModal('APPROVE')}
                      style={{
                        padding: '0.6rem 1.35rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                        background: 'linear-gradient(135deg, #10b981, #059669)'
                      }}
                    >
                      ✓ Approve Submission
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Decision Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={closeConfirmModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="portal-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'linear-gradient(165deg, rgba(22, 27, 44, 0.98), rgba(13, 17, 28, 0.99))',
              border: confirmModal.action === 'APPROVE'
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.75)',
              borderRadius: '18px',
              padding: '1.75rem',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: confirmModal.action === 'APPROVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                border: `1px solid ${confirmModal.action === 'APPROVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {confirmModal.action === 'APPROVE' ? '✓' : '✕'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: confirmModal.action === 'APPROVE' ? '#34d399' : '#f87171' }}>
                  {confirmModal.action === 'APPROVE' ? 'Confirm Evidence Approval' : 'Confirm Evidence Rejection'}
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  This decision will finalize the audit status.
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
              {confirmModal.action === 'APPROVE'
                ? 'Are you sure you want to approve this activity? The creator will immediately be awarded XP and receive an in-app verification notification.'
                : 'Please specify the exact reason for rejecting this evidence so the creator can understand why their submission was declined.'}
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                {confirmModal.action === 'APPROVE' ? 'Reviewer Feedback (Optional)' : 'Rejection Reason (Required) *'}
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={confirmModal.feedback}
                onChange={(e) => setConfirmModal(prev => ({ ...prev, feedback: e.target.value, error: null }))}
                placeholder={confirmModal.action === 'APPROVE' ? 'E.g., Verified engagement matches campaign guidelines.' : 'E.g., Screenshot timestamp does not match post date.'}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.86rem',
                  color: 'var(--text-highlight)'
                }}
              />
              {confirmModal.error && (
                <div style={{ color: 'var(--status-error)', fontSize: '0.8rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>⚠️</span> {confirmModal.error}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.07)'
            }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeConfirmModal}
                disabled={confirmModal.isSubmitting}
                style={{
                  padding: '0.6rem 1.15rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '10px'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmModal.action === 'APPROVE' ? 'btn-primary' : 'btn-danger'}
                onClick={handleExecuteDecision}
                disabled={confirmModal.isSubmitting}
                style={{
                  padding: '0.6rem 1.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  background: confirmModal.action === 'APPROVE'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : undefined,
                  boxShadow: confirmModal.action === 'APPROVE'
                    ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                    : '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
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
