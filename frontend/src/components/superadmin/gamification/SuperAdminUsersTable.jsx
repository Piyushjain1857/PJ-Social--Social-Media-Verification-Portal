import React from 'react';

export default function SuperAdminUsersTable({
  users = [],
  pagination = {},
  isLoading,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
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
  onAdjustXP
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
    search || roleFilter || levelFilter || statusFilter || minXP || maxXP || (sortBy && sortBy !== 'xp')
  );

  return (
    <div className="superadmin-users-table-container">
      {/* Search & Filters Controls */}
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
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by Name, Email, or User ID…"
              className="input-portal"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.86rem' }}
            />
          </div>

          {/* Role Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="input-portal"
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              style={{ width: '100%', fontSize: '0.84rem' }}
            >
              <option value="">All Roles</option>
              <option value="USER">User (Creator)</option>
              <option value="ADMIN">Admin (Moderator)</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '120px' }}>
            <select
              className="input-portal"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              style={{ width: '100%', fontSize: '0.84rem' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ minWidth: '140px' }}>
            <select
              className="input-portal"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              style={{ width: '100%', fontSize: '0.84rem' }}
            >
              <option value="xp">Highest XP</option>
              <option value="level">Highest Level</option>
              <option value="rank">Best Rank</option>
              <option value="recent_activity">Recent Activity</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>XP Range:</span>
            <input
              type="number"
              placeholder="Min XP"
              value={minXP}
              onChange={(e) => onMinXPChange(e.target.value)}
              style={{
                width: '95px',
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
                width: '95px',
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
            Showing <strong>{users.length}</strong> of <strong>{pagination.totalUsers || 0}</strong> platform accounts
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
            <div>Loading Super Admin users directory...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-highlight)' }}>
              No Users Found
            </div>
            <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No platform accounts matched your search terms or filter criteria.
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
            {/* Desktop Table */}
            <div className="table-responsive admin-desktop-points-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '0.95rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>User</th>
                    <th style={{ padding: '0.95rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '0.95rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total XP</th>
                    <th style={{ padding: '0.95rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Level</th>
                    <th style={{ padding: '0.95rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rank</th>
                    <th style={{ padding: '0.95rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>XP (7d / 30d)</th>
                    <th style={{ padding: '0.95rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last Activity</th>
                    <th style={{ padding: '0.95rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.95rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.2s'
                      }}
                      className="table-row-hover"
                    >
                      {/* User Column */}
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
                            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.92rem' }}>
                              {u.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            background: u.role === 'SUPER_ADMIN' ? 'rgba(236, 72, 153, 0.15)' : (u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.12)'),
                            color: u.role === 'SUPER_ADMIN' ? '#f472b6' : (u.role === 'ADMIN' ? '#a5b4fc' : '#6ee7b7'),
                            border: `1px solid ${u.role === 'SUPER_ADMIN' ? 'rgba(236, 72, 153, 0.3)' : (u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.25)')}`
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Total XP */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.98rem' }}>
                          {(u.totalXP || 0).toLocaleString()} XP
                        </span>
                      </td>

                      {/* Level */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1rem' }}>{u.levelIcon || '🌱'}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.84rem' }}>
                              Lvl {u.currentLevel}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {u.levelName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rank */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: u.rank === 1 ? '#facc15' : (u.rank <= 3 ? '#38bdf8' : 'var(--text-secondary)'),
                            fontSize: '0.92rem'
                          }}
                        >
                          #{u.rank}
                        </span>
                      </td>

                      {/* XP This Week / Month */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>+{u.xpThisWeek || 0}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 0.25rem' }}>/</span>
                          <span style={{ color: '#38bdf8' }}>+{u.xpThisMonth || 0}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>7d / 30d gain</div>
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
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: u.status === 'ACTIVE' ? '#10b981' : '#ef4444'
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
                            title="Inspect complete gamification dossier"
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
                            title="Super Admin manual XP adjustment"
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
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
                      <span style={{ color: 'var(--text-muted)' }}>Role: </span>
                      <strong>{u.role}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Level: </span>
                      <strong style={{ color: 'var(--text-highlight)' }}>{u.currentLevel} ({u.levelName})</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Rank: </span>
                      <strong style={{ color: '#facc15' }}>#{u.rank}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => onViewUser(u.id)}
                      className="btn-portal-secondary"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem' }}
                    >
                      👁 View Dossier
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustXP(u)}
                      className="btn-portal-primary"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem' }}
                    >
                      ✏️ Adjust XP
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Bar */}
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
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || 1}</strong> ({pagination.totalUsers || 0} total)
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => onPageChange(pagination.page - 1)}
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
                  onClick={() => onPageChange(pagination.page + 1)}
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
