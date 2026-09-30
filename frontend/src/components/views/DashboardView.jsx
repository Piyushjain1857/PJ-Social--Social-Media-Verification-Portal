import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchUserDashboard,
  fetchAdminDashboard,
  fetchSystemStats,
  fetchAuditLogs,
  fetchAllSubmissions,
  fetchUsers,
} from '../../services/api';
import ScreenshotImage from '../ScreenshotImage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_ICONS = {
  INSTAGRAM: '📸',
  LINKEDIN:  '💼',
  FACEBOOK:  '👥',
  TWITTER:   '🐦',
  TIKTOK:    '🎵',
  YOUTUBE:   '▶️',
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

      {/* ── Welcome header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
            👋 Welcome back, {firstName}
          </h2>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Here's your social verification activity at a glance.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onNavigateToNav('submit-activity')}
          style={{
            padding: '0.6rem 1.4rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: 'var(--role-user)',
            color: '#07090e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          }}
        >
          ➕ Submit Activity
        </button>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>

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

// ─── SUPER_ADMIN Dashboard (unchanged, inline) ─────────────────────────────
function SuperAdminDashboard({ onNavigateToNav }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ systemStats: null, auditLogs: [], allSubmissions: [], usersList: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [statsRes, logsRes, subsRes, usersRes] = await Promise.all([
        fetchSystemStats(), fetchAuditLogs(), fetchAllSubmissions(), fetchUsers()
      ]);
      if (alive) {
        setData({
          systemStats: statsRes.success ? statsRes.data : null,
          auditLogs:   logsRes.success  ? logsRes.data  || [] : [],
          allSubmissions: subsRes.success ? subsRes.data || [] : [],
          usersList:   usersRes.success  ? usersRes.data || [] : [],
        });
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const pending  = data.allSubmissions.filter(s => s.status === 'PENDING').length;
  const approved = data.allSubmissions.filter(s => s.status === 'APPROVED').length;
  const rejected = data.allSubmissions.filter(s => s.status === 'REJECTED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {loading ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></> : (<>
          <StatCard label="Total Registered Users" value={data.usersList.length || 3} sub="Full platform accounts" color="var(--role-superadmin)" icon="👥" />
          <StatCard label="Active Administrators" value={data.usersList.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length || 2} sub="Super Admin & Moderators" color="var(--role-admin)" icon="🛡️" />
          <StatCard label="Pending Verification" value={pending} sub="Awaiting review" color="var(--status-warning)" icon="⏳" pulse={pending > 0} />
          <StatCard label="Total Submissions" value={data.allSubmissions.length || 3} sub="Proof verifications logged" color="var(--status-success)" icon="📋" />
        </>)}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-highlight)' }}>⚡ Governance Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {[
            { icon: '👥', label: 'Manage Users', sub: 'Role assignment & permissions', nav: 'users' },
            { icon: '🛡️', label: 'Admin Directory', sub: 'Moderation clearances', nav: 'admins' },
            { icon: '📋', label: 'Inspect Submissions', sub: 'All platform activities', nav: 'submissions' },
            { icon: '🔗', label: 'Social Accounts', sub: 'Platform API configurations', nav: 'social-accounts' },
          ].map(({ icon, label, sub, nav }) => (
            <button key={nav} type="button" className="btn-secondary" onClick={() => onNavigateToNav(nav)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'flex-start', padding: '0.85rem 1rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)' }}>🔒 Recent System Audit Log</h3>
          <span className="badge badge-superadmin" style={{ fontSize: '0.72rem' }}>SUPER ADMIN ONLY</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem' }}>Timestamp</th>
                <th style={{ padding: '0.65rem' }}>Actor</th>
                <th style={{ padding: '0.65rem' }}>Action</th>
                <th style={{ padding: '0.65rem' }}>Target</th>
                <th style={{ padding: '0.65rem' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {data.auditLogs.slice(0, 4).map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.65rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '0.65rem', fontWeight: 600, color: 'var(--text-highlight)' }}>{log.actorEmail}</td>
                  <td style={{ padding: '0.65rem' }}><span className="badge badge-superadmin" style={{ fontSize: '0.7rem' }}>{log.action}</span></td>
                  <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>{log.target}</td>
                  <td style={{ padding: '0.65rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const adminName = user?.name || 'Admin Moderator';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Error Banner ── */}
      {status === 'error' && (
        <ErrorBanner
          message={`Failed to load administrator dashboard: ${error}`}
          onRetry={load}
        />
      )}

      {/* ── Welcome & Operational Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <span className="badge badge-admin" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
              🛡️ MODERATOR CONTROL
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              • Live Queue Telemetry
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
            Welcome back, {adminName}
          </h2>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Review pending creator proofs, track daily moderation throughput, and enforce compliance guidelines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={load}
            disabled={isLoading}
            style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Refresh dashboard metrics"
          >
            <span>↺</span> {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigateToNav('review-submissions')}
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              background: 'var(--role-admin)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
            }}
          >
            <span>⚖️</span> Review Queue ({pendingCount}) →
          </button>
        </div>
      </div>

      {/* ── Statistics Cards (4 KPI Cards) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
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
              label="Pending Submissions"
              value={pendingCount}
              sub="Awaiting verification decision"
              color="var(--status-warning)"
              icon="⏳"
              pulse={pendingCount > 0}
            />
            <StatCard
              label="Reviewed Today"
              value={reviewedToday}
              sub="Evaluated in the last 24 hours"
              color="var(--role-admin)"
              icon="🎯"
            />
            <StatCard
              label="Approved Submissions"
              value={approvedCount}
              sub="Valid creator activities logged"
              color="var(--status-success)"
              icon="✓"
            />
            <StatCard
              label="Rejected Submissions"
              value={rejectedCount}
              sub="Invalid or non-compliant proof"
              color="var(--status-error)"
              icon="✕"
            />
          </>
        )}
      </div>

      {/* ── Quick Link to Review Queue Callout ── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderLeft: '4px solid var(--role-admin)',
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
        }}
      >
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚖️</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
              Moderation &amp; Verification Queue
            </h3>
            {pendingCount > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                {pendingCount} PENDING
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            {pendingCount > 0
              ? `There are currently ${pendingCount} social activity submissions awaiting evidence inspection and approval.`
              : 'All pending submissions have been evaluated. Great job! Check back as creators log new activity.'}
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => onNavigateToNav('review-submissions')}
          style={{
            padding: '0.7rem 1.6rem',
            fontSize: '0.92rem',
            fontWeight: 700,
            background: 'var(--role-admin)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          <span>⚖️</span> Open Review Queue ({pendingCount}) →
        </button>
      </div>

      {/* ── Recent Pending Submissions List / Queue Preview ── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
                ⏳ Recent Pending Submissions
              </h3>
              {!isLoading && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                  {recentPending.length} shown
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    padding: '1rem 1.15rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
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
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.06)',
                        flexShrink: 0,
                      }}
                      title={sub.platform}
                    >
                      {PLATFORM_ICONS[sub.platform] || '🌐'}
                    </span>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-highlight)' }}>
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
                            padding: '0.15rem 0.45rem',
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
                          width: '44px',
                          height: '44px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                        }}
                        title="Click to view evidence in lightbox"
                      >
                        <ScreenshotImage
                          screenshotUrl={sub.screenshotUrl}
                          thumbnailStyle={{ width: '44px', height: '44px', objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Right: Status + Timing + Quick link to queue */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                        ⏳ PENDING
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {timeAgo(sub.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onNavigateToNav('review-submissions')}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      title="Inspect in moderation queue (actions handled in queue view)"
                    >
                      Inspect Queue →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Standard Moderation Procedures ── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
          📋 Moderator Verification Standard Operating Procedures
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--status-warning)' }}>1️⃣</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>Identity Verification</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Verify the creator handle visible in the screenshot matches the registered creator account.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--primary-light)' }}>2️⃣</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>Active Timestamp</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Confirm timestamp of social engagement proof is within the valid active campaign timeframe.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--status-success)' }}>3️⃣</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>Legitimate Evidence</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Ensure screenshot has not been cropped to obscure timestamps, handles, or interaction state.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--status-error)' }}>4️⃣</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>Constructive Feedback</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                When rejecting submissions, always provide actionable, polite feedback so creators can rectify.
              </div>
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
