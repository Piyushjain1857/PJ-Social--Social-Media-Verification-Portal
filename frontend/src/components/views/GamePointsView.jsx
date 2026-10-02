import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import PersonalGamificationDashboard from '../gamification/PersonalGamificationDashboard';
import Leaderboard from '../gamification/Leaderboard';
import UserXPChart from '../gamification/UserXPChart';
import PositionTimeline from '../gamification/PositionTimeline';
import DynamicLevelTimeline from '../gamification/DynamicLevelTimeline';
import XPHistoryLedger from '../gamification/XPHistoryLedger';
import { fetchAdminGamificationOverview, adjustUserPoints } from '../../services/api';
import { fetchUserGamification } from '../../services/gamificationApi';

export default function GamePointsView({ onNavigateToNav = null }) {
  const { user } = useAuth();
  const currentRole = user?.role || 'USER';

  // Role-tailored tabs
  const [adminTab, setAdminTab] = useState('leaderboard'); // 'leaderboard' | 'creators' | 'my-stats' | 'inspector' | 'engine'
  
  // Admin creators overview state
  const [creators, setCreators] = useState([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [creatorsSearch, setCreatorsSearch] = useState('');
  const [creatorsPagination, setCreatorsPagination] = useState({ page: 1, limit: 12, totalCount: 0, totalPages: 1 });

  // Inspector state
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [inspectedUserData, setInspectedUserData] = useState(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // Super Admin manual adjust modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState(null);
  const [adjustPointsVal, setAdjustPointsVal] = useState(50);
  const [adjustReason, setAdjustReason] = useState('Outstanding community advocacy');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustMessage, setAdjustMessage] = useState(null);

  // Load creators overview for Admin / Super Admin
  const loadCreators = useCallback(async (page = 1, search = creatorsSearch) => {
    if (currentRole === 'USER') return;
    setCreatorsLoading(true);
    try {
      const res = await fetchAdminGamificationOverview({ page, limit: 12, search });
      if (res && res.success) {
        setCreators(res.data?.users || res.data?.creators || res.users || []);
        if (res.pagination) {
          setCreatorsPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Could not load creators overview:', err.message);
    } finally {
      setCreatorsLoading(false);
    }
  }, [currentRole, creatorsSearch]);

  useEffect(() => {
    if (currentRole !== 'USER' && adminTab === 'creators') {
      loadCreators(creatorsPagination.page, creatorsSearch);
    }
  }, [currentRole, adminTab, loadCreators, creatorsPagination.page, creatorsSearch]);

  const handleInspectUser = async (uId) => {
    setSelectedUserId(uId);
    setAdminTab('inspector');
    setInspectorLoading(true);
    try {
      const res = await fetchUserGamification(uId);
      if (res && res.success) {
        setInspectedUserData(res.data);
      }
    } catch (err) {
      console.warn('Failed to load user dossier:', err);
    } finally {
      setInspectorLoading(false);
    }
  };

  const handleAdjustPointsSubmit = async (e) => {
    e.preventDefault();
    if (!adjustTargetUser?.id) return;
    setAdjustSubmitting(true);
    setAdjustMessage(null);
    try {
      const res = await adjustUserPoints({
        userId: adjustTargetUser.id,
        points: parseInt(adjustPointsVal, 10),
        reason: adjustReason
      });
      if (res && res.success) {
        setAdjustMessage({ type: 'success', text: `Successfully adjusted balance by ${adjustPointsVal > 0 ? '+' : ''}${adjustPointsVal} XP!` });
        setTimeout(() => {
          setShowAdjustModal(false);
          setAdjustMessage(null);
          loadCreators(creatorsPagination.page);
        }, 1500);
      } else {
        throw new Error(res?.message || 'Adjustment failed');
      }
    } catch (err) {
      setAdjustMessage({ type: 'error', text: err.message || 'Error executing adjustment' });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // ============================================================================
  // 1. NORMAL USER: Renders Personal Gamification Dashboard
  // ============================================================================
  if (currentRole === 'USER') {
    return <PersonalGamificationDashboard onNavigateToNav={onNavigateToNav} />;
  }

  // ============================================================================
  // 2. ADMIN & SUPER ADMIN: Role-Tailored Gamification Hub
  // ============================================================================
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';

  return (
    <div className="layout-content-area gamepoints-admin-container">
      {/* Header Banner */}
      <div className="gamepoints-dashboard-banner glass-panel">
        <div className="gamepoints-banner-content">
          <div className="gamepoints-banner-badge admin">
            <span className="gamepoints-banner-dot" />
            <span>{isSuperAdmin ? '👑 Super Administrator Access' : '🛡️ Admin Moderator Oversight'}</span>
          </div>
          <h1 className="gamepoints-banner-title">
            <span className="gamepoints-banner-icon">🎮</span> Game Points Governance &amp; Leaderboard
          </h1>
          <p className="gamepoints-banner-description">
            {isSuperAdmin
              ? 'Configure dynamic level tiers, inspect creator progression curves, audit global XP transactions, and reward bonuses.'
              : 'Monitor community rankings, inspect participant progression curves, and verify creator activity points.'}
          </p>
        </div>

        {/* Role Sub-Navigation Tabs */}
        <div className="gamepoints-banner-actions">
          <div className="gamepoints-subnav-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={adminTab === 'leaderboard'}
              className={`gamepoints-subnav-btn ${adminTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setAdminTab('leaderboard')}
            >
              <span>🏆</span> Community Leaderboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={adminTab === 'creators'}
              className={`gamepoints-subnav-btn ${adminTab === 'creators' ? 'active' : ''}`}
              onClick={() => setAdminTab('creators')}
            >
              <span>👥</span> Creators Directory
            </button>
            {selectedUserId && (
              <button
                type="button"
                role="tab"
                aria-selected={adminTab === 'inspector'}
                className={`gamepoints-subnav-btn ${adminTab === 'inspector' ? 'active' : ''}`}
                onClick={() => setAdminTab('inspector')}
              >
                <span>🔍</span> User Dossier
              </button>
            )}
            {isSuperAdmin && (
              <button
                type="button"
                role="tab"
                aria-selected={adminTab === 'engine'}
                className={`gamepoints-subnav-btn ${adminTab === 'engine' ? 'active' : ''}`}
                onClick={() => setAdminTab('engine')}
              >
                <span>⚡</span> Level Engine Controls
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Governance & Administration Advisory Notice */}
      <div style={{
        margin: '1.25rem 0',
        padding: '0.85rem 1.25rem',
        borderRadius: '12px',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        fontSize: '0.88rem'
      }}>
        <span style={{ fontSize: '1.25rem' }}>🛡️</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-highlight)' }}>Management Account:</strong> Administrators and Super Administrators configure, audit, and allocate game points for creators. Administrative accounts manage the ecosystem and do not hold personal player points or compete on the leaderboard.
        </span>
      </div>

      {/* Tab: Community Leaderboard */}
      {adminTab === 'leaderboard' && (
        <div style={{ marginTop: '1.5rem' }}>
          <Leaderboard onSelectUser={(uId) => handleInspectUser(uId)} />
        </div>
      )}

      {/* Tab: Creators Overview Directory */}
      {adminTab === 'creators' && (
        <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.2rem' }}>
                👥 Community Creators Directory
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Inspect participant XP balances, levels, and verification activity
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Search creator by name or email…"
                className="input-portal"
                value={creatorsSearch}
                onChange={(e) => {
                  setCreatorsSearch(e.target.value);
                  loadCreators(1, e.target.value);
                }}
                style={{ width: '280px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {creatorsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="status-dot checking" style={{ margin: '0 auto 1rem auto' }} />
              <span>Loading creators directory…</span>
            </div>
          ) : creators.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No creators found matching search criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {creators.map((c) => {
                const totalXP = c.totalXP ?? c.totalPoints ?? 0;
                const levelObj = c.level || {};

                return (
                  <div
                    key={c.id}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.95rem' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.email}
                        </div>
                      </div>
                      <span className="level-badge level-badge-sm tier-active">
                        {levelObj.icon || '🌱'} Lvl {levelObj.level || levelObj.currentLevel || 1}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total XP</div>
                        <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1rem' }}>{totalXP.toLocaleString()} XP</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Approved Proofs</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '1rem' }}>
                          {c.approvedSubmissionsCount ?? c._count?.submissions ?? 0}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem' }}
                        onClick={() => handleInspectUser(c.id)}
                      >
                        🔍 Inspect Dossier
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="btn-portal-primary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => {
                            setAdjustTargetUser(c);
                            setShowAdjustModal(true);
                          }}
                        >
                          🎁 Bonus / Adjust
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Inspect Specific User Dossier */}
      {adminTab === 'inspector' && (
        <div style={{ marginTop: '1.5rem' }}>
          {inspectorLoading ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="status-dot checking" style={{ margin: '0 auto 1rem auto' }} />
              <span>Loading user dossier…</span>
            </div>
          ) : !selectedUserId ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              Select a creator from the directory or leaderboard to inspect their full gamification dossier.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-highlight)' }}>
                  🔍 User Dossier: {inspectedUserData?.levelName} (Level {inspectedUserData?.currentLevel})
                </h3>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAdminTab('creators')}
                  style={{ fontSize: '0.8rem' }}
                >
                  ← Back to Directory
                </button>
              </div>

              <div className="gamepoints-kpi-grid">
                <div className="gamepoints-kpi-card level-card glass-panel">
                  <div className="gamepoints-kpi-header">
                    <span className="gamepoints-kpi-title">User Level</span>
                    <span className="gamepoints-level-badge-pill">Tier {inspectedUserData?.currentLevel}</span>
                  </div>
                  <div className="gamepoints-level-display">
                    <div className="gamepoints-level-big-icon">{inspectedUserData?.icon || '🌱'}</div>
                    <div className="gamepoints-level-text-group">
                      <div className="gamepoints-level-number-tag">LEVEL {inspectedUserData?.currentLevel}</div>
                      <div className="gamepoints-level-title">{inspectedUserData?.levelName}</div>
                      <div className="gamepoints-level-xp-value">{inspectedUserData?.totalXP?.toLocaleString()} XP</div>
                    </div>
                  </div>
                </div>

                <div className="gamepoints-kpi-card position-card glass-panel">
                  <div className="gamepoints-kpi-header">
                    <span className="gamepoints-kpi-title">Authoritative Rank</span>
                    <span className="gamepoints-rank-standing-pill">#{inspectedUserData?.rank || 1}</span>
                  </div>
                  <div className="gamepoints-position-display">
                    <div className="gamepoints-rank-big-number">#{inspectedUserData?.rank || 1}</div>
                    <div className="gamepoints-rank-of-total">out of {inspectedUserData?.totalParticipants} creators</div>
                  </div>
                  <div className="gamepoints-percentile-box">
                    Ahead of {inspectedUserData?.percentileAhead}% of community
                  </div>
                </div>
              </div>

              {/* Inspected User's Chart and History */}
              <div style={{ marginTop: '1.5rem' }}>
                <UserXPChart userId={selectedUserId} />
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <PositionTimeline userId={selectedUserId} />
              </div>
            </div>
          )}
        </div>
      )}


      {/* Tab: Super Admin Level Engine Controls */}
      {adminTab === 'engine' && isSuperAdmin && (
        <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.25rem' }}>
                ⚡ Super Admin Level Engine Configuration
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Configure active level tiers, XP step requirements, and global progression formulas
              </p>
            </div>
            {onNavigateToNav && (
              <button
                type="button"
                className="btn-portal-primary"
                onClick={() => onNavigateToNav('levels')}
              >
                ⚡ Open Dedicated Level Manager
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Configured Tiers</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>50+ Levels</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--status-success)', marginTop: '0.25rem' }}>Dynamic Database Config</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Earning Rules</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-highlight)', marginTop: '0.25rem' }}>
                Like: +1 | Comment: +2 | Story: +2
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Strict Idempotency Guardrails</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Audit Log Guard</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>100%</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Immutable Transaction Ledger</div>
            </div>
          </div>

          <DynamicLevelTimeline />
        </div>
      )}

      {/* Super Admin Points Adjustment Modal */}
      {showAdjustModal && (
        <div className="modal-backdrop" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-highlight)' }}>
                🎁 Super Admin Points Bonus / Adjustment
              </h3>
              <button type="button" className="btn-close" onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAdjustPointsSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Target Creator</label>
                <div style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '1rem' }}>
                  {adjustTargetUser?.name} ({adjustTargetUser?.email})
                </div>
              </div>

              <div>
                <label className="form-label">Adjustment Points / XP</label>
                <input
                  type="number"
                  className="input-portal"
                  value={adjustPointsVal}
                  onChange={(e) => setAdjustPointsVal(e.target.value)}
                  placeholder="e.g. 50 or -20"
                  required
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Positive values award bonuses; negative values deduct points.
                </span>
              </div>

              <div>
                <label className="form-label">Mandatory Audit Reason</label>
                <textarea
                  className="input-portal"
                  rows="3"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Explain why this adjustment is being issued for compliance log…"
                  required
                />
              </div>

              {adjustMessage && (
                <div className={`alert-box ${adjustMessage.type}`}>
                  {adjustMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={adjustSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-portal-primary"
                  disabled={adjustSubmitting}
                >
                  {adjustSubmitting ? 'Recording Audit…' : 'Execute Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
