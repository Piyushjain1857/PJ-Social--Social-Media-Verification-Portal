import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSuperAdminUsers,
  fetchSuperAdminUserDetails,
  createSuperAdminUser,
  updateSuperAdminUser,
  updateSuperAdminUserStatus,
  fetchUsers
} from '../../services/api';
import FilterBar from '../common/FilterBar';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';

export default function UsersView() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Directory & pagination state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    usersCount: 0,
    adminsCount: 0,
    superAdminsCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Status & error feedback
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE'
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE'
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [statusTargetUser, setStatusTargetUser] = useState(null);
  const [statusTargetNewValue, setStatusTargetNewValue] = useState('ACTIVE');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Handle Escape key to dismiss open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCreateModalOpen && !createSubmitting) setIsCreateModalOpen(false);
        if (isEditModalOpen && !editSubmitting) setIsEditModalOpen(false);
        if (isDetailsModalOpen) setIsDetailsModalOpen(false);
        if (isStatusConfirmOpen && !statusSubmitting) setIsStatusConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, isEditModalOpen, isDetailsModalOpen, isStatusConfirmOpen, createSubmitting, editSubmitting, statusSubmitting]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    debouncedSearch ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    startDate ||
    endDate ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc'
  );

  // Load users directory
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const queryParams = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      };

      if (isSuperAdmin) {
        const res = await fetchSuperAdminUsers(queryParams);

        if (res.success) {
          setUsers(res.data || []);
          if (res.pagination) {
            setPagination({
              totalCount: res.pagination.totalCount ?? 0,
              totalPages: res.pagination.totalPages ?? 1,
              currentPage: res.pagination.currentPage ?? currentPage,
              limit: res.pagination.limit ?? pageSize,
              hasNextPage: Boolean(res.pagination.hasNext),
              hasPrevPage: Boolean(res.pagination.hasPrev)
            });
          }
          if (res.stats) setStats(res.stats);
        } else {
          throw new Error(res.message || 'Failed to fetch users');
        }
      } else {
        // Fallback for ADMIN role
        const res = await fetchUsers(queryParams);
        if (res.success) {
          const list = res.data || [];
          setUsers(list);
          if (res.pagination) {
            setPagination({
              totalCount: res.pagination.totalCount ?? list.length,
              totalPages: res.pagination.totalPages ?? 1,
              currentPage: res.pagination.currentPage ?? currentPage,
              limit: res.pagination.limit ?? pageSize,
              hasNextPage: Boolean(res.pagination.hasNext),
              hasPrevPage: Boolean(res.pagination.hasPrev)
            });
          } else {
            setPagination({
              totalCount: list.length,
              totalPages: 1,
              currentPage: 1,
              limit: list.length,
              hasNextPage: false,
              hasPrevPage: false
            });
          }
          if (res.stats) {
            setStats(res.stats);
          } else {
            setStats({
              total: list.length,
              active: list.filter(u => u.status === 'ACTIVE').length,
              inactive: list.filter(u => u.status === 'INACTIVE').length,
              suspended: list.filter(u => u.status === 'SUSPENDED').length,
              usersCount: list.filter(u => u.role === 'USER').length,
              adminsCount: list.filter(u => u.role === 'ADMIN').length,
              superAdminsCount: list.filter(u => u.role === 'SUPER_ADMIN').length
            });
          }
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load user directory.');
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, currentPage, pageSize, debouncedSearch, roleFilter, statusFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Generate strong random password helper
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // ── Create User Handlers ──
  const openCreateModal = () => {
    setCreateForm({
      name: '',
      email: '',
      password: generateRandomPassword(),
      role: 'USER',
      status: 'ACTIVE'
    });
    setCreateError(null);
    setShowCreatePassword(true);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.name.trim()) {
      setCreateError('Name is required.');
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes('@')) {
      setCreateError('A valid email address is required.');
      return;
    }
    if (!createForm.password || createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters long.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await createSuperAdminUser({
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        status: createForm.status
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setStatusMessage(`User "${res.data.name}" created successfully as ${res.data.role}.`);
        setTimeout(() => setStatusMessage(null), 5000);
        await loadUsers();
      } else {
        throw new Error(res.message || 'User creation failed.');
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create user.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Edit User Handlers ──
  const openEditModal = (user) => {
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status
    });
    setEditError(null);
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);

    if (!editForm.name.trim()) {
      setEditError('Name is required.');
      return;
    }
    if (!editForm.email.trim() || !editForm.email.includes('@')) {
      setEditError('A valid email address is required.');
      return;
    }
    if (editForm.password && editForm.password.length < 8) {
      setEditError('If setting a new password, it must be at least 8 characters long.');
      return;
    }

    setEditSubmitting(true);
    try {
      const updates = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
        status: editForm.status
      };
      if (editForm.password) {
        updates.password = editForm.password;
      }

      const res = await updateSuperAdminUser(editForm.id, updates);
      if (res.success) {
        setIsEditModalOpen(false);
        setStatusMessage(`User "${res.data.name}" updated successfully.`);
        setTimeout(() => setStatusMessage(null), 5000);
        await loadUsers();
      } else {
        throw new Error(res.message || 'Update failed.');
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update user.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── View User Details Handler ──
  const handleViewDetails = async (userId) => {
    setIsDetailsModalOpen(true);
    setDetailsLoading(true);
    setSelectedUserDetails(null);

    try {
      const res = await fetchSuperAdminUserDetails(userId);
      if (res.success && res.data) {
        setSelectedUserDetails(res.data);
      } else {
        // Fallback to local row data if endpoint isn't accessible
        const local = users.find(u => u.id === userId);
        setSelectedUserDetails(local);
      }
    } catch (err) {
      const local = users.find(u => u.id === userId);
      setSelectedUserDetails(local);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── Status Toggle Handlers (Activate / Deactivate / Suspend) ──
  const openStatusConfirm = (user, newStatus) => {
    setStatusTargetUser(user);
    setStatusTargetNewValue(newStatus);
    setIsStatusConfirmOpen(true);
  };

  const handleStatusConfirmSubmit = async () => {
    if (!statusTargetUser) return;
    setStatusSubmitting(true);

    try {
      const res = await updateSuperAdminUserStatus(statusTargetUser.id, statusTargetNewValue);
      if (res.success) {
        setIsStatusConfirmOpen(false);
        setStatusMessage(`User "${statusTargetUser.name}" status changed to ${statusTargetNewValue}.`);
        setTimeout(() => setStatusMessage(null), 5000);
        await loadUsers();
      } else {
        throw new Error(res.message || 'Status change failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to change status.');
      setIsStatusConfirmOpen(false);
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Helpers
  const getRoleBadge = (role) => {
    if (role === 'SUPER_ADMIN') {
      return <span className="badge badge-superadmin">👑 SUPER_ADMIN</span>;
    }
    if (role === 'ADMIN') {
      return <span className="badge badge-admin">🛡️ ADMIN</span>;
    }
    return <span className="badge badge-user">🚀 USER</span>;
  };

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE') {
      return <span className="badge badge-success">● ACTIVE</span>;
    }
    if (status === 'INACTIVE') {
      return <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>○ INACTIVE</span>;
    }
    return <span className="badge badge-error">✕ SUSPENDED</span>;
  };

  const getAvatarBg = (role) => {
    if (role === 'SUPER_ADMIN') return 'var(--role-superadmin-bg)';
    if (role === 'ADMIN') return 'var(--role-admin-bg)';
    return 'var(--role-user-bg)';
  };

  const isSoleSuperAdmin = (u) => {
    return u.role === 'SUPER_ADMIN' && stats.superAdminsCount <= 1;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1200px' }}>
      {/* ── Top Header Panel & Governance Summary ── */}
      <div className="admin-dash-panel" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="admin-hero-icon-box cyan">
              👥
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
                  User Governance & Access Management
                </h2>
                <span className="badge badge-superadmin" style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem' }}>
                  SUPER_ADMIN CLEARANCE
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.84rem', maxWidth: '780px' }}>
                Provision, monitor, and regulate platform accounts with granular RBAC privilege controls.
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              className="btn-portal-primary"
              onClick={openCreateModal}
              style={{ fontSize: '0.84rem', padding: '0.55rem 1.15rem' }}
            >
              <span>➕</span>
              <span>Create New User</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Live Stats Strip ── */}
      <div className="superadmin-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="superadmin-kpi-card users">
          <div className="superadmin-kpi-icon-box users">
            👥
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Total Users</span>
            <span className="superadmin-kpi-value" style={{ color: '#38bdf8' }}>
              {stats.total}
            </span>
            <span className="superadmin-kpi-subtext">All registered</span>
          </div>
        </div>

        <div className="superadmin-kpi-card active-accts">
          <div className="superadmin-kpi-icon-box active-accts">
            ✓
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Active Accounts</span>
            <span className="superadmin-kpi-value" style={{ color: '#10b981' }}>
              {stats.active}
            </span>
            <span className="superadmin-kpi-subtext">In good standing</span>
          </div>
        </div>

        <div className="superadmin-kpi-card suspended-accts">
          <div className="superadmin-kpi-icon-box suspended-accts">
            ⏸️
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Inactive / Suspended</span>
            <span className="superadmin-kpi-value" style={{ color: '#f59e0b' }}>
              {stats.inactive + stats.suspended}
            </span>
            <span className="superadmin-kpi-subtext">Requires attention</span>
          </div>
        </div>

        <div className="superadmin-kpi-card creators-accts">
          <div className="superadmin-kpi-icon-box creators-accts">
            🚀
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Creators (USER)</span>
            <span className="superadmin-kpi-value" style={{ color: '#818cf8' }}>
              {stats.usersCount}
            </span>
            <span className="superadmin-kpi-subtext">Verified creators</span>
          </div>
        </div>

        <div className="superadmin-kpi-card admins-accts">
          <div className="superadmin-kpi-icon-box admins-accts">
            🛡️
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Admins (ADMIN)</span>
            <span className="superadmin-kpi-value" style={{ color: '#c084fc' }}>
              {stats.adminsCount}
            </span>
            <span className="superadmin-kpi-subtext">Queue moderators</span>
          </div>
        </div>

        <div className="superadmin-kpi-card superadmins-accts">
          <div className="superadmin-kpi-icon-box superadmins-accts">
            👑
          </div>
          <div className="superadmin-kpi-info">
            <span className="superadmin-kpi-label">Super Admins</span>
            <span className="superadmin-kpi-value" style={{ color: '#f43f5e' }}>
              {stats.superAdminsCount}
            </span>
            <span className="superadmin-kpi-subtext">Root authority</span>
          </div>
        </div>
      </div>

      {/* ── Status / Error Banners ── */}
      {statusMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✓ {statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚠️ {errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <FilterBar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by user name or email..."
        filters={[
          {
            id: 'role',
            label: 'Clearance Role',
            value: roleFilter,
            onChange: (val) => { setRoleFilter(val); setCurrentPage(1); },
            options: [
              { value: 'ALL', label: `All Roles (${stats.total || pagination.totalCount || 0})` },
              { value: 'USER', label: 'Creators (USER)' },
              { value: 'ADMIN', label: 'Moderators (ADMIN)' },
              { value: 'SUPER_ADMIN', label: 'Super Admins (SUPER_ADMIN)' }
            ]
          },
          {
            id: 'status',
            label: 'Account Status',
            value: statusFilter,
            onChange: (val) => { setStatusFilter(val); setCurrentPage(1); },
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'SUSPENDED', label: 'Suspended' }
            ]
          }
        ]}
        dateRange={{
          startDate,
          onStartDateChange: (d) => { setStartDate(d); setCurrentPage(1); },
          endDate,
          onEndDateChange: (d) => { setEndDate(d); setCurrentPage(1); }
        }}
        sortOptions={[
          { value: 'createdAt', label: 'Joined Date' },
          { value: 'name', label: 'Full Name' },
          { value: 'email', label: 'Email Address' },
          { value: 'role', label: 'Clearance Role' }
        ]}
        sortBy={sortBy}
        onSortByChange={(val) => { setSortBy(val); setCurrentPage(1); }}
        sortOrder={sortOrder}
        onToggleSortOrder={() => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        totalCount={pagination.totalCount}
        isLoading={isLoading}
      />

      {/* ── Users Table ── */}
      <div className="admin-dash-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive-wrapper" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
          <table className="portal-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.85rem 0.95rem' }}>User Profile</th>
                <th style={{ padding: '0.85rem 0.65rem', whiteSpace: 'nowrap' }}>Clearance &amp; Role</th>
                <th style={{ padding: '0.85rem 0.65rem', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '0.85rem 0.65rem', whiteSpace: 'nowrap' }}>Activity</th>
                <th style={{ padding: '0.85rem 0.65rem', whiteSpace: 'nowrap' }}>Joined Date</th>
                <th style={{ padding: '0.85rem 0.95rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Governance Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingSkeleton rows={5} columns={6} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem 1rem' }}>
                    <EmptyState
                      icon="👥"
                      title="No Users Found"
                      description={
                        hasActiveFilters
                          ? `No users match your active search and filter criteria (${[
                              searchTerm && `"${searchTerm}"`,
                              roleFilter !== 'ALL' && `Role: ${roleFilter}`,
                              statusFilter !== 'ALL' && `Status: ${statusFilter}`
                            ].filter(Boolean).join(', ')}).`
                          : "There are currently no registered users matching this directory."
                      }
                      actionText={hasActiveFilters ? "Clear All Filters" : null}
                      onAction={hasActiveFilters ? handleClearFilters : null}
                    />
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const soleSuperAdmin = isSoleSuperAdmin(u);

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* User Identity */}
                      <td style={{ padding: '0.75rem 0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: getAvatarBg(u.role),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              color: '#ffffff',
                              flexShrink: 0
                            }}
                          >
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                              {isCurrent && (
                                <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-light)', padding: '0.05rem 0.35rem' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.75rem 0.65rem', whiteSpace: 'nowrap' }}>
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 0.65rem', whiteSpace: 'nowrap' }}>
                        {getStatusBadge(u.status)}
                      </td>

                      {/* Activity */}
                      <td style={{ padding: '0.75rem 0.65rem', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {u.role === 'USER' && (
                          <span>{u.submissionsCount ?? 0} submission(s)</span>
                        )}
                        {u.role === 'ADMIN' && (
                          <span>{u.reviewsCount ?? 0} moderation(s)</span>
                        )}
                        {u.role === 'SUPER_ADMIN' && (
                          <span style={{ color: 'var(--role-superadmin)' }}>Root Admin</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td style={{ padding: '0.75rem 0.65rem', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          {/* View Details */}
                          <button
                            type="button"
                            className="btn-action-chip view"
                            onClick={() => handleViewDetails(u.id)}
                            title="View user dossier & activity"
                          >
                            <span>👁️</span>
                            <span>Details</span>
                          </button>

                          {/* Edit User (Super Admin only) */}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              className="btn-action-chip edit"
                              onClick={() => openEditModal(u)}
                              title="Edit user details and role"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Activate / Deactivate Toggle (Super Admin only) */}
                          {isSuperAdmin && (
                            <>
                              {u.status === 'ACTIVE' ? (
                                <button
                                  type="button"
                                  className="btn-action-chip danger"
                                  onClick={() => openStatusConfirm(u, 'INACTIVE')}
                                  disabled={soleSuperAdmin}
                                  style={{
                                    opacity: soleSuperAdmin ? 0.4 : 1,
                                    cursor: soleSuperAdmin ? 'not-allowed' : 'pointer'
                                  }}
                                  title={soleSuperAdmin ? 'Cannot deactivate the sole active Super Administrator' : 'Deactivate user access'}
                                >
                                  <span>⛔</span>
                                  <span>Deactivate</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-action-chip success"
                                  onClick={() => openStatusConfirm(u, 'ACTIVE')}
                                  title="Re-activate user access"
                                >
                                  <span>⚡</span>
                                  <span>Activate</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination Controls ── */}
      <Pagination
        page={currentPage}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        limit={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        onLimitChange={(l) => { setPageSize(l); setCurrentPage(1); }}
        limitOptions={[10, 25, 50]}
        isLoading={isLoading}
      />

      {/* ====================================================================
          1. CREATE USER MODAL
          ==================================================================== */}
      {isCreateModalOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={() => !createSubmitting && setIsCreateModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Provision New User"
        >
          <div
            className="portal-modal-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'linear-gradient(165deg, rgba(22, 27, 44, 0.98), rgba(13, 17, 28, 0.99))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(99, 102, 241, 0.15)',
              borderRadius: '18px',
              padding: '1.75rem',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(99, 102, 241, 0.15))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                }}>
                  ➕
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                    Provision New User
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Create a new Normal User, Admin Moderator, or Super Administrator
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createSubmitting}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.84rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span> <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                  <span>👤</span> Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    color: 'var(--text-highlight)'
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                  <span>✉️</span> Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  required
                  placeholder="alex.morgan@company.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    color: 'var(--text-highlight)'
                  }}
                />
              </div>

              {/* Password */}
              <div style={{
                padding: '0.85rem 1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                    <span>🔑</span> Initial Password <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(Min. 8 chars)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: generateRandomPassword() })}
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#a5b4fc',
                      borderRadius: '6px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🎲</span> Generate Strong
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    className="input-field"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.4rem 0.65rem 0.95rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      color: 'var(--text-highlight)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.45rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showCreatePassword ? 'Hide password' : 'Show password'}
                  >
                    {showCreatePassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                    <span>🛡️</span> Account Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      color: 'var(--text-highlight)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="USER">USER (Creator)</option>
                    <option value="ADMIN">ADMIN (Moderator)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Root)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                    <span>⚡</span> Initial Status <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      color: 'var(--text-highlight)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.85rem',
                marginTop: '0.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.07)'
              }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={createSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '10px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createSubmitting}
                  style={{
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    background: 'linear-gradient(135deg, #10b981, #059669)'
                  }}
                >
                  {createSubmitting ? (
                    <>
                      <span className="status-dot checking" style={{ width: '8px', height: '8px' }} />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span> Provision Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          2. EDIT USER MODAL
          ==================================================================== */}
      {isEditModalOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={() => !editSubmitting && setIsEditModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Edit User Account"
        >
          <div
            className="portal-modal-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'linear-gradient(165deg, rgba(22, 27, 44, 0.98), rgba(13, 17, 28, 0.99))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(99, 102, 241, 0.15)',
              borderRadius: '18px',
              padding: '1.75rem',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.15))',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                }}>
                  ✏️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                    Edit User Account
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Update details, assign roles, or reset account security
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsEditModalOpen(false)}
                disabled={editSubmitting}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.84rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span> <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                  <span>👤</span> Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    color: 'var(--text-highlight)'
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                  <span>✉️</span> Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    color: 'var(--text-highlight)'
                  }}
                />
              </div>

              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                    <span>🛡️</span> Role Assignment <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      color: 'var(--text-highlight)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="USER">USER (Creator)</option>
                    <option value="ADMIN">ADMIN (Moderator)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Root)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                    <span>⚡</span> Account Status <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      color: 'var(--text-highlight)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* Reset Password Optional */}
              <div style={{
                padding: '0.85rem 1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                    <span>🔑</span> Reset Password <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({ ...editForm, password: generateRandomPassword() });
                      setShowEditPassword(true);
                    }}
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#a5b4fc',
                      borderRadius: '6px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🎲</span> Suggest Strong Password
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Leave blank to keep existing password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.4rem 0.65rem 0.95rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      color: 'var(--text-highlight)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.45rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? '👁️' : '🔒'}
                  </button>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Leave blank to maintain the user's current encrypted credentials.
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.85rem',
                marginTop: '0.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.07)'
              }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={editSubmitting}
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '10px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={editSubmitting}
                  style={{
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                  }}
                >
                  {editSubmitting ? (
                    <>
                      <span className="status-dot checking" style={{ width: '8px', height: '8px' }} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          3. USER DETAILS DOSSIER MODAL
          ==================================================================== */}
      {isDetailsModalOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={() => setIsDetailsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="User Profile Dossier"
        >
          <div
            className="portal-modal-card"
            style={{
              maxWidth: '640px',
              width: '100%',
              background: 'linear-gradient(165deg, rgba(22, 27, 44, 0.98), rgba(13, 17, 28, 0.99))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(99, 102, 241, 0.15)',
              borderRadius: '18px',
              padding: '1.75rem',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15))',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                }}>
                  📋
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                    User Profile & Activity Dossier
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Full identity credentials and verification activity record
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsDetailsModalOpen(false)}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="status-dot checking" style={{ margin: '0 auto 1rem auto', transform: 'scale(1.3)' }} />
                <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>Decrypting and loading user dossier...</div>
              </div>
            ) : selectedUserDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* User Identity Banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  padding: '1.15rem 1.35rem',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '14px',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '14px',
                        background: getAvatarBg(selectedUserDetails.role),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.35rem',
                        color: '#ffffff',
                        boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.12)',
                        flexShrink: 0
                      }}
                    >
                      {selectedUserDetails.name ? selectedUserDetails.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                        {selectedUserDetails.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>✉️</span>
                        <span>{selectedUserDetails.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {getRoleBadge(selectedUserDetails.role)}
                        {getStatusBadge(selectedUserDetails.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Details & Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                  {/* User ID Box with 1-click Copy */}
                  <div
                    style={{
                      padding: '0.9rem 1rem',
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>🆔</span> User ID
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(selectedUserDetails.id)}
                        style={{
                          background: copiedId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          border: `1px solid ${copiedId ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                          color: copiedId ? '#10b981' : 'var(--text-secondary)',
                          borderRadius: '6px',
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease'
                        }}
                        title="Copy full UUID"
                      >
                        {copiedId ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                    <div
                      onClick={() => handleCopyId(selectedUserDetails.id)}
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.76rem',
                        color: 'var(--text-highlight)',
                        background: 'rgba(0, 0, 0, 0.25)',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer'
                      }}
                      title={selectedUserDetails.id}
                    >
                      {selectedUserDetails.id}
                    </div>
                  </div>

                  {/* Member Since Box */}
                  <div
                    style={{
                      padding: '0.9rem 1rem',
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.4rem'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>📅</span> Registration Date
                    </span>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
                      {new Date(selectedUserDetails.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Verified platform member
                    </div>
                  </div>

                  {/* Submissions Box */}
                  <div
                    style={{
                      padding: '0.9rem 1rem',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0.01))',
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>📤</span> Submissions
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#34d399', lineHeight: 1.1 }}>
                      {selectedUserDetails.submissionsCount ?? (selectedUserDetails.submissions?.length || 0)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Proofs submitted for review
                    </div>
                  </div>

                  {/* Moderations Box */}
                  <div
                    style={{
                      padding: '0.9rem 1rem',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(99, 102, 241, 0.01))',
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>⚖️</span> Moderations
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#a5b4fc', lineHeight: 1.1 }}>
                      {selectedUserDetails.reviewsCount ?? 0}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Submissions reviewed & audited
                    </div>
                  </div>
                </div>

                {/* Submissions or Reviews history if present */}
                {selectedUserDetails.submissions && selectedUserDetails.submissions.length > 0 ? (
                  <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Recent Activity Logs</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{selectedUserDetails.submissions.length} total</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                      {selectedUserDetails.submissions.map(s => (
                        <div
                          key={s.id}
                          style={{
                            padding: '0.6rem 0.85rem',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.82rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem' }}>
                              {s.platform === 'INSTAGRAM' ? '📸' : s.platform === 'TWITTER' ? '🐦' : s.platform === 'FACEBOOK' ? '👥' : s.platform === 'YOUTUBE' ? '▶️' : '🌐'}
                            </span>
                            <span style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>{s.platform}</span>
                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{s.actionType}</span>
                          </div>
                          <span className={`badge ${s.status === 'APPROVED' ? 'badge-success' : s.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Modal Footer Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '0.85rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                  marginTop: '0.5rem'
                }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsDetailsModalOpen(false)}
                    style={{
                      padding: '0.6rem 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '10px'
                    }}
                  >
                    Close Dossier
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        openEditModal(selectedUserDetails);
                      }}
                      style={{
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                      }}
                    >
                      <span>✏️</span> Edit User Credentials
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Unable to load user details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          4. CONFIRM STATUS CHANGE MODAL
          ==================================================================== */}
      {isStatusConfirmOpen && statusTargetUser && (
        <div
          className="portal-modal-backdrop"
          onClick={() => !statusSubmitting && setIsStatusConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Status Change"
        >
          <div
            className="portal-modal-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'linear-gradient(165deg, rgba(22, 27, 44, 0.98), rgba(13, 17, 28, 0.99))',
              border: statusTargetNewValue === 'ACTIVE'
                ? '1px solid rgba(34, 197, 94, 0.25)'
                : '1px solid rgba(239, 68, 68, 0.25)',
              boxShadow: statusTargetNewValue === 'ACTIVE'
                ? '0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(34, 197, 94, 0.15)'
                : '0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(239, 68, 68, 0.15)',
              borderRadius: '18px',
              padding: '1.75rem',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: statusTargetNewValue === 'ACTIVE'
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.1))'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))',
                  border: statusTargetNewValue === 'ACTIVE'
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  boxShadow: statusTargetNewValue === 'ACTIVE'
                    ? '0 4px 12px rgba(34, 197, 94, 0.15)'
                    : '0 4px 12px rgba(239, 68, 68, 0.15)'
                }}>
                  {statusTargetNewValue === 'ACTIVE' ? '⚡' : '⛔'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                    Confirm Status Change
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Target: <strong style={{ color: 'var(--text-highlight)' }}>{statusTargetUser.name}</strong> ({statusTargetUser.email})
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsStatusConfirmOpen(false)}
                disabled={statusSubmitting}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              marginBottom: '1.25rem'
            }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                {statusTargetNewValue === 'ACTIVE' ? (
                  <>Are you sure you want to <strong style={{ color: '#22c55e' }}>activate</strong> this account? The user will immediately be granted permission to authenticate and access platform capabilities.</>
                ) : (
                  <>Are you sure you want to change status to <strong style={{ color: '#ef4444' }}>{statusTargetNewValue}</strong>? The user will be blocked from logging in or submitting verification proofs.</>
                )}
              </p>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.85rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.07)'
            }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={statusSubmitting}
                onClick={() => setIsStatusConfirmOpen(false)}
                style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '10px'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={statusTargetNewValue === 'ACTIVE' ? 'btn-success' : 'btn-danger'}
                disabled={statusSubmitting}
                onClick={handleStatusConfirmSubmit}
                style={{
                  padding: '0.6rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  boxShadow: statusTargetNewValue === 'ACTIVE'
                    ? '0 4px 14px rgba(34, 197, 94, 0.35)'
                    : '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                {statusSubmitting ? 'Updating...' : `Confirm ${statusTargetNewValue}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
