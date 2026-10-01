import React, { useState, useEffect, useCallback } from 'react';
import { fetchUsers, updateUserRole } from '../../services/api';
import FilterBar from '../common/FilterBar';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';

export default function AdminsView() {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL, ADMIN, SUPER_ADMIN
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 12,
    hasNext: false,
    hasPrev: false
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setRoleFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
    debouncedSearch ||
    roleFilter !== 'ALL' ||
    startDate ||
    endDate ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc'
  );

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Query server for administrative accounts
      const queryRole = roleFilter === 'ALL' ? 'ADMINS' : roleFilter;
      const res = await fetchUsers({
        page,
        limit,
        search: debouncedSearch,
        role: queryRole,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder
      });

      if (res.success) {
        const list = res.data || [];
        setAdmins(list);
        if (res.pagination) {
          setPagination(res.pagination);
        } else {
          setPagination({
            totalCount: list.length,
            totalPages: 1,
            currentPage: 1,
            limit: list.length,
            hasNext: false,
            hasPrev: false
          });
        }
      } else {
        throw new Error(res.message || 'Failed to load administrator directory.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load administrator directory.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleDemoteAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to demote this administrator to regular USER?')) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateUserRole(userId, 'USER');
      if (res.success) {
        setStatusMessage('Administrator successfully demoted to Creator USER.');
        await loadAdmins();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update administrator role.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Security Clearance Overview */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
          🛡️ Administrative Governance & Security Clearances
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          This view monitors all personnel possessing privileged access. Strictly enforced by server-side RBAC: 
          Admin moderators cannot promote users to Super Admin or modify other administrator roles. Only authenticated 
          Super Administrators retain governance authority.
        </p>
      </div>

      {statusMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMessage}</span>
          <button type="button" className="btn-secondary" onClick={loadAdmins} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>Retry</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search administrators by name or email..."
        filters={[
          {
            id: 'role',
            label: 'Clearance Tier',
            value: roleFilter,
            onChange: (val) => { setRoleFilter(val); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Administrators (Tier 1 & 2)' },
              { value: 'ADMIN', label: 'Moderators (ADMIN)' },
              { value: 'SUPER_ADMIN', label: 'Super Admins (SUPER_ADMIN)' }
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
          { value: 'createdAt', label: 'Access Granted Date' },
          { value: 'name', label: 'Administrator Name' },
          { value: 'email', label: 'Email Address' },
          { value: 'role', label: 'Clearance Level' }
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

      {/* Loading Skeletons */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel skeleton-card" style={{ height: '220px', borderRadius: '16px' }} />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="No Administrators Found"
          description={
            hasActiveFilters
              ? `No staff match the criteria (${[
                  search && `"${search}"`,
                  roleFilter !== 'ALL' && `Clearance: ${roleFilter}`
                ].filter(Boolean).join(', ')}). Try resetting filters.`
              : 'There are currently no staff accounts with administrative privileges.'
          }
          actionText={hasActiveFilters ? 'Clear All Filters' : null}
          onAction={hasActiveFilters ? handleClearFilters : null}
        />
      ) : (
        /* Admin Cards Grid - 9 or 12 boxes per page */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {admins.map((adm) => (
            <div
              key={adm.id}
              className="glass-panel"
              style={{
                padding: '1.35rem 1.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: 'linear-gradient(165deg, rgba(22, 27, 44, 0.8), rgba(13, 17, 28, 0.92))',
                border: adm.role === 'SUPER_ADMIN'
                  ? '1px solid rgba(234, 179, 8, 0.25)'
                  : '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 10px 28px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Header with Avatar, Name, Email, and Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: adm.role === 'SUPER_ADMIN'
                      ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.1))'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(14, 165, 233, 0.1))',
                    border: `1px solid ${adm.role === 'SUPER_ADMIN' ? 'rgba(234, 179, 8, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0,
                    boxShadow: adm.role === 'SUPER_ADMIN'
                      ? '0 4px 12px rgba(234, 179, 8, 0.15)'
                      : '0 4px 12px rgba(99, 102, 241, 0.15)'
                  }}>
                    {adm.role === 'SUPER_ADMIN' ? '👑' : '🛡️'}
                  </div>

                  <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      color: 'var(--text-highlight)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {adm.name}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px'
                    }}>
                      {adm.email}
                    </div>
                  </div>
                </div>

                <span
                  className={`badge ${adm.role === 'SUPER_ADMIN' ? 'badge-superadmin' : 'badge-admin'}`}
                  style={{
                    flexShrink: 0,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    letterSpacing: '0.04em'
                  }}
                >
                  {adm.role}
                </span>
              </div>

              {/* Clearance & Details */}
              <div style={{
                fontSize: '0.82rem',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🛡️ Clearance
                  </span>
                  <span style={{ fontWeight: 600, color: adm.role === 'SUPER_ADMIN' ? '#facc15' : '#818cf8' }}>
                    {adm.role === 'SUPER_ADMIN' ? 'Tier 1 (Root Authority)' : 'Tier 2 (Queue Moderator)'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📅 Access Granted
                  </span>
                  <span style={{ color: 'var(--text-highlight)' }}>
                    {new Date(adm.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⚡ Status
                  </span>
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.78rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Active &amp; Verified
                  </span>
                </div>
              </div>

              {/* Footer action button */}
              {adm.role !== 'SUPER_ADMIN' ? (
                <button
                  type="button"
                  onClick={() => handleDemoteAdmin(adm.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    borderRadius: '10px',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginTop: 'auto',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                  }}
                >
                  <span>⚠️</span> Revoke Admin Privileges
                </button>
              ) : (
                <div style={{
                  padding: '0.45rem 0.75rem',
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  borderRadius: '10px',
                  color: '#facc15',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  marginTop: 'auto'
                }}>
                  <span>👑</span> Root Authority Protected
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls - Options configured for 9 or 12 boxes */}
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        limit={limit}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        limitOptions={[9, 12, 18, 24]}
        isLoading={isLoading}
      />
    </div>
  );
}
