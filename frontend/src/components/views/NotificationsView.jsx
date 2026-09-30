import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getNotificationMeta = (notif) => {
  const isApproved =
    notif.type === 'APPROVAL' ||
    notif.title?.toLowerCase().includes('approved') ||
    notif.message?.toLowerCase().includes('approved');

  const isRejected =
    notif.type === 'REJECTION' ||
    notif.title?.toLowerCase().includes('rejected') ||
    notif.message?.toLowerCase().includes('rejected');

  const isAccount =
    notif.type === 'ACCOUNT_ALERT' ||
    notif.title?.toLowerCase().includes('role') ||
    notif.message?.toLowerCase().includes('role');

  if (isApproved) {
    return {
      category: 'approval',
      icon: '🎉',
      color: 'var(--status-success)',
      borderColor: 'var(--status-success)',
      bgColor: 'rgba(34, 197, 94, 0.12)',
      label: 'Approved'
    };
  }
  if (isRejected) {
    return {
      category: 'rejection',
      icon: '❌',
      color: 'var(--status-error)',
      borderColor: 'var(--status-error)',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      label: 'Rejected'
    };
  }
  if (isAccount) {
    return {
      category: 'account',
      icon: '🛡️',
      color: 'var(--role-superadmin)',
      borderColor: 'var(--role-superadmin)',
      bgColor: 'rgba(192, 132, 252, 0.12)',
      label: 'Admin Action'
    };
  }
  return {
    category: 'system',
    icon: '📢',
    color: 'var(--accent-cyan)',
    borderColor: 'var(--accent-cyan)',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    label: 'Notice'
  };
};

export default function NotificationsView({ onNavigateToNav, onNotificationUpdated }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, UNREAD, READ, APPROVALS, REJECTIONS, ACCOUNT
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState(new Set());
  const [statusMessage, setStatusMessage] = useState(null);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
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

  const handleMarkAsRead = async (notifId) => {
    if (markingIds.has(notifId)) return;
    setMarkingIds(prev => new Set(prev).add(notifId));

    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, isRead: true } : n)
    );

    try {
      await markNotificationRead(notifId);
      if (onNotificationUpdated) onNotificationUpdated();
    } catch (err) {
      console.warn('Error marking notification as read:', err.message);
      loadNotifications();
    } finally {
      setMarkingIds(prev => {
        const next = new Set(prev);
        next.delete(notifId);
        return next;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      const res = await markAllNotificationsRead();
      setStatusMessage({
        type: 'success',
        text: `Marked ${res.count || unreadCount} notification(s) as read.`
      });
      setTimeout(() => setStatusMessage(null), 4000);
      if (onNotificationUpdated) onNotificationUpdated();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Failed to mark all as read. Please try again.'
      });
      loadNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Metrics computation
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = totalCount - unreadCount;

  // Filter and search
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      const meta = getNotificationMeta(notif);

      // Tab filtering
      if (activeFilter === 'UNREAD' && notif.isRead) return false;
      if (activeFilter === 'READ' && !notif.isRead) return false;
      if (activeFilter === 'APPROVALS' && meta.category !== 'approval') return false;
      if (activeFilter === 'REJECTIONS' && meta.category !== 'rejection') return false;
      if (activeFilter === 'ACCOUNT' && meta.category !== 'account') return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = notif.title?.toLowerCase().includes(query);
        const matchesMsg = notif.message?.toLowerCase().includes(query);
        const matchesType = notif.type?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMsg && !matchesType) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  return (
    <div className="notif-page-container">
      {/* Top Banner / Actions Bar */}
      <div className="glass-panel notif-header-panel">
        <div>
          <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', color: 'var(--text-highlight)' }}>
            🔔 Notification & Verification Center
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Real-time updates regarding submission reviews, administrative actions, and account security.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadNotifications}
            disabled={isLoading}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          >
            {isLoading ? 'Checking...' : '🔄 Refresh'}
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              opacity: unreadCount === 0 ? 0.5 : 1,
              cursor: unreadCount === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {isMarkingAll ? 'Marking...' : '✓ Mark All as Read'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="notif-stats-strip">
        <div className="notif-stat-pill">
          <span>Total Notifications:</span>
          <strong>{totalCount}</strong>
        </div>
        <div className={`notif-stat-pill ${unreadCount > 0 ? 'unread' : ''}`}>
          <span>Unread:</span>
          <strong>{unreadCount}</strong>
        </div>
        <div className="notif-stat-pill">
          <span>Read:</span>
          <strong>{readCount}</strong>
        </div>
        <div className="notif-stat-pill" style={{ marginLeft: 'auto' }}>
          <span>Security Clearance:</span>
          <strong style={{ color: 'var(--accent-cyan)' }}>{user?.role || 'USER'}</strong>
        </div>
      </div>

      {/* Status banner if action was performed */}
      {statusMessage && (
        <div
          className={`badge ${statusMessage.type === 'success' ? 'badge-success' : 'badge-error'}`}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="notif-controls-row">
        <div className="notif-filter-tabs">
          <button
            type="button"
            className={`notif-filter-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            <span>All</span>
            <span className="notif-filter-count">{totalCount}</span>
          </button>

          <button
            type="button"
            className={`notif-filter-tab ${activeFilter === 'UNREAD' ? 'active' : ''}`}
            onClick={() => setActiveFilter('UNREAD')}
          >
            <span>Unread</span>
            <span className="notif-filter-count">{unreadCount}</span>
          </button>

          <button
            type="button"
            className={`notif-filter-tab ${activeFilter === 'READ' ? 'active' : ''}`}
            onClick={() => setActiveFilter('READ')}
          >
            <span>Read</span>
            <span className="notif-filter-count">{readCount}</span>
          </button>

          <button
            type="button"
            className={`notif-filter-tab ${activeFilter === 'APPROVALS' ? 'active' : ''}`}
            onClick={() => setActiveFilter('APPROVALS')}
          >
            <span>🎉 Approvals</span>
          </button>

          <button
            type="button"
            className={`notif-filter-tab ${activeFilter === 'REJECTIONS' ? 'active' : ''}`}
            onClick={() => setActiveFilter('REJECTIONS')}
          >
            <span>❌ Rejections</span>
          </button>

          <button
            type="button"
            className={`notif-filter-tab ${activeFilter === 'ACCOUNT' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ACCOUNT')}
          >
            <span>🛡️ Admin Actions</span>
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem 0.4rem 2rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-md)'
            }}
          />
          <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.85rem' }}>
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="glass-panel notif-empty-state" style={{ padding: '3.5rem 2rem' }}>
          <div className="notif-empty-icon" style={{ fontSize: '3rem' }}>
            {activeFilter === 'UNREAD' ? '🎉' : searchQuery ? '🔍' : '🔕'}
          </div>
          <h3 className="notif-empty-title" style={{ fontSize: '1.1rem' }}>
            {searchQuery
              ? `No notifications matching "${searchQuery}"`
              : activeFilter === 'UNREAD'
              ? 'You have zero unread notifications'
              : 'No notifications in this view'}
          </h3>
          <p className="notif-empty-desc" style={{ maxWidth: '380px' }}>
            {activeFilter === 'UNREAD'
              ? "You're completely caught up! New verification alerts or administrator actions will appear here automatically."
              : searchQuery
              ? 'Try searching with a different keyword or resetting your filter tabs.'
              : 'Notifications generated during the verification workflow and moderation reviews will appear here.'}
          </p>
          {(activeFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setActiveFilter('ALL');
                setSearchQuery('');
              }}
              style={{ marginTop: '0.5rem', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="notif-cards-list">
          {filteredNotifications.map((notif) => {
            const meta = getNotificationMeta(notif);
            const isUnread = !notif.isRead;
            const isMarkingThis = markingIds.has(notif.id);

            return (
              <div
                key={notif.id}
                className={`glass-panel notif-card ${isUnread ? 'unread' : ''}`}
                style={{
                  borderLeftColor: meta.borderColor,
                }}
              >
                {/* Notification Type Icon */}
                <div
                  className="notif-card-icon-wrap"
                  style={{
                    background: meta.bgColor,
                    color: meta.color,
                    border: `1px solid ${meta.borderColor}33`
                  }}
                >
                  {meta.icon}
                </div>

                {/* Main Card Content */}
                <div className="notif-card-main">
                  <div className="notif-card-top">
                    <div className="notif-card-title-group">
                      <span className="notif-card-title">
                        {notif.title || 'Verification Update'}
                      </span>
                      <span className={`notif-status-badge ${isUnread ? 'unread' : 'read'}`}>
                        {isUnread ? '● UNREAD' : 'READ'}
                      </span>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.66rem',
                          background: meta.bgColor,
                          color: meta.color,
                          borderColor: `${meta.borderColor}44`
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="notif-card-time" title={new Date(notif.createdAt).toLocaleString()}>
                      {formatTimeAgo(notif.createdAt)}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="notif-card-message">
                    {notif.message}
                  </div>

                  {/* Card Bottom / Actions */}
                  <div className="notif-card-bottom">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {notif.submissionId && (
                        <button
                          type="button"
                          className="nav-link"
                          onClick={() => {
                            if (user?.role === 'USER') {
                              onNavigateToNav('my-submissions');
                            } else {
                              onNavigateToNav('review-submissions');
                            }
                          }}
                          style={{
                            fontSize: '0.78rem',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: 'var(--accent-cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <span>Inspect linked submission #{notif.submissionId}</span>
                          <span>→</span>
                        </button>
                      )}

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div>
                      {isUnread ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleMarkAsRead(notif.id)}
                          disabled={isMarkingThis}
                          style={{
                            fontSize: '0.74rem',
                            padding: '0.25rem 0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <span>{isMarkingThis ? '⌛' : '✓'}</span>
                          <span>{isMarkingThis ? 'Marking...' : 'Mark as read'}</span>
                        </button>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <span>✓</span>
                          <span>Read</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
