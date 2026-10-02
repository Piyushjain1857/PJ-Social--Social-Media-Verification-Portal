import React from 'react';

export default function AdminUsersPointsTable({
  users = [],
  pagination = {},
  isLoading,
  search,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  minXP,
  onMinXPChange,
  maxXP,
  onMaxXPChange,
  onClearFilters,
  onPageChange,
  onViewUser,
  onAdjustXP,
  onViewProgress
}) {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const hasActiveFilters = Boolean(
    search || levelFilter || statusFilter || minXP || maxXP || (sortBy && sortBy !== 'highest_xp')
  );

  return (
    <div className="admin-users-points-section">
      {/* Search and Filters Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          borderRadius: '14px',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by Name, Email, or User ID..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Level Filter */}
          <div style={{ flex: '0 0 140px' }}>
            <select
              value={levelFilter}
              onChange={(e) => onLevelFilterChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              <option value="">All Levels</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
              <option value="5">Level 5+</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: '0 0 130px' }}>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ flex: '0 0 170px' }}>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              <option value="highest_xp">Highest XP</option>
              <option value="lowest_xp">Lowest XP</option>
              <option value="highest_level">Highest Level</option>
              <option value="lowest_level">Lowest Level</option>
              <option value="recent_activity">Recent Activity</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters row (XP Range + Clear) */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>XP Range:</span>
            <input
              type="number"
              placeholder="Min XP"
              value={minXP}
              onChange={(e) => onMinXPChange(e.target.value)}
              style={{
                width: '100px',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '0.82rem'
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>–</span>
            <input
              type="number"
              placeholder="Max XP"
              value={maxXP}
              onChange={(e) => onMaxXPChange(e.target.value)}
              style={{
                width: '100px',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '0.82rem'
              }}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clear Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing <strong>{users.length}</strong> of <strong>{pagination.totalUsers || 0}</strong> creators
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
            <div>Loading creator points ledger...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-highlight)' }}>
              No Creators Found
            </div>
            <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No creator accounts matched your search terms or filter criteria.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-portal-secondary"
                onClick={onClearFilters}
                style={{ fontSize: '0.82rem' }}
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive admin-desktop-points-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>User</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total XP</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Level</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Level Name</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rank</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last Activity</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                      className="admin-table-row"
                    >
                      {/* User Avatar + Name */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>
                              {u.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ID: {u.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>

                      {/* Total XP */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                          {(u.totalXP || 0).toLocaleString()} XP
                        </span>
                      </td>

                      {/* Level */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}
                        >
                          Level {u.currentLevel}
                        </span>
                      </td>

                      {/* Level Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-highlight)', fontWeight: 600 }}>
                          <span>{u.icon || '🌱'}</span>
                          <span>{u.levelName}</span>
                        </div>
                      </td>

                      {/* Rank */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: u.rank === 1 ? '#facc15' : u.rank === 2 ? '#cbd5e1' : u.rank === 3 ? '#d97706' : 'var(--text-highlight)'
                          }}
                        >
                          #{u.rank}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {u.lastActivity}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: u.status === 'ACTIVE' ? '#34d399' : '#f87171',
                            border: u.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: u.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                            }}
                          />
                          {u.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onViewUser(u.id)}
                            title="View full gamification dossier"
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#cbd5e1',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            👁 View
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdjustXP(u)}
                            title="Adjust user XP"
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.35)',
                              color: '#a5b4fc',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            ✏️ Adjust XP
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewProgress(u.id)}
                            title="View XP progression curves"
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#7dd3fc',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            📊 View Progress
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (visible on screens <= 768px via CSS) */}
            <div className="admin-mobile-points-cards">
              {users.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}
                      >
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1rem' }}>
                      {(u.totalXP || 0).toLocaleString()} XP
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Level: </span>
                      <strong style={{ color: 'var(--text-highlight)' }}>{u.currentLevel} ({u.levelName})</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Rank: </span>
                      <strong style={{ color: '#facc15' }}>#{u.rank}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Active: </span>
                      <span>{u.lastActivity}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => onViewUser(u.id)}
                      className="btn-portal-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem' }}
                    >
                      👁 View
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustXP(u)}
                      className="btn-portal-primary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem' }}
                    >
                      ✏️ Adjust XP
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewProgress(u.id)}
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#7dd3fc',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      📊 Progress
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalUsers} total creators)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="btn-portal-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="btn-portal-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
