import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchUserDashboard,
  fetchAdminDashboard,
  fetchSuperAdminDashboard,
  fetchSystemStats,
  fetchAuditLogs,
  fetchAllSubmissions,
  fetchUsers,
} from '../../services/api';
import ScreenshotImage from '../ScreenshotImage';
import PointsSummary from '../common/PointsSummary';
import GamificationSummary from '../gamification/GamificationSummary';
import { InstagramIcon, LinkedInIcon, FacebookIcon, TwitterXIcon, TikTokIcon, YouTubeIcon } from '../common/SocialIcons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_ICONS = {
  INSTAGRAM: <InstagramIcon size={16} />,
  LINKEDIN:  <LinkedInIcon size={16} />,
  FACEBOOK:  <FacebookIcon size={16} />,
  TWITTER:   <TwitterXIcon size={16} />,
  TIKTOK:    <TikTokIcon size={16} />,
  YOUTUBE:   <YouTubeIcon size={16} />,
};

const NOTIF_ICONS = {
  SUBMISSION_UPDATE: '📋',
  REVIEW_FEEDBACK: '📬',
  SYSTEM:          '🔔',
  ALERT:           '⚠️',
};

const STATUS_CONFIG = {
  APPROVED: { label: 'APPROVED', color: 'var(--status-success)', icon: '✓', badgeClass: 'badge-success' },
  PENDING:  { label: 'PENDING',  color: 'var(--status-warning)', icon: '⏳', badgeClass: 'badge-warning' },
  REJECTED: { label: 'REJECTED', color: 'var(--status-error)',   icon: '✕', badgeClass: 'badge-error'   },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon, pulse }) {
  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.35rem 1.25rem',
        borderLeft: `4px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Background glyph watermark */}
      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '3rem', opacity: 0.07, userSelect: 'none' }}>
        {icon}
      </span>

      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: '2.1rem', fontWeight: 800, color, lineHeight: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {value}
        {pulse && (
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%', background: color,
            display: 'inline-block', animation: 'pulse-dot 2s infinite',
          }} />
        )}
      </div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}

function TrustScoreRing({ score }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const progress = circ - (score / 100) * circ;
  const color = score >= 80 ? 'var(--status-success)' : score >= 50 ? 'var(--status-warning)' : 'var(--status-error)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="50" y="55" textAnchor="middle" fill={color} fontSize="18" fontWeight="800">{score}%</text>
      </svg>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Trust Score
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-panel" style={{ padding: '1.35rem', borderLeft: '4px solid rgba(255,255,255,0.08)' }}>
      <div className="skeleton" style={{ height: '0.7rem', width: '55%', marginBottom: '0.6rem', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: '2rem', width: '35%', marginBottom: '0.4rem', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: '0.65rem', width: '70%', borderRadius: 4 }} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="skeleton" style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: '0.75rem', width: '60%', marginBottom: '0.4rem', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: '0.6rem', width: '80%', borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ width: '4.5rem', height: '1.4rem', borderRadius: 20 }} />
    </div>
  );
}

function EmptyState({ icon, title, message, actionLabel, onAction }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2.5rem 1rem', textAlign: 'center' }}>
      <span style={{ fontSize: '2.5rem', opacity: 0.5 }}>{icon}</span>
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{title}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '28ch' }}>{message}</div>
      {onAction && (
        <button type="button" className="btn-primary" onClick={onAction}
          style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--status-error)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}>
          ↺ Retry
        </button>
      )}
    </div>
  );
}

// ─── Platform Breakdown Mini Chart ────────────────────────────────────────────
function PlatformBar({ platformBreakdown, total }) {
  if (!total) return null;
  const platforms = Object.entries(platformBreakdown).sort((a, b) => b[1] - a[1]);
  const COLORS = { INSTAGRAM: '#E1306C', LINKEDIN: '#0A66C2', FACEBOOK: '#1877F2', TWITTER: '#1DA1F2', TIKTOK: '#ff0050', YOUTUBE: '#FF0000' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {platforms.map(([platform, count]) => (
        <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1rem', width: '1.4rem', textAlign: 'center' }}>
            {PLATFORM_ICONS[platform] || '🌐'}
          </span>
          <div style={{ fontSize: '0.78rem', width: '6rem', color: 'var(--text-secondary)' }}>{platform}</div>
          <div style={{ flex: 1, height: '6px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(count / total) * 100}%`,
              background: COLORS[platform] || 'var(--primary)',
              borderRadius: 4,
              transition: 'width 0.8s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: '1.5rem', textAlign: 'right' }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── USER Dashboard ───────────────────────────────────────────────────────────
function UserDashboard({ onNavigateToNav }) {
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    setState(s => ({ ...s, status: 'loading', error: null }));
    try {
      const res = await fetchUserDashboard();
      if (res.success) {
        setState({ status: 'success', data: res.data, error: null });
      } else {
        setState({ status: 'error', data: null, error: res.message || 'Unexpected error.' });
      }
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message || 'Failed to load dashboard.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { status, data, error } = state;
  const isLoading = status === 'loading';

  const stats = data?.stats || {};
  const recentSubs = data?.recentSubmissions || [];
  const recentNotifs = data?.recentNotifications || [];
  const firstName = (user?.name || 'Creator').split(' ')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Error banner ── */}
      {status === 'error' && (
        <ErrorBanner
          message={`Could not load your dashboard: ${error}`}
          onRetry={load}
        />
      )}

      {/* ── Welcome Creator Hero Header ── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem 2rem',
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'linear-gradient(135deg, rgba(16, 24, 39, 0.85) 0%, rgba(13, 27, 42, 0.75) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          boxShadow: '0 16px 40px -12px rgba(0, 0, 0, 0.5), 0 0 25px -8px rgba(52, 211, 153, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              padding: '2.5px',
              background: 'linear-gradient(135deg, var(--role-user, #34d399), #06b6d4)',
              boxShadow: '0 0 18px rgba(52, 211, 153, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#fff'
              }}
            >
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge badge-user" style={{ fontSize: '0.72rem', padding: '0.15rem 0.6rem', fontWeight: 700 }}>
                🚀 ROLE: CREATOR USER
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.15rem 0.6rem' }}>
                ✓ VERIFIED
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              Welcome back, {firstName} 👋
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>
              Track your social media engagement verification status, earn creator XP, and climb the ranks.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigateToNav('user-space')}
            style={{
              padding: '0.6rem 1.15rem',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(52, 211, 153, 0.1)',
              borderColor: 'rgba(52, 211, 153, 0.3)',
              color: '#34d399'
            }}
          >
            🚀 Creator Studio
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigateToNav('submit-activity')}
            style={{
              padding: '0.6rem 1.35rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              background: 'var(--role-user, #34d399)',
              color: '#07090e',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(52, 211, 153, 0.3)'
            }}
          >
            ➕ Submit Activity
          </button>
        </div>
      </div>

      {/* ── KPI stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Total Submissions"
              value={stats.total ?? 0}
              sub="Engagement proofs logged"
              color="var(--role-user)"
              icon="📋"
            />
            <StatCard
              label="Approved"
              value={stats.approved ?? 0}
              sub="Verified creator points"
              color="var(--status-success)"
              icon="✓"
            />
            <StatCard
              label="Pending Review"
              value={stats.pending ?? 0}
              sub="Awaiting admin decision"
              color="var(--status-warning)"
              icon="⏳"
              pulse={(stats.pending ?? 0) > 0}
            />
            <StatCard
              label="Rejected"
              value={stats.rejected ?? 0}
              sub="Invalid or missing proof"
              color="var(--status-error)"
              icon="✕"
            />
          </>
        )}
      </div>

      {/* ── Gamification XP & Level Progression Engine ── */}
      <GamificationSummary onNavigateToNav={onNavigateToNav} />

      {/* ── Gamification & Points Breakdown ── */}
      <PointsSummary onNavigateToNav={onNavigateToNav} />

      {/* ── Trust score + platform breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
        {/* Trust score ring */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '160px' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.75rem', textAlign: 'center' }}>
            Creator Compliance
          </div>
          {isLoading ? (
            <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
          ) : (
            <TrustScoreRing score={stats.trustScore ?? 100} />
          )}
          {!isLoading && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {(stats.trustScore ?? 100) >= 80 ? '🟢 Excellent' : (stats.trustScore ?? 100) >= 50 ? '🟡 Needs Work' : '🔴 Low Score'}
            </div>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1rem' }}>
            Platform Activity Breakdown
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[60, 40, 80].map((w, i) => <div key={i} className="skeleton" style={{ height: '0.65rem', width: `${w}%`, borderRadius: 4 }} />)}
            </div>
          ) : !stats.total ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No submissions yet.</div>
          ) : (
            <PlatformBar platformBreakdown={stats.platformBreakdown || {}} total={stats.total} />
          )}
        </div>
      </div>

      {/* ── Notifications callout ── */}
      {!isLoading && (stats.unreadNotifications ?? 0) > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '1rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderLeft: '4px solid var(--primary)',
            cursor: 'pointer',
          }}
          onClick={() => onNavigateToNav('notifications')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onNavigateToNav('notifications')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.3rem' }}>📬</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-highlight)' }}>
                You have {stats.unreadNotifications} unread notification{stats.unreadNotifications > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Review feedback or system messages await
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--primary-light)', fontWeight: 600 }}>
            View all →
          </span>
        </div>
      )}

      {/* ── Bottom grid: Recent Submissions + Recent Notifications ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>

        {/* Recent Submissions */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
              📋 Recent Submissions
            </h3>
            {!isLoading && stats.total > 0 && (
              <button
                type="button"
                className="nav-link"
                onClick={() => onNavigateToNav('my-submissions')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--primary-light)', fontWeight: 600 }}
              >
                View all ({stats.total}) →
              </button>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : recentSubs.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No submissions yet"
              message="Submit your first social engagement proof to get started."
              actionLabel="➕ Submit Now"
              onAction={() => onNavigateToNav('submit-activity')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentSubs.map(sub => {
                const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.8rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      gap: '0.75rem',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.055)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '1.35rem',
                        width: '2.25rem', height: '2.25rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.06)',
                        flexShrink: 0,
                      }}>
                        {PLATFORM_ICONS[sub.platform] || '🌐'}
                      </span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-highlight)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.platform} · {sub.actionType}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.description || sub.postUrl}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                      <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {timeAgo(sub.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
              🔔 Recent Notifications
            </h3>
            {!isLoading && recentNotifs.length > 0 && (
              <button
                type="button"
                className="nav-link"
                onClick={() => onNavigateToNav('notifications')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--primary-light)', fontWeight: 600 }}
              >
                See all →
              </button>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : recentNotifs.length === 0 ? (
            <EmptyState
              icon="🔕"
              title="All quiet here"
              message="Notifications about your submission reviews will appear here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentNotifs.map(notif => (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: notif.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.08)',
                    border: `1px solid ${notif.isRead ? 'var(--border-subtle)' : 'rgba(99,102,241,0.25)'}`,
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    fontSize: '1.1rem',
                    width: '2.1rem', height: '2.1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    flexShrink: 0,
                  }}>
                    {NOTIF_ICONS[notif.type] || '🔔'}
                  </span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: '0.88rem', color: 'var(--text-highlight)' }}>
                        {notif.title}
                        {!notif.isRead && (
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', marginLeft: '0.4rem', verticalAlign: 'middle' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.45 }}>
                      {notif.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
          ⚡ Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { icon: '➕', label: 'Submit Activity', sub: 'Log a social engagement', nav: 'submit-activity', color: 'var(--role-user)' },
            { icon: '📋', label: 'My Submissions', sub: 'View full history', nav: 'my-submissions', color: 'var(--primary-light)' },
            { icon: '🔔', label: 'Notifications', sub: `${stats.unreadNotifications ?? 0} unread`, nav: 'notifications', color: 'var(--status-warning)' },
            { icon: '👤', label: 'My Profile', sub: 'Account & settings', nav: 'profile', color: 'var(--text-secondary)' },
          ].map(({ icon, label, sub, nav, color }) => (
            <button
              key={nav}
              type="button"
              onClick={() => onNavigateToNav(nav)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'left',
                transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                color: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = ''; }}
            >
              <span style={{ fontSize: '1.4rem', width: '2.2rem', height: '2.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `${color}22`, flexShrink: 0 }}>
                {icon}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-highlight)' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── SUPER_ADMIN Dashboard ──────────────────────────────────────────────────
function SuperAdminDashboard({ onNavigateToNav }) {
  const { user } = useAuth();
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setState(s => ({ ...s, status: 'loading', error: null }));

    try {
      const res = await fetchSuperAdminDashboard();
      if (res.success) {
        setState({ status: 'success', data: res.data, error: null });
      } else {
        setState({
          status: 'error',
          data: null,
          error: res.message || 'Failed to load Super Administrator governance dashboard.',
        });
      }
    } catch (err) {
      setState({
        status: 'error',
        data: null,
        error: err.message || 'Network error fetching super admin dashboard.',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { status, data, error } = state;
  const isLoading = status === 'loading';
  const stats = data?.stats || {};
  const platformBreakdown = data?.platformBreakdown || {};
  const recentSubmissions = data?.recentSubmissions || [];
  const recentActivity = data?.recentActivity || [];

  // Metrics
  const totalUsers = stats.totalUsers ?? 0;
  const creatorsCount = stats.creatorsCount ?? 0;
  const totalAdmins = stats.totalAdmins ?? 0;
  const adminsCount = stats.adminsCount ?? 0;
  const superAdminsCount = stats.superAdminsCount ?? 0;

  const totalSubmissions = stats.totalSubmissions ?? 0;
  const pendingSubmissions = stats.pendingSubmissions ?? 0;
  const approvedSubmissions = stats.approvedSubmissions ?? 0;
  const rejectedSubmissions = stats.rejectedSubmissions ?? 0;

  const activeSocialAccounts = stats.activeSocialAccounts ?? 0;
  const totalSocialAccounts = stats.totalSocialAccounts ?? 0;
  const approvalRate = stats.approvalRate ?? 0;

  // Platform percentages
  const igCount = platformBreakdown.INSTAGRAM || 0;
  const liCount = platformBreakdown.LINKEDIN || 0;
  const fbCount = platformBreakdown.FACEBOOK || 0;
  const totalPlatformSubs = igCount + liCount + fbCount || 1;

  const igPct = Math.round((igCount / totalPlatformSubs) * 100);
  const liPct = Math.round((liCount / totalPlatformSubs) * 100);
  const fbPct = Math.round((fbCount / totalPlatformSubs) * 100);

  // Status percentages
  const subTotalForBar = totalSubmissions || 1;
  const approvedPct = Math.round((approvedSubmissions / subTotalForBar) * 100);
  const pendingPct = Math.round((pendingSubmissions / subTotalForBar) * 100);
  const rejectedPct = Math.round((rejectedSubmissions / subTotalForBar) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>

      {/* ── Header Governance Banner ── */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.6rem' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                Super Administrator Central Command
              </h2>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Institutional governance overview · Live PostgreSQL database analytics · Official account channels
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--status-success)',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '0.35rem 0.65rem',
                borderRadius: '20px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-success)', display: 'inline-block' }} />
              PostgreSQL Connected
            </span>

            <button
              type="button"
              className="btn-refresh-pill"
              onClick={() => load(true)}
              disabled={isLoading || isRefreshing}
              title="Refresh data"
            >
              <svg
                className={`refresh-icon-svg ${isRefreshing ? 'spinning' : ''}`}
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
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {status === 'error' && (
        <ErrorBanner
          message={`Failed to load Super Administrator governance data: ${error}`}
          onRetry={() => load(false)}
        />
      )}

      {/* ── Analytics Metric Cards Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            {/* 1. Total Users */}
            <StatCard
              label="Total Users"
              value={totalUsers}
              sub={`${creatorsCount} Creators · ${totalAdmins} Staff`}
              color="var(--role-superadmin)"
              icon="👥"
            />

            {/* 2. Total Admins */}
            <StatCard
              label="Total Admins"
              value={totalAdmins}
              sub={`${adminsCount} Moderators · ${superAdminsCount} Super Admins`}
              color="var(--role-admin)"
              icon="🛡️"
            />

            {/* 3. Total Submissions */}
            <StatCard
              label="Total Submissions"
              value={totalSubmissions}
              sub="Verifications across platforms"
              color="var(--primary)"
              icon="📋"
            />

            {/* 4. Active Social Accounts */}
            <StatCard
              label="Active Social Accounts"
              value={`${activeSocialAccounts} / ${totalSocialAccounts}`}
              sub="Institutional college profiles"
              color="#8B5CF6"
              icon="🏛️"
            />

            {/* 5. Pending Submissions */}
            <StatCard
              label="Pending Submissions"
              value={pendingSubmissions}
              sub="Awaiting admin evaluation"
              color="var(--status-warning)"
              icon="⏳"
              pulse={pendingSubmissions > 0}
            />

            {/* 6. Approved Submissions */}
            <StatCard
              label="Approved Submissions"
              value={approvedSubmissions}
              sub="Verified activities"
              color="var(--status-success)"
              icon="✓"
            />

            {/* 7. Rejected Submissions */}
            <StatCard
              label="Rejected Submissions"
              value={rejectedSubmissions}
              sub="Declined with feedback"
              color="var(--status-error)"
              icon="✕"
            />

            {/* 8. Approval Ratio */}
            <StatCard
              label="Approval Ratio"
              value={`${approvalRate}%`}
              sub="Overall platform pass rate"
              color="var(--status-success)"
              icon="📈"
            />
          </>
        )}
      </div>

      {/* ── Distribution & Pipeline Breakdown Row ── */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          
          {/* Platform Distribution Bar */}
          <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
                📊 Platform Volume Distribution
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {totalSubmissions} Total Activities
              </span>
            </div>

            {/* Stacked bar */}
            <div style={{ height: '10px', width: '100%', borderRadius: '5px', overflow: 'hidden', display: 'flex', background: 'rgba(255, 255, 255, 0.05)' }}>
              <div style={{ width: `${igPct}%`, background: '#E1306C', transition: 'width 0.5s ease' }} title={`Instagram: ${igCount}`} />
              <div style={{ width: `${liPct}%`, background: '#0A66C2', transition: 'width 0.5s ease' }} title={`LinkedIn: ${liCount}`} />
              <div style={{ width: `${fbPct}%`, background: '#1877F2', transition: 'width 0.5s ease' }} title={`Facebook: ${fbCount}`} />
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', paddingTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E1306C', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Instagram:</span>
                <strong style={{ color: 'var(--text-highlight)' }}>{igCount} ({igPct}%)</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0A66C2', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>LinkedIn:</span>
                <strong style={{ color: 'var(--text-highlight)' }}>{liCount} ({liPct}%)</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1877F2', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Facebook:</span>
                <strong style={{ color: 'var(--text-highlight)' }}>{fbCount} ({fbPct}%)</strong>
              </div>
            </div>
          </div>

          {/* Verification Status Distribution Bar */}
          <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
                ⚖️ Verification Decision Breakdown
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {approvalRate}% Approved
              </span>
            </div>

            {/* Stacked Status bar */}
            <div style={{ height: '10px', width: '100%', borderRadius: '5px', overflow: 'hidden', display: 'flex', background: 'rgba(255, 255, 255, 0.05)' }}>
              <div style={{ width: `${approvedPct}%`, background: 'var(--status-success)', transition: 'width 0.5s ease' }} title={`Approved: ${approvedSubmissions}`} />
              <div style={{ width: `${pendingPct}%`, background: 'var(--status-warning)', transition: 'width 0.5s ease' }} title={`Pending: ${pendingSubmissions}`} />
              <div style={{ width: `${rejectedPct}%`, background: 'var(--status-error)', transition: 'width 0.5s ease' }} title={`Rejected: ${rejectedSubmissions}`} />
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', paddingTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-success)', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Approved:</span>
                <strong style={{ color: 'var(--status-success)' }}>{approvedSubmissions}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-warning)', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Pending:</span>
                <strong style={{ color: 'var(--status-warning)' }}>{pendingSubmissions}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-error)', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Rejected:</span>
                <strong style={{ color: 'var(--status-error)' }}>{rejectedSubmissions}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Governance Action Shortcuts ── */}
      <div className="glass-panel" style={{ padding: '1.35rem' }}>
        <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
          ⚡ Governance Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
          {[
            { icon: '👥', label: 'User Directory', sub: 'Roles, status & credentials', nav: 'users' },
            { icon: '🛡️', label: 'Admin Governance', sub: 'Clearances & staff privileges', nav: 'admins' },
            { icon: '📋', label: 'All Submissions', sub: 'Global verification archive', nav: 'submissions' },
            { icon: '🏛️', label: 'Official Accounts', sub: 'Institutional platform channels', nav: 'social-accounts' },
            { icon: '⚙️', label: 'Platform Settings', sub: 'Security & policy governance', nav: 'settings' },
          ].map(({ icon, label, sub, nav }) => (
            <button
              key={nav}
              type="button"
              className="btn-secondary"
              onClick={() => onNavigateToNav(nav)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                justifyContent: 'flex-start',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-highlight)' }}>{label}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Submissions Across Platform ── */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
              Recent Submissions
            </h3>
            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
              Latest {recentSubmissions.length}
            </span>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigateToNav('submissions')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            View Submissions Queue →
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : recentSubmissions.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No Submissions Found"
            message="No activity verifications have been submitted by creators yet."
          />
        ) : (
          <div className="table-responsive-wrapper" style={{ margin: 0, border: 'none', background: 'transparent' }}>
            <table className="portal-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem' }}>Creator</th>
                  <th style={{ padding: '0.65rem' }}>Platform & Account</th>
                  <th style={{ padding: '0.65rem' }}>Action</th>
                  <th style={{ padding: '0.65rem' }}>Post / Proof Link</th>
                  <th style={{ padding: '0.65rem' }}>Status</th>
                  <th style={{ padding: '0.65rem' }}>Submitted</th>
                  <th style={{ padding: '0.65rem', textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map(sub => {
                  const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.65rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>{sub.userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.userEmail}</div>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>{PLATFORM_ICONS[sub.platform] || '🌐'}</span>
                          <span style={{ fontWeight: 600 }}>{sub.platform}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {sub.socialAccountHandle || sub.socialAccountName}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {sub.actionType}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {sub.postUrl ? (
                          <a
                            href={sub.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary-light)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                          >
                            <span>Inspect Post</span>
                            <span style={{ fontSize: '0.7rem' }}>↗</span>
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: '0.72rem' }}>
                          {cfg.icon} {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {timeAgo(sub.createdAt)}
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onNavigateToNav('submissions')}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Activity & Audit Stream ── */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🔒</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
              Recent Activity & Audit Stream
            </h3>
          </div>
          <span className="badge badge-superadmin" style={{ fontSize: '0.72rem' }}>
            SUPER ADMIN AUDIT TRAIL
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <SkeletonRow /><SkeletonRow />
          </div>
        ) : recentActivity.length === 0 ? (
          <EmptyState
            icon="🔒"
            title="No Recent Activity Logged"
            message="Audit records and moderation decisions will appear here as administrators review submissions."
          />
        ) : (
          <div className="table-responsive-wrapper" style={{ margin: 0, border: 'none', background: 'transparent' }}>
            <table className="portal-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem' }}>Timestamp</th>
                  <th style={{ padding: '0.65rem' }}>Actor</th>
                  <th style={{ padding: '0.65rem' }}>Role</th>
                  <th style={{ padding: '0.65rem' }}>Event / Decision</th>
                  <th style={{ padding: '0.65rem' }}>Target</th>
                  <th style={{ padding: '0.65rem' }}>Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.65rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {timeAgo(item.timestamp)}
                    </td>
                    <td style={{ padding: '0.65rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                      {item.actorName}
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      <span className={`badge ${item.actorRole === 'SUPER_ADMIN' ? 'badge-superadmin' : item.actorRole === 'ADMIN' ? 'badge-admin' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                        {item.actorRole}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      <span
                        className={`badge ${
                          item.action === 'APPROVED'
                            ? 'badge-success'
                            : item.action === 'REJECTED'
                            ? 'badge-error'
                            : 'badge-warning'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {item.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>
                      {item.target}
                    </td>
                    <td style={{ padding: '0.65rem', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.details}>
                      {item.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}


// ─── ADMIN Dashboard ───────────────────────────────────────────────────────
function AdminDashboard({ onNavigateToNav }) {
  const { user } = useAuth();
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });

  const load = useCallback(async () => {
    setState(s => ({ ...s, status: 'loading', error: null }));
    try {
      const res = await fetchAdminDashboard();
      if (res.success) {
        setState({ status: 'success', data: res.data, error: null });
      } else {
        setState({ status: 'error', data: null, error: res.message || 'Failed to load administrator dashboard.' });
      }
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message || 'Network error fetching administrator dashboard.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { status, data, error } = state;
  const isLoading = status === 'loading';
  const stats = data?.stats || {};
  const recentPending = data?.recentPending || [];

  const pendingCount = stats.pending ?? 0;
  const reviewedToday = stats.reviewedToday ?? 0;
  const approvedCount = stats.approved ?? 0;
  const rejectedCount = stats.rejected ?? 0;
  const totalUsers = stats.totalUsers ?? 0;
  const creatorsCount = stats.creatorsCount ?? 0;
  const totalAdmins = stats.totalAdmins ?? 0;
  const adminName = user?.name || 'Admin Moderator';

  return (
    <div className="admin-dash-container">

      {/* ── Error Banner ── */}
      {status === 'error' && (
        <ErrorBanner
          message={`Failed to load administrator dashboard: ${error}`}
          onRetry={load}
        />
      )}

      {/* ── Moderator Cockpit Hero Banner ── */}
      <div className="admin-dash-hero">
        <div className="admin-dash-hero-content">
          <div className="admin-dash-tag-row">
            <span className="admin-dash-role-badge">
              🛡️ MODERATOR CONTROL
            </span>
            <div className="admin-dash-telemetry-tag">
              <span className="admin-dash-telemetry-dot" />
              <span>Live Queue Telemetry Active</span>
            </div>
            {pendingCount === 0 && (
              <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem' }}>
                ✓ Queue Cleared
              </span>
            )}
          </div>
          <h2 className="admin-dash-hero-title">
            Welcome back, {adminName}
          </h2>
          <p className="admin-dash-hero-subtitle">
            Review pending creator proofs, monitor {totalUsers} platform users, track daily moderation throughput, and enforce compliance guidelines with real-time audit trails.
          </p>
        </div>

        <div className="admin-dash-hero-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          <button
            type="button"
            className="btn-refresh-pill"
            onClick={load}
            disabled={status === 'loading'}
            title="Refresh moderation metrics, queue count, and user directory telemetry"
          >
            <svg
              className={`refresh-icon-svg ${status === 'loading' ? 'spinning' : ''}`}
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
            <span>{status === 'loading' ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>

          <button
            type="button"
            className="admin-dash-btn-queue"
            onClick={() => onNavigateToNav('review-submissions')}
          >
            <span>⚖️</span>
            <span>Launch Review Desk ({pendingCount})</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* ── Statistics Cards (5 KPI HUD Cards) ── */}
      <div className="admin-dash-kpi-grid">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div
              className="admin-dash-kpi-card users"
              onClick={() => onNavigateToNav('users')}
              role="button"
              tabIndex={0}
              title="Click to inspect user directory"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToNav('users'); }}
            >
              <div className="admin-dash-kpi-icon-box users">
                👥
              </div>
              <div className="admin-dash-kpi-info">
                <span className="admin-dash-kpi-label">Platform Users</span>
                <span className="admin-dash-kpi-value" style={{ color: '#38bdf8' }}>
                  {totalUsers}
                </span>
                <span className="admin-dash-kpi-subtext">{creatorsCount} Creators · {totalAdmins} Staff →</span>
              </div>
            </div>
            <div
              className="admin-dash-kpi-card pending"
              onClick={() => onNavigateToNav('review-submissions')}
              role="button"
              tabIndex={0}
              title="Click to launch pending review queue"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToNav('review-submissions'); }}
            >
              <div className="admin-dash-kpi-icon-box pending">
                ⏳
              </div>
              <div className="admin-dash-kpi-info">
                <span className="admin-dash-kpi-label">Pending Submissions</span>
                <span className="admin-dash-kpi-value" style={{ color: '#f59e0b' }}>
                  {pendingCount}
                  {pendingCount > 0 && (
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b',
                      display: 'inline-block', animation: 'pulse-dot 2s infinite',
                    }} />
                  )}
                </span>
                <span className="admin-dash-kpi-subtext">Awaiting verification decision →</span>
              </div>
            </div>

            <div
              className="admin-dash-kpi-card reviewed"
              onClick={() => onNavigateToNav('submissions')}
              role="button"
              tabIndex={0}
              title="Click to browse reviewed submissions"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToNav('submissions'); }}
            >
              <div className="admin-dash-kpi-icon-box reviewed">
                🎯
              </div>
              <div className="admin-dash-kpi-info">
                <span className="admin-dash-kpi-label">Reviewed Today</span>
                <span className="admin-dash-kpi-value" style={{ color: '#818cf8' }}>
                  {reviewedToday}
                </span>
                <span className="admin-dash-kpi-subtext">Evaluated in last 24 hours →</span>
              </div>
            </div>

            <div
              className="admin-dash-kpi-card approved"
              onClick={() => onNavigateToNav('submissions')}
              role="button"
              tabIndex={0}
              title="Click to view verified approved submissions"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToNav('submissions'); }}
            >
              <div className="admin-dash-kpi-icon-box approved">
                ✓
              </div>
              <div className="admin-dash-kpi-info">
                <span className="admin-dash-kpi-label">Approved Submissions</span>
                <span className="admin-dash-kpi-value" style={{ color: '#34d399' }}>
                  {approvedCount}
                </span>
                <span className="admin-dash-kpi-subtext">Valid creator activities logged →</span>
              </div>
            </div>

            <div
              className="admin-dash-kpi-card rejected"
              onClick={() => onNavigateToNav('submissions')}
              role="button"
              tabIndex={0}
              title="Click to inspect rejected submissions"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToNav('submissions'); }}
            >
              <div className="admin-dash-kpi-icon-box rejected">
                ✕
              </div>
              <div className="admin-dash-kpi-info">
                <span className="admin-dash-kpi-label">Rejected Submissions</span>
                <span className="admin-dash-kpi-value" style={{ color: '#f87171' }}>
                  {rejectedCount}
                </span>
                <span className="admin-dash-kpi-subtext">Invalid or non-compliant proof →</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Quick Link to Review Queue Callout ── */}
      <div className={`admin-dash-queue-callout ${pendingCount > 0 ? 'has-pending' : 'empty'}`}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{pendingCount > 0 ? '🚨' : '✨'}</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
              {pendingCount > 0 ? 'Action Required: Pending Verification Requests' : 'Moderation Queue Fully Cleared'}
            </h3>
            {pendingCount > 0 ? (
              <span className="badge badge-warning" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                {pendingCount} PENDING
              </span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                ALL CLEAR
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
            {pendingCount > 0
              ? `There are currently ${pendingCount} creator social engagement proof submissions awaiting evidence inspection and approval.`
              : 'All submitted evidence has been reviewed and verified. Fantastic work! Creators receive real-time notifications once you approve or reject submissions.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {pendingCount > 0 ? (
            <button
              type="button"
              className="admin-dash-btn-queue"
              onClick={() => onNavigateToNav('review-submissions')}
            >
              <span>⚖️</span> Open Review Queue ({pendingCount}) →
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigateToNav('submissions')}
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              📋 Browse All Historical Submissions →
            </button>
          )}
        </div>
      </div>

      {/* ── Recent Pending Submissions List / Queue Preview ── */}
      <div className="admin-dash-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                ⏳ Recent Pending Submissions
              </h3>
              {!isLoading && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700 }}>
                  {recentPending.length} shown
                </span>
              )}
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Most recent creator evidence submissions awaiting admin moderation verdict.
            </p>
          </div>

          {!isLoading && recentPending.length > 0 && (
            <button
              type="button"
              className="nav-link"
              onClick={() => onNavigateToNav('review-submissions')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: 'var(--primary-light)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              Go to Full Queue ({pendingCount}) →
            </button>
          )}
        </div>

        {/* List Content */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : recentPending.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="No Pending Submissions"
            message="All creator submissions have been reviewed. The moderation queue is completely up to date!"
            actionLabel="📋 Browse All Submissions"
            onAction={() => onNavigateToNav('submissions')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentPending.map((sub) => {
              const creatorName = sub.userName || sub.user?.name || 'Creator';
              const creatorEmail = sub.userEmail || sub.user?.email || '';

              return (
                <div
                  key={sub.id}
                  className="admin-dash-submission-row"
                >
                  {/* Left: Platform Icon + Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px', minWidth: 0 }}>
                    {/* Platform avatar */}
                    <span
                      style={{
                        fontSize: '1.4rem',
                        width: '2.5rem',
                        height: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        flexShrink: 0,
                      }}
                      title={sub.platform}
                    >
                      {PLATFORM_ICONS[sub.platform] || '🌐'}
                    </span>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-highlight)' }}>
                          {creatorName}
                        </span>
                        {creatorEmail && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            ({creatorEmail})
                          </span>
                        )}
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          {sub.actionType}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {/* Post link */}
                        <a
                          href={sub.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--primary-light)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            maxWidth: '320px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`Open ${sub.postUrl} in new tab`}
                        >
                          <span>🔗</span> {sub.postUrl}
                        </a>

                        {sub.description && (
                          <span
                            style={{
                              fontSize: '0.76rem',
                              color: 'var(--text-secondary)',
                              maxWidth: '300px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={sub.description}
                          >
                            • {sub.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Screenshot Thumbnail */}
                  {sub.screenshotUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: '#000',
                          cursor: 'pointer',
                        }}
                        title="Click to view evidence in lightbox"
                      >
                        <ScreenshotImage
                          screenshotUrl={sub.screenshotUrl}
                          thumbnailStyle={{ width: '46px', height: '46px', objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Right: Status + Timing + Quick link to queue */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                        ⏳ PENDING
                      </span>
                      <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {timeAgo(sub.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onNavigateToNav('review-submissions')}
                      style={{
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      title="Inspect in moderation queue"
                    >
                      Review Desk →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Standard Moderation Procedures ── */}
      <div className="admin-dash-panel" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          background: 'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '0.9rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="m9 14 2 2 4-4" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.08rem', color: '#ffffff', fontWeight: 800, letterSpacing: '-0.01em' }}>
                  Moderator Verification Standard Operating Procedures
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: '#c7d2fe',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  Protocol &amp; SOP
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Mandatory compliance standards enforced across all submission audits to ensure fair, consistent, and accountable decisions.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.74rem',
            color: '#34d399',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
            <span>Active Quality Framework</span>
          </div>
        </div>

        <div className="admin-dash-sop-grid">
          {/* Phase 1 */}
          <div className="admin-dash-sop-card" style={{ borderTop: '3px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1.25rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#f59e0b',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.22rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'inline-block'
              }}>
                Phase 01
              </span>
              <div className="admin-dash-sop-step-num" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.35)', marginLeft: 'auto', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>Identity Verification</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                Verify the creator handle visible in the screenshot matches the registered creator account profile.
              </div>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>✓</span> Match username &amp; profile handle
            </div>
          </div>

          {/* Phase 2 */}
          <div className="admin-dash-sop-card" style={{ borderTop: '3px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1.25rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#818cf8',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.22rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'inline-block'
              }}>
                Phase 02
              </span>
              <div className="admin-dash-sop-step-num" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.35)', marginLeft: 'auto', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>Active Timestamp</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                Confirm timestamp of social engagement proof is within the valid active campaign timeframe.
              </div>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>✓</span> Validate recency &amp; deadline window
            </div>
          </div>

          {/* Phase 3 */}
          <div className="admin-dash-sop-card" style={{ borderTop: '3px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1.25rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#34d399',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.22rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'inline-block'
              }}>
                Phase 03
              </span>
              <div className="admin-dash-sop-step-num" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', marginLeft: 'auto', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>Legitimate Evidence</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                Ensure screenshot has not been cropped to obscure timestamps, handles, or interaction state.
              </div>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.72rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>✓</span> Unaltered, complete UI screenshot
            </div>
          </div>

          {/* Phase 4 */}
          <div className="admin-dash-sop-card" style={{ borderTop: '3px solid #f43f5e' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1.25rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#fb7185',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.22rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                display: 'inline-block'
              }}>
                Phase 04
              </span>
              <div className="admin-dash-sop-step-num" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.35)', marginLeft: 'auto', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>Constructive Feedback</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                When rejecting submissions, always provide actionable, polite feedback so creators can rectify.
              </div>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.72rem', color: '#fb7185', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>✓</span> Clear reason &amp; actionable guidance
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Root DashboardView ────────────────────────────────────────────────────
export default function DashboardView({ onNavigateToNav }) {
  const { user } = useAuth();
  const role = user?.role || 'USER';

  if (role === 'SUPER_ADMIN') return <SuperAdminDashboard onNavigateToNav={onNavigateToNav} />;
  if (role === 'ADMIN')       return <AdminDashboard      onNavigateToNav={onNavigateToNav} />;
  return                             <UserDashboard       onNavigateToNav={onNavigateToNav} />;
}
