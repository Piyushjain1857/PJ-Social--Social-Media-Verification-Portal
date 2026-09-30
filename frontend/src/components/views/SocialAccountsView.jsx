import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSuperAdminSocialAccounts,
  fetchActiveOfficialAccounts,
  fetchOfficialAccountById,
  createSuperAdminSocialAccount,
  updateSuperAdminSocialAccount,
  updateSuperAdminSocialAccountStatus,
  deleteSuperAdminSocialAccount
} from '../../services/api';

const PLATFORM_CONFIG = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    domain: 'instagram.com',
    placeholder: 'https://www.instagram.com/krmuniv/?hl=en',
    handlePrefix: '@'
  },
  LINKEDIN: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    domain: 'linkedin.com',
    placeholder: 'https://www.linkedin.com/school/krmuniv/posts/?feedView=all',
    handlePrefix: ''
  },
  FACEBOOK: {
    name: 'Facebook',
    icon: '👥',
    color: '#1877F2',
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
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

  // Load Accounts
  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isSuperAdmin) {
        const res = await fetchSuperAdminSocialAccounts({
          platform: platformFilter,
          status: statusFilter,
          search: debouncedSearch
        });
        if (res.success) {
          setAccounts(res.data || []);
        } else {
          setErrorMessage(res.message || 'Failed to load official social accounts.');
        }
      } else {
        // Read-only view for other roles
        const res = await fetchActiveOfficialAccounts(platformFilter);
        if (res.success) {
          let list = res.data || [];
          if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            list = list.filter(a =>
              (a.name && a.name.toLowerCase().includes(q)) ||
              (a.handle && a.handle.toLowerCase().includes(q)) ||
              (a.description && a.description.toLowerCase().includes(q))
            );
          }
          setAccounts(list);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to service.');
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, platformFilter, statusFilter, debouncedSearch]);

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
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🏛️</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-highlight)' }}>
                Official College Social Media Accounts
              </h2>
            </div>
            <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Central institutional directory of official university channels. Creators can only submit verification evidence against active official college accounts.
            </p>
          </div>

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
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <span>➕</span>
              <span>Add Official Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Status & Error Alerts */}
      {statusMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-rejected)', color: 'var(--status-rejected)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Accounts</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-highlight)', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            📸 {instagramCount} · 💼 {linkedinCount} · 👥 {facebookCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Profiles</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--status-success)', marginTop: '0.25rem' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Available for user submissions</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inactive / Archived</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: inactiveCount > 0 ? 'var(--status-pending)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
            {inactiveCount}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Submissions temporarily paused</div>
        </div>

        {isSuperAdmin && (
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Linked Submissions</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--role-admin)', marginTop: '0.25rem' }}>
              {totalSubmissions}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Across all official channels</div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search box */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <input
              type="text"
              id="input-search-social-accounts"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account name, handle, URL, or description..."
              className="input-field"
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                fontSize: '0.9rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            className="btn-secondary"
            onClick={loadAccounts}
            disabled={isLoading}
            style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
          >
            {isLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Platform Tabs & Status Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
          {/* Platform Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Platforms', icon: '🌐' },
              { id: 'INSTAGRAM', label: 'Instagram', icon: '📸' },
              { id: 'LINKEDIN', label: 'LinkedIn', icon: '💼' },
              { id: 'FACEBOOK', label: 'Facebook', icon: '👥' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                id={`filter-platform-${tab.id.toLowerCase()}`}
                onClick={() => setPlatformFilter(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: platformFilter === tab.id ? '1px solid var(--role-superadmin)' : '1px solid var(--border-subtle)',
                  background: platformFilter === tab.id ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  color: platformFilter === tab.id ? 'var(--text-highlight)' : 'var(--text-secondary)'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Status Filters (Only for Super Admin) */}
          {isSuperAdmin && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'ACTIVE', label: 'Active' },
                { id: 'INACTIVE', label: 'Inactive' }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  id={`filter-status-${st.id.toLowerCase()}`}
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    border: statusFilter === st.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                    background: statusFilter === st.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    color: statusFilter === st.id ? 'var(--text-highlight)' : 'var(--text-muted)'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Non-SuperAdmin Notice */}
      {!isSuperAdmin && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--role-admin)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          ℹ️ You are viewing the verified official college accounts directory. Only Super Administrators can add, edit, or remove official social accounts.
        </div>
      )}

      {/* Accounts List / Cards */}
      {isLoading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
          <div>Loading official college social accounts...</div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏛️</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-highlight)', fontSize: '1.15rem' }}>
            No Official Social Media Accounts Found
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            {searchTerm || platformFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No official accounts match your search or filter criteria.'
              : 'No official accounts have been registered yet.'}
          </p>
          {isSuperAdmin && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenAdd}
              style={{ marginTop: '1.25rem', padding: '0.6rem 1.25rem' }}
            >
              Add First Official Account
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {accounts.map(acc => {
            const cfg = PLATFORM_CONFIG[acc.platform] || PLATFORM_CONFIG.INSTAGRAM;
            const isToggling = togglingId === acc.id;

            return (
              <div
                key={acc.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.15rem',
                  position: 'relative',
                  borderTop: `3px solid ${cfg.color}`,
                  opacity: acc.isActive ? 1 : 0.72,
                  transition: 'opacity 0.2s ease, transform 0.2s ease'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: `${cfg.color}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        border: `1px solid ${cfg.color}44`
                      }}
                    >
                      {cfg.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: cfg.color
                          }}
                        >
                          {cfg.name}
                        </span>
                        <span
                          title="Verified College Account"
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--status-success)',
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.12)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '10px'
                          }}
                        >
                          ✓ Official
                        </span>
                      </div>
                      <h3
                        style={{
                          margin: '0.2rem 0 0 0',
                          fontSize: '1.05rem',
                          fontWeight: 600,
                          color: 'var(--text-highlight)'
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
                    {acc.isActive ? '● ACTIVE' : '○ INACTIVE'}
                  </span>
                </div>

                {/* Handle & Profile URL Link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Handle:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {acc.handle}
                    </span>
                  </div>

                  {acc.accountUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>URL:</span>
                      <a
                        href={acc.accountUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: cfg.color,
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <span>{acc.accountUrl}</span>
                        <span style={{ fontSize: '0.72rem' }}>↗</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Description */}
                {acc.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.83rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {acc.description}
                  </p>
                )}

                {/* Footer Info & Submissions Count */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.75rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  <div>
                    {acc.submissionsCount !== undefined ? (
                      <span>📊 <strong>{acc.submissionsCount}</strong> submissions linked</span>
                    ) : (
                      <span>Created {new Date(acc.createdAt || Date.now()).toLocaleDateString()}</span>
                    )}
                  </div>

                  {!acc.isActive && (
                    <span style={{ color: 'var(--status-rejected)', fontSize: '0.74rem' }}>
                      Submissions paused
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
                    paddingTop: '0.25rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleOpenView(acc)}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    👁️ Dossier
                  </button>

                  {isSuperAdmin && (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleOpenEdit(acc)}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleToggleStatus(acc)}
                        disabled={isToggling}
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.35rem 0.75rem',
                          color: acc.isActive ? 'var(--status-rejected)' : 'var(--status-success)',
                          borderColor: acc.isActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        {isToggling ? '⏳...' : acc.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDelete(acc)}
                        title="Delete official account"
                        style={{
                          background: 'none',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: 'var(--status-rejected)',
                          cursor: 'pointer',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.8rem'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>➕</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  Add Official College Social Account
                </h3>
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

            {addError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', borderLeft: '3px solid var(--status-rejected)', color: 'var(--status-rejected)', fontSize: '0.85rem', marginBottom: '1.25rem', borderRadius: '4px' }}>
                ⚠️ {addError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Platform Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Platform <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'].map(pKey => {
                    const cfg = PLATFORM_CONFIG[pKey];
                    const isSelected = addForm.platform === pKey;
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => setAddForm(prev => ({ ...prev, platform: pKey }))}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer',
                          border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                          background: isSelected ? `${cfg.color}1e` : 'rgba(255, 255, 255, 0.03)',
                          color: isSelected ? 'var(--text-highlight)' : 'var(--text-secondary)'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{cfg.icon}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{cfg.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Official Account Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. K.R. Mangalam University Official Instagram"
                  value={addForm.name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Descriptive title recognized by students, faculty, and alumni.
                </div>
              </div>

              {/* Account URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Account Profile / School URL <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder={PLATFORM_CONFIG[addForm.platform].placeholder}
                  value={addForm.accountUrl}
                  onChange={(e) => setAddForm(prev => ({ ...prev, accountUrl: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  🔒 {getDomainHint(addForm.platform)}
                </div>
              </div>

              {/* Handle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Account Handle (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. @krmuniv or krmuniv"
                  value={addForm.handle}
                  onChange={(e) => setAddForm(prev => ({ ...prev, handle: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Leave blank to automatically extract handle from the URL.
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Official purpose or campus scope of this social media channel..."
                  value={addForm.description}
                  onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0' }}>
                <input
                  type="checkbox"
                  id="add-is-active"
                  checked={addForm.isActive}
                  onChange={(e) => setAddForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--role-superadmin)', cursor: 'pointer' }}
                />
                <label htmlFor="add-is-active" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <strong>Activate immediately</strong> (enables creator verification submissions)
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
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
                  {addSubmitting ? '⏳ Creating...' : '✓ Register Official Account'}
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
            style={{ width: '100%', maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>✏️</span>
                <h3 id="edit-account-title" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  Edit Official Account
                </h3>
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
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', borderLeft: '3px solid var(--status-rejected)', color: 'var(--status-rejected)', fontSize: '0.85rem', marginBottom: '1.25rem', borderRadius: '4px' }}>
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Platform Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Platform
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'].map(pKey => {
                    const cfg = PLATFORM_CONFIG[pKey];
                    const isSelected = editForm.platform === pKey;
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, platform: pKey }))}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer',
                          border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                          background: isSelected ? `${cfg.color}1e` : 'rgba(255, 255, 255, 0.03)',
                          color: isSelected ? 'var(--text-highlight)' : 'var(--text-secondary)'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{cfg.icon}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{cfg.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Account Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Account URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Account URL <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input
                  type="url"
                  required
                  value={editForm.accountUrl}
                  onChange={(e) => setEditForm(prev => ({ ...prev, accountUrl: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  🔒 {getDomainHint(editForm.platform)}
                </div>
              </div>

              {/* Handle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Account Handle
                </label>
                <input
                  type="text"
                  value={editForm.handle}
                  onChange={(e) => setEditForm(prev => ({ ...prev, handle: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Active Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0' }}>
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--role-superadmin)', cursor: 'pointer' }}
                />
                <label htmlFor="edit-is-active" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <strong>Account is Active</strong> (accepts student activity submissions)
                </label>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
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
            style={{ width: '100%', maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>
                  {PLATFORM_CONFIG[selectedAccount.platform]?.icon || '🌐'}
                </span>
                <div>
                  <h3 id="view-account-title" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-highlight)' }}>
                    {selectedAccount.name || selectedAccount.handle}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: PLATFORM_CONFIG[selectedAccount.platform]?.color || 'var(--text-secondary)', fontWeight: 600 }}>
                    Official {PLATFORM_CONFIG[selectedAccount.platform]?.name || selectedAccount.platform} Channel
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Status & Verification Pill */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${selectedAccount.isActive ? 'badge-success' : 'badge-warning'}`}>
                  {selectedAccount.isActive ? '● Active Channel' : '○ Paused / Inactive'}
                </span>
                <span className="badge badge-info">
                  ✓ Verified Official College Channel
                </span>
              </div>

              {/* Data Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Handle</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {selectedAccount.handle}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Linked Submissions</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--role-admin)', marginTop: '0.2rem' }}>
                    {selectedAccount.submissionsCount || selectedAccount.submissions?.length || 0} activities
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Official URL</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    <a
                      href={selectedAccount.accountUrl || selectedAccount.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: PLATFORM_CONFIG[selectedAccount.platform]?.color || 'var(--text-highlight)', textDecoration: 'none', wordBreak: 'break-all' }}
                    >
                      {selectedAccount.accountUrl || selectedAccount.profileUrl} ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedAccount.description && (
                <div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Description</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                    {selectedAccount.description}
                  </div>
                </div>
              )}

              {/* Recent Activity Submissions if any */}
              {selectedAccount.submissions && selectedAccount.submissions.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Recent Submissions Target
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedAccount.submissions.map(sub => (
                      <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div>
                          <strong>{sub.actionType}</strong> · <span style={{ color: 'var(--text-muted)' }}>{new Date(sub.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`badge ${sub.status === 'APPROVED' ? 'badge-success' : sub.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
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
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleToggleStatus(selectedAccount)}
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.4rem 0.85rem',
                          color: selectedAccount.isActive ? 'var(--status-rejected)' : 'var(--status-success)'
                        }}
                      >
                        {selectedAccount.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsViewModalOpen(false)}
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                  >
                    Close
                  </button>
                </div>
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
            style={{ width: '100%', maxWidth: '480px', borderTop: '4px solid var(--status-rejected)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>🗑️</span>
                <h3 id="delete-account-title" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  Delete Official Social Account?
                </h3>
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

            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete the official account{' '}
              <strong style={{ color: 'var(--text-highlight)' }}>
                "{accountToDelete.name || accountToDelete.handle}"
              </strong>{' '}
              ({accountToDelete.platform})?
            </p>

            <div style={{ background: 'rgba(239, 68, 68, 0.12)', borderLeft: '3px solid var(--status-rejected)', padding: '0.75rem 1rem', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              ⚠️ Creators will no longer be able to submit verification evidence targeting this account. Existing historical submissions will be preserved with their review decisions.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
                  gap: '0.4rem'
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
