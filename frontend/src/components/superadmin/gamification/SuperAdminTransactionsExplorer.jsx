import React, { useState, useEffect } from 'react';
import { fetchSuperAdminTransactions } from '../../../services/superAdminGamificationApi';

export default function SuperAdminTransactionsExplorer() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalTransactions: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [minXP, setMinXP] = useState('');
  const [maxXP, setMaxXP] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadTransactions = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchSuperAdminTransactions({
        page,
        limit: 15,
        search,
        action: actionFilter,
        minXP,
        maxXP,
        startDate,
        endDate
      });
      if (res && res.success) {
        setTransactions(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Could not load transactions:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
  }, [actionFilter, minXP, maxXP, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTransactions(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setActionFilter('');
    setMinXP('');
    setMaxXP('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => loadTransactions(1), 50);
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'LIKE':
        return { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'COMMENT':
        return { bg: 'rgba(168, 85, 247, 0.14)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' };
      case 'STORY':
        return { bg: 'rgba(236, 72, 153, 0.14)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.35)' };
      case 'SUPER_ADMIN_ADJUSTMENT':
        return { bg: 'rgba(245, 158, 11, 0.16)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' };
      case 'ADMIN_ADJUSTMENT':
      case 'ADJUSTMENT':
        return { bg: 'rgba(99, 102, 241, 0.14)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.35)' };
      case 'BONUS':
        return { bg: 'rgba(16, 185, 129, 0.14)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.08)', text: '#cbd5e1', border: 'rgba(255, 255, 255, 0.15)' };
    }
  };

  const hasActiveFilters = Boolean(search || actionFilter || minXP || maxXP || startDate || endDate);

  return (
    <div className="superadmin-transactions-explorer">
      {/* Search & Filters Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px', marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by User, Actor, or Description…"
                className="input-portal"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.86rem' }}
              />
            </div>

            {/* Action Type Filter */}
            <div style={{ minWidth: '170px' }}>
              <select
                className="input-portal"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem' }}
              >
                <option value="">All Action Types</option>
                <option value="LIKE">Like (Post)</option>
                <option value="COMMENT">Comment</option>
                <option value="STORY">Story</option>
                <option value="SUPER_ADMIN_ADJUSTMENT">Super Admin Adjustment</option>
                <option value="ADMIN_ADJUSTMENT">Admin Adjustment</option>
                <option value="ADJUSTMENT">Manual Adjustment</option>
                <option value="BONUS">Bonus XP</option>
              </select>
            </div>

            <button type="submit" className="btn-portal-primary" style={{ fontSize: '0.84rem', padding: '0.5rem 1rem' }}>
              Search
            </button>
          </div>

          {/* Secondary Filters: Dates & XP Range */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dates:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-portal"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-portal"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>XP:</span>
              <input
                type="number"
                placeholder="Min"
                value={minXP}
                onChange={(e) => setMinXP(e.target.value)}
                style={{
                  width: '80px',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              />
              <span style={{ color: 'var(--text-muted)' }}>–</span>
              <input
                type="number"
                placeholder="Max"
                value={maxXP}
                onChange={(e) => setMaxXP(e.target.value)}
                style={{
                  width: '80px',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Clear
              </button>
            )}

            <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Total: <strong>{pagination.totalTransactions || 0}</strong> transactions recorded
            </div>
          </div>
        </form>
      </div>

      {/* Transactions Table Container */}
      <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
            <div>Loading XP transaction explorer...</div>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions match the selected filters.
          </div>
        ) : (
          <>
            <div className="table-responsive admin-desktop-points-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date / Time</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recipient User</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Actor</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>XP Delta</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Source</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reason / Details</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const badge = getActionBadgeColor(tx.action);
                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }} className="table-row-hover">
                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(tx.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{tx.user?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{tx.user?.email}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                          {tx.actor}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`
                            }}
                          >
                            {tx.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 800, color: tx.xp >= 0 ? '#10b981' : '#f87171', fontSize: '0.95rem' }}>
                            {tx.xp > 0 ? `+${tx.xp}` : tx.xp} XP
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {tx.source}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '240px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.reason}>
                            {tx.reason}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                            ● {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="admin-mobile-points-cards">
              {transactions.map((tx) => (
                <div key={tx.id} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{tx.user?.name}</span>
                    <span style={{ fontWeight: 800, color: tx.xp >= 0 ? '#10b981' : '#f87171' }}>
                      {tx.xp > 0 ? `+${tx.xp}` : tx.xp} XP
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{tx.action} • {tx.actor}</span>
                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{tx.reason}</div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || 1}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => loadTransactions(pagination.page - 1)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: pagination.page <= 1 ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1',
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadTransactions(pagination.page + 1)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: pagination.page >= pagination.totalPages ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1',
                    cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
