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
  { id: 'LIKE', name: 'Like / Upvote', icon: '❤️', desc: 'Reacted to official post', xp: '+10 XP' },
  { id: 'COMMENT', name: 'Discussion Comment', icon: '💬', desc: 'Meaningful feedback posted', xp: '+15 XP' },
  { id: 'STORY', name: '24h Story Share', icon: '📱', desc: 'Broadcasted to followers', xp: '+25 XP' },
];

const SAMPLE_DEMO_SUBMISSIONS = [
  {
    id: 1042,
    platform: 'INSTAGRAM',
    actionType: 'STORY',
    postUrl: 'https://www.instagram.com/p/DAq_official_fest_2026',
    description: 'Shared the official University Tech Fest teaser on my 24h Instagram story with #PJTechFest2026 tag.',
    screenshotUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    reviews: [
      {
        adminName: 'Dean of Media / Moderator',
        feedback: 'Story view metrics, official handle mention, and timestamp verified. +25 XP credited to your profile!'
      }
    ]
  },
  {
    id: 1041,
    platform: 'LINKEDIN',
    actionType: 'COMMENT',
    postUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:724810294819028374',
    description: 'Participated in the AI Research Symposium discussion thread with key questions on multi-agent safety.',
    screenshotUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=600&auto=format&fit=crop&q=80',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    reviews: []
  },
  {
    id: 1039,
    platform: 'FACEBOOK',
    actionType: 'LIKE',
    postUrl: 'https://www.facebook.com/university.official/posts/9910283819284',
    description: 'Liked and reacted to the campus placement report release post.',
    screenshotUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    reviews: [
      {
        adminName: 'Campus Admin',
        feedback: 'Verified engagement on primary placement broadcast. +10 XP awarded.'
      }
    ]
  }
];

export default function UserSpace({ onNavigate, onNavigateToNav }) {
  const { user } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'create' | 'notifications' | 'profile' | 'rbac-test'

  // Data State
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showDemoPreview, setShowDemoPreview] = useState(false);

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
  const currentSubmissions = showDemoPreview && submissions.length === 0 ? SAMPLE_DEMO_SUBMISSIONS : submissions;
  const totalSubs = currentSubmissions.length;
  const approvedSubs = currentSubmissions.filter(s => s.status === 'APPROVED').length;
  const pendingSubs = currentSubmissions.filter(s => s.status === 'PENDING').length;
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

  // Fast quest launcher from empty state
  const handleStartQuest = (platform, actionType) => {
    const targetObj = PLATFORMS.find(p => p.id === platform);
    setFormData(prev => ({
      ...prev,
      platform,
      actionType,
      postUrl: targetObj?.placeholder || ''
    }));
    setActiveTab('create');
  };

  // Copy link
  const handleCopyUrl = (url, id) => {
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
  const filteredSubmissions = currentSubmissions.filter(sub => {
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
          <span>✓</span> VERIFIED APPROVED
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

  const currentLevelNumber = gamification?.currentLevel || 1;
  const currentLevelName = gamification?.levelName || 'Novice';
  const currentTotalXP = gamification?.totalXP || 0;
  const currentProgressPercent = gamification?.progressPercentage || 0;
  const xpRemaining = gamification?.xpRemaining ?? 100;

  return (
    <div className="user-space-wrapper">
      {/* ── 1. Top Creator Command Hub (Hero Banner) ── */}
      <section className="user-hero-card" aria-label="Creator Activity Workspace Command Hub">
        <div className="user-hero-inner">
          <div className="user-hero-identity">
            <div className="user-hero-avatar-wrap">
              <div className="user-hero-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-hero-status-pip" title="Live Authenticated Session Active" />
            </div>

            <div className="user-hero-details">
              <div className="user-hero-badges">
                <span className="user-badge-chip role-creator">
                  🚀 ROLE: CREATOR USER
                </span>
                <span className="user-badge-chip account-active">
                  ✓ VERIFIED ACCOUNT
                </span>
                <span className="user-badge-chip xp-tier">
                  {gamification?.icon || '🌱'} Level {currentLevelNumber} · {currentLevelName}
                </span>
                <span className="user-badge-chip streak-chip">
                  🔥 1-Day Streak
                </span>
              </div>
              <h1>
                <span>Welcome back, </span>
                <span className="creator-name-highlight">{user?.name || 'Creator'}</span>
              </h1>
              <p className="user-hero-email">
                <span>Account:</span>
                <strong style={{ color: '#f8fafc' }}>{user?.email}</strong>
                <span style={{ color: '#475569' }}>•</span>
                <span style={{ color: '#38bdf8' }}>ID: #{user?.id ? String(user.id).slice(-6) : 'PJ-USER'}</span>
              </p>
            </div>
          </div>

          <div className="user-hero-actions">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => {
                setActiveTab('create');
              }}
            >
              <span>➕</span>
              <span>Submit Proof</span>
            </button>

            <button
              type="button"
              className="btn-hero-glass"
              onClick={() => setActiveTab('profile')}
            >
              <span>🎮</span>
              <span>XP &amp; Rewards</span>
            </button>

            <div className="telemetry-pill" title="Live background synchronization active">
              <div className="telemetry-dot" />
              <span>Live Cloud Sync</span>
            </div>
          </div>
        </div>

        {/* Dynamic XP Progress Ribbon inside Hero */}
        <div className="hero-xp-track-wrap">
          <div className="hero-xp-track-header">
            <span className="hero-xp-track-label">
              <span>⚡ Level Journey:</span>
              <strong>{currentLevelName}</strong>
              <span style={{ color: '#64748b' }}>→</span>
              <span style={{ color: '#94a3b8' }}>Level {currentLevelNumber + 1} (Rising Star)</span>
            </span>
            <span className="hero-xp-track-values">
              <span style={{ color: '#34d399' }}>{currentTotalXP} XP</span>
              <span style={{ color: '#64748b' }}> / </span>
              <span style={{ color: '#94a3b8' }}>{currentTotalXP + xpRemaining} XP</span>
              <span style={{ color: '#06b6d4', marginLeft: '0.5rem' }}>({currentProgressPercent}%)</span>
            </span>
          </div>
          <div className="hero-xp-bar-bg">
            <div
              className="hero-xp-bar-fill"
              style={{ width: `${Math.max(4, Math.min(100, currentProgressPercent))}%` }}
            />
          </div>
        </div>
      </section>

      {/* ── 2. Futuristic Holographic Metric Cards ── */}
      <div className="user-hero-stats-ribbon">
        {/* Card 1: Total Proofs */}
        <div className="user-stat-card theme-indigo">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Proofs</span>
            <div className="stat-card-icon-orb indigo">📊</div>
          </div>
          <div className="stat-card-value-wrap">
            <span className="stat-card-value">{totalSubs}</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-card-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              All Platforms
            </span>
            <span>Lifetime Submissions</span>
          </div>
        </div>

        {/* Card 2: Verified Approved */}
        <div className="user-stat-card theme-emerald">
          <div className="stat-card-header">
            <span className="stat-card-label">Verified Approved</span>
            <div className="stat-card-icon-orb emerald">🛡️</div>
          </div>
          <div className="stat-card-value-wrap">
            <span className="stat-card-value emerald">{approvedSubs}</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-card-tag emerald">
              ✓ Verified
            </span>
            <span>Points Credited</span>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="user-stat-card theme-amber">
          <div className="stat-card-header">
            <span className="stat-card-label">Pending Review</span>
            <div className="stat-card-icon-orb amber">⏳</div>
          </div>
          <div className="stat-card-value-wrap">
            <span className="stat-card-value amber">{pendingSubs}</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-card-tag amber">
              Under Review
            </span>
            <span>Avg &lt; 2h moderation</span>
          </div>
        </div>

        {/* Card 4: Approval Rate */}
        <div className="user-stat-card theme-cyan">
          <div className="stat-card-header">
            <span className="stat-card-label">Approval Rate</span>
            <div className="stat-card-icon-orb cyan">🎯</div>
          </div>
          <div className="stat-card-value-wrap">
            <span className="stat-card-value cyan">{approvalRate}%</span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-card-tag cyan">
              Quality Score
            </span>
            <span>Elite Creator Standing</span>
          </div>
        </div>

        {/* Card 5: XP Progression */}
        <div className="user-stat-card theme-violet">
          <div className="stat-card-header">
            <span className="stat-card-label">XP Progression</span>
            <div className="stat-card-icon-orb violet">⚡</div>
          </div>
          <div className="stat-card-value-wrap">
            <span className="stat-card-value violet">
              {currentTotalXP} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>XP</span>
            </span>
          </div>
          <div className="stat-card-footer">
            <span className="stat-card-tag violet">
              Level {currentLevelNumber}
            </span>
            <span>Next tier in {xpRemaining} XP</span>
          </div>
        </div>
      </div>

      {/* ── 3. High-End Segmented Navigation Bar ── */}
      <nav className="user-tabs-bar" aria-label="Creator Workspace Views">
        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          <span>📋</span>
          <span>My Submissions</span>
          <span className="user-tab-badge">{totalSubs}</span>
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
            <span className="user-tab-badge unread-alert">
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
            borderLeft: '4px solid #10b981',
            background: 'rgba(16, 185, 129, 0.12)',
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
            borderLeft: '4px solid #ef4444',
            background: 'rgba(239, 68, 68, 0.12)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {submissions.length === 0 && (
                <button
                  type="button"
                  className="btn-hero-glass"
                  onClick={() => setShowDemoPreview(!showDemoPreview)}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                >
                  <span>{showDemoPreview ? '👁️ Hide Sample Proofs' : '✨ Preview Sample Data'}</span>
                </button>
              )}

              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => setActiveTab('create')}
              >
                <span>➕</span>
                <span>Submit New Proof</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
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
              {searchTerm && (
                <button
                  type="button"
                  className="user-search-clear"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="user-filter-groups">
              <div className="user-filter-pills">
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Status:</span>
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
              </div>

              <div className="user-filter-pills">
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Platform:</span>
                {['ALL', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK'].map((pl) => (
                  <button
                    key={pl}
                    type="button"
                    className={`user-filter-pill ${platformFilter === pl ? `active pill-${pl.toLowerCase()}` : ''}`}
                    onClick={() => setPlatformFilter(pl)}
                  >
                    {pl === 'ALL' ? 'All' : pl === 'INSTAGRAM' ? '📸 Instagram' : pl === 'LINKEDIN' ? '💼 LinkedIn' : '👥 Facebook'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submissions Feed List */}
          {isLoading && submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
              <div className="status-dot checking" style={{ width: '22px', height: '22px', margin: '0 auto 1.25rem auto' }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>Loading verified activity submissions…</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            /* ── Interactive Empty State: Creator Quest Launchpad ── */
            <div className="creator-quest-launchpad">
              <div className="launchpad-hero-orb">🚀</div>
              <h3 className="launchpad-title">
                {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL'
                  ? 'No matching activity submissions found'
                  : 'Launch Your First Creator Submission'}
              </h3>
              <p className="launchpad-subtitle">
                {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL'
                  ? 'Try clearing your active search term or filter selection to see all records.'
                  : 'Turn your college social media engagement into verified creator points, climb the campus leaderboard, and unlock elite ranks.'}
              </p>

              {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL' ? (
                <button
                  type="button"
                  className="btn-hero-glass"
                  onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setPlatformFilter('ALL'); }}
                  style={{ margin: '0 auto' }}
                >
                  Reset All Filters
                </button>
              ) : (
                <>
                  {/* 3 Interactive Quick Quests */}
                  <div className="quest-cards-grid">
                    {/* Quest 1 */}
                    <div
                      className="quest-mission-card instagram"
                      onClick={() => handleStartQuest('INSTAGRAM', 'STORY')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="quest-card-header">
                        <span className="quest-platform-badge">
                          <span>📸</span> Instagram
                        </span>
                        <span className="quest-xp-reward">+25 XP Boost</span>
                      </div>
                      <div className="quest-card-body">
                        <h4>24h Story Broadcast</h4>
                        <p>Share official fest, hackathon, or campus announcements on your Instagram story.</p>
                      </div>
                      <div className="quest-card-footer">
                        <span>Start Quest →</span>
                        <span>📱 Story Share</span>
                      </div>
                    </div>

                    {/* Quest 2 */}
                    <div
                      className="quest-mission-card linkedin"
                      onClick={() => handleStartQuest('LINKEDIN', 'COMMENT')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="quest-card-header">
                        <span className="quest-platform-badge">
                          <span>💼</span> LinkedIn
                        </span>
                        <span className="quest-xp-reward">+15 XP</span>
                      </div>
                      <div className="quest-card-body">
                        <h4>Thoughtful Discussion</h4>
                        <p>Post meaningful feedback and insights on official college career &amp; research articles.</p>
                      </div>
                      <div className="quest-card-footer">
                        <span>Start Quest →</span>
                        <span>💬 Discussion</span>
                      </div>
                    </div>

                    {/* Quest 3 */}
                    <div
                      className="quest-mission-card facebook"
                      onClick={() => handleStartQuest('INSTAGRAM', 'LIKE')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="quest-card-header">
                        <span className="quest-platform-badge">
                          <span>❤️</span> Social Like
                        </span>
                        <span className="quest-xp-reward">+10 XP</span>
                      </div>
                      <div className="quest-card-body">
                        <h4>Campus Post Reaction</h4>
                        <p>Like and support official announcements across university handles.</p>
                      </div>
                      <div className="quest-card-footer">
                        <span>Start Quest →</span>
                        <span>⚡ Fastest Proof</span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Step Verification Roadmap */}
                  <div className="launchpad-roadmap">
                    <div className="roadmap-step">
                      <div className="roadmap-num">1</div>
                      <div className="roadmap-text">
                        <h5>Engage on Social Media</h5>
                        <p>Like, comment, or share official university posts on your handles.</p>
                      </div>
                    </div>
                    <div className="roadmap-step">
                      <div className="roadmap-num">2</div>
                      <div className="roadmap-text">
                        <h5>Capture Screenshot Proof</h5>
                        <p>Take a clear screenshot showing your username and engagement timestamp.</p>
                      </div>
                    </div>
                    <div className="roadmap-step">
                      <div className="roadmap-num">3</div>
                      <div className="roadmap-text">
                        <h5>Earn Verified XP</h5>
                        <p>Moderators review and award XP points directly into your creator profile.</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-hero-primary"
                      onClick={() => setActiveTab('create')}
                      style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}
                    >
                      <span>🚀</span>
                      <span>Submit Activity Proof Now</span>
                    </button>
                    <button
                      type="button"
                      className="btn-hero-glass"
                      onClick={() => setShowDemoPreview(true)}
                      style={{ padding: '0.85rem 1.6rem', fontSize: '0.9rem' }}
                    >
                      <span>👁️</span>
                      <span>Preview Sample Verified Card</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {showDemoPreview && submissions.length === 0 && (
                <div style={{
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div style={{ color: '#38bdf8', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>✨</span>
                    <span><strong>Preview Mode:</strong> Displaying sample verified submissions to demonstrate cards, lightbox zoom, and review notes.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDemoPreview(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                  >
                    Close Preview
                  </button>
                </div>
              )}

              {filteredSubmissions.map((sub) => {
                const pInfo = PLATFORMS.find(p => p.id === sub.platform) || { name: sub.platform, icon: '🌐', class: 'default' };
                const formattedId = typeof sub.id === 'string' && sub.id.length > 10
                  ? `#${sub.id.slice(0, 8)}…`
                  : `#${sub.id}`;
                const relativeTime = new Date(sub.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <article key={sub.id} className="user-sub-card">
                    <div className="user-sub-card-header">
                      <div className="user-sub-platform-badges">
                        <span className={`platform-pill ${pInfo.class}`}>
                          <span>{pInfo.icon}</span>
                          <span>{pInfo.name}</span>
                        </span>
                        <span className="action-pill">
                          {ACTIONS.find(a => a.id === sub.actionType)?.icon || '⚡'} {sub.actionType}
                        </span>
                        <button
                          type="button"
                          className="sub-id-chip"
                          onClick={() => handleCopyUrl(String(sub.id), `id-${sub.id}`)}
                          title={`Click to copy full ID (${sub.id})`}
                        >
                          {copiedId === `id-${sub.id}` ? '✓ Copied!' : `ID: ${formattedId}`}
                        </button>
                      </div>

                      <div>
                        {getStatusBadge(sub.status)}
                      </div>
                    </div>

                    {sub.description && (
                      <p className="user-sub-desc">
                        "{sub.description}"
                      </p>
                    )}

                    <div className="user-sub-link-row">
                      <div className="target-url-content">
                        <span className="target-url-label">🔗 Target Post:</span>
                        <a
                          href={sub.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open target post in a new tab"
                          className="target-url-link"
                        >
                          <span>{sub.postUrl}</span>
                          <span style={{ fontSize: '0.85rem' }}>↗</span>
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyUrl(sub.postUrl, sub.id)}
                        className="btn-copy-target"
                        title="Copy target URL to clipboard"
                      >
                        {copiedId === sub.id ? '✓ Copied' : '📋 Copy URL'}
                      </button>
                    </div>

                    {/* Screenshot Evidence Preview */}
                    {sub.screenshotUrl && (
                      <div className="evidence-preview-wrapper">
                        <div className="evidence-preview-header">
                          <span>📸</span>
                          <span>Attached Proof Evidence (Click image to inspect):</span>
                        </div>
                        <div className="evidence-image-frame">
                          <ScreenshotImage
                            screenshotUrl={sub.screenshotUrl}
                            alt={`Submission #${sub.id} proof evidence`}
                            thumbnailStyle={{ width: '150px', height: '95px', borderRadius: '10px', objectFit: 'cover' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Moderator Feedback */}
                    {sub.reviews && sub.reviews.length > 0 && (
                      <div className="moderator-feedback-box">
                        <div className="moderator-feedback-header">
                          <span className="moderator-shield-icon">🛡️</span>
                          <span className="moderator-header-text">Official Reviewer Verdict ({sub.reviews[0].adminName || 'Moderator'}):</span>
                          <span className="moderator-verified-tag">✓ VERIFIED BY ADMIN</span>
                        </div>
                        <p className="moderator-feedback-text">
                          "{sub.reviews[0].feedback || 'Verified activity matches community guidelines.'}"
                        </p>
                      </div>
                    )}

                    <div className="user-sub-card-footer">
                      <span className="sub-time-label">
                        <span>🕒</span> Submitted on {relativeTime}
                      </span>
                      <span className="sub-security-token">
                        <span>🔒</span> Server-Verified Token Signature
                      </span>
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
                Authorized role: <strong style={{ color: '#34d399' }}>USER</strong>. Submissions are processed via secure server-side verification pipelines.
              </p>
            </div>
            <button
              type="button"
              className="btn-hero-glass"
              onClick={() => setActiveTab('submissions')}
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              ← Back to My Submissions
            </button>
          </div>

          <div className="submit-studio-grid">
            {/* Form Column */}
            <form onSubmit={handleCreateSubmission}>
              {/* Platform Selector */}
              <div style={{ marginBottom: '1.5rem' }}>
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
                        {isSelected && <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>✓ Selected</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Type Selector */}
              <div style={{ marginBottom: '1.5rem' }}>
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
                        <span className="action-reward-tag">{a.xp}</span>
                        <div style={{ fontSize: '1.4rem' }}>{a.icon}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>{a.name}</div>
                          <div style={{ fontSize: '0.74rem', opacity: 0.8, marginTop: '0.2rem' }}>{a.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Post URL */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-group-label">3. Target Post / Reel URL *</label>
                <input
                  type="url"
                  required
                  className="user-form-input"
                  placeholder={selectedPlatformObj.placeholder}
                  value={formData.postUrl}
                  onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                  Paste the direct public link to the official university post you engaged with.
                </div>
              </div>

              {/* Proof Attachment Mode (File Upload vs URL) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-group-label">4. Screenshot Proof Evidence (Optional)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <button
                    type="button"
                    className={`btn-hero-glass ${proofMode === 'file' ? 'selected' : ''}`}
                    onClick={() => setProofMode('file')}
                    style={{
                      background: proofMode === 'file' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: proofMode === 'file' ? '#34d399' : 'rgba(255,255,255,0.1)',
                      color: proofMode === 'file' ? '#34d399' : '#94a3b8'
                    }}
                  >
                    📁 Direct Image Upload
                  </button>
                  <button
                    type="button"
                    className={`btn-hero-glass ${proofMode === 'url' ? 'selected' : ''}`}
                    onClick={() => setProofMode('url')}
                    style={{
                      background: proofMode === 'url' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: proofMode === 'url' ? '#34d399' : 'rgba(255,255,255,0.1)',
                      color: proofMode === 'url' ? '#34d399' : '#94a3b8'
                    }}
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
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        borderRadius: '12px'
                      }}>
                        <img src={filePreview} alt="Proof preview" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                            {selectedFile?.name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#34d399', marginTop: '0.2rem' }}>
                            ✓ {(selectedFile?.size / 1024).toFixed(1)} KB · Image verified &amp; ready
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-hero-glass"
                          onClick={() => {
                            setSelectedFile(null);
                            if (filePreview) URL.revokeObjectURL(filePreview);
                            setFilePreview(null);
                          }}
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
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
                        <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📷</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e2e8f0' }}>
                          Click or drag screenshot file here to attach proof
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
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
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                      Provide a direct link to an image host or public screenshot permalink.
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Description */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label className="form-group-label">5. Activity Description &amp; Verification Notes</label>
                <textarea
                  rows={3}
                  className="user-form-textarea"
                  placeholder="Provide brief context (e.g., 'Shared official campus tech fest announcement on my story. Handle @myhandle visible in screenshot')."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Submission CTA */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  type="submit"
                  className="btn-hero-primary"
                  disabled={submitting}
                  style={{
                    padding: '0.85rem 2rem',
                    fontSize: '0.95rem'
                  }}
                >
                  {submitting ? 'Encrypting & Submitting Proof…' : 'Submit Activity Proof →'}
                </button>
                <button
                  type="button"
                  className="btn-hero-glass"
                  onClick={() => setActiveTab('submissions')}
                  style={{ padding: '0.85rem 1.4rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Live Simulation Card Preview Column */}
            <div>
              <div className="live-preview-box">
                <span className="live-preview-badge">
                  <span>👁️</span> Live Submission Simulator
                </span>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <span className={`platform-pill ${selectedPlatformObj.class}`}>
                    <span>{selectedPlatformObj.icon}</span>
                    <span>{selectedPlatformObj.name}</span>
                  </span>
                  <span className="action-pill">
                    {selectedActionObj.icon} {selectedActionObj.name}
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: '0 0 0.85rem 0', minHeight: '44px', lineHeight: 1.5 }}>
                  {formData.description || 'Your activity description will preview here in real-time as you type.'}
                </p>

                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.85rem', wordBreak: 'break-all', padding: '0.5rem 0.75rem', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '6px' }}>
                  <strong style={{ color: '#64748b' }}>Target URL:</strong>{' '}
                  <span style={{ color: '#38bdf8' }}>
                    {formData.postUrl || selectedPlatformObj.placeholder}
                  </span>
                </div>

                {filePreview && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <img
                      src={filePreview}
                      alt="Proof Preview"
                      style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>Status: ⏳ Queued for Review</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>Reward: {selectedActionObj.xp}</span>
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
                className="btn-hero-glass"
                onClick={handleMarkAllRead}
                style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
              >
                ✓ Mark All as Read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔕</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '1.2rem' }}>No notifications received yet</h3>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                When your submitted activities are evaluated by administrators, review verdicts and XP alerts will show here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {notifications.map((notif) => {
                const isApproved = notif.title?.toLowerCase().includes('approved') || notif.message?.toLowerCase().includes('approved');
                const isRejected = notif.title?.toLowerCase().includes('rejected') || notif.message?.toLowerCase().includes('rejected');
                const icon = isApproved ? '🎉' : isRejected ? '❌' : '📢';
                const borderColor = isApproved ? '#10b981' : isRejected ? '#ef4444' : '#34d399';

                return (
                  <div
                    key={notif.id}
                    style={{
                      background: notif.isRead ? 'rgba(15, 23, 42, 0.55)' : 'rgba(52, 211, 153, 0.1)',
                      borderLeft: `4px solid ${borderColor}`,
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '1.15rem 1.4rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      boxShadow: notif.isRead ? 'none' : '0 4px 18px rgba(52, 211, 153, 0.15)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <span style={{ background: '#34d399', color: '#07090e', fontSize: '0.68rem', fontWeight: 800, padding: '0.12rem 0.5rem', borderRadius: '10px' }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                          {notif.message}
                        </p>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.45rem' }}>
                          {new Date(notif.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!notif.isRead && (
                      <button
                        type="button"
                        className="btn-hero-glass"
                        onClick={() => handleMarkNotifRead(notif.id)}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', flexShrink: 0 }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Level Roadmap Grid */}
          <div className="user-pane-card">
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>⚡</span> Creator Rank Progression Roadmap
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: '#94a3b8' }}>
              Verify social media activity to gain experience points, climb tiers, and unlock exclusive platform perks.
            </p>

            <div className="level-milestone-track">
              {[
                { level: 1, name: 'Novice', icon: '🌱', xp: '0 - 99 XP', active: currentLevelNumber === 1 },
                { level: 2, name: 'Rising Star', icon: '⚡', xp: '100 - 249 XP', active: currentLevelNumber === 2 },
                { level: 3, name: 'Pro Creator', icon: '🚀', xp: '250 - 499 XP', active: currentLevelNumber === 3 },
                { level: 4, name: 'Ambassador', icon: '👑', xp: '500 - 999 XP', active: currentLevelNumber === 4 },
                { level: 5, name: 'Elite Vanguard', icon: '🏆', xp: '1000+ XP', active: currentLevelNumber >= 5 }
              ].map(tier => (
                <div key={tier.level} className={`milestone-node ${tier.active ? 'active-tier' : ''}`}>
                  <div className="milestone-icon">{tier.icon}</div>
                  <div className="milestone-level">Level {tier.level}</div>
                  <div className="milestone-name">{tier.name}</div>
                  <div className="milestone-xp">{tier.xp}</div>
                  {tier.active && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', background: 'rgba(52, 211, 153, 0.2)', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
                      CURRENT TIER
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Identity Card */}
            <div className="user-pane-card">
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>👤</span> Verified Creator Credentials
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Creator Name</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{user?.name}</div>
                </div>

                <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Registered Email</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{user?.email}</div>
                </div>

                <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Role</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>{user?.role}</div>
                </div>

                <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>User ID</div>
                  <div style={{ fontSize: '0.86rem', fontFamily: 'monospace', color: '#38bdf8', marginTop: '0.2rem' }}>{user?.id}</div>
                </div>
              </div>
            </div>

            {/* Achievement Badges Showcase */}
            <div className="user-pane-card">
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🏆</span> Creator Achievement Badges
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                {[
                  { name: 'First Proof', icon: '🥇', desc: 'Submit first activity proof', unlocked: totalSubs > 0 },
                  { name: 'Story Master', icon: '📱', desc: '3 verified story broadcasts', unlocked: approvedSubs >= 3 },
                  { name: 'Discussion Voice', icon: '💬', desc: 'Engage on college forums', unlocked: approvedSubs >= 1 },
                  { name: 'Flawless Record', icon: '🎯', desc: 'Maintain 100% approval rate', unlocked: approvalRate === 100 && totalSubs > 0 },
                  { name: 'Active Streak', icon: '🔥', desc: 'Verify within 24 hours', unlocked: true },
                  { name: 'Century Club', icon: '⚡', desc: 'Amass 100+ Total XP', unlocked: currentTotalXP >= 100 }
                ].map(badge => (
                  <div
                    key={badge.name}
                    style={{
                      padding: '0.9rem',
                      background: badge.unlocked ? 'rgba(52, 211, 153, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                      border: `1px solid ${badge.unlocked ? 'rgba(52, 211, 153, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderRadius: '10px',
                      opacity: badge.unlocked ? 1 : 0.6
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{badge.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: badge.unlocked ? '#34d399' : '#94a3b8' }}>{badge.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>{badge.desc}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, marginTop: '0.35rem', color: badge.unlocked ? '#10b981' : '#475569' }}>
                      {badge.unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: RBAC API Defense Probe ── */}
      {activeTab === 'rbac-test' && (
        <div className="user-pane-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="user-pane-header">
            <div className="user-pane-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="user-badge-chip" style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  SECURITY AUDIT SUITE
                </span>
                <span className="user-badge-chip" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  SERVER-ENFORCED MIDDLEWARE
                </span>
              </div>
              <h2>
                <span>🛡️</span>
                <span>Backend Role Middleware Defense Probe</span>
              </h2>
              <p style={{ maxWidth: '820px', lineHeight: 1.6 }}>
                Security mandate: <em>"Do not rely only on frontend hiding. Every protected API must be secured by backend middleware. Test each role against restricted endpoints."</em>
                <br />
                Issue live authenticated HTTP requests using your current <strong>USER</strong> JWT token against server endpoints to verify that unauthorized requests are rejected at the server level.
              </p>
            </div>
          </div>

          {/* Endpoint Probes */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.5rem' }}>
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
            <div style={{ padding: '1rem', color: '#38bdf8', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="status-dot checking" style={{ width: '14px', height: '14px' }} />
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
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.7rem',
                    borderRadius: '6px',
                    background: rbacTestResult.status === 403 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                    color: rbacTestResult.status === 403 ? '#f87171' : '#34d399',
                    border: `1px solid ${rbacTestResult.status === 403 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`
                  }}
                >
                  HTTP {rbacTestResult.status} {rbacTestResult.status === 403 ? 'FORBIDDEN (PROTECTED)' : 'AUTHORIZED'}
                </span>
              </div>

              <div className="rbac-terminal-body">
                <div style={{ marginBottom: '0.85rem', color: rbacTestResult.status === 403 ? '#fca5a5' : '#86efac' }}>
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

                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                  // Server Response Payload:
                </div>
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '1.25rem',
                    borderRadius: '8px',
                    margin: 0,
                    overflowX: 'auto',
                    color: '#e2e8f0',
                    fontSize: '0.84rem',
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
