import React, { useState, useEffect, useCallback } from 'react';
import { fetchMySubmissions } from '../../services/api';
import ScreenshotImage from '../ScreenshotImage';
import FilterBar from '../common/FilterBar';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';

export default function MySubmissionsView({ onNavigateToNav }) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [actionTypeFilter, setActionTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal inspection
  const [selectedSub, setSelectedSub] = useState(null);

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchMySubmissions({
        page,
        limit,
        search: searchTerm,
        status: statusFilter,
        platform: platformFilter,
        actionType: actionTypeFilter,
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
      console.warn('My Submissions load warning:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, platformFilter, actionTypeFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPlatformFilter('ALL');
    setActionTypeFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    statusFilter !== 'ALL' ||
    platformFilter !== 'ALL' ||
    actionTypeFilter !== 'ALL' ||
    startDate ||
    endDate ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc'
  );

  const pendingCount = submissions.filter(s => s.status === 'PENDING').length;
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : (submissions.length > 0 ? Math.round((approvedCount / submissions.length) * 100) : 100);

  const renderPlatformIcon = (platform) => {
    const p = (platform || '').toUpperCase();
    if (p === 'INSTAGRAM') {
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#e1306c' }}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      );
    }
    if (p === 'LINKEDIN') {
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0a66c2' }}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
          <rect x="2" y="9" width="4" height="12"></rect>
          <circle cx="4" cy="4" r="2"></circle>
        </svg>
      );
    }
    if (p === 'FACEBOOK') {
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1877f2' }}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
      );
    }
    return <span>🌐</span>;
  };

  const renderActionPill = (actionType) => {
    const a = (actionType || '').toUpperCase();
    const cls = a.toLowerCase();
    let label = a;
    let icon = '⚡';
    if (a === 'LIKE') {
      icon = '❤️';
      label = 'Like';
    } else if (a === 'COMMENT') {
      icon = '💬';
      label = 'Comment';
    } else if (a === 'STORY') {
      icon = '📱';
      label = 'Story';
    }
    return (
      <span className={`my-subs-action-pill ${cls}`}>
        {icon} {label}
      </span>
    );
  };

  const renderStatusPill = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') {
      return (
        <div className="my-subs-status-cell">
          <span className="my-subs-status-pill approved">
            ✓ APPROVED
          </span>
          <span className="my-subs-status-sub">Validated & Credited</span>
        </div>
      );
    }
    if (s === 'REJECTED') {
      return (
        <div className="my-subs-status-cell">
          <span className="my-subs-status-pill rejected">
            ✕ REJECTED
          </span>
          <span className="my-subs-status-sub">Feedback recorded</span>
        </div>
      );
    }
    return (
      <div className="my-subs-status-cell">
        <span className="my-subs-status-pill pending">
          ⏳ PENDING
        </span>
        <span className="my-subs-status-sub">In review queue</span>
      </div>
    );
  };

  return (
    <div className="my-submissions-container">
      {/* Quick KPI Stats Strip */}
      <div className="my-subs-kpi-grid">
        <div className="my-subs-kpi-card">
          <div className="my-subs-kpi-icon-box total">
            📤
          </div>
          <div className="my-subs-kpi-info">
            <span className="my-subs-kpi-label">Total Submitted</span>
            <span className="my-subs-kpi-value">{totalCount}</span>
            <span className="my-subs-kpi-subtext">Verification requests</span>
          </div>
        </div>

        <div className="my-subs-kpi-card">
          <div className="my-subs-kpi-icon-box pending">
            ⏳
          </div>
          <div className="my-subs-kpi-info">
            <span className="my-subs-kpi-label">In Review Queue</span>
            <span className="my-subs-kpi-value">{pendingCount}</span>
            <span className="my-subs-kpi-subtext">Awaiting admin verdict</span>
          </div>
        </div>

        <div className="my-subs-kpi-card">
          <div className="my-subs-kpi-icon-box approved">
            ✓
          </div>
          <div className="my-subs-kpi-info">
            <span className="my-subs-kpi-label">Verified & Approved</span>
            <span className="my-subs-kpi-value">{approvedCount}</span>
            <span className="my-subs-kpi-subtext">Points & XP awarded</span>
          </div>
        </div>

        <div className="my-subs-kpi-card">
          <div className="my-subs-kpi-icon-box rate">
            💎
          </div>
          <div className="my-subs-kpi-info">
            <span className="my-subs-kpi-label">Approval Rate</span>
            <span className="my-subs-kpi-value">{approvalRate}%</span>
            <span className="my-subs-kpi-subtext">Validation track record</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        search={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
        searchPlaceholder="Search post URL, description..."
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
              { value: 'PENDING', label: '⏳ Pending' },
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
          { value: 'platform', label: 'Platform' }
        ]}
        sortBy={sortBy}
        onSortByChange={(s) => { setSortBy(s); setPage(1); }}
        sortOrder={sortOrder}
        onToggleSortOrder={() => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); setPage(1); }}
      />

      {/* Submissions List / Table */}
      {isLoading ? (
        <LoadingSkeleton rows={4} height="52px" />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon="📤"
          title="No submissions found"
          description={
            hasActiveFilters
              ? 'No submissions match your active filter settings. Try resetting filters to see your complete history.'
              : "You haven't submitted any social media activity for verification yet."
          }
          onClearFilters={hasActiveFilters ? handleClearFilters : null}
          clearLabel="Reset filters"
        >
          {!hasActiveFilters && onNavigateToNav && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigateToNav('submit-activity')}
              style={{ marginTop: '0.75rem', background: 'var(--role-user)', color: '#07090e', fontWeight: 700 }}
            >
              Submit Your First Activity
            </button>
          )}
        </EmptyState>
      ) : (
        <div className="my-subs-table-card">
          <div className="table-responsive-wrapper" style={{ margin: 0 }}>
            <table className="my-subs-table" style={{ minWidth: '720px' }}>
              <thead>
                <tr>
                  <th>Platform & Action</th>
                  <th>Proof & Target</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const platformClass = (sub.platform || '').toLowerCase();
                  return (
                    <tr key={sub.id}>
                      {/* Platform & Action */}
                      <td>
                        <div className="my-subs-platform-cell">
                          <div className={`my-subs-platform-icon-box ${platformClass}`}>
                            {renderPlatformIcon(sub.platform)}
                          </div>
                          <div className="my-subs-platform-details">
                            <div className="my-subs-platform-name-row">
                              <span className="my-subs-platform-title">{sub.platform}</span>
                              {renderActionPill(sub.actionType)}
                            </div>
                            <span className="my-subs-id-chip">
                              #{sub.id ? sub.id.slice(0, 8) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Proof & Target */}
                      <td>
                        <div className="my-subs-proof-cell">
                          <div
                            className="my-subs-proof-thumb"
                            title="Click to inspect evidence"
                            onClick={() => setSelectedSub(sub)}
                          >
                            {sub.screenshotUrl ? (
                              <ScreenshotImage
                                screenshotUrl={sub.screenshotUrl}
                                alt="Proof thumbnail"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: '1.2rem', opacity: 0.6 }}>📷</span>
                            )}
                          </div>
                          <div className="my-subs-proof-info">
                            {sub.socialAccount?.handle && (
                              <span className="my-subs-channel-tag">
                                <span>🎯</span> @{sub.socialAccount.handle}
                              </span>
                            )}
                            <a
                              href={sub.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="my-subs-url-link"
                              title={sub.postUrl}
                            >
                              <span>🔗</span>
                              <span>{sub.postUrl}</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {renderStatusPill(sub.status)}
                      </td>

                      {/* Submitted Date */}
                      <td>
                        <div className="my-subs-date-cell">
                          <span className="my-subs-date-primary">
                            {new Date(sub.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="my-subs-date-time">
                            {new Date(sub.createdAt).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="my-subs-inspect-btn"
                          onClick={() => setSelectedSub(sub)}
                        >
                          <span>🔍</span>
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          limitOptions={[10, 20, 50]}
        />
      )}

      {/* Detail Inspection Modal Dossier */}
      {selectedSub && (
        <div className="modal-backdrop" onClick={() => setSelectedSub(null)}>
          <div
            className="my-subs-modal-dossier"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
                    Verification Evidence Dossier
                  </h3>
                  {renderActionPill(selectedSub.actionType)}
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Record ID: {selectedSub.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Submission Overview Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Platform</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem', color: 'var(--text-highlight)' }}>{selectedSub.platform}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Action Executed</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem', color: 'var(--text-highlight)' }}>{selectedSub.actionType}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Verification Status</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {selectedSub.status === 'APPROVED' && <span className="my-subs-status-pill approved">✓ APPROVED</span>}
                    {selectedSub.status === 'REJECTED' && <span className="my-subs-status-pill rejected">✕ REJECTED</span>}
                    {selectedSub.status === 'PENDING' && <span className="my-subs-status-pill pending">⏳ PENDING</span>}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Logged At</span>
                  <div style={{ fontSize: '0.82rem', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
                    {new Date(selectedSub.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Target Post URL */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                  Target Content Link
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a
                    href={selectedSub.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', fontSize: '0.85rem', wordBreak: 'break-all', textDecoration: 'none' }}
                  >
                    🔗 {selectedSub.postUrl}
                  </a>
                  <a
                    href={selectedSub.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    Visit Post ↗
                  </a>
                </div>
              </div>

              {/* Screenshot Proof Canvas */}
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
                  Proof Screenshot Evidence
                </span>
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#05070a', textAlign: 'center', padding: '0.5rem' }}>
                  <ScreenshotImage
                    screenshotUrl={selectedSub.screenshotUrl}
                    alt="Submission Proof Screenshot"
                    style={{ maxHeight: '340px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              </div>

              {/* Description / Notes if available */}
              {selectedSub.description && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    Creator Description / Notes
                  </span>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {selectedSub.description}
                  </p>
                </div>
              )}

              {/* Review History & Admin Feedback */}
              {selectedSub.reviews && selectedSub.reviews.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                    Moderation Verdict & History
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {selectedSub.reviews.map((rev, i) => (
                      <div
                        key={rev.id || i}
                        style={{
                          padding: '0.85rem 1rem',
                          background: rev.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                          border: `1px solid ${rev.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          borderRadius: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.84rem' }}>
                            🛡️ Reviewed by {rev.adminName || rev.admin?.name || 'Portal Moderator'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(rev.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ color: rev.status === 'APPROVED' ? '#34d399' : '#f87171', fontWeight: 700, fontSize: '0.82rem' }}>
                          Verdict: {rev.status}
                        </div>
                        {rev.feedback && (
                          <div style={{ marginTop: '0.4rem', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.25)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.82rem', fontStyle: 'italic' }}>
                            "{rev.feedback}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedSub(null)}
                  style={{ padding: '0.5rem 1.4rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
