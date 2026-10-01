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
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-panel skeleton-card" style={{ height: '180px' }} />
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
        /* Admin Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {admins.map((adm) => (
            <div key={adm.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: adm.role === 'SUPER_ADMIN' ? 'var(--role-superadmin-bg)' : 'var(--role-admin-bg)',
                    border: `1px solid ${adm.role === 'SUPER_ADMIN' ? 'var(--role-superadmin-border)' : 'var(--role-admin-border)'}`,
                    color: adm.role === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : 'var(--role-admin)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 800
                  }}>
                    {adm.role === 'SUPER_ADMIN' ? '👑' : '🛡️'}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-highlight)' }}>
                      {adm.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {adm.email}
                    </div>
                  </div>
                </div>

                <span className={`badge ${adm.role === 'SUPER_ADMIN' ? 'badge-superadmin' : 'badge-admin'}`}>
                  {adm.role}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <div><strong>Clearance Level:</strong> {adm.role === 'SUPER_ADMIN' ? 'Tier 1 (Root Authority)' : 'Tier 2 (Queue Moderator)'}</div>
                <div><strong>Access Granted:</strong> {new Date(adm.createdAt).toLocaleDateString()}</div>
                <div><strong>Status:</strong> <span style={{ color: 'var(--status-success)' }}>Active &amp; Verified</span></div>
              </div>

              {adm.role !== 'SUPER_ADMIN' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleDemoteAdmin(adm.id)}
                  style={{ fontSize: '0.82rem', padding: '0.45rem', marginTop: 'auto', color: 'var(--status-error)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                >
                  Revoke Admin Privileges
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
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
