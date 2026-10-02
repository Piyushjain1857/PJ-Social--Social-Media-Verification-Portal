import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import FilterBar from '../common/FilterBar';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, APPROVAL, REJECTION, ACCOUNT_ALERT, SYSTEM_ALERT
  const [readFilter, setReadFilter] = useState('ALL'); // ALL, UNREAD, READ
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNext: false,
    hasPrev: false
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState(new Set());
  const [statusMessage, setStatusMessage] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setTypeFilter('ALL');
    setReadFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    debouncedSearch ||
    typeFilter !== 'ALL' ||
    readFilter !== 'ALL' ||
    startDate ||
    endDate ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc'
  );

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      let isReadParam;
      if (readFilter === 'UNREAD') isReadParam = false;
      else if (readFilter === 'READ') isReadParam = true;

      const res = await fetchNotifications({
        page,
        limit,
        search: debouncedSearch,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        isRead: isReadParam,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder
      });

      if (res.success && res.data) {
        setNotifications(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.unreadCount !== undefined) {
          setUnreadCount(res.unreadCount);
        }
      }
    } catch (err) {
      console.warn('Notifications fetch warning:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, typeFilter, readFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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
  const totalCount = pagination.totalCount || notifications.length;
  const readCount = Math.max(0, totalCount - unreadCount);

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
            className="btn-refresh-pill"
            onClick={loadNotifications}
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
            <span>{isLoading ? 'Checking…' : 'Refresh Data'}</span>
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

      {/* Quick Category Tabs */}
      <div className="notif-filter-tabs" style={{ marginBottom: '0.5rem' }}>
        <button
          type="button"
          className={`notif-filter-tab ${typeFilter === 'ALL' && readFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => { setTypeFilter('ALL'); setReadFilter('ALL'); setPage(1); }}
        >
          <span>All</span>
          <span className="notif-filter-count">{totalCount}</span>
        </button>

        <button
          type="button"
          className={`notif-filter-tab ${readFilter === 'UNREAD' ? 'active' : ''}`}
          onClick={() => { setReadFilter('UNREAD'); setTypeFilter('ALL'); setPage(1); }}
        >
          <span>Unread</span>
          <span className="notif-filter-count">{unreadCount}</span>
        </button>

        <button
          type="button"
          className={`notif-filter-tab ${readFilter === 'READ' ? 'active' : ''}`}
          onClick={() => { setReadFilter('READ'); setTypeFilter('ALL'); setPage(1); }}
        >
          <span>Read</span>
          <span className="notif-filter-count">{readCount}</span>
        </button>

        <button
          type="button"
          className={`notif-filter-tab ${typeFilter === 'APPROVAL' ? 'active' : ''}`}
          onClick={() => { setTypeFilter('APPROVAL'); setReadFilter('ALL'); setPage(1); }}
        >
          <span>🎉 Approvals</span>
        </button>

        <button
          type="button"
          className={`notif-filter-tab ${typeFilter === 'REJECTION' ? 'active' : ''}`}
          onClick={() => { setTypeFilter('REJECTION'); setReadFilter('ALL'); setPage(1); }}
        >
          <span>❌ Rejections</span>
        </button>

        <button
          type="button"
          className={`notif-filter-tab ${typeFilter === 'ACCOUNT_ALERT' ? 'active' : ''}`}
          onClick={() => { setTypeFilter('ACCOUNT_ALERT'); setReadFilter('ALL'); setPage(1); }}
        >
          <span>🛡️ Admin Actions</span>
        </button>
      </div>

      {/* Professional Search & Filter Bar */}
      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search notifications by title or message..."
        filters={[
          {
            id: 'type',
            label: 'Alert Type',
            value: typeFilter,
            onChange: (val) => { setTypeFilter(val); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Alert Types' },
              { value: 'APPROVAL', label: 'Approvals (🎉)' },
              { value: 'REJECTION', label: 'Rejections (❌)' },
              { value: 'ACCOUNT_ALERT', label: 'Account Alerts (🛡️)' },
              { value: 'SYSTEM_ALERT', label: 'System Notices (📢)' }
            ]
          },
          {
            id: 'readStatus',
            label: 'Read Status',
            value: readFilter,
            onChange: (val) => { setReadFilter(val); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'UNREAD', label: 'Unread Only' },
              { value: 'READ', label: 'Read Only' }
            ]
          }
        ]}
        dateRange={{
          startDate,
          onStartDateChange: (d) => { setStartDate(d); setPage(1); },
          endDate,
          onEndDateChange: (d) => { setEndDate(d); setPage(1); }
        }}
        sortOptions={[
          { value: 'createdAt', label: 'Received Date' },
          { value: 'title', label: 'Alert Title' },
          { value: 'type', label: 'Alert Category' }
        ]}
        sortBy={sortBy}
        onSortByChange={(val) => { setSortBy(val); setPage(1); }}
        sortOrder={sortOrder}
        onToggleSortOrder={() => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); setPage(1); }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        totalCount={pagination.totalCount}
        isLoading={isLoading}
      />

      {/* Notifications List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="glass-panel skeleton-card" style={{ height: '90px' }} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={readFilter === 'UNREAD' ? '🎉' : '🔕'}
          title={
            readFilter === 'UNREAD'
              ? 'Zero Unread Notifications'
              : 'No Notifications Found'
          }
          description={
            hasActiveFilters
              ? 'No notifications match your active search and filter criteria. Try resetting filters.'
              : readFilter === 'UNREAD'
              ? "You're completely caught up! New alerts and moderation updates will appear here automatically."
              : 'Notifications generated during verification and moderation activities will appear here.'
          }
          actionText={hasActiveFilters ? 'Clear All Filters' : null}
          onAction={hasActiveFilters ? handleClearFilters : null}
        />
      ) : (
        <div className="notif-cards-list">
          {notifications.map((notif) => {
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

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        limit={limit}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        limitOptions={[10, 25, 50]}
        isLoading={isLoading}
      />
    </div>
  );
}
