import React, { useState, useEffect } from 'react';
import { fetchMyNotifications } from '../../services/api';

export default function NotificationsView({ onNavigateToNav }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetchMyNotifications();
      if (res.success) {
        setNotifications(res.data || []);
      }
    } catch (err) {
      console.warn('Notifications fetch warning:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
            🔔 Activity Verification Alerts
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Instant notifications regarding verification reviews and account status updates.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadNotifications}
          disabled={isLoading}
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
        >
          {isLoading ? 'Checking...' : '🔄 Refresh'}
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔕</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-highlight)' }}>No New Notifications</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            You're all caught up! You will be notified here once an admin moderator reviews your activity proof.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                borderLeft: notif.type === 'APPROVAL' ? '4px solid var(--status-success)' : notif.type === 'REJECTION' ? '4px solid var(--status-error)' : '4px solid var(--primary)'
              }}
            >
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                {notif.type === 'APPROVAL' ? '🎉' : notif.type === 'REJECTION' ? '⚠️' : '📢'}
              </span>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-highlight)' }}>
                    {notif.title || notif.type || 'Verification Update'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {notif.message}
                </div>

                {notif.submissionId && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className="nav-link"
                      onClick={() => onNavigateToNav('my-submissions')}
                      style={{ fontSize: '0.78rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-cyan)' }}
                    >
                      Inspect linked submission #{notif.submissionId} →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
