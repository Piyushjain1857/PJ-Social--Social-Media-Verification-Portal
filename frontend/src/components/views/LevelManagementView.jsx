import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminLevels,
  fetchLevelConfiguration,
  createAdminLevel,
  updateAdminLevel,
  updateAdminLevelStatus,
  deleteAdminLevel,
  generateAdminLevels
} from '../../services/api';

const QUICK_ICONS = ['🌱', '⭐', '🚀', '⚡', '💎', '👑', '🏆', '🛡️', '🔥', '🎯', '🧭', '🌟', '🎖️', '🥇', '🥈', '🥉'];

export default function LevelManagementView() {
  const [levels, setLevels] = useState([]);
  const [config, setConfig] = useState({
    totalLevels: 0,
    activeLevels: 0,
    highestLevel: 0,
    totalXPRequired: 0,
    xpToMaxLevel: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active item for Edit / Delete
  const [selectedLevel, setSelectedLevel] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    levelNumber: 1,
    name: '',
    xpRequired: 250,
    icon: '⭐',
    description: '',
    isActive: true
  });

  const [editForm, setEditForm] = useState({
    levelNumber: 1,
    name: '',
    xpRequired: 250,
    icon: '⭐',
    description: '',
    isActive: true
  });

  const [generateForm, setGenerateForm] = useState({
    count: 50,
    xpPerLevel: 250,
    confirmModify: false,
    actionOnDecrease: 'deactivate'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [levelsRes, configRes] = await Promise.all([
        fetchAdminLevels(),
        fetchLevelConfiguration()
      ]);

      if (levelsRes && levelsRes.success) {
        setLevels(levelsRes.data || []);
      }
      if (configRes && configRes.success) {
        setConfig(configRes.data || {});
      }
    } catch (err) {
      setError(err.message || 'Error loading level configurations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setActionError(null);
    const highestNum = levels.length > 0 ? Math.max(...levels.map((l) => l.levelNumber)) : 0;
    setCreateForm({
      levelNumber: highestNum + 1,
      name: '',
      xpRequired: 250,
      icon: '⭐',
      description: '',
      isActive: true
    });
    setShowCreateModal(true);
  };

  // Submit Create Level
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);

    if (!createForm.name.trim()) {
      setActionError('Level name is required.');
      return;
    }
    if (createForm.xpRequired <= 0) {
      setActionError('XP requirement must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdminLevel(createForm);
      if (res && res.success) {
        showToastMsg(`Level ${createForm.levelNumber} ("${createForm.name}") created successfully!`);
        setShowCreateModal(false);
        loadData();
      } else {
        throw new Error(res?.message || 'Failed to create level.');
      }
    } catch (err) {
      setActionError(err.message || 'Error creating level.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (level) => {
    setActionError(null);
    setSelectedLevel(level);
    setEditForm({
      levelNumber: level.levelNumber,
      name: level.name,
      xpRequired: level.xpRequired,
      icon: level.icon || '⭐',
      description: level.description || '',
      isActive: level.isActive
    });
    setShowEditModal(true);
  };

  // Submit Edit Level
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLevel) return;
    setActionError(null);

    if (!editForm.name.trim()) {
      setActionError('Level name is required.');
      return;
    }
    if (editForm.xpRequired <= 0) {
      setActionError('XP requirement must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateAdminLevel(selectedLevel.id, editForm);
      if (res && res.success) {
        showToastMsg(`Level ${selectedLevel.levelNumber} updated successfully!`);
        setShowEditModal(false);
        loadData();
      } else {
        throw new Error(res?.message || 'Failed to update level.');
      }
    } catch (err) {
      setActionError(err.message || 'Error updating level.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (level) => {
    try {
      const nextStatus = !level.isActive;
      const res = await updateAdminLevelStatus(level.id, nextStatus);
      if (res && res.success) {
        showToastMsg(`Level ${level.levelNumber} is now ${nextStatus ? 'Active' : 'Inactive'}.`);
        loadData();
      }
    } catch (err) {
      showToastMsg(err.message || 'Error changing status.', 'error');
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (level) => {
    setActionError(null);
    setSelectedLevel(level);
    setShowDeleteModal(true);
  };

  // Submit Delete / Deactivate
  const handleDeleteSubmit = async (force = false, deactivateInstead = false) => {
    if (!selectedLevel) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await deleteAdminLevel(selectedLevel.id, { force, deactivateInstead });
      if (res && res.success) {
        showToastMsg(res.message || `Level ${selectedLevel.levelNumber} handled.`);
        setShowDeleteModal(false);
        loadData();
      } else {
        throw new Error(res?.message || 'Failed to delete level.');
      }
    } catch (err) {
      setActionError(err.message || 'Error deleting level.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Bulk Generate Modal
  const handleOpenGenerate = () => {
    setActionError(null);
    setGenerateForm({
      count: config.totalLevels || 50,
      xpPerLevel: 250,
      confirmModify: false,
      actionOnDecrease: 'deactivate'
    });
    setShowGenerateModal(true);
  };

  // Submit Bulk Generate
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);

    if (generateForm.count < 1 || generateForm.count > 200) {
      setActionError('Number of levels must be between 1 and 200.');
      return;
    }
    if (generateForm.xpPerLevel < 1) {
      setActionError('XP per level must be greater than 0.');
      return;
    }
    if (!generateForm.confirmModify) {
      setActionError('Please confirm the modification warning before generating levels.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await generateAdminLevels(generateForm);
      if (res && res.success) {
        showToastMsg(res.message || `Successfully generated ${generateForm.count} levels.`);
        setShowGenerateModal(false);
        loadData();
      } else {
        throw new Error(res?.message || 'Failed to generate levels.');
      }
    } catch (err) {
      setActionError(err.message || 'Error generating levels.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Sort
  const filteredLevels = levels
    .filter((l) => {
      if (statusFilter === 'ACTIVE') return l.isActive;
      if (statusFilter === 'INACTIVE') return !l.isActive;
      return true;
    })
    .filter((l) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        String(l.levelNumber).includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      return sortOrder === 'asc'
        ? a.levelNumber - b.levelNumber
        : b.levelNumber - a.levelNumber;
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: toast.type === 'error' ? 'var(--status-error)' : 'var(--status-success)',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Dashboard Summary */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          {/* Title row — icon + h2 LEFT, buttons RIGHT */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.6rem' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
                Level Management Engine
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleOpenCreate}
                style={{
                  fontSize: '0.82rem',
                  padding: '0.5rem 1rem',
                  background: 'var(--role-superadmin)',
                  color: '#fff',
                  fontWeight: 700,
                  gap: '0.4rem'
                }}
              >
                <span>➕</span> Add Level
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleOpenGenerate}
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', gap: '0.4rem' }}
              >
                <span>⚙️</span> System Configuration
              </button>

              <button
                type="button"
                className="btn-refresh-pill"
                onClick={loadData}
                title="Refresh levels"
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
            </div>
          </div>

          {/* Subtitle below the title row */}
          <p style={{ margin: '0.35rem 0 0 1.9rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Complete institutional governance over creator XP thresholds, level titles, icons, and progression tiers.
          </p>
        </div>

        {/* 4 Summary Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderLeft: '4px solid #38bdf8',
              borderRadius: '8px',
              padding: '1rem'
            }}
          >
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Total Levels
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#7dd3fc', marginTop: '0.25rem' }}>
              {config.totalLevels}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Configured in Database
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderLeft: '4px solid #34d399',
              borderRadius: '8px',
              padding: '1rem'
            }}
          >
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Active Levels
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#6ee7b7', marginTop: '0.25rem' }}>
              {config.activeLevels}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Currently in live engine
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderLeft: '4px solid #a855f7',
              borderRadius: '8px',
              padding: '1rem'
            }}
          >
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Highest Level
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d8b4fe', marginTop: '0.25rem' }}>
              Level {config.highestLevel}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Current pinnacle tier
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderLeft: '4px solid #facc15',
              borderRadius: '8px',
              padding: '1rem'
            }}
          >
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              XP to Max Level
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fef08a', marginTop: '0.25rem' }}>
              {config.totalXPRequired?.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#facc15' }}>XP</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Cumulative progression sum
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Search & Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: '1', minWidth: '240px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Search by name or level number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '320px', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
          />

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              className={statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setStatusFilter('ALL')}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            >
              All ({levels.length})
            </button>
            <button
              type="button"
              className={statusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setStatusFilter('ACTIVE')}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            >
              Active ({levels.filter((l) => l.isActive).length})
            </button>
            <button
              type="button"
              className={statusFilter === 'INACTIVE' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setStatusFilter('INACTIVE')}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            >
              Inactive ({levels.filter((l) => !l.isActive).length})
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
          >
            <span>↕️</span> Level {sortOrder === 'asc' ? '1 → Max' : 'Max → 1'}
          </button>
        </div>
      </div>

      {/* Main Levels Table / Responsive Cards */}
      {isLoading ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '40px', marginBottom: '0.75rem', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '40px', marginBottom: '0.75rem', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '40px', marginBottom: '0.75rem', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '40px', borderRadius: '6px' }} />
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderLeft: '4px solid var(--status-error)' }}>
          <p style={{ color: 'var(--status-error)', fontWeight: 600 }}>{error}</p>
          <button type="button" className="btn-secondary" onClick={loadData} style={{ marginTop: '0.5rem' }}>
            Try Again
          </button>
        </div>
      ) : filteredLevels.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>🔍</span>
          <h3 style={{ color: 'var(--text-highlight)', margin: '0.5rem 0' }}>No Levels Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No levels match your search or filter criteria.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
            style={{ marginTop: '0.5rem' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                    Level
                  </th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>
                    Icon
                  </th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Name & Description
                  </th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    XP Required
                  </th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cumulative XP
                  </th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '220px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLevels.map((lvl) => {
                  return (
                    <tr
                      key={lvl.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        opacity: lvl.isActive ? 1 : 0.6,
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Level # */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: lvl.isActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                            color: lvl.isActive ? '#38bdf8' : '#94a3b8',
                            border: `1px solid ${lvl.isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`
                          }}
                        >
                          Level {lvl.levelNumber}
                        </span>
                      </td>

                      {/* Icon */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '1.35rem' }}>
                        {lvl.icon || '⭐'}
                      </td>

                      {/* Name & Description */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.9rem' }}>
                          {lvl.name}
                        </div>
                        {lvl.description && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                            {lvl.description}
                          </div>
                        )}
                      </td>

                      {/* XP Required */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontWeight: 700, color: '#facc15' }}>
                          {lvl.xpRequired.toLocaleString()} XP
                        </span>
                      </td>

                      {/* Cumulative XP Range */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            color: '#94a3b8',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}
                        >
                          {lvl.cumulativeStartXP?.toLocaleString()} – {lvl.cumulativeEndXP?.toLocaleString()} XP
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          className={`badge ${lvl.isActive ? 'badge-success' : 'badge-inactive'}`}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.55rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: lvl.isActive ? '#22c55e' : '#94a3b8' }} />
                          {lvl.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleOpenEdit(lvl)}
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            title="Edit level"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleToggleStatus(lvl)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.6rem',
                              color: lvl.isActive ? '#f87171' : '#34d399'
                            }}
                            title={lvl.isActive ? 'Disable level' : 'Enable level'}
                          >
                            {lvl.isActive ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleOpenDelete(lvl)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.6rem',
                              color: 'var(--status-error)'
                            }}
                            title="Delete level"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: Create Level
          ==================================================================== */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
                ➕ Create New Level
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            {actionError && (
              <div style={{ margin: '1rem 1rem 0 1rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
                ⚠️ {actionError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Level Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={createForm.levelNumber}
                    onChange={(e) => setCreateForm({ ...createForm, levelNumber: parseInt(e.target.value, 10) || 1 })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Level Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Master Contributor"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  XP Required (To Advance to Next Level) *
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={createForm.xpRequired}
                  onChange={(e) => setCreateForm({ ...createForm, xpRequired: parseInt(e.target.value, 10) || 250 })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Level Icon (Emoji / Symbol)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '80px', textAlign: 'center', fontSize: '1.2rem' }}
                    value={createForm.icon}
                    onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
                  />
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {QUICK_ICONS.slice(0, 8).map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, icon: ic })}
                        style={{
                          background: createForm.icon === ic ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${createForm.icon === ic ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '0.2rem 0.4rem',
                          fontSize: '0.95rem'
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Description (Optional)
                </label>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder="Achievement criteria or description..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="create-active"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                />
                <label htmlFor="create-active" style={{ fontSize: '0.82rem', color: 'var(--text-highlight)', cursor: 'pointer' }}>
                  Make this level immediately active in the progression engine
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ background: 'var(--role-superadmin)', color: '#fff' }}>
                  {isSubmitting ? 'Creating...' : 'Create Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: Edit Level
          ==================================================================== */}
      {showEditModal && selectedLevel && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
                ✏️ Edit Level {selectedLevel.levelNumber}
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>

            {actionError && (
              <div style={{ margin: '1rem 1rem 0 1rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
                ⚠️ {actionError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Level Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={editForm.levelNumber}
                    onChange={(e) => setEditForm({ ...editForm, levelNumber: parseInt(e.target.value, 10) || 1 })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Level Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  XP Required (To Advance to Next Level) *
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={editForm.xpRequired}
                  onChange={(e) => setEditForm({ ...editForm, xpRequired: parseInt(e.target.value, 10) || 250 })}
                  required
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Cumulative thresholds for all subsequent levels will automatically adjust dynamically.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Level Icon
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '80px', textAlign: 'center', fontSize: '1.2rem' }}
                    value={editForm.icon}
                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                  />
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {QUICK_ICONS.slice(0, 8).map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, icon: ic })}
                        style={{
                          background: editForm.icon === ic ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${editForm.icon === ic ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '0.2rem 0.4rem',
                          fontSize: '0.95rem'
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                />
                <label htmlFor="edit-active" style={{ fontSize: '0.82rem', color: 'var(--text-highlight)', cursor: 'pointer' }}>
                  Level is Active in Progression Engine
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ background: 'var(--role-superadmin)', color: '#fff' }}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: Bulk Generate / Configuration
          ==================================================================== */}
      {showGenerateModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
                ⚙️ Level System Configuration & Bulk Generator
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowGenerateModal(false)}>
                ✕
              </button>
            </div>

            {actionError && (
              <div style={{ margin: '1rem 1rem 0 1rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
                ⚠️ {actionError}
              </div>
            )}

            <form onSubmit={handleGenerateSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.82rem',
                  color: '#bae6fd'
                }}
              >
                <strong>ℹ️ XP Preservation Guarantee:</strong> Modifying the level series will recalculate rank brackets, but will <strong>NEVER</strong> change or delete any user's verified XP balance or audit trail.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Number of Levels
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    className="input-field"
                    value={generateForm.count}
                    onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value, 10) || 50 })}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Currently: {config.totalLevels} levels
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Default XP Per Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={generateForm.xpPerLevel}
                    onChange={(e) => setGenerateForm({ ...generateForm, xpPerLevel: parseInt(e.target.value, 10) || 250 })}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Standard: 250 XP
                  </div>
                </div>
              </div>

              {generateForm.count < config.totalLevels && (
                <div
                  style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    fontSize: '0.78rem',
                    color: '#fef08a'
                  }}
                >
                  <strong>⚠️ Decreasing Level Count ({config.totalLevels} → {generateForm.count}):</strong>
                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="actionOnDecrease"
                        checked={generateForm.actionOnDecrease === 'deactivate'}
                        onChange={() => setGenerateForm({ ...generateForm, actionOnDecrease: 'deactivate' })}
                      />
                      Deactivate extra levels (Safe & Recommended)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="actionOnDecrease"
                        checked={generateForm.actionOnDecrease === 'delete'}
                        onChange={() => setGenerateForm({ ...generateForm, actionOnDecrease: 'delete' })}
                      />
                      Permanently delete extra levels
                    </label>
                  </div>
                </div>
              )}

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '0.75rem'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={generateForm.confirmModify}
                    onChange={(e) => setGenerateForm({ ...generateForm, confirmModify: e.target.checked })}
                    style={{ marginTop: '0.15rem' }}
                    required
                  />
                  <span>
                    I confirm that this will modify the active level structure. Existing user XP will remain unchanged.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || !generateForm.confirmModify}
                  style={{ background: 'var(--role-superadmin)', color: '#fff' }}
                >
                  {isSubmitting ? 'Generating...' : `Apply ${generateForm.count} Levels Configuration`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: Safe Delete Level
          ==================================================================== */}
      {showDeleteModal && selectedLevel && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--status-error)' }}>
                🗑️ Delete Level {selectedLevel.levelNumber}
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>

            {actionError && (
              <div style={{ margin: '1rem 1rem 0 1rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
                ⚠️ {actionError}
              </div>
            )}

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to remove <strong>Level {selectedLevel.levelNumber} ("{selectedLevel.name}")</strong>?
              </p>

              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  color: '#fef08a'
                }}
              >
                <strong>💡 Recommended Safe Action:</strong> Deactivate this level rather than permanently deleting it. Deactivation safely excludes the level from active progression while preserving historical records.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleDeleteSubmit(false, true)}
                  disabled={isSubmitting}
                  style={{ background: '#38bdf8', color: '#07090e', fontWeight: 700 }}
                >
                  🔒 Safely Deactivate Level (Recommended)
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleDeleteSubmit(true, false)}
                  disabled={isSubmitting}
                  style={{ color: 'var(--status-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  Permanently Delete Level
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
