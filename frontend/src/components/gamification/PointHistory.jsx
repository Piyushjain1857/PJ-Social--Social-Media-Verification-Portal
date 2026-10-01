import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyPointsHistory } from '../../services/api';

const ACTION_ICONS = {
  LIKE: '❤️',
  COMMENT: '💬',
  STORY: '📱',
  BONUS: '🎁',
  ADJUSTMENT: '⚖️'
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * PointHistory Component
 * Paginated, searchable, and filterable point transaction history for the authenticated user.
 */
export default function PointHistory() {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchMyPointsHistory({
        page,
        limit: 10,
        search: search.trim() || undefined,
        actionType: actionType !== 'ALL' ? actionType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      if (res && res.success) {
        setHistory(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        throw new Error(res?.message || 'Failed to load point transaction history.');
      }
    } catch (err) {
      setError(err.message || 'Error loading transaction history.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, actionType, startDate, endDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleResetFilters = () => {
    setSearch('');
    setActionType('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.35rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
            Point History
          </h3>
          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Audit log of verified activities and point awards
          </p>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Total Transactions: <strong>{pagination.totalCount || history.length}</strong>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="history-filters-bar">
        <input
          type="text"
          className="history-search-input"
          placeholder="Search activity or notes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="history-select"
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Actions</option>
          <option value="LIKE">❤️ Likes (+1)</option>
          <option value="COMMENT">💬 Comments (+2)</option>
          <option value="STORY">📱 Stories (+2)</option>
          <option value="BONUS">🎁 Bonus</option>
          <option value="ADJUSTMENT">⚖️ Adjustments</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <input
            type="date"
            className="history-select"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            title="Start Date"
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
          <input
            type="date"
            className="history-select"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            title="End Date"
          />
        </div>

        {(search || actionType !== 'ALL' || startDate || endDate) && (
          <button
            type="button"
            className="btn-ghost"
            onClick={handleResetFilters}
            style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--status-error-bg)', border: '1px solid var(--status-error)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: '62px', borderRadius: '8px' }} />
          ))}
        </div>
      ) : history.length === 0 ? (
        /* Empty State */
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            No point transactions found
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
            {search || actionType !== 'ALL' || startDate || endDate
              ? 'Try adjusting your search criteria or clearing filters.'
              : 'Submit and get your social media proofs approved to start earning points!'}
          </p>
        </div>
      ) : (
        /* Transactions List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {history.map((tx) => {
            const isPositive = tx.points >= 0;
            const actionIcon = ACTION_ICONS[tx.actionType] || '⭐';
            const platform = tx.submission?.platform || tx.metadata?.actionType || 'Institutional Portal';

            return (
              <div key={tx.id} className="history-tx-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}
                  >
                    {actionIcon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-highlight)' }}>
                        {platform} {tx.actionType}
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        APPROVED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {tx.description || 'Verified social engagement activity proof'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {formatDate(tx.createdAt)}
                    </div>
                  </div>
                </div>

                <div className={`history-tx-points ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? `+${tx.points}` : tx.points} pts
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
