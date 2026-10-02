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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-highlight)' }}>
            📊 My Verification Submissions
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Track the live review progress, reviewer feedback, and historical verifications of your submitted evidence.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-refresh-pill"
            onClick={loadSubmissions}
            disabled={isLoading}
          >
            <svg
              className={`refresh-icon-svg ${isLoading ? 'spinning' : ''}`}
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>{isLoading ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>
          {onNavigateToNav && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigateToNav('submit-activity')}
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', background: 'var(--role-user)', color: '#07090e', fontWeight: 700 }}
            >
              ➕ New Activity
            </button>
          )}
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
              {submissions.map((sub) => (
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
                      View Details 🔍
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Detail Inspection Modal Drawer */}
      {selectedSub && (
        <div className="modal-backdrop" onClick={() => setSelectedSub(null)}>
          <div
            className="modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                🔍 Submission Details
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
              {/* Submission Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform</span>
                  <div style={{ fontWeight: 600 }}>{selectedSub.platform}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Type</span>
                  <div style={{ fontWeight: 600 }}>{selectedSub.actionType}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submission ID</span>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{selectedSub.id}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span>
                  <div>
                    {selectedSub.status === 'APPROVED' && <span className="badge badge-success">✓ APPROVED</span>}
                    {selectedSub.status === 'REJECTED' && <span className="badge badge-error">✕ REJECTED</span>}
                    {selectedSub.status === 'PENDING' && <span className="badge badge-warning">⏳ PENDING</span>}
                  </div>
                </div>
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
                  Your Screenshot Evidence
                </span>
                <ScreenshotImage
                  screenshotUrl={selectedSub.screenshotUrl}
                  alt="Submission Proof Screenshot"
                  style={{ maxHeight: '280px', borderRadius: '8px', border: '1px solid var(--border-subtle)', width: '100%', objectFit: 'contain', background: '#000' }}
                />
              </div>

              {/* Description */}
              {selectedSub.description && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Your Description / Notes</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    {selectedSub.description}
                  </p>
                </div>
              )}

              {/* Reviewer Feedback & Logs */}
              {selectedSub.reviews && selectedSub.reviews.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Moderation Feedback & History
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSub.reviews.map((rev, i) => (
                      <div key={rev.id || i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ color: 'var(--text-highlight)' }}>
                            Reviewed by {rev.adminName || rev.admin?.name || 'Moderator'}
                          </strong>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(rev.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ color: rev.status === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)', fontWeight: 600 }}>
                          Verdict: {rev.status}
                        </div>
                        {rev.feedback && (
                          <div style={{ marginTop: '0.35rem', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                            "{rev.feedback}"
                          </div>
                        )}
                      </div>
                    ))}
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
