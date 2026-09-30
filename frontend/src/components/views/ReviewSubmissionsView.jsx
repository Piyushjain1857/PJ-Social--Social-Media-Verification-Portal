import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchPendingReviews,
  fetchReviewSubmissionDetails,
  reviewSubmission,
} from '../../services/api';
import ScreenshotImage from '../ScreenshotImage';

const PLATFORM_ICONS = {
  INSTAGRAM: '📸',
  LINKEDIN:  '💼',
  FACEBOOK:  '👥',
  TWITTER:   '🐦',
  TIKTOK:    '🎵',
  YOUTUBE:   '▶️',
};

const STATUS_CONFIG = {
  PENDING:  { label: 'PENDING',  color: 'var(--status-warning)', badgeClass: 'badge-warning', icon: '⏳' },
  APPROVED: { label: 'APPROVED', color: 'var(--status-success)', badgeClass: 'badge-success', icon: '✓' },
  REJECTED: { label: 'REJECTED', color: 'var(--status-error)',   badgeClass: 'badge-error',   icon: '✕' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReviewSubmissionsView() {
  // ── Filters & Query State ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platform, setPlatform] = useState('ALL');
  const [actionType, setActionType] = useState('ALL');
  const [status, setStatus] = useState('PENDING');
  const [dateRange, setDateRange] = useState('ALL'); // ALL, TODAY, 7DAYS, 30DAYS
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // ── Data & Async State ──
  const [submissions, setSubmissions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ── Detailed Submission Dossier Modal State ──
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [isDossierLoading, setIsDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState(null);

  // ── Verification Decision Form State ──
  const [verdict, setVerdict] = useState('APPROVED');
  const [feedback, setFeedback] = useState('');
  const [isSubmittingVerdict, setIsSubmittingVerdict] = useState(false);
  const [verdictError, setVerdictError] = useState(null);

  // Checklist verification states (for human verification tracking)
  const [checklistState, setChecklistState] = useState({
    handleMatches: false,
    timestampValid: false,
    actionConsistent: false,
    evidenceAuthentic: false,
  });

  const searchTimerRef = useRef(null);

  // Debounce search input by 300ms
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  // Convert dateRange preset to ISO date string for API
  const getDateRangeFilter = () => {
    if (dateRange === 'TODAY') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return { startDate: d.toISOString() };
    }
    if (dateRange === '7DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return { startDate: d.toISOString() };
    }
    if (dateRange === '30DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      return { startDate: d.toISOString() };
    }
    return {};
  };

  // Fetch pending review items
  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const dateFilters = getDateRangeFilter();
      const res = await fetchPendingReviews({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        platform: platform !== 'ALL' ? platform : undefined,
        actionType: actionType !== 'ALL' ? actionType : undefined,
        status: status !== 'ALL' ? status : undefined,
        ...dateFilters,
      });

      if (res.success) {
        setSubmissions(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setErrorMessage(res.message || 'Failed to load review queue.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error communicating with review API.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, platform, actionType, status, dateRange]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Load detailed dossier when modal opens
  const openDetailsModal = async (subId) => {
    setSelectedSubId(subId);
    setDossier(null);
    setDossierError(null);
    setVerdict('APPROVED');
    setFeedback('Verified activity engagement matches criteria.');
    setVerdictError(null);
    setChecklistState({
      handleMatches: false,
      timestampValid: false,
      actionConsistent: false,
      evidenceAuthentic: false,
    });
    setIsDossierLoading(true);

    try {
      const res = await fetchReviewSubmissionDetails(subId);
      if (res.success && res.data) {
        setDossier(res.data);
      } else {
        setDossierError(res.message || 'Could not load detailed verification dossier.');
      }
    } catch (err) {
      setDossierError(err.message || 'Failed to fetch submission verification details.');
    } finally {
      setIsDossierLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedSubId(null);
    setDossier(null);
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedSubId) {
        closeDetailsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSubId]);

  // Handle verdict decision submission
  const handleVerdictSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubId) return;

    if (verdict === 'REJECTED' && (!feedback || !feedback.trim())) {
      setVerdictError('Please specify the rejection reason so the creator can understand.');
      return;
    }

    setIsSubmittingVerdict(true);
    setVerdictError(null);

    try {
      const res = await reviewSubmission(selectedSubId, verdict, feedback.trim());
      if (res.success) {
        setSuccessMessage(`Submission #${selectedSubId.substring(0, 8)} successfully marked as ${verdict}.`);
        setTimeout(() => setSuccessMessage(null), 5000);
        closeDetailsModal();
        await loadReviews();
      } else {
        setVerdictError(res.message || 'Failed to submit moderation review.');
      }
    } catch (err) {
      setVerdictError(err.message || 'Network error processing review verdict.');
    } finally {
      setIsSubmittingVerdict(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setPlatform('ALL');
    setActionType('ALL');
    setStatus('PENDING');
    setDateRange('ALL');
    setPage(1);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (platform !== 'ALL' ? 1 : 0) +
    (actionType !== 'ALL' ? 1 : 0) +
    (status !== 'PENDING' ? 1 : 0) +
    (dateRange !== 'ALL' ? 1 : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Page Header & Telemetry ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-admin" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
              ⚖️ MODERATION QUEUE
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              • {pagination.totalCount} submission{pagination.totalCount === 1 ? '' : 's'} total
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
            Verification Review Queue
          </h2>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Inspect creator proof evidence, evaluate platform rules compliance, and record human verification verdicts.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadReviews}
          disabled={isLoading}
          style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          title="Refresh review queue"
        >
          <span>↺</span> {isLoading ? 'Refreshing…' : 'Refresh Queue'}
        </button>
      </div>

      {/* ── Human Verification Notice Banner ── */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          borderLeft: '4px solid var(--role-admin)',
          background: 'rgba(99, 102, 241, 0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🛡️</span>
        <div>
          <strong style={{ color: 'var(--text-highlight)' }}>Human Verification Standard:</strong>{' '}
          Admin review is an authentic human moderation process. The portal does not automate scraping or claim that social media actions are genuine without manual confirmation. Examine creator handles, screenshot timestamps, and external URL legitimacy before recording approvals.
        </div>
      </div>

      {/* ── Success / Error Banners ── */}
      {successMessage && (
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
          <span>✓ {successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div
          className="glass-panel"
          style={{
            padding: '0.85rem 1.25rem',
            borderLeft: '4px solid var(--status-error)',
            color: 'var(--status-error)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button type="button" onClick={loadReviews} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}>Retry</button>
        </div>
      )}

      {/* ── Search & Multi-Filter Control Toolbar ── */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔍</span>
            <input
              type="text"
              className="input-field"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search creator name, email, URL, or notes..."
              style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: search ? '2.2rem' : '1rem', fontSize: '0.88rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Active Filter Pill */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-light)', fontSize: '0.78rem' }}>
                {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResetFilters}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
              >
                Reset All
              </button>
            </div>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {/* Platform Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Platform
            </label>
            <select
              className="input-field"
              value={platform}
              onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">🌐 All Platforms</option>
              <option value="INSTAGRAM">📸 Instagram</option>
              <option value="LINKEDIN">💼 LinkedIn</option>
              <option value="FACEBOOK">👥 Facebook</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Action Type
            </label>
            <select
              className="input-field"
              value={actionType}
              onChange={(e) => { setActionType(e.target.value); setPage(1); }}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">All Actions</option>
              <option value="LIKE">❤️ Like / Upvote</option>
              <option value="COMMENT">💬 Comment</option>
              <option value="STORY">📱 24-hr Story</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Status
            </label>
            <select
              className="input-field"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="PENDING">⏳ Pending Review</option>
              <option value="APPROVED">✓ Approved</option>
              <option value="REJECTED">✕ Rejected</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Submitted Time
            </label>
            <select
              className="input-field"
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">📅 Today Only</option>
              <option value="7DAYS">Past 7 Days</option>
              <option value="30DAYS">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Submissions Review Queue Table / Cards ── */}
      <div className="glass-panel" style={{ padding: '1.25rem', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-sm)' }} />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '3rem', opacity: 0.6 }}>🎉</span>
            <h3 style={{ margin: 0, color: 'var(--text-highlight)' }}>No Submissions Found</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '42ch' }}>
              {activeFilterCount > 0
                ? 'No submissions match your active filter criteria. Try adjusting or clearing your filters.'
                : 'All submissions have been verified and processed! The moderation queue is clear.'}
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleResetFilters}
                style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Platform &amp; Action</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Creator</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Target Post</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Screenshot Proof</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Submitted</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.PENDING;
                  const creatorName = sub.userName || sub.user?.name || 'Creator';
                  const creatorEmail = sub.userEmail || sub.user?.email || '';

                  return (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Platform & Action */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontSize: '1.4rem' }}>{PLATFORM_ICONS[sub.platform] || '🌐'}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{sub.platform}</div>
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.1rem 0.4rem',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                              }}
                            >
                              {sub.actionType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Creator Details */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>{creatorName}</div>
                        {creatorEmail && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{creatorEmail}</div>
                        )}
                      </td>

                      {/* Post URL & Description */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle', maxWidth: '240px' }}>
                        <a
                          href={sub.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--primary-light)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '220px',
                            fontWeight: 500,
                          }}
                          title={`Open ${sub.postUrl} in new tab`}
                        >
                          <span>🔗</span> {sub.postUrl}
                        </a>
                        {sub.description && (
                          <div
                            style={{
                              fontSize: '0.76rem',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '0.2rem',
                            }}
                            title={sub.description}
                          >
                            {sub.description}
                          </div>
                        )}
                      </td>

                      {/* Screenshot Thumbnail */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                        {sub.screenshotUrl ? (
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              display: 'inline-block',
                              border: '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                            }}
                            title="Click to zoom screenshot evidence"
                          >
                            <ScreenshotImage
                              screenshotUrl={sub.screenshotUrl}
                              thumbnailStyle={{ width: '46px', height: '46px', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No proof</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-highlight)' }}>{timeAgo(sub.createdAt)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => openDetailsModal(sub.id)}
                          style={{
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🔍 View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Controls ── */}
        {!isLoading && submissions.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '1.25rem',
              marginTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              <strong>{pagination.totalCount}</strong> submissions
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
              >
                ← Previous
              </button>

              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                className="btn-secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          DETAILED SUBMISSION VERIFICATION MODAL ("View Details")
          ==================================================================== */}
      {selectedSubId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.25rem',
          }}
          onClick={closeDetailsModal}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '850px',
              width: '100%',
              padding: '1.75rem',
              maxHeight: '92vh',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>{dossier ? PLATFORM_ICONS[dossier.submission.platform] : '🔍'}</span>
                  <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontSize: '1.25rem' }}>
                    Verification Dossier
                  </h3>
                  {dossier && (
                    <span className={`badge ${STATUS_CONFIG[dossier.submission.status]?.badgeClass || 'badge-warning'}`}>
                      {dossier.submission.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Submission ID: {selectedSubId}
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={closeDetailsModal}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.9rem' }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {isDossierLoading ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <div className="status-dot checking" style={{ width: '16px', height: '16px', margin: '0 auto 1rem auto' }} />
                <div>Loading complete submission dossier…</div>
              </div>
            ) : dossierError ? (
              <div style={{ padding: '2rem 1rem', color: 'var(--status-error)', textAlign: 'center' }}>
                ⚠️ {dossierError}
              </div>
            ) : dossier ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* 2-Column Details Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>

                  {/* Left Column: Proof & Submission Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Evidence Screenshot */}
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-highlight)' }}>
                          📸 Uploaded Screenshot Evidence:
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to zoom</span>
                      </div>

                      {dossier.submission.screenshotUrl ? (
                        <ScreenshotImage
                          screenshotUrl={dossier.submission.screenshotUrl}
                          alt="Submission Evidence Proof"
                          thumbnailStyle={{
                            maxHeight: '340px',
                            width: '100%',
                            objectFit: 'contain',
                            borderRadius: 'var(--radius-sm)',
                            background: '#07090e',
                          }}
                        />
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-error)', fontSize: '0.85rem' }}>
                          ⚠️ No screenshot evidence provided.
                        </div>
                      )}
                    </div>

                    {/* Target Post URL */}
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                        Target Social Media Link
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--primary-light)', wordBreak: 'break-all' }}>
                          {dossier.submission.postUrl}
                        </span>
                        <a
                          href={dossier.submission.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
                        >
                          Visit ↗
                        </a>
                      </div>
                    </div>

                    {/* Creator Description Notes */}
                    {dossier.submission.description && (
                      <div className="glass-panel" style={{ padding: '1rem' }}>
                        <strong style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                          Creator Description Note
                        </strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          "{dossier.submission.description}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Creator Dossier & Checklist & Verdict Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Creator Profile & Trust Score */}
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                        Creator Verification History
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-highlight)' }}>
                            {dossier.creator.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {dossier.creator.email}
                          </div>
                        </div>
                        <span className="badge badge-user" style={{ fontSize: '0.72rem' }}>
                          {dossier.creator.status}
                        </span>
                      </div>

                      {/* Creator Metrics */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{dossier.creator.stats.total}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--status-success)' }}>Approved</div>
                          <div style={{ fontWeight: 700, color: 'var(--status-success)' }}>{dossier.creator.stats.approved}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--primary-light)' }}>Trust Score</div>
                          <div style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{dossier.creator.stats.trustScore}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Human Verification Checklist */}
                    <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--role-admin)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                        Human Verification Checklist
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checklistState.handleMatches}
                            onChange={(e) => setChecklistState(s => ({ ...s, handleMatches: e.target.checked }))}
                            style={{ marginTop: '0.15rem' }}
                          />
                          <span>Handle / profile name in screenshot matches registered creator.</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checklistState.timestampValid}
                            onChange={(e) => setChecklistState(s => ({ ...s, timestampValid: e.target.checked }))}
                            style={{ marginTop: '0.15rem' }}
                          />
                          <span>Timestamp in screenshot is within active campaign window.</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checklistState.actionConsistent}
                            onChange={(e) => setChecklistState(s => ({ ...s, actionConsistent: e.target.checked }))}
                            style={{ marginTop: '0.15rem' }}
                          />
                          <span>Evidence explicitly demonstrates [{dossier.submission.actionType}] action.</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checklistState.evidenceAuthentic}
                            onChange={(e) => setChecklistState(s => ({ ...s, evidenceAuthentic: e.target.checked }))}
                            style={{ marginTop: '0.15rem' }}
                          />
                          <span>Evidence appears genuine and uncropped; no tampering signs.</span>
                        </label>
                      </div>
                    </div>

                    {/* Verdict Decision Form */}
                    <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Record Verification Decision
                      </div>

                      {verdictError && (
                        <div style={{ color: 'var(--status-error)', fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                          ⚠️ {verdictError}
                        </div>
                      )}

                      <form onSubmit={handleVerdictSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                            Decision Verdict:
                          </label>
                          <div style={{ display: 'flex', gap: '1.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                              <input
                                type="radio"
                                name="verdict"
                                value="APPROVED"
                                checked={verdict === 'APPROVED'}
                                onChange={() => {
                                  setVerdict('APPROVED');
                                  setFeedback('Verified activity engagement matches criteria.');
                                  setVerdictError(null);
                                }}
                              />
                              <span style={{ color: 'var(--status-success)', fontWeight: 700 }}>✓ Approve</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                              <input
                                type="radio"
                                name="verdict"
                                value="REJECTED"
                                checked={verdict === 'REJECTED'}
                                onChange={() => {
                                  setVerdict('REJECTED');
                                  setFeedback('Proof missing timestamp or required handle verification.');
                                  setVerdictError(null);
                                }}
                              />
                              <span style={{ color: 'var(--status-error)', fontWeight: 700 }}>✕ Reject</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                            Moderator Feedback {verdict === 'REJECTED' && <span style={{ color: 'var(--status-error)' }}>* (Required)</span>}
                          </label>
                          <textarea
                            className="input-field"
                            rows="3"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Enter constructive feedback to be sent to the creator..."
                            required={verdict === 'REJECTED'}
                            style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.25rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={closeDetailsModal}
                            disabled={isSubmittingVerdict}
                            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmittingVerdict}
                            style={{
                              fontSize: '0.82rem',
                              padding: '0.45rem 1.1rem',
                              fontWeight: 700,
                              background: verdict === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)',
                            }}
                          >
                            {isSubmittingVerdict ? 'Submitting…' : `Confirm ${verdict}`}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Past Review History if already reviewed */}
                    {dossier.submission.reviews && dossier.submission.reviews.length > 0 && (
                      <div className="glass-panel" style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          Prior Review History
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {dossier.submission.reviews.map((r) => (
                            <div key={r.id} style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span style={{ color: r.status === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)' }}>
                                  {r.status} by {r.admin?.name || r.adminName || 'Admin'}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                  {formatDate(r.createdAt)}
                                </span>
                              </div>
                              {r.feedback && (
                                <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                  "{r.feedback}"
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
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
