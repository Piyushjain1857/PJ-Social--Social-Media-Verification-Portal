import React, { useState } from 'react';

/**
 * Reusable Professional Filter & Search Bar
 * 
 * Features:
 * - Search input with debounced / immediate updates & clear icon
 * - Configurable filter dropdowns (Status, Platform, Action, Role, Reviewer, etc.)
 * - Optional Date Range selector (startDate, endDate)
 * - Sorting controls (field selection + asc/desc toggle)
 * - Result count display
 * - One-click "Clear All Filters" button
 * - Collapsible filter panel on smaller screens
 */
export default function FilterBar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  dateRange = null,
  sortOptions = [],
  sortBy = '',
  onSortByChange,
  sortOrder = 'desc',
  onToggleSortOrder,
  onClearFilters,
  hasActiveFilters = false,
  totalCount = null,
  isLoading = false
}) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Top Bar: Search, Quick Stats, Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Search Input Box */}
        <div style={{ flex: '1 1 280px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '0.9rem' }}>
            🔍
          </span>
          <input
            type="text"
            className="input-field"
            value={search}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%',
              paddingLeft: '2.4rem',
              paddingRight: search ? '2.4rem' : '0.85rem',
              height: '40px',
              fontSize: '0.88rem'
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange && onSearchChange('')}
              title="Clear search"
              style={{
                position: 'absolute',
                right: '0.75rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.2rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Results Counter & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {totalCount !== null && (
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap'
              }}
            >
              {isLoading ? 'Searching...' : `Found ${totalCount} ${totalCount === 1 ? 'result' : 'results'}`}
            </span>
          )}

          {/* Toggle Advanced Filters Button */}
          {(filters.length > 0 || dateRange) && (
            <button
              type="button"
              className={`btn-secondary ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: showAdvancedFilters ? 'rgba(99, 102, 241, 0.2)' : undefined,
                borderColor: showAdvancedFilters ? 'var(--primary)' : undefined
              }}
            >
              <span>⚙️ Filters</span>
              {hasActiveFilters && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'inline-block'
                  }}
                />
              )}
            </button>
          )}

          {/* Clear Filters CTA */}
          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="btn-secondary"
              title="Reset all filters and search to default"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                color: 'var(--status-error)',
                borderColor: 'rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>✕</span>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showAdvancedFilters && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.85rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          {/* Custom Select Filters */}
          {filters.map((filter) => (
            <div key={filter.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                {filter.label}
              </label>
              <select
                className="input-field"
                value={filter.value || 'ALL'}
                onChange={(e) => filter.onChange && filter.onChange(e.target.value)}
                style={{ height: '36px', fontSize: '0.82rem', padding: '0.25rem 0.65rem' }}
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Date Range: Start Date */}
          {dateRange && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  From Date
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={dateRange.startDate || ''}
                  onChange={(e) => dateRange.onStartDateChange && dateRange.onStartDateChange(e.target.value)}
                  style={{ height: '36px', fontSize: '0.82rem', padding: '0.25rem 0.65rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  To Date
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={dateRange.endDate || ''}
                  onChange={(e) => dateRange.onEndDateChange && dateRange.onEndDateChange(e.target.value)}
                  style={{ height: '36px', fontSize: '0.82rem', padding: '0.25rem 0.65rem' }}
                />
              </div>
            </>
          )}

          {/* Sort By Field */}
          {sortOptions.length > 0 && onSortByChange && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Sort By
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <select
                  className="input-field"
                  value={sortBy}
                  onChange={(e) => onSortByChange(e.target.value)}
                  style={{ height: '36px', fontSize: '0.82rem', padding: '0.25rem 0.65rem', flex: 1 }}
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {onToggleSortOrder && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onToggleSortOrder}
                    title={sortOrder === 'asc' ? 'Ascending (A-Z, oldest first)' : 'Descending (Z-A, newest first)'}
                    style={{
                      height: '36px',
                      padding: '0 0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem'
                    }}
                  >
                    {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
