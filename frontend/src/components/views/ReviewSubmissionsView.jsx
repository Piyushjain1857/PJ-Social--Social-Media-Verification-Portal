import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchPendingReviews,
  fetchReviewSubmissionDetails,
  approveSubmission,
  rejectSubmission,
  addReviewInternalNote,
  requestReviewClarification,
} from '../../services/api';
import ScreenshotImage from '../ScreenshotImage';
import { InstagramIcon, LinkedInIcon, FacebookIcon, TwitterXIcon } from '../common/SocialIcons';

const PLATFORM_CONFIG = {
  INSTAGRAM: { icon: <InstagramIcon size={16} />, name: 'Instagram', color: '#E1306C' },
  LINKEDIN:  { icon: <LinkedInIcon size={16} />,  name: 'LinkedIn',  color: '#0A66C2' },
  TWITTER:   { icon: <TwitterXIcon size={16} />,   name: 'Twitter / X', color: '#ffffff' },
  FACEBOOK:  { icon: <FacebookIcon size={16} />,  name: 'Facebook',  color: '#1877F2' },
};

const ACTION_DESCRIPTIONS = {
  LIKE: 'Liked post or reacted to official creator update',
  COMMENT: 'Posted relevant feedback on official discussion thread',
  STORY: 'Shared campaign content to active 24-hr story',
};

const STATUS_CONFIG = {
  PENDING:  { label: 'PENDING',  color: 'var(--status-warning)', badgeClass: 'badge-warning', icon: '⏳' },
  APPROVED: { label: 'APPROVED', color: 'var(--status-success)', badgeClass: 'badge-success', icon: '✓' },
  REJECTED: { label: 'REJECTED', color: 'var(--status-error)',   badgeClass: 'badge-error',   icon: '✕' },
};

const REJECTION_PRESETS = [
  'Visible handle in screenshot does not match registered creator account.',
  'Screenshot timestamp is outside the active campaign window.',
  'Evidence is cropped and does not clearly show required engagement.',
  'Post URL is private or inaccessible for manual verification.',
  'Activity shown in proof does not match selected action type.',
];

const CLARIFICATION_PRESETS = [
  'Please provide an uncropped screenshot showing your profile handle clearly.',
  'Your post link appears private. Please adjust privacy settings or submit public proof.',
  'Please upload high-resolution evidence showing the engagement count and timestamp.',
];

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
  // ── Queue & Filter State ──
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [dossier, setDossier] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platform, setPlatform] = useState('ALL');
  const [actionType, setActionType] = useState('ALL');
  const [status, setStatus] = useState('PENDING'); // PENDING | APPROVED | REJECTED | ALL
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });

  // ── Async Loading & Feedback State ──
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [isDossierLoading, setIsDossierLoading] = useState(false);
  const [queueError, setQueueError] = useState(null);
  const [dossierError, setDossierError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // ── Inline Note State ──
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // ── Modals State ──
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: 'APPROVE', // 'APPROVE' | 'REJECT'
    feedback: '',
    error: null,
    isSubmitting: false,
  });

  const [clarificationModal, setClarificationModal] = useState({
    isOpen: false,
    message: '',
    error: null,
    isSubmitting: false,
  });

  const [noteModal, setNoteModal] = useState({
    isOpen: false,
    note: '',
    error: null,
    isSubmitting: false,
  });

  const [copiedUrl, setCopiedUrl] = useState(false);

  const searchTimerRef = useRef(null);

  // ── Debounce search input ──
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  // ── Load Queue Submissions ──
  const loadQueue = useCallback(async () => {
    setIsQueueLoading(true);
    setQueueError(null);

    try {
      const res = await fetchPendingReviews({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        platform: platform !== 'ALL' ? platform : undefined,
        actionType: actionType !== 'ALL' ? actionType : undefined,
        status: status !== 'ALL' ? status : undefined,
      });

      if (res.success) {
        const items = res.data || [];
        setSubmissions(items);
        if (res.pagination) {
          setPagination(res.pagination);
        }

        // Auto-select first item if current selection is invalid or null
        if (items.length > 0) {
          if (!selectedSubId || !items.some(i => i.id === selectedSubId)) {
            setSelectedSubId(items[0].id);
          }
        } else {
          setSelectedSubId(null);
          setDossier(null);
        }
      } else {
        setQueueError(res.message || 'Failed to load review queue.');
      }
    } catch (err) {
      setQueueError(err.message || 'Error communicating with review API.');
    } finally {
      setIsQueueLoading(false);
    }
  }, [page, limit, debouncedSearch, platform, actionType, status, selectedSubId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // ── Load Selected Submission Dossier ──
  const loadDossier = useCallback(async (subId) => {
    if (!subId) {
      setDossier(null);
      return;
    }

    setIsDossierLoading(true);
    setDossierError(null);

    try {
      const res = await fetchReviewSubmissionDetails(subId, {
        status: status !== 'ALL' ? status : undefined,
        platform: platform !== 'ALL' ? platform : undefined,
        actionType: actionType !== 'ALL' ? actionType : undefined,
        search: debouncedSearch.trim() || undefined,
      });

      if (res.success && res.data) {
        setDossier(res.data);
      } else {
        setDossierError(res.message || 'Could not load submission dossier.');
      }
    } catch (err) {
      setDossierError(err.message || 'Failed to load submission verification dossier.');
    } finally {
      setIsDossierLoading(false);
    }
  }, [status, platform, actionType, debouncedSearch]);

  useEffect(() => {
    if (selectedSubId) {
      loadDossier(selectedSubId);
    }
  }, [selectedSubId, loadDossier]);

  // ── Queue Navigation Helpers ──
  const currentIndex = submissions.findIndex(s => s.id === selectedSubId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < submissions.length - 1;

  const handleSelectPrevious = useCallback(() => {
    if (hasPrevious) {
      const prevSub = submissions[currentIndex - 1];
      setSelectedSubId(prevSub.id);
    }
  }, [hasPrevious, currentIndex, submissions]);

  const handleSelectNext = useCallback(() => {
    if (hasNext) {
      const nextSub = submissions[currentIndex + 1];
      setSelectedSubId(nextSub.id);
    }
  }, [hasNext, currentIndex, submissions]);

  // ── Keyboard Shortcuts (A, R, N, P, Escape) ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If user is focused on an editable input/textarea, ignore shortcuts
      const activeTag = document.activeElement?.tagName?.toUpperCase();
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;

      // Handle Escape for modals
      if (e.key === 'Escape') {
        if (confirmModal.isOpen) setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (clarificationModal.isOpen) setClarificationModal(prev => ({ ...prev, isOpen: false }));
        if (noteModal.isOpen) setNoteModal(prev => ({ ...prev, isOpen: false }));
        if (showMobileModal) setShowMobileModal(false);
        return;
      }

      // If any modal is open, don't trigger other hotkeys
      if (confirmModal.isOpen || clarificationModal.isOpen || noteModal.isOpen) return;

      // Hotkey: P -> Previous
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleSelectPrevious();
        return;
      }

      // Hotkey: N -> Next
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleSelectNext();
        return;
      }

      // Hotkey: A -> Approve
      if (e.key === 'a' || e.key === 'A') {
        if (dossier?.submission && dossier.submission.status === 'PENDING') {
          e.preventDefault();
          openConfirmModal('APPROVE');
        }
        return;
      }

      // Hotkey: R -> Reject
      if (e.key === 'r' || e.key === 'R') {
        if (dossier?.submission && dossier.submission.status === 'PENDING') {
          e.preventDefault();
          openConfirmModal('REJECT');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    confirmModal.isOpen,
    clarificationModal.isOpen,
    noteModal.isOpen,
    showMobileModal,
    dossier?.submission,
    handleSelectPrevious,
    handleSelectNext,
  ]);

  // Lock body scroll when mobile pop-up modal is open
  useEffect(() => {
    if (showMobileModal && typeof window !== 'undefined' && window.innerWidth <= 900) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileModal]);

  // ── Open Modals ──
  const openConfirmModal = (action) => {
    setActionError(null);
    setConfirmModal({
      isOpen: true,
      action,
      feedback: action === 'APPROVE' ? 'Verified activity engagement matches criteria.' : '',
      error: null,
      isSubmitting: false,
    });
  };

  const closeConfirmModal = () => {
    if (confirmModal.isSubmitting) return;
    setConfirmModal(prev => ({ ...prev, isOpen: false, error: null }));
  };

  const openClarificationModal = () => {
    setActionError(null);
    setClarificationModal({
      isOpen: true,
      message: '',
      error: null,
      isSubmitting: false,
    });
  };

  const closeClarificationModal = () => {
    if (clarificationModal.isSubmitting) return;
    setClarificationModal(prev => ({ ...prev, isOpen: false, error: null }));
  };

  const openNoteModal = () => {
    setActionError(null);
    setNoteModal({
      isOpen: true,
      note: '',
      error: null,
      isSubmitting: false,
    });
  };

  const closeNoteModal = () => {
    if (noteModal.isSubmitting) return;
    setNoteModal(prev => ({ ...prev, isOpen: false, error: null }));
  };

  // ── Submit Verdict (Approve / Reject) ──
  const handleExecuteVerdict = async () => {
    const { action, feedback } = confirmModal;

    if (action === 'REJECT' && (!feedback || !feedback.trim())) {
      setConfirmModal(prev => ({
        ...prev,
        error: 'A rejection reason is mandatory so the creator knows what was missing or invalid.',
      }));
      return;
    }

    setConfirmModal(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const fn = action === 'APPROVE' ? approveSubmission : rejectSubmission;
      const res = await fn(selectedSubId, feedback);

      if (res.success) {
        setActionSuccess(`Submission marked as ${action} successfully!`);
        setTimeout(() => setActionSuccess(null), 4000);
        closeConfirmModal();

        // Refresh dossier and queue
        await Promise.all([loadDossier(selectedSubId), loadQueue()]);
      } else {
        setConfirmModal(prev => ({
          ...prev,
          error: res.message || `Failed to ${action.toLowerCase()} submission.`,
        }));
      }
    } catch (err) {
      setConfirmModal(prev => ({
        ...prev,
        error: err.message || `Error submitting ${action.toLowerCase()} verdict.`,
      }));
    } finally {
      setConfirmModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // ── Submit Clarification Request ──
  const handleSendClarification = async () => {
    const { message } = clarificationModal;
    if (!message || !message.trim()) {
      setClarificationModal(prev => ({ ...prev, error: 'Please enter a clarification message for the creator.' }));
      return;
    }

    setClarificationModal(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const res = await requestReviewClarification(selectedSubId, message.trim());
      if (res.success) {
        setActionSuccess('Clarification request recorded and creator notified.');
        setTimeout(() => setActionSuccess(null), 4000);
        closeClarificationModal();
        await loadDossier(selectedSubId);
      } else {
        setClarificationModal(prev => ({ ...prev, error: res.message || 'Failed to request clarification.' }));
      }
    } catch (err) {
      setClarificationModal(prev => ({ ...prev, error: err.message || 'Error sending clarification request.' }));
    } finally {
      setClarificationModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // ── Add Internal Review Note ──
  const handleAddInternalNote = async (noteText, fromModal = false) => {
    if (!noteText || !noteText.trim()) return;

    if (fromModal) setNoteModal(prev => ({ ...prev, isSubmitting: true, error: null }));
    else setIsSavingNote(true);

    try {
      const res = await addReviewInternalNote(selectedSubId, noteText.trim());
      if (res.success) {
        setActionSuccess('Internal review note attached.');
        setTimeout(() => setActionSuccess(null), 3500);
        setNewNoteText('');
        if (fromModal) closeNoteModal();
        await loadDossier(selectedSubId);
      } else {
        const msg = res.message || 'Failed to attach internal review note.';
        if (fromModal) setNoteModal(prev => ({ ...prev, error: msg }));
        else setActionError(msg);
      }
    } catch (err) {
      const msg = err.message || 'Error attaching internal note.';
      if (fromModal) setNoteModal(prev => ({ ...prev, error: msg }));
      else setActionError(msg);
    } finally {
      if (fromModal) setNoteModal(prev => ({ ...prev, isSubmitting: false }));
      else setIsSavingNote(false);
    }
  };

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  const activeSub = dossier?.submission;
  const creator = dossier?.creator;
  const officialAcc = dossier?.officialAccount;
  const platformMeta = PLATFORM_CONFIG[activeSub?.platform] || { icon: '🌐', name: activeSub?.platform || 'Social', color: 'var(--primary)' };
  const statusMeta = STATUS_CONFIG[activeSub?.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="review-workspace-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* ── Top Workspace Bar ── */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--role-admin)' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div className="admin-header-title-group">
            <div className="gamepoints-banner-badge admin responsive-header-pill">
              <span className="gamepoints-banner-dot" />
              <span>🛡️ Evidence Audit</span>
            </div>
            <div className="admin-header-title-left">
              <span style={{ fontSize: '1.35rem' }}>⚖️</span>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-highlight)', letterSpacing: '-0.02em' }}>
                Verification Review Workspace
              </h2>
            </div>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            Dual-pane human review terminal with split evidence inspection, creator audit trail, and instant verdict execution.
          </p>
        </div>

        {/* Keyboard Shortcuts Hint Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.2rem' }}>Shortcuts:</span>
          <span className="kbd-badge" title="Press A to approve selected submission"><kbd>A</kbd> Approve</span>
          <span className="kbd-badge" title="Press R to reject selected submission"><kbd>R</kbd> Reject</span>
          <span className="kbd-badge" title="Press N to navigate to next submission"><kbd>N</kbd> Next</span>
          <span className="kbd-badge" title="Press P to navigate to previous submission"><kbd>P</kbd> Prev</span>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
          <span>⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* ── Main Two-Column Split Workspace ── */}
      <div className="review-split-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* ==================================================================
            LEFT COLUMN: Submission Queue & Filters
            ================================================================== */}
        <div className="glass-panel queue-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          {/* Queue Header & Counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                Queue
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
                background: pagination.totalCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                color: pagination.totalCount > 0 ? '#fbbf24' : 'var(--text-muted)',
                border: `1px solid ${pagination.totalCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                fontFamily: 'var(--font-mono, monospace)'
              }}>
                {pagination.totalCount} {pagination.totalCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              type="button"
              className="btn-refresh-pill"
              onClick={loadQueue}
              disabled={isQueueLoading}
              title="Refresh moderation queue"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
            >
              <svg
                className={`refresh-icon-svg ${isQueueLoading ? 'spinning' : ''}`}
                viewBox="0 0 24 24"
                width="13"
                height="13"
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
              <span>{isQueueLoading ? 'Refreshing…' : 'Refresh Data'}</span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="search"
              placeholder="Search creator, URL, note..."
              value={search}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.55rem 2.2rem 0.55rem 2.25rem',
                fontSize: '0.82rem',
                color: 'var(--text-highlight, #f8fafc)',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.55)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.18)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.2)';
              }}
            />
            <svg
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.45, pointerEvents: 'none' }}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                title="Clear search query"
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs (Sleek Segmented Bar) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '3px',
            background: 'rgba(15, 23, 42, 0.65)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {[
              { id: 'PENDING', label: 'Pending', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)' },
              { id: 'APPROVED', label: 'Approved', color: '#34d399', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)' },
              { id: 'REJECTED', label: 'Rejected', color: '#f87171', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)' },
              { id: 'ALL', label: 'All', color: '#a5b4fc', bg: 'rgba(99, 102, 241, 0.22)', border: 'rgba(99, 102, 241, 0.45)' },
            ].map((s) => {
              const isActive = status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setStatus(s.id); setPage(1); }}
                  style={{
                    padding: '0.42rem 0.2rem',
                    fontSize: '0.73rem',
                    fontWeight: isActive ? 700 : 500,
                    borderRadius: '7px',
                    border: `1px solid ${isActive ? s.border : 'transparent'}`,
                    cursor: 'pointer',
                    background: isActive ? s.bg : 'transparent',
                    color: isActive ? s.color : 'var(--text-secondary, #94a3b8)',
                    boxShadow: isActive ? `0 2px 8px ${s.border}` : 'none',
                    transition: 'all 0.15s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
                    }
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Platform Filters (Sleek Segmented Bar) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '3px',
            background: 'rgba(15, 23, 42, 0.45)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            {[
              { id: 'ALL', label: 'All', icon: '🌐', color: '#c7d2fe', bg: 'rgba(99, 102, 241, 0.22)', border: 'rgba(99, 102, 241, 0.45)' },
              { id: 'INSTAGRAM', label: 'Insta', icon: <InstagramIcon size={13} />, color: '#f472b6', bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.4)' },
              { id: 'LINKEDIN', label: 'LinkedIn', icon: <LinkedInIcon size={13} />, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)', border: 'rgba(56, 189, 248, 0.4)' },
              { id: 'FACEBOOK', label: 'FB', icon: <FacebookIcon size={13} />, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.18)', border: 'rgba(96, 165, 250, 0.4)' },
            ].map((p) => {
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPlatform(p.id); setPage(1); }}
                  style={{
                    padding: '0.42rem 0.2rem',
                    fontSize: '0.73rem',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '7px',
                    border: `1px solid ${isSelected ? p.border : 'transparent'}`,
                    cursor: 'pointer',
                    background: isSelected ? p.bg : 'transparent',
                    color: isSelected ? p.color : 'var(--text-secondary, #94a3b8)',
                    boxShadow: isSelected ? `0 2px 8px ${p.border}` : 'none',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.28rem'
                  }}
                  title={`Filter by ${p.label}`}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
                    }
                  }}
                >
                  <span style={{ fontSize: '0.8rem' }}>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Queue Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {isQueueLoading && submissions.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div className="status-dot checking" style={{ width: '12px', height: '12px', margin: '0 auto 0.75rem auto' }} />
                Loading queue submissions...
              </div>
            ) : queueError ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--status-error)', fontSize: '0.85rem' }}>
                ⚠️ {queueError}
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.5 }}>📭</span>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No Submissions Found</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Try clearing filters or changing review status.</div>
              </div>
            ) : (
              submissions.map((sub) => {
                const isSelected = sub.id === selectedSubId;
                const pMeta = PLATFORM_CONFIG[sub.platform] || { icon: '🌐', name: sub.platform, color: 'var(--primary)' };
                const sMeta = STATUS_CONFIG[sub.status] || STATUS_CONFIG.PENDING;

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubId(sub.id);
                      setShowMobileModal(true);
                    }}
                    style={{
                      padding: '0.85rem 0.95rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.2)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Header Row: Creator name & status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--text-highlight)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sub.userName || sub.user?.name || 'Creator'}
                      </span>
                      <span className={`badge ${sMeta.badgeClass}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        {sMeta.icon} {sub.status}
                      </span>
                    </div>

                    {/* Metadata Row: Platform + Action Type + Time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{pMeta.icon}</span>
                        <strong style={{ color: pMeta.color }}>{pMeta.name}</strong>
                        <span>•</span>
                        <span>{sub.actionType}</span>
                      </span>
                      <span>{timeAgo(sub.createdAt)}</span>
                    </div>

                    {/* URL Snippet */}
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>
                      🔗 {sub.postUrl}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Queue Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
              >
                ◀ Prev
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
              >
                Next ▶
              </button>
            </div>
          )}
        </div>

        {/* ==================================================================
            RIGHT COLUMN: Selected Submission Details & Human Verification Stage
            ================================================================== */}
        <div className={`review-stage-panel ${showMobileModal ? 'mobile-modal-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Mobile Pop-up Top Bar */}
          <div className="mobile-stage-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.15rem' }}>⚖️</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-highlight)' }}>
                Evidence &amp; Verification
              </span>
            </div>
            <button
              type="button"
              className="btn-close-mobile-stage"
              onClick={() => setShowMobileModal(false)}
              aria-label="Close modal and return to Queue"
            >
              ✕ Close
            </button>
          </div>

          {/* Action Success / Error Notifications in Review Stage */}
          {actionSuccess && (
            <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <span>✓</span>
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <span>⚠️</span>
              <span>{actionError}</span>
            </div>
          )}

          {!selectedSubId ? (
            <div className="glass-panel" style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)'
              }}>
                ⚖️
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                  Verification Review Workspace
                </h3>
                <p style={{ margin: '0.45rem auto 0', color: 'var(--text-secondary)', maxWidth: '44ch', fontSize: '0.88rem', lineHeight: 1.55 }}>
                  {submissions.length > 0
                    ? 'Select an activity proof from the moderation queue on the left to inspect evidence, cross-reference creator credentials, and record your verification verdict.'
                    : 'The moderation queue is currently clear! When new creator submissions are submitted, they will appear in your queue for real-time review.'}
                </p>
              </div>

              {submissions.length === 0 ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  <span>Queue Status: All Caught Up 🎉</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                  <div style={{ padding: '0.5rem 0.85rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <kbd style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#38bdf8', fontWeight: 700, marginRight: '0.35rem' }}>A</kbd> Approve & Award XP
                  </div>
                  <div style={{ padding: '0.5rem 0.85rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <kbd style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#f87171', fontWeight: 700, marginRight: '0.35rem' }}>R</kbd> Reject with Reason
                  </div>
                </div>
              )}
            </div>
          ) : isDossierLoading && !activeSub ? (
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div className="status-dot checking" style={{ width: '16px', height: '16px', margin: '0 auto 1rem auto' }} />
              <h4 style={{ margin: 0, color: 'var(--text-highlight)' }}>Loading Verification Dossier…</h4>
              <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Retrieving screenshot proof, audit timeline, and creator track record</p>
            </div>
          ) : dossierError ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderLeft: '4px solid var(--status-error)' }}>
              <h4 style={{ margin: 0, color: 'var(--status-error)' }}>⚠️ Unable to load submission details</h4>
              <p style={{ margin: '0.5rem 0 1rem 0', color: 'var(--text-secondary)' }}>{dossierError}</p>
              <button type="button" className="btn-secondary" onClick={() => loadDossier(selectedSubId)}>Try Again</button>
            </div>
          ) : activeSub ? (
            <>
              {/* ── Stage Action Bar ── */}
              <div className="glass-panel stage-action-bar" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderTop: '3px solid var(--primary)', flexShrink: 0, minHeight: 'fit-content' }}>
                {/* Prev / Next Queue Nav & Status */}
                <div className="stage-nav-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleSelectPrevious}
                      disabled={!hasPrevious}
                      title="Previous Submission in queue (Hotkey: P)"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span>◀</span>
                      <span>Prev</span>
                      <kbd className="nav-kbd" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>P</kbd>
                    </button>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.35rem', whiteSpace: 'nowrap' }}>
                      {currentIndex >= 0 ? `${currentIndex + 1} of ${submissions.length}` : ''}
                    </span>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleSelectNext}
                      disabled={!hasNext}
                      title="Next Submission in queue (Hotkey: N)"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span>Next</span>
                      <span>▶</span>
                      <kbd className="nav-kbd" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>N</kbd>
                    </button>
                  </div>

                  {/* Current Status Pill */}
                  <span className={`badge ${statusMeta.badgeClass}`} style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}>
                    {statusMeta.icon} {activeSub.status}
                  </span>
                </div>

                {/* Primary Action Buttons Grid */}
                <div className="stage-action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', width: '100%' }}>
                  {/* Approve Button */}
                  <button
                    type="button"
                    className="btn-primary btn-stage-action btn-stage-approve"
                    onClick={() => openConfirmModal('APPROVE')}
                    disabled={activeSub.status === 'APPROVED' || activeSub.status === 'REJECTED'}
                    title={activeSub.status !== 'PENDING' ? 'Submission already verified' : 'Approve submission (Hotkey: A)'}
                    style={{
                      padding: '0.55rem 1rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: '#10b981',
                      opacity: activeSub.status !== 'PENDING' ? 0.5 : 1,
                      cursor: activeSub.status !== 'PENDING' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <span>✓</span>
                    <span>Approve</span>
                    <kbd style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>A</kbd>
                  </button>

                  {/* Reject Button (Destructive Confirmation) */}
                  <button
                    type="button"
                    className="btn-danger btn-stage-action btn-stage-reject"
                    onClick={() => openConfirmModal('REJECT')}
                    disabled={activeSub.status === 'REJECTED' || activeSub.status === 'APPROVED'}
                    title={activeSub.status !== 'PENDING' ? 'Submission already verified' : 'Reject submission (Hotkey: R)'}
                    style={{
                      padding: '0.55rem 1rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      opacity: activeSub.status !== 'PENDING' ? 0.5 : 1,
                      cursor: activeSub.status !== 'PENDING' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <span>✕</span>
                    <span>Reject</span>
                    <kbd style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>R</kbd>
                  </button>

                  {/* Request Clarification */}
                  <button
                    type="button"
                    className="btn-secondary btn-stage-action"
                    onClick={openClarificationModal}
                    title="Request clarification or additional proof from creator"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <span>💬</span>
                    <span>Request Clarification</span>
                  </button>

                  {/* Add Note */}
                  <button
                    type="button"
                    className="btn-secondary btn-stage-action"
                    onClick={openNoteModal}
                    title="Add an internal moderation note (private to staff)"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <span>📝</span>
                    <span>Add Note</span>
                  </button>
                </div>
              </div>

              {/* ── Human Verification Notice ── */}
              <div className="human-verification-notice" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '0.75rem 1.15rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.05rem' }}>🛡️</span>
                <span style={{ lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text-highlight)' }}>Human Evidence Verification:</strong> Administrator decisions reflect manual verification of submitted proof. The portal does not claim automated platform scraping. Verify evidence screenshot authenticity manually.
                </span>
              </div>

              {/* ── Main Details Grid (Evidence vs Intelligence) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(300px, 0.8fr)', gap: '1.25rem' }}>
                {/* ─── Evidence & Submission Column ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Submission Evidence Card */}
                  <div className="glass-panel evidence-proof-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="evidence-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                        Activity Evidence &amp; Proof
                      </span>
                      <span className="evidence-id-badge" title={activeSub.id} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-mono, monospace)' }}>
                        ID: <code style={{ color: 'var(--accent-cyan)' }}>#{activeSub.id ? activeSub.id.slice(0, 8) : ''}</code>
                      </span>
                    </div>

                    {/* Target Platform & Official Account */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform &amp; Action</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{platformMeta.icon}</span>
                          <div>
                            <strong style={{ color: platformMeta.color, fontSize: '0.95rem' }}>{platformMeta.name}</strong>
                            <span className="badge badge-outline" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                              {activeSub.actionType}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {ACTION_DESCRIPTIONS[activeSub.actionType]}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Official Account</div>
                        <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                          {officialAcc?.name || officialAcc?.handle || 'Official Brand Account'}
                        </div>
                        {officialAcc?.handle && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                            {officialAcc.handle.startsWith('@') ? officialAcc.handle : `@${officialAcc.handle}`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submitted Post URL */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                        Submitted URL / Permaproof
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.85rem' }}>🔗</span>
                        <a
                          href={activeSub.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ flex: 1, fontSize: '0.84rem', color: 'var(--primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {activeSub.postUrl}
                        </a>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleCopyUrl(activeSub.postUrl)}
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                        >
                          {copiedUrl ? '✓ Copied' : 'Copy'}
                        </button>
                        <a
                          href={activeSub.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', textDecoration: 'none' }}
                        >
                          Open ↗
                        </a>
                      </div>
                    </div>

                    {/* Creator's Description / Notes */}
                    {activeSub.description && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                          Creator Notes
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                          "{activeSub.description}"
                        </div>
                      </div>
                    )}

                    {/* Screenshot Evidence Viewer */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Evidence Screenshot Proof (Click image to expand lightbox)
                        </span>
                        {activeSub.screenshotUrl && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                            🔍 Fullscreen Lightbox
                          </span>
                        )}
                      </div>

                      {activeSub.screenshotUrl ? (
                        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.3)', maxHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ScreenshotImage
                            screenshotUrl={activeSub.screenshotUrl}
                            alt={`Evidence for ${activeSub.platform} submission`}
                            showLightbox={true}
                            thumbnailStyle={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-error)', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(239,68,68,0.3)' }}>
                          ⚠️ No screenshot image attached to this submission.
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                      <span>Submitted: {formatDate(activeSub.createdAt)}</span>
                      <span>Last Activity: {formatDate(activeSub.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* ─── Intelligence, Checklist & Audit Trail Column ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Creator Profile & Trust Intelligence Card */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-highlight)' }}>
                        Creator Trust &amp; Metrics
                      </span>
                      <span className="badge badge-user" style={{ fontSize: '0.68rem' }}>
                        {creator?.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
                        {(creator?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-highlight)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {creator?.name || 'Creator'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {creator?.email || ''}
                        </div>
                      </div>
                    </div>

                    {/* Historical Trust Metric Pills */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-highlight)' }}>{creator?.stats?.total ?? 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--status-success)' }}>Approved</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--status-success)' }}>{creator?.stats?.approved ?? 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--status-error)' }}>Rejected</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--status-error)' }}>{creator?.stats?.rejected ?? 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)' }}>Trust</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-cyan)' }}>{creator?.stats?.trustScore ?? 100}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Checklist */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-highlight)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                      Moderation Verification Checklist
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span>👤</span>
                        <div><strong>Creator Identity:</strong> Confirm visible profile matches creator credentials.</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span>⏱️</span>
                        <div><strong>Active Window:</strong> Check that post date falls within verification campaign dates.</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span>🎯</span>
                        <div><strong>Action Consistency:</strong> Check for visible {activeSub.actionType} engagement.</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span>🔍</span>
                        <div><strong>Authenticity:</strong> Check screenshot for uncropped UI and absence of edits.</div>
                      </div>
                    </div>
                  </div>

                  {/* Previous Reviews & Decision History */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-highlight)' }}>
                        Review Decision History
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {(dossier?.reviewHistory || []).length} recorded
                      </span>
                    </div>

                    {(!dossier?.reviewHistory || dossier.reviewHistory.length === 0) ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                        No moderation decisions recorded yet. Status is PENDING.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {dossier.reviewHistory.map((rev) => {
                          const rMeta = STATUS_CONFIG[rev.status] || STATUS_CONFIG.PENDING;
                          return (
                            <div key={rev.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${rMeta.color}`, fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ fontWeight: 700, color: rMeta.color }}>{rMeta.icon} {rev.status}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeAgo(rev.createdAt)}</span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                Moderator: <strong>{rev.admin?.name || rev.adminName || 'Admin'}</strong>
                              </div>
                              {rev.feedback && (
                                <div style={{ marginTop: '0.35rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                                  "{rev.feedback}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Clarification Requests Timeline */}
                  {dossier?.clarifications && dossier.clarifications.length > 0 && (
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-highlight)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                        Clarification Requests Sent ({dossier.clarifications.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {dossier.clarifications.map((c) => (
                          <div key={c.id} style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                              <span>Sent by: <strong>{c.admin?.name || c.adminName || 'Admin'}</strong></span>
                              <span>{timeAgo(c.createdAt)}</span>
                            </div>
                            <div style={{ marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                              💬 {c.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Internal Review Notes (Admin Only) */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-highlight)' }}>
                        Internal Review Notes (Staff Only)
                      </span>
                      <span className="badge badge-admin" style={{ fontSize: '0.65rem' }}>PRIVATE</span>
                    </div>

                    {/* Existing Notes */}
                    {(!dossier?.internalNotes || dossier.internalNotes.length === 0) ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No internal notes attached yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {dossier.internalNotes.map((n) => (
                          <div key={n.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                              <span>{n.admin?.name || n.adminName || 'Admin'}</span>
                              <span>{timeAgo(n.createdAt)}</span>
                            </div>
                            <div style={{ color: 'var(--text-primary)' }}>{n.note}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Quick Note Composer */}
                    <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.3rem' }}>
                      <input
                        type="text"
                        placeholder="Add quick internal note..."
                        className="input-field"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newNoteText.trim()) {
                            e.preventDefault();
                            handleAddInternalNote(newNoteText);
                          }
                        }}
                        style={{ flex: 1, fontSize: '0.8rem', minHeight: '34px' }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleAddInternalNote(newNoteText)}
                        disabled={isSavingNote || !newNoteText.trim()}
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
                      >
                        {isSavingNote ? 'Saving…' : 'Add Note'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Mobile Stage Pop-up Backdrop ── */}
      {showMobileModal && (
        <div
          className="mobile-stage-backdrop"
          onClick={() => setShowMobileModal(false)}
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          MODALS & DIALOGS
          ==================================================================== */}

      {/* ── 1. APPROVE / REJECT CONFIRMATION DIALOG (Destructive for Reject) ── */}
      {confirmModal.isOpen && (
        <div className="modal-backdrop" onClick={closeConfirmModal} style={{ zIndex: 2500 }}>
          <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%', padding: '1.75rem', borderLeft: `4px solid ${confirmModal.action === 'APPROVE' ? 'var(--status-success)' : 'var(--status-error)'}`, zIndex: 2501 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {confirmModal.action === 'APPROVE' ? '✓' : '⚠️'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  Confirm {confirmModal.action === 'APPROVE' ? 'Approval' : 'Rejection'}
                </h3>
              </div>
              <button type="button" onClick={closeConfirmModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {confirmModal.action === 'REJECT' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', color: 'var(--status-error)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                <strong>Destructive Action:</strong> Rejections are final and notify the creator immediately. A clear, specific explanation is mandatory so the creator understands what was invalid.
              </div>
            )}

            {/* Quick Presets for Rejection */}
            {confirmModal.action === 'REJECT' && (
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>Quick Reasons:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {REJECTION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="badge badge-outline"
                      onClick={() => setConfirmModal(prev => ({ ...prev, feedback: preset }))}
                      style={{ cursor: 'pointer', fontSize: '0.7rem', padding: '0.2rem 0.5rem', textAlign: 'left' }}
                    >
                      {preset.substring(0, 42)}…
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {confirmModal.action === 'APPROVE' ? 'Approval Notes (Optional):' : 'Rejection Reason (Mandatory):'}
              </label>
              <textarea
                rows={3}
                className="input-field"
                placeholder={confirmModal.action === 'APPROVE' ? 'Add optional congratulations or feedback...' : 'Specify why this submission was rejected...'}
                value={confirmModal.feedback}
                onChange={(e) => setConfirmModal(prev => ({ ...prev, feedback: e.target.value, error: null }))}
                style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            {confirmModal.error && (
              <div style={{ color: 'var(--status-error)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                ⚠️ {confirmModal.error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button type="button" className="btn-secondary" onClick={closeConfirmModal} disabled={confirmModal.isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className={confirmModal.action === 'APPROVE' ? 'btn-primary' : 'btn-danger'}
                onClick={handleExecuteVerdict}
                disabled={confirmModal.isSubmitting}
                style={{ padding: '0.55rem 1.35rem' }}
              >
                {confirmModal.isSubmitting ? 'Processing…' : `Confirm ${confirmModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. REQUEST CLARIFICATION DIALOG ── */}
      {clarificationModal.isOpen && (
        <div className="modal-backdrop" onClick={closeClarificationModal} style={{ zIndex: 2500 }}>
          <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%', padding: '1.75rem', borderLeft: '4px solid var(--accent-cyan)', zIndex: 2501 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>💬</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  Request Proof Clarification
                </h3>
              </div>
              <button type="button" onClick={closeClarificationModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Sends an immediate notification to <strong>{creator?.name || 'the creator'}</strong> requesting additional details, higher resolution screenshots, or privacy settings adjustments. The submission remains PENDING.
            </p>

            {/* Presets */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>Quick Prompts:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {CLARIFICATION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="badge badge-outline"
                    onClick={() => setClarificationModal(prev => ({ ...prev, message: preset }))}
                    style={{ cursor: 'pointer', fontSize: '0.7rem', padding: '0.2rem 0.5rem', textAlign: 'left' }}
                  >
                    {preset.substring(0, 45)}…
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Clarification Message to Creator:
              </label>
              <textarea
                rows={3}
                className="input-field"
                placeholder="Explain what specific proof is needed to complete verification..."
                value={clarificationModal.message}
                onChange={(e) => setClarificationModal(prev => ({ ...prev, message: e.target.value, error: null }))}
                style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            {clarificationModal.error && (
              <div style={{ color: 'var(--status-error)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                ⚠️ {clarificationModal.error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button type="button" className="btn-secondary" onClick={closeClarificationModal} disabled={clarificationModal.isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSendClarification}
                disabled={clarificationModal.isSubmitting}
                style={{ padding: '0.55rem 1.35rem' }}
              >
                {clarificationModal.isSubmitting ? 'Sending…' : 'Send Clarification Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. ADD INTERNAL NOTE DIALOG ── */}
      {noteModal.isOpen && (
        <div className="modal-backdrop" onClick={closeNoteModal} style={{ zIndex: 2500 }}>
          <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%', padding: '1.75rem', borderLeft: '4px solid var(--role-admin)', zIndex: 2501 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>📝</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  Add Internal Moderation Note
                </h3>
              </div>
              <button type="button" onClick={closeNoteModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Internal notes are <strong>strictly private to administrators</strong> and are never shown to the creator. Use for review annotations, verification tracking, or team coordination.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Note Content:</label>
              <textarea
                rows={3}
                className="input-field"
                placeholder="Enter internal review findings or team notes..."
                value={noteModal.note}
                onChange={(e) => setNoteModal(prev => ({ ...prev, note: e.target.value, error: null }))}
                style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            {noteModal.error && (
              <div style={{ color: 'var(--status-error)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                ⚠️ {noteModal.error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button type="button" className="btn-secondary" onClick={closeNoteModal} disabled={noteModal.isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleAddInternalNote(noteModal.note, true)}
                disabled={noteModal.isSubmitting}
                style={{ padding: '0.55rem 1.35rem' }}
              >
                {noteModal.isSubmitting ? 'Saving…' : 'Save Internal Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
