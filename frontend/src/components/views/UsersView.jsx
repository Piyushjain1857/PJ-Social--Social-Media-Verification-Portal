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
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-highlight)' }}>
              👥 User Governance & Access Management
            </h2>
            <span className="badge badge-superadmin" style={{ fontSize: '0.7rem' }}>
              SUPER_ADMIN CLEARANCE
            </span>
          </div>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '780px' }}>
            Provision, monitor, and regulate platform accounts. Super Administrators possess root authority to manage Normal Users and Admin Moderators with granular privilege controls.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            className="btn-primary"
            onClick={openCreateModal}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}
          >
            <span>➕</span>
            <span>Create New User</span>
          </button>
        )}
      </div>

      {/* ── Live Stats Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Users</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-highlight)', marginTop: '0.2rem' }}>{stats.total}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--status-success)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Accounts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-success)', marginTop: '0.2rem' }}>{stats.active}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--status-warning)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inactive / Suspended</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-warning)', marginTop: '0.2rem' }}>
            {stats.inactive + stats.suspended}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--role-user)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--role-user)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Creators (USER)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--role-user)', marginTop: '0.2rem' }}>{stats.usersCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--role-admin)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--role-admin)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admins (ADMIN)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--role-admin)', marginTop: '0.2rem' }}>{stats.adminsCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--role-superadmin)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--role-superadmin)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Super Admins</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--role-superadmin)', marginTop: '0.2rem' }}>{stats.superAdminsCount}</div>
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
      <div className="table-responsive-wrapper">
        <table className="portal-table" style={{ minWidth: '850px' }}>
          <thead>
            <tr>
              <th>User Profile</th>
              <th>Clearance &amp; Role</th>
              <th>Status</th>
              <th>Activity</th>
              <th>Joined Date</th>
              <th style={{ textAlign: 'right' }}>Governance Actions</th>
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
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: getAvatarBg(u.role),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: '#ffffff',
                            flexShrink: 0
                          }}
                        >
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                            {isCurrent && (
                              <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-light)', padding: '0.05rem 0.4rem' }}>
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getRoleBadge(u.role)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getStatusBadge(u.status)}
                    </td>

                    {/* Activity */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
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
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        {/* View Details */}
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleViewDetails(u.id)}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.76rem' }}
                          title="View user dossier & activity"
                        >
                          👁️ Details
                        </button>

                        {/* Edit User (Super Admin only) */}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openEditModal(u)}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.76rem' }}
                            title="Edit user details and role"
                          >
                            ✏️ Edit
                          </button>
                        )}

                        {/* Activate / Deactivate Toggle (Super Admin only) */}
                        {isSuperAdmin && (
                          <>
                            {u.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => openStatusConfirm(u, 'INACTIVE')}
                                disabled={soleSuperAdmin}
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.76rem',
                                  color: soleSuperAdmin ? 'var(--text-muted)' : 'var(--status-error)',
                                  borderColor: soleSuperAdmin ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.3)',
                                  opacity: soleSuperAdmin ? 0.5 : 1,
                                  cursor: soleSuperAdmin ? 'not-allowed' : 'pointer'
                                }}
                                title={soleSuperAdmin ? 'Cannot deactivate the sole active Super Administrator' : 'Deactivate user access'}
                              >
                                ⛔ Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => openStatusConfirm(u, 'ACTIVE')}
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.76rem',
                                  color: 'var(--status-success)',
                                  borderColor: 'rgba(34, 197, 94, 0.3)'
                                }}
                                title="Re-activate user access"
                              >
                                ⚡ Activate
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
              maxWidth: '540px',
              border: '1px solid rgba(99, 102, 241, 0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  ➕ Provision New User
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Create a new Normal User, Admin Moderator, or Super Administrator.
                </p>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createSubmitting}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.84rem', marginBottom: '1rem' }}>
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  className="input-field"
                  required
                  placeholder="alex.morgan@company.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Initial Password (Min. 8 characters) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: generateRandomPassword() })}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                  >
                    🎲 Regenerate
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    className="input-field"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 2.2rem 0.6rem 0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    {showCreatePassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Account Role *
                  </label>
                  <select
                    className="input-field"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                  >
                    <option value="USER">USER (Creator)</option>
                    <option value="ADMIN">ADMIN (Moderator)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Root)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Initial Status *
                  </label>
                  <select
                    className="input-field"
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={createSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createSubmitting}
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {createSubmitting ? 'Creating...' : '✓ Provision Account'}
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
              maxWidth: '540px',
              border: '1px solid rgba(99, 102, 241, 0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  ✏️ Edit User Account
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Update details, assign roles, or reset account security.
                </p>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsEditModalOpen(false)}
                disabled={editSubmitting}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.84rem', marginBottom: '1rem' }}>
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  className="input-field"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                />
              </div>

              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Role Assignment *
                  </label>
                  <select
                    className="input-field"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                  >
                    <option value="USER">USER (Creator)</option>
                    <option value="ADMIN">ADMIN (Moderator)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Root)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Account Status *
                  </label>
                  <select
                    className="input-field"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* Reset Password Optional */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Reset Password (Leave blank to keep current)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({ ...editForm, password: generateRandomPassword() });
                      setShowEditPassword(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                  >
                    🎲 Suggest Password
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Enter new password (optional)"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 2.2rem 0.6rem 0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    {showEditPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={editSubmitting}
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={editSubmitting}
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                📋 User Profile & Activity Dossier
              </h3>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsDetailsModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="status-dot checking" style={{ margin: '0 auto 0.75rem auto' }} />
                <div>Fetching user dossier...</div>
              </div>
            ) : selectedUserDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Header card with avatar & role */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: getAvatarBg(selectedUserDetails.role),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.15rem',
                      color: '#ffffff'
                    }}
                  >
                    {selectedUserDetails.name ? selectedUserDetails.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
                      {selectedUserDetails.name}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      {selectedUserDetails.email}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                      {getRoleBadge(selectedUserDetails.role)}
                      {getStatusBadge(selectedUserDetails.status)}
                    </div>
                  </div>
                </div>

                {/* Account Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>User ID</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-highlight)', wordBreak: 'break-all' }}>
                      {selectedUserDetails.id}
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Member Since</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                      {new Date(selectedUserDetails.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Submissions</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--role-user)' }}>
                      {selectedUserDetails.submissionsCount ?? 0}
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Moderations</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--role-admin)' }}>
                      {selectedUserDetails.reviewsCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* Submissions or Reviews history if present */}
                {selectedUserDetails.submissions && selectedUserDetails.submissions.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.5rem' }}>
                      Recent Verification Submissions ({selectedUserDetails.submissions.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {selectedUserDetails.submissions.map(s => (
                        <div key={s.id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <span>{s.platform} • {s.actionType}</span>
                          <span className={`badge ${s.status === 'APPROVED' ? 'badge-success' : s.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions in Dossier */}
                {isSuperAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        openEditModal(selectedUserDetails);
                      }}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      ✏️ Edit This User
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsDetailsModalOpen(false)}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      Close Dossier
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
              border: statusTargetNewValue === 'ACTIVE'
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : '1px solid rgba(239, 68, 68, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {statusTargetNewValue === 'ACTIVE' ? '⚡' : '⛔'}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
                    Confirm Status Change
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Target: <strong>{statusTargetUser.name}</strong> ({statusTargetUser.email})
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsStatusConfirmOpen(false)}
                disabled={statusSubmitting}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="portal-modal-body">
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                {statusTargetNewValue === 'ACTIVE' ? (
                  <>Are you sure you want to <strong>activate</strong> this account? The user will immediately be granted permission to authenticate and access platform capabilities.</>
                ) : (
                  <>Are you sure you want to change status to <strong>{statusTargetNewValue}</strong>? The user will be blocked from logging in or submitting verification proofs.</>
                )}
              </p>
            </div>

            <div className="portal-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={statusSubmitting}
                onClick={() => setIsStatusConfirmOpen(false)}
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={statusTargetNewValue === 'ACTIVE' ? 'btn-success' : 'btn-danger'}
                disabled={statusSubmitting}
                onClick={handleStatusConfirmSubmit}
                style={{ fontSize: '0.85rem' }}
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
