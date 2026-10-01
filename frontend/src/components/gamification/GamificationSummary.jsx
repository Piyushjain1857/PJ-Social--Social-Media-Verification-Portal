import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMyPoints,
  fetchMyRank,
  fetchAllPointTransactions,
  fetchAdminGamificationOverview,
  adjustUserPoints,
  fetchUsers
} from '../../services/api';
import PointsCard from './PointsCard';
import LevelBadge from './LevelBadge';
import LevelProgress from './LevelProgress';
import RankCard from './RankCard';
import Leaderboard from './Leaderboard';
import PointHistory from './PointHistory';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * GamificationSummary Component
 * Comprehensive Gamification Hub for the Social Media Activity Verification Portal.
 * 
 * Provides:
 * 1. User Gamification Dashboard (Total Points, Weekly/Monthly stats, Activity breakdown)
 * 2. Level System & Progress Indicator (Current level, Next level, Points remaining)
 * 3. My Rank Card & comparison
 * 4. Portal-Wide Leaderboard with All Time / Monthly / Weekly timeframes
 * 5. Detailed Point History with search & filters
 * 6. Super Admin Manual Point Adjustment with mandatory reason & audit ledger
 * 7. Future Rewards Foundation Preview
 */
export default function GamificationSummary({ onNavigateToNav = null }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

  // Active Tab: 'overview' | 'leaderboard' | 'history' | 'management'
  const [activeTab, setActiveTab] = useState('overview');

  // Creator summary & rank state
  const [summary, setSummary] = useState(null);
  const [rankData, setRankData] = useState(null);
  const [rankTimeframe, setRankTimeframe] = useState('all_time');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Super Admin Management State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState('');
  const [adjustPointsValue, setAdjustPointsValue] = useState(10);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustStatus, setAdjustStatus] = useState({ loading: false, error: null, success: null });
  const [creatorUsers, setCreatorUsers] = useState([]);

  // Super Admin Global Ledger State
  const [adminLedger, setAdminLedger] = useState([]);
  const [adminLedgerPagination, setAdminLedgerPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [adminLedgerFilter, setAdminLedgerFilter] = useState({ search: '', actionType: 'ALL', page: 1 });
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Admin Gamification Overview State (ADMIN & SUPER_ADMIN)
  const [adminOverviewUsers, setAdminOverviewUsers] = useState([]);
  const [adminOverviewPagination, setAdminOverviewPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [adminOverviewSearch, setAdminOverviewSearch] = useState('');
  const [isLoadingAdminOverview, setIsLoadingAdminOverview] = useState(false);

  // Fetch creator points and ranking
  const loadUserGamification = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ptsRes, rkRes] = await Promise.all([
        fetchMyPoints(),
        fetchMyRank(rankTimeframe)
      ]);

      if (ptsRes && ptsRes.success) {
        setSummary(ptsRes.data);
      }
      if (rkRes && rkRes.success) {
        setRankData(rkRes.data);
      }
    } catch (err) {
      setError(err.message || 'Error loading gamification profile.');
    } finally {
      setIsLoading(false);
    }
  }, [rankTimeframe]);

  useEffect(() => {
    loadUserGamification();
  }, [loadUserGamification]);

  // Load creators list for Super Admin adjustment dropdown
  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers({ role: 'USER', limit: 100 })
        .then(res => {
          if (res && res.success) {
            const list = Array.isArray(res.data) ? res.data : (res.data?.users || []);
            setCreatorUsers(list);
            if (list.length > 0 && !adjustTargetUser) {
              setAdjustTargetUser(list[0].id);
            }
          }
        })
        .catch(err => console.warn('Could not load creators list:', err.message));
    }
  }, [isSuperAdmin]);

  // Load Super Admin global transactions ledger
  const loadGlobalLedger = useCallback(async () => {
    if (!isSuperAdmin) return;
    setIsLoadingLedger(true);
    try {
      const res = await fetchAllPointTransactions({
        page: adminLedgerFilter.page,
        limit: 10,
        search: adminLedgerFilter.search.trim() || undefined,
        actionType: adminLedgerFilter.actionType !== 'ALL' ? adminLedgerFilter.actionType : undefined
      });
      if (res && res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.records || []);
        setAdminLedger(list);
        if (res.pagination) {
          setAdminLedgerPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Could not load global transactions ledger:', err.message);
    } finally {
      setIsLoadingLedger(false);
    }
  }, [isSuperAdmin, adminLedgerFilter]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'management') {
      loadGlobalLedger();
    }
  }, [isSuperAdmin, activeTab, loadGlobalLedger]);

  // Load Admin Creators Overview
  const loadAdminOverview = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingAdminOverview(true);
    try {
      const res = await fetchAdminGamificationOverview({
        page: adminOverviewPagination.page,
        limit: 15,
        search: adminOverviewSearch.trim() || undefined
      });
      if (res && res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.users || []);
        setAdminOverviewUsers(list);
        if (res.pagination) {
          setAdminOverviewPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Could not load admin gamification overview:', err.message);
    } finally {
      setIsLoadingAdminOverview(false);
    }
  }, [isAdmin, adminOverviewPagination.page, adminOverviewSearch]);

  useEffect(() => {
    if (isAdmin && activeTab === 'admin_overview') {
      loadAdminOverview();
    }
  }, [isAdmin, activeTab, loadAdminOverview]);

  // Handle Super Admin Manual Point Adjustment
  const handleExecuteAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustTargetUser) {
      setAdjustStatus({ loading: false, error: 'Please select a recipient user.', success: null });
      return;
    }
    const ptsNum = parseInt(adjustPointsValue, 10);
    if (isNaN(ptsNum) || ptsNum === 0) {
      setAdjustStatus({ loading: false, error: 'Adjustment points must be a non-zero integer.', success: null });
      return;
    }
    if (!adjustReason || !adjustReason.trim()) {
      setAdjustStatus({ loading: false, error: 'A mandatory reason is required for manual point adjustments.', success: null });
      return;
    }

    setAdjustStatus({ loading: true, error: null, success: null });
    try {
      const res = await adjustUserPoints({
        userId: adjustTargetUser,
        points: ptsNum,
        reason: adjustReason.trim()
      });

      if (res && res.success) {
        setAdjustStatus({
          loading: false,
          error: null,
          success: `Successfully adjusted points by ${ptsNum > 0 ? '+' : ''}${ptsNum}! New total: ${res.data?.newTotalPoints ?? '—'} pts.`
        });
        setAdjustReason('');
        loadGlobalLedger();
        loadUserGamification();
        setTimeout(() => {
          setShowAdjustModal(false);
          setAdjustStatus({ loading: false, error: null, success: null });
        }, 1500);
      } else {
        throw new Error(res?.message || 'Points adjustment failed.');
      }
    } catch (err) {
      setAdjustStatus({ loading: false, error: err.message || 'Error executing points adjustment.', success: null });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* ─── Hero Gamification Banner ──────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(20, 26, 44, 0.85) 0%, rgba(10, 14, 22, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Glow Accent */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(99, 102, 241, 0.25))',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)'
              }}
            >
              🏆
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-highlight)' }}>
                  Portal Gamification & Ranking
                </h1>
                {summary?.level && <LevelBadge level={summary.level} size="md" />}
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Earn verified portal points: <strong>Like (+1 pt)</strong>, <strong>Comment (+2 pts)</strong>, <strong>Story (+2 pts)</strong> upon admin approval.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {isSuperAdmin && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowAdjustModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  border: 'none',
                  fontSize: '0.82rem',
                  padding: '0.5rem 1rem'
                }}
              >
                ⚖️ Adjust Points
              </button>
            )}

            {onNavigateToNav && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onNavigateToNav('submit-activity')}
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              >
                ➕ Submit Activity Proof
              </button>
            )}
          </div>
        </div>

        {/* Level Progression Bar in Hero */}
        {summary?.level && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <LevelProgress level={summary.level} />
          </div>
        )}
      </div>

      {/* ─── Navigation Tabs ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'overview' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'overview' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>📊</span> Overview
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'leaderboard' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'leaderboard' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🥇</span> Leaderboard
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'history' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>📜</span> Point History
        </button>

        {isAdmin && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'admin_overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin_overview')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'admin_overview' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'admin_overview' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>🛡️</span> Creator Directory Overview
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'management' ? 'active' : ''}`}
            onClick={() => setActiveTab('management')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'management' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'management' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>⚖️</span> Super Admin Ledger & Adjustments
          </button>
        )}
      </div>

      {/* ─── TAB 1: OVERVIEW ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Row: PointsCard + RankCard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
            <PointsCard
              summary={summary}
              isLoading={isLoading}
              onViewHistory={() => setActiveTab('history')}
            />

            <RankCard
              rankData={rankData}
              isLoading={isLoading}
              timeframe={rankTimeframe}
              onTimeframeChange={setRankTimeframe}
              onOpenLeaderboard={() => setActiveTab('leaderboard')}
            />
          </div>

          {/* Activity Feeds: Recent Point Awards & Latest Approved Activities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Recent Point Activity */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
                  ⚡ Recent Point Activity
                </h4>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setActiveTab('history')}
                  style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem' }}
                >
                  View All →
                </button>
              </div>

              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '6px' }} />
                  ))}
                </div>
              ) : (summary?.recentTransactions || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No recent point activity yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {summary.recentTransactions.slice(0, 5).map(tx => (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-highlight)' }}>
                          {tx.actionType}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {formatDate(tx.createdAt)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.95rem',
                          color: tx.points >= 0 ? '#34d399' : '#f43f5e'
                        }}
                      >
                        {tx.points >= 0 ? `+${tx.points}` : tx.points} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Latest Approved Activities */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
                  ✅ Latest Approved Proofs
                </h4>
                {onNavigateToNav && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onNavigateToNav('my-submissions')}
                    style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem' }}
                  >
                    All Submissions →
                  </button>
                )}
              </div>

              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '6px' }} />
                  ))}
                </div>
              ) : (summary?.latestApprovedActivities || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No approved activities recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {summary.latestApprovedActivities.slice(0, 5).map(sub => (
                    <div
                      key={sub.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-highlight)' }}>
                          {sub.platform} {sub.actionType}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Verified {formatDate(sub.updatedAt || sub.createdAt)}
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                        APPROVED ✓
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Future Rewards System Foundation Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.35rem',
              borderLeft: '4px solid #a855f7',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.06) 0%, rgba(13, 17, 26, 0.7) 100%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎖️</span>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                Rewards & Benefits Foundation
              </h4>
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>COMING SOON</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your verified portal points form the foundation for upcoming institutional perks:
              exclusive college merchandise, campus event VIP access, ambassador certificates, and digital badges.
              Keep verifying your genuine engagement!
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB 2: LEADERBOARD ───────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <Leaderboard />
      )}

      {/* ─── TAB 3: POINT HISTORY ─────────────────────────────────────── */}
      {activeTab === 'history' && (
        <PointHistory />
      )}

      {/* ─── TAB 4: ADMIN CREATOR GAMIFICATION OVERVIEW ──────────────── */}
      {activeTab === 'admin_overview' && isAdmin && (
        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                  🛡️ Creator Gamification Directory
                </h3>
                <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                  READ-ONLY AUDIT
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Inspect student community points, levels, and verified activity totals. Administrative point modifications are restricted to Super Administrators.
              </p>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Total Creators: <strong>{adminOverviewPagination.totalCount || adminOverviewUsers.length}</strong>
            </div>
          </div>

          {/* Search bar */}
          <div className="history-filters-bar">
            <input
              type="text"
              className="history-search-input"
              placeholder="Search creator by name or email..."
              value={adminOverviewSearch}
              onChange={(e) => setAdminOverviewSearch(e.target.value)}
            />
          </div>

          {/* Creator Table */}
          {isLoadingAdminOverview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '8px' }} />
              ))}
            </div>
          ) : adminOverviewUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No creators found matching criteria.
            </div>
          ) : (
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Level</th>
                    <th style={{ textAlign: 'center' }}>Approved Submissions</th>
                    <th style={{ textAlign: 'right' }}>Total Points</th>
                    <th>Recent Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOverviewUsers.map((creator) => {
                    const recentAct = creator.recentApprovedSubmissions?.[0] || creator.recentTransactions?.[0];
                    return (
                      <tr key={creator.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.82rem',
                                fontWeight: 700
                              }}
                            >
                              {creator.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>
                                {creator.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {creator.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <LevelBadge level={creator.level} size="sm" />
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-highlight)' }}>
                          {creator.approvedSubmissionsCount ?? '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#facc15', fontSize: '1rem' }}>
                          ⭐ {(creator.totalPoints ?? 0).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {recentAct ? (
                            <span>
                              {recentAct.platform ? `${recentAct.platform} ${recentAct.actionType}` : recentAct.description || 'Active'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: SUPER ADMIN LEDGER & ADJUSTMENTS ─────────────────── */}
      {activeTab === 'management' && isSuperAdmin && (
        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                ⚖️ Global Point Transactions Audit Ledger
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Complete immutable record of all point rewards, deductions, and manual administrative adjustments
              </p>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowAdjustModal(true)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              ⚖️ Manual Adjustment
            </button>
          </div>

          {/* Filter Toolbar for Admin Ledger */}
          <div className="history-filters-bar">
            <input
              type="text"
              className="history-search-input"
              placeholder="Search user or reason..."
              value={adminLedgerFilter.search}
              onChange={(e) => setAdminLedgerFilter(f => ({ ...f, search: e.target.value, page: 1 }))}
            />

            <select
              className="history-select"
              value={adminLedgerFilter.actionType}
              onChange={(e) => setAdminLedgerFilter(f => ({ ...f, actionType: e.target.value, page: 1 }))}
            >
              <option value="ALL">All Action Types</option>
              <option value="LIKE">LIKE (+1)</option>
              <option value="COMMENT">COMMENT (+2)</option>
              <option value="STORY">STORY (+2)</option>
              <option value="ADJUSTMENT">ADJUSTMENT (Manual)</option>
              <option value="BONUS">BONUS</option>
            </select>
          </div>

          {/* Ledger Table */}
          {isLoadingLedger ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '6px' }} />
              ))}
            </div>
          ) : adminLedger.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No transactions match the filter.
            </div>
          ) : (
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User ID</th>
                    <th>Action</th>
                    <th>Description / Reason</th>
                    <th style={{ textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLedger.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.createdAt)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {tx.userId?.slice(0, 8)}...
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {tx.actionType}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {tx.description}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: tx.points >= 0 ? '#34d399' : '#f43f5e' }}>
                        {tx.points >= 0 ? `+${tx.points}` : tx.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Super Admin Manual Points Adjustment Modal ─────────────── */}
      {showAdjustModal && isSuperAdmin && (
        <div className="points-adjust-modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="points-adjust-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚖️</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                  Manual Points Adjustment
                </h3>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowAdjustModal(false)}
                style={{ fontSize: '1.1rem', padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {adjustStatus.error && (
                <div style={{ padding: '0.65rem 0.85rem', background: 'var(--status-error-bg)', border: '1px solid var(--status-error)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.8rem' }}>
                  ⚠️ {adjustStatus.error}
                </div>
              )}
              {adjustStatus.success && (
                <div style={{ padding: '0.65rem 0.85rem', background: 'var(--status-success-bg)', border: '1px solid var(--status-success)', borderRadius: 'var(--radius-sm)', color: '#86efac', fontSize: '0.8rem' }}>
                  ✓ {adjustStatus.success}
                </div>
              )}

              {/* Recipient User */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Recipient User *
                </label>
                <select
                  value={adjustTargetUser}
                  onChange={e => setAdjustTargetUser(e.target.value)}
                  className="history-select"
                  style={{ width: '100%' }}
                  required
                >
                  {creatorUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — Current: {u.totalPoints ?? 0} pts
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Points */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Point Adjustment (+ for bonus, - for deduction) *
                </label>
                <input
                  type="number"
                  value={adjustPointsValue}
                  onChange={e => setAdjustPointsValue(e.target.value)}
                  className="history-search-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 50 or -20"
                  step="1"
                  required
                />
              </div>

              {/* Mandatory Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Mandatory Audit Reason *
                </label>
                <textarea
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="history-search-input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  placeholder="e.g. Event participation bonus / Invalid claim correction"
                  required
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  This reason is recorded in the transaction ledger and sent to the user.
                </span>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={adjustStatus.loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={adjustStatus.loading}
                >
                  {adjustStatus.loading ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
