import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMySubmissions,
  createSubmission,
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  testRestrictedEndpoint
} from '../services/api';
import { fetchMyGamification } from '../services/gamificationApi';
import ScreenshotImage from '../components/ScreenshotImage';

const PLATFORMS = [
  { id: 'INSTAGRAM', name: 'Instagram', icon: '📸', color: '#E1306C', class: 'instagram', placeholder: 'https://instagram.com/p/...' },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: '💼', color: '#0A66C2', class: 'linkedin', placeholder: 'https://linkedin.com/feed/update/...' },
  { id: 'FACEBOOK', name: 'Facebook', icon: '👥', color: '#1877F2', class: 'facebook', placeholder: 'https://facebook.com/stories/...' },
];

const ACTIONS = [
  { id: 'LIKE', name: 'Like / Upvote', icon: '❤️', desc: 'Reacted to official post' },
  { id: 'COMMENT', name: 'Discussion Comment', icon: '💬', desc: 'Meaningful feedback posted' },
  { id: 'STORY', name: '24h Story Share', icon: '📱', desc: 'Broadcasted to followers' },
];

export default function UserSpace({ onNavigate, onNavigateToNav }) {
  const { user, logout } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'create' | 'notifications' | 'profile' | 'rbac-test'

  // Data State
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Submissions search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');

  // New submission form state
  const [formData, setFormData] = useState({
    platform: 'INSTAGRAM',
    actionType: 'LIKE',
    postUrl: '',
    screenshotUrl: '',
    description: ''
  });
  const [proofMode, setProofMode] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // RBAC test probe state
  const [rbacTestResult, setRbacTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [probeLatency, setProbeLatency] = useState(null);

  // Load user data
  const loadUserData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [subRes, notifRes, gameRes] = await Promise.allSettled([
        fetchMySubmissions(),
        fetchMyNotifications(),
        fetchMyGamification()
      ]);

      if (subRes.status === 'fulfilled' && subRes.value?.success) {
        setSubmissions(subRes.value.data || []);
      }
      if (notifRes.status === 'fulfilled' && notifRes.value?.success) {
        setNotifications(notifRes.value.data || []);
      }
      if (gameRes.status === 'fulfilled' && gameRes.value) {
        setGamification(gameRes.value);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to load user records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Compute live creator statistics
  const totalSubs = submissions.length;
  const approvedSubs = submissions.filter(s => s.status === 'APPROVED').length;
  const pendingSubs = submissions.filter(s => s.status === 'PENDING').length;
  const rejectedSubs = submissions.filter(s => s.status === 'REJECTED').length;
  const approvalRate = totalSubs > 0 ? Math.round((approvedSubs / totalSubs) * 100) : 100;
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  // File selection handling
  const handleFileChange = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setApiError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setApiError('File is too large. Maximum size is 5MB.');
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    setApiError(null);
  };

  // Submit activity proof
  const handleCreateSubmission = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      let submissionPayload;
      if (proofMode === 'file' && selectedFile) {
        submissionPayload = new FormData();
        submissionPayload.append('platform', formData.platform);
        submissionPayload.append('actionType', formData.actionType);
        submissionPayload.append('postUrl', formData.postUrl);
        submissionPayload.append('description', formData.description);
        submissionPayload.append('screenshot', selectedFile);
      } else {
        submissionPayload = {
          platform: formData.platform,
          actionType: formData.actionType,
          postUrl: formData.postUrl,
          screenshotUrl: formData.screenshotUrl,
          description: formData.description
        };
      }

      const result = await createSubmission(submissionPayload);
      if (result.success) {
        setSuccessMessage('🎉 Activity submission created successfully and queued for admin verification!');
        setFormData({
          platform: 'INSTAGRAM',
          actionType: 'LIKE',
          postUrl: '',
          screenshotUrl: '',
          description: ''
        });
        setSelectedFile(null);
        if (filePreview) URL.revokeObjectURL(filePreview);
        setFilePreview(null);
        setActiveTab('submissions');
        await loadUserData();
      }
    } catch (err) {
      setApiError(err.message || 'Failed to create submission.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark single notification read
  const handleMarkNotifRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await markNotificationRead(id);
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  // Mark all notifications read
  const handleMarkAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await markAllNotificationsRead();
      setSuccessMessage('All notifications marked as read.');
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  // RBAC test probe
  const runRbacTest = async (endpoint, label) => {
    setTestingEndpoint(true);
    setRbacTestResult(null);
    const start = performance.now();
    try {
      const res = await testRestrictedEndpoint(endpoint);
      const latency = Math.round(performance.now() - start);
      setProbeLatency(latency);
      setRbacTestResult({
        endpoint,
        label,
        allowed: true,
        status: 200,
        ...res
      });
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setProbeLatency(latency);
      setRbacTestResult({
        endpoint,
        label,
        allowed: false,
        status: err.status || 403,
        message: err.message || 'Access Forbidden by Server Role Middleware',
        data: err.data || { error: 'Forbidden', roleRequired: 'ADMIN or SUPER_ADMIN', userRole: user?.role }
      });
    } finally {
      setTestingEndpoint(false);
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = !searchTerm ||
      sub.postUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.platform?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    const matchesPlatform = platformFilter === 'ALL' || sub.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const getStatusBadge = (status) => {
    if (status === 'APPROVED') {
      return (
        <span className="user-sub-status-pill approved">
          <span>✓</span> APPROVED
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="user-sub-status-pill rejected">
          <span>✕</span> REJECTED
        </span>
      );
    }
    return (
      <span className="user-sub-status-pill pending">
        <span>⏳</span> PENDING REVIEW
      </span>
    );
  };

  const selectedPlatformObj = PLATFORMS.find(p => p.id === formData.platform) || PLATFORMS[0];
  const selectedActionObj = ACTIONS.find(a => a.id === formData.actionType) || ACTIONS[0];

  return (
    <div className="user-space-wrapper">
      {/* ── 1. Top Creator Hero Banner ── */}
      <section className="user-hero-card" aria-label="Creator Activity Workspace Header">
        <div className="user-hero-inner">
          <div className="user-hero-identity">
            <div className="user-hero-avatar-wrap">
              <div className="user-hero-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-hero-status-pip" title="Account active and verified" />
            </div>

            <div className="user-hero-details">
              <div className="user-hero-badges">
                <span className="user-badge-chip role-creator">
                  🚀 ROLE: CREATOR USER
                </span>
                <span className="user-badge-chip account-active">
                  ✓ VERIFIED ACCOUNT
                </span>
                {gamification?.levelName && (
                  <span className="user-badge-chip xp-tier">
                    {gamification.icon || '🌱'} Level {gamification.currentLevel || 1} · {gamification.levelName}
                  </span>
                )}
              </div>
              <h1>
                <span>Creator Activity Workspace</span>
              </h1>
              <p className="user-hero-email">
                Logged in as <strong>{user?.name}</strong> (<span style={{ color: 'var(--role-user, #34d399)' }}>{user?.email}</span>)
              </p>
            </div>
          </div>

          <div className="user-hero-actions">
            {onNavigateToNav ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onNavigateToNav('dashboard')}
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              >
                📊 Main Dashboard
              </button>
            ) : onNavigate ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onNavigate('portal')}
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              >
                🌐 Public Landing
              </button>
            ) : null}

            <button
              type="button"
              className="btn-refresh-pill"
              onClick={loadUserData}
              disabled={isLoading}
              title="Refresh all metrics"
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

            <button
              type="button"
              className="btn-primary"
              onClick={logout}
              style={{
                fontSize: '0.82rem',
                padding: '0.5rem 1.1rem',
                background: 'rgba(239, 68, 68, 0.85)',
                color: '#fff',
                borderColor: 'rgba(239, 68, 68, 0.4)'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Hero Quick Metrics Ribbon */}
        <div className="user-hero-stats-ribbon">
          <div className="user-hero-stat-box">
            <span className="user-hero-stat-label">Total Proofs</span>
            <span className="user-hero-stat-value">{totalSubs}</span>
          </div>
          <div className="user-hero-stat-box">
            <span className="user-hero-stat-label">Verified Approved</span>
            <span className="user-hero-stat-value success">{approvedSubs}</span>
          </div>
          <div className="user-hero-stat-box">
            <span className="user-hero-stat-label">Pending Review</span>
            <span className="user-hero-stat-value warning">{pendingSubs}</span>
          </div>
          <div className="user-hero-stat-box">
            <span className="user-hero-stat-label">Approval Rate</span>
            <span className="user-hero-stat-value">{approvalRate}%</span>
          </div>
          <div className="user-hero-stat-box">
            <span className="user-hero-stat-label">XP Progression</span>
            <span className="user-hero-stat-value" style={{ color: '#38bdf8' }}>
              {gamification?.totalXP ?? 0} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>XP</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Modern Segmented Tab Navigation ── */}
      <nav className="user-tabs-bar" aria-label="Creator Workspace Views">
        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          <span>📋</span>
          <span>My Submissions</span>
          <span className="user-tab-badge">{submissions.length}</span>
        </button>

        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <span>➕</span>
          <span>Submit Activity Proof</span>
        </button>

        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span>🔔</span>
          <span>Notifications</span>
          {unreadNotifs > 0 ? (
            <span className="user-tab-badge" style={{ background: '#f59e0b', color: '#07090e' }}>
              {unreadNotifs}
            </span>
          ) : (
            <span className="user-tab-badge">{notifications.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span>👤</span>
          <span>Creator Profile &amp; XP</span>
        </button>

        <button
          type="button"
          className={`user-tab-btn tab-security ${activeTab === 'rbac-test' ? 'active tab-security' : ''}`}
          onClick={() => setActiveTab('rbac-test')}
        >
          <span>🛡️</span>
          <span>RBAC Defense Probe</span>
        </button>
      </nav>

      {/* ── Global Feedback Alerts ── */}
      {successMessage && (
        <div
          className="user-pane-card"
          style={{
            padding: '1rem 1.4rem',
            borderLeft: '4px solid var(--status-success, #10b981)',
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#34d399', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {apiError && (
        <div
          className="user-pane-card"
          style={{
            padding: '1rem 1.4rem',
            borderLeft: '4px solid var(--status-error, #ef4444)',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>⚠️</span>
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── TAB 1: My Submissions ── */}
      {activeTab === 'submissions' && (
        <div className="user-pane-card">
          <div className="user-pane-header">
            <div className="user-pane-title-group">
              <h2>
                <span>📋</span>
                <span>My Verified Engagement Activities</span>
              </h2>
              <p>
                Browse your submitted proof of engagement, verification verdicts, and administrative review notes.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setActiveTab('create')}
              style={{
                fontSize: '0.84rem',
                padding: '0.5rem 1.15rem',
                background: 'var(--role-user, #34d399)',
                color: '#07090e',
                fontWeight: 700
              }}
            >
              ➕ Submit New Proof
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="user-subs-controls">
            <div className="user-search-input-wrap">
              <span className="user-search-icon">🔍</span>
              <input
                type="text"
                className="user-search-input"
                placeholder="Search post URL, description, or platform…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="user-filter-pills">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Status:</span>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`user-filter-pill ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'ALL' ? 'All' : st === 'PENDING' ? '⏳ Pending' : st === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
                </button>
              ))}

              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, marginLeft: '0.5rem' }}>Platform:</span>
              {['ALL', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK'].map((pl) => (
                <button
                  key={pl}
                  type="button"
                  className={`user-filter-pill ${platformFilter === pl ? 'active' : ''}`}
                  onClick={() => setPlatformFilter(pl)}
                >
                  {pl === 'ALL' ? 'All' : pl === 'INSTAGRAM' ? '📸 Instagram' : pl === 'LINKEDIN' ? '💼 LinkedIn' : '👥 Facebook'}
                </button>
              ))}
            </div>
          </div>

          {/* Submissions List */}
          {isLoading && submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
              <div className="status-dot checking" style={{ width: '20px', height: '20px', margin: '0 auto 1rem auto' }} />
              <p>Loading your activity submissions…</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📤</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '1.1rem' }}>
                {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL'
                  ? 'No matching submissions found'
                  : 'No activity proof submitted yet'}
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.86rem', maxWidth: '380px', marginInline: 'auto' }}>
                {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL'
                  ? 'Try clearing your active search filter or status selection.'
                  : 'Submit social engagement proofs to earn creator points, unlock achievement levels, and rise on the leaderboard.'}
              </p>
              {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL' ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setPlatformFilter('ALL'); }}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setActiveTab('create')}
                  style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem', background: 'var(--role-user, #34d399)', color: '#07090e', fontWeight: 700 }}
                >
                  Submit Your First Activity Proof →
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredSubmissions.map((sub) => {
                const pInfo = PLATFORMS.find(p => p.id === sub.platform) || { name: sub.platform, icon: '🌐', class: 'default' };
                return (
                  <article key={sub.id} className="user-sub-card">
                    <div className="user-sub-card-header">
                      <div className="user-sub-platform-badges">
                        <span className={`platform-pill ${pInfo.class}`}>
                          <span>{pInfo.icon}</span>
                          <span>{pInfo.name}</span>
                        </span>
                        <span className="action-pill">
                          {sub.actionType}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontFamily: 'monospace' }}>
                          ID: #{sub.id}
                        </span>
                      </div>

                      <div>
                        {getStatusBadge(sub.status)}
                      </div>
                    </div>

                    {sub.description && (
                      <p className="user-sub-desc">
                        {sub.description}
                      </p>
                    )}

                    <div className="user-sub-link-row">
                      <strong style={{ color: '#94a3b8' }}>Post URL:</strong>
                      <a
                        href={sub.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open external target post in a new tab"
                      >
                        <span>{sub.postUrl}</span>
                        <span style={{ fontSize: '0.75rem' }}>↗</span>
                      </a>
                    </div>

                    {/* Screenshot Evidence Preview */}
                    {sub.screenshotUrl && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginBottom: '0.4rem', fontWeight: 600 }}>
                          📸 Attached Evidence Proof:
                        </div>
                        <ScreenshotImage
                          screenshotUrl={sub.screenshotUrl}
                          alt={`Submission #${sub.id} proof`}
                          thumbnailStyle={{ width: '100px', height: '65px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}
                        />
                      </div>
                    )}

                    {/* Moderator Feedback */}
                    {sub.reviews && sub.reviews.length > 0 && (
                      <div className="moderator-feedback-box">
                        <div className="moderator-feedback-header">
                          <span>🛡️</span>
                          <span>Reviewer Feedback ({sub.reviews[0].adminName || 'Moderator'}):</span>
                        </div>
                        <p className="moderator-feedback-text">
                          "{sub.reviews[0].feedback || 'Verified activity matches community guidelines.'}"
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span>Submitted on {new Date(sub.createdAt).toLocaleString()}</span>
                      <span>Security: Server-Verified Token</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Submit Activity Proof ── */}
      {activeTab === 'create' && (
        <div className="user-pane-card">
          <div className="user-pane-header">
            <div className="user-pane-title-group">
              <h2>
                <span>➕</span>
                <span>Submit Social Media Activity Proof</span>
              </h2>
              <p>
                Authorized role: <strong style={{ color: 'var(--role-user, #34d399)' }}>USER</strong>. Submissions are securely processed via <code style={{ color: '#38bdf8' }}>POST /api/submissions</code>.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActiveTab('submissions')}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
            >
              ← Back to My Submissions
            </button>
          </div>

          <div className="submit-studio-grid">
            {/* Form Column */}
            <form onSubmit={handleCreateSubmission}>
              {/* Platform Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-group-label">1. Select Target Social Platform *</label>
                <div className="platform-select-grid">
                  {PLATFORMS.map((p) => {
                    const isSelected = formData.platform === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`platform-card-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, platform: p.id })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFormData({ ...formData, platform: p.id }); }}
                      >
                        <span className="p-icon">{p.icon}</span>
                        <span className="p-name">{p.name}</span>
                        {isSelected && <span style={{ fontSize: '0.7rem', color: '#34d399' }}>✓ Selected</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Type Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-group-label">2. Select Action Type *</label>
                <div className="action-select-grid">
                  {ACTIONS.map((a) => {
                    const isSelected = formData.actionType === a.id;
                    return (
                      <div
                        key={a.id}
                        className={`action-card-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, actionType: a.id })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFormData({ ...formData, actionType: a.id }); }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{a.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{a.name}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{a.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Post URL */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-group-label">3. Target Post / Reel URL *</label>
                <input
                  type="url"
                  required
                  className="user-form-input"
                  placeholder={selectedPlatformObj.placeholder}
                  value={formData.postUrl}
                  onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '0.35rem' }}>
                  Paste the direct public link to the official post you engaged with.
                </div>
              </div>

              {/* Proof Attachment Mode (File Upload vs URL) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-group-label">4. Screenshot Proof Evidence (Optional)</label>
                <div className="proof-mode-toggle">
                  <button
                    type="button"
                    className={`proof-toggle-btn ${proofMode === 'file' ? 'active' : ''}`}
                    onClick={() => setProofMode('file')}
                  >
                    📁 Direct Image Upload
                  </button>
                  <button
                    type="button"
                    className={`proof-toggle-btn ${proofMode === 'url' ? 'active' : ''}`}
                    onClick={() => setProofMode('url')}
                  >
                    🔗 External URL
                  </button>
                </div>

                {proofMode === 'file' ? (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                    />

                    {filePreview ? (
                      <div className="proof-preview-container">
                        <img src={filePreview} alt="Proof preview" className="proof-thumb-preview" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                            {selectedFile?.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                            {(selectedFile?.size / 1024).toFixed(1)} KB · Image ready for verification
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedFile(null);
                            if (filePreview) URL.revokeObjectURL(filePreview);
                            setFilePreview(null);
                          }}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`proof-dropzone ${isDragOver ? 'dragover' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
                        }}
                      >
                        <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>📷</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                          Click or drag image file here to attach proof
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '0.2rem' }}>
                          Supports JPEG, PNG, WebP up to 5 MB
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      className="user-form-input"
                      placeholder="https://example.com/screenshot.jpg"
                      value={formData.screenshotUrl}
                      onChange={(e) => setFormData({ ...formData, screenshotUrl: e.target.value })}
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '0.35rem' }}>
                      Provide a direct link to an image host or public screenshot permalink.
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Description */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-group-label">5. Activity Description &amp; Verification Notes</label>
                <textarea
                  rows={3}
                  className="user-form-textarea"
                  placeholder="Provide brief context (e.g., 'Liked the official campus hackathon announcement post and added a congratulatory comment')."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Submission CTA */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    background: 'var(--role-user, #34d399)',
                    color: '#07090e',
                    boxShadow: '0 4px 18px rgba(52, 211, 153, 0.35)'
                  }}
                >
                  {submitting ? 'Encrypting & Submitting Proof…' : 'Submit Activity Proof →'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab('submissions')}
                  style={{ padding: '0.75rem 1.25rem', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Live Card Preview Column */}
            <div>
              <div className="live-preview-box">
                <span className="live-preview-badge">
                  <span>👁️</span> Live Submission Preview
                </span>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span className={`platform-pill ${selectedPlatformObj.class}`}>
                    <span>{selectedPlatformObj.icon}</span>
                    <span>{selectedPlatformObj.name}</span>
                  </span>
                  <span className="action-pill">
                    {selectedActionObj.icon} {selectedActionObj.name}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: '0 0 0.65rem 0', minHeight: '36px' }}>
                  {formData.description || 'Your activity description will appear here once typed.'}
                </p>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginBottom: '0.65rem', wordBreak: 'break-all' }}>
                  <strong>Target Link:</strong>{' '}
                  <span style={{ color: '#38bdf8' }}>
                    {formData.postUrl || selectedPlatformObj.placeholder}
                  </span>
                </div>

                {filePreview && (
                  <div style={{ marginBottom: '0.65rem' }}>
                    <img
                      src={filePreview}
                      alt="Proof Preview"
                      style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>Status: ⏳ Pending Moderator Review</span>
                  <span>XP: +10-25 XP on approval</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Notifications ── */}
      {activeTab === 'notifications' && (
        <div className="user-pane-card">
          <div className="user-pane-header">
            <div className="user-pane-title-group">
              <h2>
                <span>🔔</span>
                <span>Verification Notifications &amp; Alerts</span>
              </h2>
              <p>
                Receive live updates whenever an administrator verifies, approves, or provides feedback on your activity.
              </p>
            </div>
            {unreadNotifs > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleMarkAllRead}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              >
                ✓ Mark All as Read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔕</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>No notifications received yet</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                When your submitted activities are evaluated by administrators, review verdicts will show here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((notif) => {
                const isApproved = notif.title?.toLowerCase().includes('approved') || notif.message?.toLowerCase().includes('approved');
                const isRejected = notif.title?.toLowerCase().includes('rejected') || notif.message?.toLowerCase().includes('rejected');
                const icon = isApproved ? '🎉' : isRejected ? '❌' : '📢';
                const borderColor = isApproved ? '#10b981' : isRejected ? '#ef4444' : 'var(--role-user, #34d399)';

                return (
                  <div
                    key={notif.id}
                    style={{
                      background: notif.isRead ? 'rgba(15, 23, 42, 0.45)' : 'rgba(52, 211, 153, 0.08)',
                      borderLeft: `3px solid ${borderColor}`,
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-sm, 8px)',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <span style={{ background: '#34d399', color: '#07090e', fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
                          {notif.message}
                        </p>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '0.4rem' }}>
                          {new Date(notif.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!notif.isRead && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleMarkNotifRead(notif.id)}
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', flexShrink: 0 }}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Creator Identity & XP Profile ── */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Creator Credentials Card */}
          <div className="user-pane-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👤</span> Creator Identity Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(10, 15, 28, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Full Name</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{user?.name}</div>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(10, 15, 28, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Account Email</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{user?.email}</div>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(10, 15, 28, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Role</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--role-user, #34d399)', marginTop: '0.2rem' }}>{user?.role}</div>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(10, 15, 28, 0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 700 }}>User ID</div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#94a3b8', marginTop: '0.2rem' }}>{user?.id}</div>
              </div>
            </div>
          </div>

          {/* Gamification & XP Card */}
          <div className="user-pane-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎮</span> Gamification &amp; XP Progression
            </h3>

            {gamification ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(52, 211, 153, 0.08)', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
                  <span style={{ fontSize: '2.5rem' }}>{gamification.icon || '🌱'}</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 700 }}>Current Rank</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                      Level {gamification.currentLevel || 1} · {gamification.levelName || 'Novice'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
                      Total Earned: <strong>{gamification.totalXP || 0} XP</strong>
                    </div>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    <span>Progress to Level {(gamification.currentLevel || 1) + 1}</span>
                    <span>{gamification.progressPercentage || 0}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, gamification.progressPercentage || 0))}%`,
                        background: 'linear-gradient(90deg, #34d399, #06b6d4)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '0.35rem', textAlign: 'right' }}>
                    {gamification.xpRemaining != null ? `${gamification.xpRemaining} XP needed for next milestone` : 'Max Level achieved'}
                  </div>
                </div>

                <div style={{ padding: '0.75rem 1rem', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  💡 <strong>Earn more XP:</strong> Submit social media engagement proof with clear screenshot evidence. Each approved like earns +10 XP, comments earn +15 XP, and 24h stories earn +25 XP!
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>Loading gamification statistics…</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: RBAC API Defense Probe ── */}
      {activeTab === 'rbac-test' && (
        <div className="user-pane-card" style={{ borderLeft: '4px solid var(--status-error, #ef4444)' }}>
          <div className="user-pane-header">
            <div className="user-pane-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="user-badge-chip" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  SECURITY AUDIT SUITE
                </span>
                <span className="user-badge-chip" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  SERVER-ENFORCED MIDDLEWARE
                </span>
              </div>
              <h2>
                <span>🛡️</span>
                <span>Backend Role Middleware Defense Probe</span>
              </h2>
              <p style={{ maxWidth: '800px', lineHeight: 1.6 }}>
                Security mandate: <em>"Do not rely only on frontend hiding. Every protected API must be secured by backend middleware. Test each role against restricted endpoints."</em>
                <br />
                Issue live authenticated HTTP requests using your current <strong>USER</strong> JWT token against server endpoints to verify that unauthorized requests are rejected at the server level.
              </p>
            </div>
          </div>

          {/* Endpoint Probes */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className="rbac-probe-btn"
              disabled={testingEndpoint}
              onClick={() => runRbacTest('/submissions', 'GET /api/submissions (Admin Review Queue)')}
            >
              <span>🔒</span>
              <span>Probe /api/submissions (Expect 403 Forbidden)</span>
            </button>

            <button
              type="button"
              className="rbac-probe-btn"
              disabled={testingEndpoint}
              onClick={() => runRbacTest('/users', 'GET /api/users (User Directory)')}
            >
              <span>🔒</span>
              <span>Probe /api/users (Expect 403 Forbidden)</span>
            </button>

            <button
              type="button"
              className="rbac-probe-btn"
              disabled={testingEndpoint}
              onClick={() => runRbacTest('/superadmin/audit-logs', 'GET /api/superadmin/audit-logs (Audit Logs)')}
            >
              <span>🔒</span>
              <span>Probe /api/superadmin/audit-logs (Expect 403 Forbidden)</span>
            </button>

            <button
              type="button"
              className="rbac-probe-btn authorized"
              disabled={testingEndpoint}
              onClick={() => runRbacTest('/submissions/my', 'GET /api/submissions/my (Creator Self Submissions)')}
            >
              <span>🔓</span>
              <span>Probe /api/submissions/my (Expect 200 OK)</span>
            </button>
          </div>

          {testingEndpoint && (
            <div style={{ padding: '1rem', color: '#38bdf8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="status-dot checking" style={{ width: '12px', height: '12px' }} />
              <span>Transmitting live authenticated request to backend middleware…</span>
            </div>
          )}

          {/* Probe Terminal Display */}
          {rbacTestResult && (
            <div className="rbac-terminal-wrap">
              <div className="rbac-terminal-bar">
                <div className="terminal-dots">
                  <div className="terminal-dot red" />
                  <div className="terminal-dot yellow" />
                  <div className="terminal-dot green" />
                </div>
                <div className="terminal-title">
                  {rbacTestResult.endpoint} · {probeLatency != null ? `${probeLatency}ms latency` : ''}
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: rbacTestResult.status === 403 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: rbacTestResult.status === 403 ? '#f87171' : '#34d399',
                    border: `1px solid ${rbacTestResult.status === 403 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                  }}
                >
                  HTTP {rbacTestResult.status} {rbacTestResult.status === 403 ? 'FORBIDDEN (PROTECTED)' : 'AUTHORIZED'}
                </span>
              </div>

              <div className="rbac-terminal-body">
                <div style={{ marginBottom: '0.75rem', color: rbacTestResult.status === 403 ? '#fca5a5' : '#86efac' }}>
                  {rbacTestResult.status === 403 ? (
                    <>
                      🛡️ <strong>BACKEND DEFENSE CONFIRMED:</strong> Server role-based middleware intercepted and rejected the unauthorized request as required. The database was never queried.
                    </>
                  ) : (
                    <>
                      ✓ <strong>AUTHORIZED:</strong> Endpoint successfully authorized request for Creator USER role.
                    </>
                  )}
                </div>

                <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                  // Server Response Payload:
                </div>
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    padding: '1rem',
                    borderRadius: '6px',
                    margin: 0,
                    overflowX: 'auto',
                    color: '#e2e8f0',
                    fontSize: '0.8rem',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  {JSON.stringify(rbacTestResult.data || rbacTestResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
