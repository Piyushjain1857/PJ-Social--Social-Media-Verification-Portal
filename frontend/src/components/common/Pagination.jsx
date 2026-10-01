import React from 'react';

/**
 * Reusable Professional Pagination Component
 * 
 * Features:
 * - Dynamic page numbers with smart ellipsis
 * - First, Previous, Next, Last navigation buttons
 * - Clear result count summary ("Showing 1 to 10 of 48 items")
 * - Optional page limit size selector
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  totalCount = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50],
  isLoading = false
}) {
  if (totalCount === 0) return null;

  const startItem = Math.min((page - 1) * limit + 1, totalCount);
  const endItem = Math.min(page * limit, totalCount);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, page + 2);

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        marginTop: '1.25rem',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}
    >
      {/* Result Count and Range */}
      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        Showing <strong style={{ color: 'var(--text-highlight)' }}>{startItem}</strong> to{' '}
        <strong style={{ color: 'var(--text-highlight)' }}>{endItem}</strong> of{' '}
        <strong style={{ color: 'var(--text-highlight)' }}>{totalCount}</strong> entries
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        {/* Page Size Selector */}
        {onLimitChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Per page:</span>
            <select
              className="input-field"
              value={limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
              disabled={isLoading}
              style={{
                height: '30px',
                fontSize: '0.78rem',
                padding: '0.1rem 0.4rem',
                width: 'auto'
              }}
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Previous Button */}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          style={{
            padding: '0.35rem 0.65rem',
            fontSize: '0.78rem',
            height: '32px'
          }}
          title="Previous Page"
        >
          ◀ Prev
        </button>

        {/* Page Number Chips */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} style={{ padding: '0 0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                …
              </span>
            );
          }

          const isActive = p === page;
          return (
            <button
              key={`page-${p}`}
              type="button"
              className={isActive ? 'btn-primary' : 'btn-secondary'}
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          style={{
            padding: '0.35rem 0.65rem',
            fontSize: '0.78rem',
            height: '32px'
          }}
          title="Next Page"
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}
