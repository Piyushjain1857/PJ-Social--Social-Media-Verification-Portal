import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSuperAdminSocialAccounts,
  fetchSocialAccounts,
  fetchActiveOfficialAccounts,
  fetchOfficialAccountById,
  createSuperAdminSocialAccount,
  updateSuperAdminSocialAccount,
  updateSuperAdminSocialAccountStatus,
  deleteSuperAdminSocialAccount
} from '../../services/api';
import FilterBar from '../common/FilterBar';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';

const PLATFORM_CONFIG = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    domain: 'instagram.com',
    placeholder: 'https://www.instagram.com/krmuniv/?hl=en',
    handlePrefix: '@'
  },
  LINKEDIN: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    gradient: 'linear-gradient(135deg, #0a66c2, #0077b5, #38bdf8)',
    domain: 'linkedin.com',
    placeholder: 'https://www.linkedin.com/school/krmuniv/posts/?feedView=all',
    handlePrefix: ''
  },
  FACEBOOK: {
    name: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    gradient: 'linear-gradient(135deg, #1877f2, #2563eb, #60a5fa)',
    domain: 'facebook.com',
    placeholder: 'https://www.facebook.com/krmuniv/',
    handlePrefix: ''
  }
};

export default function SocialAccountsView() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
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
    limit: 10,
    hasNext: false,
    hasPrev: false
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    platform: 'INSTAGRAM',
    name: '',
    accountUrl: '',
    handle: '',
    description: '',
    isActive: true
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    platform: 'INSTAGRAM',
    name: '',
    accountUrl: '',
    handle: '',
    description: '',
    isActive: true
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);

  const handleCopyUrl = (url, e) => {
    if (e) e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const formatDisplayUrl = (url) => {
    if (!url) return '';
    try {
      return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    } catch {
      return url;
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle Escape key to dismiss open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen && !addSubmitting) setIsAddModalOpen(false);
        if (isEditModalOpen && !editSubmitting) setIsEditModalOpen(false);
        if (isViewModalOpen) setIsViewModalOpen(false);
        if (isDeleteModalOpen && !deleteSubmitting) setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isEditModalOpen, isViewModalOpen, isDeleteModalOpen, addSubmitting, editSubmitting, deleteSubmitting]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setPlatformFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    debouncedSearch ||
    platformFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    startDate ||
    endDate ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc'
  );

  // Load Accounts with full server-side filtering & pagination
  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const queryParams = {
        platform: platformFilter,
        status: statusFilter,
        search: debouncedSearch,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
        sortBy,
        sortOrder
      };

      const res = isSuperAdmin
        ? await fetchSuperAdminSocialAccounts(queryParams)
        : await fetchSocialAccounts(queryParams);

      if (res.success) {
        setAccounts(res.data || []);
        if (res.pagination) {
          setPagination({
            totalCount: res.pagination.totalCount ?? (res.data || []).length,
            totalPages: res.pagination.totalPages ?? 1,
            currentPage: res.pagination.page ?? page,
            limit: res.pagination.limit ?? limit,
            hasNext: Boolean(res.pagination.hasNext),
            hasPrev: Boolean(res.pagination.hasPrev)
          });
        }
      } else {
        setErrorMessage(res.message || 'Failed to load official social accounts.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to service.');
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, platformFilter, statusFilter, debouncedSearch, startDate, endDate, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const showNotification = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Add Account Handlers
  const handleOpenAdd = () => {
    setAddForm({
      platform: 'INSTAGRAM',
      name: '',
      accountUrl: '',
      handle: '',
      description: '',
      isActive: true
    });
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);

    if (!addForm.name.trim()) {
      setAddError('Account name is required.');
      return;
    }
    if (!addForm.accountUrl.trim()) {
      setAddError('Account URL is required.');
      return;
    }

    setAddSubmitting(true);
    try {
      const res = await createSuperAdminSocialAccount({
        platform: addForm.platform,
        name: addForm.name.trim(),
        accountUrl: addForm.accountUrl.trim(),
        handle: addForm.handle.trim() || undefined,
        description: addForm.description.trim() || undefined,
        isActive: addForm.isActive
      });

      if (res.success) {
        setIsAddModalOpen(false);
        showNotification(`Official account "${res.data.name || res.data.handle}" created successfully.`);
        loadAccounts();
      } else {
        setAddError(res.message || 'Failed to add official account.');
      }
    } catch (err) {
      setAddError(err.message || 'Error creating account.');
    } finally {
      setAddSubmitting(false);
    }
  };

  // Edit Account Handlers
  const handleOpenEdit = (acc) => {
    setEditForm({
      id: acc.id,
      platform: acc.platform,
      name: acc.name || '',
      accountUrl: acc.accountUrl || acc.profileUrl || '',
      handle: acc.handle || '',
      description: acc.description || '',
      isActive: acc.isActive
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);

    if (!editForm.name.trim()) {
      setEditError('Account name cannot be empty.');
      return;
    }
    if (!editForm.accountUrl.trim()) {
      setEditError('Account URL cannot be empty.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await updateSuperAdminSocialAccount(editForm.id, {
        platform: editForm.platform,
        name: editForm.name.trim(),
        accountUrl: editForm.accountUrl.trim(),
        handle: editForm.handle.trim() || undefined,
        description: editForm.description.trim(),
        isActive: editForm.isActive
      });

      if (res.success) {
        setIsEditModalOpen(false);
        showNotification(`Account "${res.data.name || res.data.handle}" updated successfully.`);
        loadAccounts();
        if (selectedAccount?.id === editForm.id) {
          setSelectedAccount(res.data);
        }
      } else {
        setEditError(res.message || 'Failed to update official account.');
      }
    } catch (err) {
      setEditError(err.message || 'Error updating account.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Status Toggle Handler
  const handleToggleStatus = async (account) => {
    if (!isSuperAdmin) return;
    const targetStatus = !account.isActive;
    setTogglingId(account.id);

    try {
      const res = await updateSuperAdminSocialAccountStatus(account.id, targetStatus);
      if (res.success) {
        showNotification(`Account "${account.name || account.handle}" is now ${targetStatus ? 'ACTIVE' : 'INACTIVE'}.`);
        loadAccounts();
        if (selectedAccount?.id === account.id) {
          setSelectedAccount(res.data);
        }
      } else {
        setErrorMessage(res.message || 'Failed to toggle account status.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error updating status.');
    } finally {
      setTogglingId(null);
    }
  };

  // View Account Dossier
  const handleOpenView = async (account) => {
    setSelectedAccount(account);
    setIsViewModalOpen(true);
    setViewLoading(true);

    try {
      const res = await fetchOfficialAccountById(account.id);
      if (res.success) {
        setSelectedAccount(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch detailed account stats:', err);
    } finally {
      setViewLoading(false);
    }
  };

  // Delete Account Handlers
  const handleOpenDelete = (account) => {
    setAccountToDelete(account);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    setDeleteSubmitting(true);
    try {
      const res = await deleteSuperAdminSocialAccount(accountToDelete.id);
      if (res.success) {
        setIsDeleteModalOpen(false);
        showNotification(`Official account "${accountToDelete.name || accountToDelete.handle}" deleted.`);
        loadAccounts();
        if (selectedAccount?.id === accountToDelete.id) {
          setIsViewModalOpen(false);
        }
      } else {
        setErrorMessage(res.message || 'Failed to delete account.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error deleting account.');
    } finally {
      setDeleteSubmitting(false);
      setAccountToDelete(null);
    }
  };

  // Quick platform URL helper hint
  const getDomainHint = (platform) => {
    const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.INSTAGRAM;
    return `Must be on ${cfg.domain} (e.g. ${cfg.placeholder})`;
  };

  // Stats calculation
  const totalCount = accounts.length;
  const activeCount = accounts.filter(a => a.isActive).length;
  const inactiveCount = accounts.filter(a => !a.isActive).length;
  const instagramCount = accounts.filter(a => a.platform === 'INSTAGRAM').length;
  const linkedinCount = accounts.filter(a => a.platform === 'LINKEDIN').length;
  const facebookCount = accounts.filter(a => a.platform === 'FACEBOOK').length;
  const totalSubmissions = accounts.reduce((acc, curr) => acc + (curr.submissionsCount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Institutional Directory Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderLeft: '4px solid var(--role-superadmin)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(13, 18, 31, 0.7) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0
              }}
            >
              🏛️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
                  Official College Channels
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.18)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}
                >
                  INSTITUTIONAL DIRECTORY
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                Central directory of authorized university channels. Creators can only submit verification claims against active official accounts.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn-refresh-pill"
              onClick={loadAccounts}
              title="Refresh account listings"
            >
              <svg
                className="refresh-icon-svg"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              <span>Refresh Data</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                className="btn-primary"
                id="btn-add-official-account"
                onClick={handleOpenAdd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.86rem',
                  fontWeight: 600
                }}
              >
                <span>➕</span>
                <span>Connect Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status & Error Alerts */}
      {statusMessage && (
        <div
          className="portal-alert portal-alert-success"
          style={{ margin: 0 }}
        >
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className="portal-alert portal-alert-error"
          style={{ margin: 0 }}
        >
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Metric 1: Total Channels */}
        <div
          className="stat-metric-card"
          style={{
            borderTop: '3px solid #6366f1',
            background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.09) 0%, rgba(13, 18, 31, 0.6) 100%)'
          }}
        >
          <div
            className="stat-metric-icon"
            style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8' }}
          >
            🏛️
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Total Channels
            </span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {totalCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.35rem' }}>
              <span>📸 {instagramCount}</span>
              <span>·</span>
              <span>💼 {linkedinCount}</span>
              <span>·</span>
              <span>👥 {facebookCount}</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Active Channels */}
        <div
          className="stat-metric-card"
          style={{
            borderTop: '3px solid #10b981',
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.09) 0%, rgba(13, 18, 31, 0.6) 100%)'
          }}
        >
          <div
            className="stat-metric-icon"
            style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}
          >
            🟢
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Active Profiles
            </span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#34d399', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {activeCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Accepting creator claims
            </span>
          </div>
        </div>

        {/* Metric 3: Paused / Inactive */}
        <div
          className="stat-metric-card"
          style={{
            borderTop: '3px solid #f59e0b',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.09) 0%, rgba(13, 18, 31, 0.6) 100%)'
          }}
        >
          <div
            className="stat-metric-icon"
            style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
          >
            ⏸️
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Paused / Inactive
            </span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: inactiveCount > 0 ? '#fbbf24' : 'var(--text-muted)', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {inactiveCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Submissions paused
            </span>
          </div>
        </div>

        {/* Metric 4: Total Linked Submissions */}
        {isSuperAdmin && (
          <div
            className="stat-metric-card"
            style={{
              borderTop: '3px solid #06b6d4',
              background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.09) 0%, rgba(13, 18, 31, 0.6) 100%)'
            }}
          >
            <div
              className="stat-metric-icon"
              style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#22d3ee' }}
            >
              📊
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Linked Submissions
              </span>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#22d3ee', lineHeight: 1.15, marginTop: '0.15rem' }}>
                {totalSubmissions}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Across all official channels
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <FilterBar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search accounts by name, handle, URL, or notes..."
        filters={[
          {
            id: 'platform',
            label: 'Platform Network',
            value: platformFilter,
            onChange: (val) => { setPlatformFilter(val); setPage(1); },
            options: [
              { value: 'ALL', label: 'All Platforms' },
              { value: 'INSTAGRAM', label: 'Instagram (📸)' },
              { value: 'LINKEDIN', label: 'LinkedIn (💼)' },
              { value: 'FACEBOOK', label: 'Facebook (👥)' }
            ]
          },
          ...(isSuperAdmin ? [
            {
              id: 'status',
              label: 'Channel Status',
              value: statusFilter,
              onChange: (val) => { setStatusFilter(val); setPage(1); },
              options: [
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Channels' },
                { value: 'INACTIVE', label: 'Inactive / Paused' }
              ]
            }
          ] : [])
        ]}
        dateRange={{
          startDate,
          onStartDateChange: (d) => { setStartDate(d); setPage(1); },
          endDate,
          onEndDateChange: (d) => { setEndDate(d); setPage(1); }
        }}
        sortOptions={[
          { value: 'createdAt', label: 'Creation Date' },
          { value: 'name', label: 'Channel Name' },
          { value: 'platform', label: 'Platform' },
          { value: 'handle', label: 'Social Handle' }
        ]}
        sortBy={sortBy}
        onSortByChange={(val) => { setSortBy(val); setPage(1); }}
        sortOrder={sortOrder}
        onToggleSortOrder={() => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); setPage(1); }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        totalCount={pagination.totalCount || accounts.length}
        isLoading={isLoading}
      />

      {/* Non-SuperAdmin Notice */}
      {!isSuperAdmin && (
        <div
          className="portal-alert portal-alert-info"
          style={{ margin: 0, fontSize: '0.85rem' }}
        >
          <span>ℹ️</span>
          <span>You are viewing verified official college accounts. Only Super Administrators can add, edit, or configure official social accounts.</span>
        </div>
      )}

      {/* Accounts List / Cards Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="glass-panel skeleton-card" style={{ height: '240px' }} />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="🏛️"
          title="No Official Social Media Accounts Found"
          description={
            hasActiveFilters
              ? `No accounts match your filter criteria (${[
                  searchTerm && `"${searchTerm}"`,
                  platformFilter !== 'ALL' && `Platform: ${platformFilter}`,
                  statusFilter !== 'ALL' && `Status: ${statusFilter}`
                ].filter(Boolean).join(', ')}). Try resetting filters.`
              : 'No official university accounts registered yet.'
          }
          actionText={hasActiveFilters ? 'Clear All Filters' : isSuperAdmin ? 'Add First Official Account' : null}
          onAction={hasActiveFilters ? handleClearFilters : isSuperAdmin ? handleOpenAdd : null}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {accounts.map(acc => {
            const cfg = PLATFORM_CONFIG[acc.platform] || PLATFORM_CONFIG.INSTAGRAM;
            const isToggling = togglingId === acc.id;
            const isCopied = copiedUrl === (acc.accountUrl || acc.profileUrl);

            return (
              <div
                key={acc.id}
                className="official-account-card"
                style={{
                  borderTop: `3px solid ${cfg.color}`,
                  opacity: acc.isActive ? 1 : 0.75,
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(13, 18, 31, 0.6) 100%)'
                }}
              >
                {/* Header Row: Platform Icon + Title + Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: `${cfg.color}1e`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        border: `1px solid ${cfg.color}44`,
                        boxShadow: `0 4px 14px ${cfg.color}22`,
                        flexShrink: 0
                      }}
                    >
                      {cfg.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: cfg.color
                          }}
                        >
                          {cfg.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: '#34d399',
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.14)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          ✓ Official
                        </span>
                      </div>
                      <h3
                        style={{
                          margin: '0.2rem 0 0 0',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          lineHeight: 1.35
                        }}
                      >
                        {acc.name || acc.handle}
                      </h3>
                    </div>
                  </div>

                  {/* Active / Inactive Badge */}
                  <span
                    className={`badge ${acc.isActive ? 'badge-success' : 'badge-warning'}`}
                    style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                  >
                    {acc.isActive ? '● ACTIVE' : '○ PAUSED'}
                  </span>
                </div>

                {/* Handle & Profile URL Link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Handle:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.05)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                      {acc.handle ? (acc.handle.startsWith('@') ? acc.handle : `@${acc.handle}`) : '—'}
                    </span>
                  </div>

                  {acc.accountUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Target URL:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                        <a
                          href={acc.accountUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={acc.accountUrl}
                          style={{
                            color: cfg.color,
                            textDecoration: 'none',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '190px'
                          }}
                        >
                          {formatDisplayUrl(acc.accountUrl)} ↗
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopyUrl(acc.accountUrl, e)}
                          title="Copy destination URL"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isCopied ? 'var(--status-success)' : 'var(--text-muted)',
                            fontSize: '0.8rem',
                            padding: '0.1rem 0.25rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {isCopied ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {acc.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontStyle: 'italic'
                    }}
                  >
                    "{acc.description}"
                  </p>
                )}

                {/* Submissions Count Badge */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.75rem',
                    fontSize: '0.76rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>📊</span>
                    <span>
                      <strong style={{ color: 'var(--text-highlight)' }}>
                        {acc.submissionsCount ?? 0}
                      </strong>{' '}
                      submissions verified
                    </span>
                  </div>

                  {!acc.isActive ? (
                    <span style={{ color: 'var(--status-pending)', fontSize: '0.72rem' }}>
                      Paused from claims
                    </span>
                  ) : (
                    <span style={{ color: 'var(--status-success)', fontSize: '0.72rem' }}>
                      Active for verification
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    paddingTop: '0.2rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleOpenView(acc)}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>👁️</span>
                    <span>Dossier</span>
                  </button>

                  {isSuperAdmin && (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleOpenEdit(acc)}
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.4rem 0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleToggleStatus(acc)}
                        disabled={isToggling}
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.4rem 0.75rem',
                          color: acc.isActive ? '#fca5a5' : '#86efac',
                          borderColor: acc.isActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                          background: acc.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'
                        }}
                      >
                        {isToggling ? '⏳...' : acc.isActive ? 'Pause' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDelete(acc)}
                        title="Delete official account"
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          borderRadius: '6px',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.82rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount || accounts.length}
        limit={limit}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        limitOptions={[9, 12, 18, 24]}
        isLoading={isLoading}
      />

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: ADD OFFICIAL ACCOUNT (SUPER_ADMIN ONLY)
      ───────────────────────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={() => !addSubmitting && setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add Official Account"
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}
                >
                  ➕
                </div>
                <div className="portal-modal-title-group">
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-highlight)' }}>
                    Register Official Channel
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Add an authorized university social account for creator verifications.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
                disabled={addSubmitting}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="portal-modal-body">
                {addError && (
                  <div className="portal-alert portal-alert-error" style={{ margin: 0 }}>
                    <span>⚠️</span>
                    <span>{addError}</span>
                  </div>
                )}

                {/* Platform Selector Cards */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    Social Platform Network <span style={{ color: 'var(--status-rejected)' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    {['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'].map(pKey => {
                      const cfg = PLATFORM_CONFIG[pKey];
                      const isSelected = addForm.platform === pKey;
                      return (
                        <button
                          key={pKey}
                          type="button"
                          className={`platform-selector-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setAddForm(prev => ({ ...prev, platform: pKey }))}
                          style={{
                            borderColor: isSelected ? cfg.color : 'var(--border-subtle)',
                            background: isSelected ? `${cfg.color}18` : 'rgba(255, 255, 255, 0.03)',
                            boxShadow: isSelected ? `0 0 16px ${cfg.color}33` : 'none'
                          }}
                        >
                          <span style={{ fontSize: '1.45rem' }}>{cfg.icon}</span>
                          <span style={{ fontSize: '0.85rem', color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                            {cfg.name}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                fontSize: '0.65rem',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    🏷️ Account Display Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. K.R. Mangalam University Official Instagram"
                    value={addForm.name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Descriptive title recognized by student creators and institutional reviewers.
                  </div>
                </div>

                {/* Account URL */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    🔗 Profile / Page URL <span style={{ color: 'var(--status-rejected)' }}>*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder={PLATFORM_CONFIG[addForm.platform].placeholder}
                    value={addForm.accountUrl}
                    onChange={(e) => setAddForm(prev => ({ ...prev, accountUrl: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#93c5fd', marginTop: '0.35rem', background: 'rgba(59, 130, 246, 0.08)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    🔒 {getDomainHint(addForm.platform)}
                  </div>
                </div>

                {/* Handle */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    @ Social Handle (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. @krmuniv or krmuniv"
                    value={addForm.handle}
                    onChange={(e) => setAddForm(prev => ({ ...prev, handle: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Leave blank to automatically extract handle from the destination URL.
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    📝 Description / Purpose (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Official scope or purpose of this college social media channel..."
                    value={addForm.description}
                    onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.88rem', resize: 'vertical', minHeight: '75px' }}
                  />
                </div>

                {/* Active Toggle Card */}
                <div
                  className="status-toggle-card"
                  onClick={() => setAddForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '1.25rem' }}>{addForm.isActive ? '🟢' : '⏸️'}</div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                        Accept Student Verification Claims
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {addForm.isActive
                          ? 'Active channel: Creators can submit proofs against this account.'
                          : 'Paused: Channel remains visible but hidden from new submissions.'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={addForm.isActive}
                    onChange={() => {}}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  id="btn-submit-add-account"
                  disabled={addSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {addSubmitting ? '⏳ Registering...' : '✓ Register Official Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: EDIT OFFICIAL ACCOUNT (SUPER_ADMIN ONLY)
      ───────────────────────────────────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !editSubmitting) setIsEditModalOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-account-title"
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}
                >
                  ✏️
                </div>
                <div className="portal-modal-title-group">
                  <h3 id="edit-account-title" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-highlight)' }}>
                    Edit Official Channel
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Update verified college handle, destination URL, and verification status.
                  </p>
                </div>
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

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="portal-modal-body">
                {editError && (
                  <div className="portal-alert portal-alert-error" style={{ margin: 0 }}>
                    <span>⚠️</span>
                    <span>{editError}</span>
                  </div>
                )}

                {/* Platform Selector Cards */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    Social Platform Network
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    {['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'].map(pKey => {
                      const cfg = PLATFORM_CONFIG[pKey];
                      const isSelected = editForm.platform === pKey;
                      return (
                        <button
                          key={pKey}
                          type="button"
                          className={`platform-selector-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setEditForm(prev => ({ ...prev, platform: pKey }))}
                          style={{
                            borderColor: isSelected ? cfg.color : 'var(--border-subtle)',
                            background: isSelected ? `${cfg.color}18` : 'rgba(255, 255, 255, 0.03)',
                            boxShadow: isSelected ? `0 0 16px ${cfg.color}33` : 'none'
                          }}
                        >
                          <span style={{ fontSize: '1.45rem' }}>{cfg.icon}</span>
                          <span style={{ fontSize: '0.85rem', color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                            {cfg.name}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                fontSize: '0.65rem',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    🏷️ Account Display Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Account URL */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    🔗 Profile / Page URL <span style={{ color: 'var(--status-rejected)' }}>*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={editForm.accountUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, accountUrl: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#93c5fd', marginTop: '0.35rem', background: 'rgba(59, 130, 246, 0.08)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    🔒 {getDomainHint(editForm.platform)}
                  </div>
                </div>

                {/* Handle */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    @ Social Handle
                  </label>
                  <input
                    type="text"
                    value={editForm.handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, handle: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    📝 Description / Scope
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.88rem', resize: 'vertical', minHeight: '75px' }}
                  />
                </div>

                {/* Active Toggle Card */}
                <div
                  className="status-toggle-card"
                  onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '1.25rem' }}>{editForm.isActive ? '🟢' : '⏸️'}</div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                        Channel is Active
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {editForm.isActive
                          ? 'Accepting creator activity submissions.'
                          : 'Temporarily paused from new submissions.'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={() => {}}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={editSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {editSubmitting ? '⏳ Saving...' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: VIEW ACCOUNT DOSSIER
      ───────────────────────────────────────────────────────────────────────────── */}
      {isViewModalOpen && selectedAccount && (
        <div
          className="portal-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setIsViewModalOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-account-title"
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Header */}
            <div className="portal-modal-header" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: `${PLATFORM_CONFIG[selectedAccount.platform]?.color || '#6366f1'}22`,
                    border: `1px solid ${PLATFORM_CONFIG[selectedAccount.platform]?.color || '#6366f1'}44`,
                    boxShadow: `0 4px 16px ${PLATFORM_CONFIG[selectedAccount.platform]?.color || '#6366f1'}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    flexShrink: 0
                  }}
                >
                  {PLATFORM_CONFIG[selectedAccount.platform]?.icon || '🌐'}
                </div>
                <div>
                  <h3 id="view-account-title" style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>
                    {selectedAccount.name || selectedAccount.handle}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: PLATFORM_CONFIG[selectedAccount.platform]?.color || 'var(--text-secondary)', fontWeight: 600, marginTop: '0.15rem' }}>
                    Official {PLATFORM_CONFIG[selectedAccount.platform]?.name || selectedAccount.platform} Channel · Verified Institutional Account
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsViewModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Dossier Body */}
            <div className="portal-modal-body">
              {/* Status & Verification Badges */}
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  className={`badge ${selectedAccount.isActive ? 'badge-success' : 'badge-warning'}`}
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.76rem' }}
                >
                  {selectedAccount.isActive ? '● Active Channel' : '○ Paused / Inactive'}
                </span>
                <span
                  className="badge badge-info"
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.76rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                >
                  🛡️ Verified Official College Channel
                </span>
              </div>

              {/* 2x2 Overview Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.85rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1.15rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Social Handle
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                    {selectedAccount.handle ? (selectedAccount.handle.startsWith('@') ? selectedAccount.handle : `@${selectedAccount.handle}`) : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Linked Submissions
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>
                    {selectedAccount.submissionsCount || selectedAccount.submissions?.length || 0} activities audited
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Official Channel URL
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <a
                      href={selectedAccount.accountUrl || selectedAccount.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: PLATFORM_CONFIG[selectedAccount.platform]?.color || 'var(--text-highlight)',
                        textDecoration: 'none',
                        wordBreak: 'break-all',
                        fontSize: '0.84rem',
                        fontWeight: 500
                      }}
                    >
                      {selectedAccount.accountUrl || selectedAccount.profileUrl} ↗
                    </a>
                    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => handleCopyUrl(selectedAccount.accountUrl || selectedAccount.profileUrl, e)}
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                      >
                        {copiedUrl === (selectedAccount.accountUrl || selectedAccount.profileUrl) ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedAccount.description && (
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    Channel Description / Scope
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontStyle: 'italic' }}>
                    "{selectedAccount.description}"
                  </div>
                </div>
              )}

              {/* Recent Activity Submissions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Recent Submissions Target
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Latest activity checks
                  </span>
                </div>

                {selectedAccount.submissions && selectedAccount.submissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedAccount.submissions.map(sub => (
                      <div key={sub.id} className="dossier-feed-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontSize: '1rem' }}>
                            {sub.actionType === 'LIKE' ? '❤️' : sub.actionType === 'COMMENT' ? '💬' : '📸'}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: '#ffffff' }}>{sub.actionType}</strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              📅 {new Date(sub.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`badge ${sub.status === 'APPROVED' ? 'badge-success' : sub.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {sub.status === 'APPROVED' ? '✓ APPROVED' : sub.status === 'REJECTED' ? '✕ REJECTED' : '⏳ PENDING'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    No creator verification submissions recorded yet for this channel.
                  </div>
                )}
              </div>
            </div>

            {/* Dossier Footer */}
            <div className="portal-modal-footer">
              <div style={{ marginRight: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                ID: {selectedAccount.id}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isSuperAdmin && (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleOpenEdit(selectedAccount);
                      }}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span>✏️</span>
                      <span>Edit Channel</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleToggleStatus(selectedAccount)}
                      style={{
                        fontSize: '0.82rem',
                        padding: '0.45rem 0.9rem',
                        color: selectedAccount.isActive ? '#fca5a5' : '#86efac',
                        borderColor: selectedAccount.isActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      {selectedAccount.isActive ? 'Pause Channel' : 'Activate Channel'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsViewModalOpen(false)}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: DELETE CONFIRMATION (SUPER_ADMIN ONLY)
      ───────────────────────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && accountToDelete && (
        <div
          className="portal-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !deleteSubmitting) setIsDeleteModalOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '480px', borderTop: '4px solid var(--status-rejected)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.6rem' }}>🗑️</span>
                <div className="portal-modal-title-group">
                  <h3 id="delete-account-title" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                    Delete Official Channel?
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Permanent removal from institutional directory
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteSubmitting}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="portal-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete the official account{' '}
                <strong style={{ color: '#ffffff' }}>
                  "{accountToDelete.name || accountToDelete.handle}"
                </strong>{' '}
                ({accountToDelete.platform})?
              </p>

              <div
                className="portal-alert portal-alert-error"
                style={{ margin: 0, fontSize: '0.82rem' }}
              >
                <span>⚠️</span>
                <span>Creators will no longer be able to submit verification claims targeting this account. Existing historical submissions will be preserved with their review decisions.</span>
              </div>
            </div>

            <div className="portal-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-account"
                className="btn-danger"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.86rem'
                }}
              >
                {deleteSubmitting ? 'Deleting...' : '🗑️ Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
