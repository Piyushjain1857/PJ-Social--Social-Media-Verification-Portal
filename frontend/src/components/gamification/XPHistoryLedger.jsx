import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyXPHistory } from '../../services/gamificationApi';
import { fetchAdminUserXPHistory } from '../../services/adminGamificationApi';

const ACTION_TABS = [
  { id: 'ALL', label: 'All Activities' },
  { id: 'LIKE', label: '❤️ Likes (+1 XP)' },
  { id: 'COMMENT', label: '💬 Comments (+2 XP)' },
  { id: 'STORY', label: '📱 Stories (+2 XP)' },
  { id: 'BONUS', label: '🎁 Bonuses' }
];

export default function XPHistoryLedger({ targetUserId = null, userId = null }) {
  const activeUserId = targetUserId || userId;
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [actionType, setActionType] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async (page = 1, filterType = actionType) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      if (filterType !== 'ALL') {
        params.actionType = filterType;
      }

      const res = activeUserId
        ? await fetchAdminUserXPHistory(activeUserId, params)
        : await fetchMyXPHistory(params);

      if (res && res.success) {
        setHistory(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        throw new Error(res?.message || 'Failed to fetch XP transaction history.');
      }
    } catch (err) {
      setError(err.message || 'Error loading XP transactions ledger.');
    } finally {
      setIsLoading(false);
    }
  }, [actionType, activeUserId]);

  useEffect(() => {
    loadHistory(1, actionType);
  }, [actionType, loadHistory]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadHistory(newPage, actionType);
  };

  const handleTabChange = (typeId) => {
    setActionType(typeId);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="gamepoints-history-ledger-card glass-panel" id="xp-history-section">
      {/* Header */}
      <div className="gamepoints-timeline-header">
        <div>
          <div className="gamepoints-timeline-title-wrap">
            <span className="gamepoints-timeline-icon">📜</span>
            <h3 className="gamepoints-timeline-title">XP Activity Ledger</h3>
            <span className="gamepoints-count-badge">
              {pagination.totalCount} Verified Transactions
            </span>
          </div>
          <p className="gamepoints-timeline-subtitle">
            Itemized auditable record of verified social proof rewards &amp; bonuses
          </p>
        </div>

        {/* Earning Rules Quick Guide */}
        <div className="gamepoints-rules-pill-row">
          <span className="rule-pill like">❤️ Like: +1 XP</span>
          <span className="rule-pill comment">💬 Comment: +2 XP</span>
          <span className="rule-pill story">📱 Story: +2 XP</span>
          <span className="rule-pill bonus">🎁 Bonus: +50 XP</span>
        </div>
      </div>

      {/* Action Type Filter Tabs */}
      <div className="gamepoints-history-filters" role="tablist" aria-label="XP history filters">
        {ACTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={actionType === tab.id}
            className={`gamepoints-filter-btn ${actionType === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Table / List */}
      <div className="gamepoints-history-table-container">
        {isLoading ? (
          <div className="gamepoints-history-loading">
            <div className="status-dot checking" />
            <span>Loading verified XP ledger…</span>
          </div>
        ) : error ? (
          <div className="gamepoints-history-error">
            <span>⚠️ {error}</span>
          </div>
        ) : history.length === 0 ? (
          <div className="gamepoints-history-empty">
            <span className="empty-icon">📭</span>
            <h4>No activity recorded for this category</h4>
            <p>Submit social proof proofs to earn verified XP rewards.</p>
          </div>
        ) : (
          <div className="gamepoints-history-list">
            <div className="gamepoints-history-table-head">
              <span className="th-action">Action &amp; Proof</span>
              <span className="th-source">Source</span>
              <span className="th-date">Date &amp; Time</span>
              <span className="th-xp text-right">XP Earned</span>
            </div>

            {history.map((tx) => {
              const icon = tx.icon || '⚡';
              const actionName = tx.actionName || tx.actionType;
              const source = tx.source || tx.submission?.platform || 'Social Portal';
              const xpVal = tx.xp != null ? tx.xp : tx.points;

              return (
                <div key={tx.id} className="gamepoints-history-row">
                  <div className="td-action">
                    <span className="action-avatar-badge">{icon}</span>
                    <div className="action-text-group">
                      <span className="action-title">{actionName}</span>
                      <span className="action-desc">{tx.description}</span>
                    </div>
                  </div>

                  <div className="td-source">
                    <span className="source-tag">{source}</span>
                  </div>

                  <div className="td-date">
                    <span className="date-text">{formatDate(tx.date || tx.createdAt)}</span>
                  </div>

                  <div className="td-xp text-right">
                    <span className={`xp-badge-pill ${tx.actionType?.toLowerCase() || 'bonus'}`}>
                      +{xpVal} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="gamepoints-pagination-bar">
          <div className="pagination-info">
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalCount} total entries)
          </div>

          <div className="pagination-buttons">
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              ← Previous
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (pagination.totalPages > 5) {
                const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
                pageNum = start + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`btn-page ${pagination.page === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
