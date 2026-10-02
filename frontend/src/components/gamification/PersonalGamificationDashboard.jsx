import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchMyGamification, fetchMyRank } from '../../services/gamificationApi';
import { gamificationRealtimeClient } from '../../services/gamificationRealtimeClient';
import UserXPChart from './UserXPChart';
import PositionTimeline from './PositionTimeline';
import DynamicLevelTimeline from './DynamicLevelTimeline';
import XPHistoryLedger from './XPHistoryLedger';
import Leaderboard from './Leaderboard';
import LevelUpModal from './LevelUpModal';

export default function PersonalGamificationDashboard({ onNavigateToNav = null }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [rankData, setRankData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'leaderboard'
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);
  const [realtimeNotification, setRealtimeNotification] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);

  // If user is Admin or Super Admin, they manage points rather than participating as players
  const isManager = user?.role && user.role !== 'USER';

  const loadData = useCallback(async () => {
    if (isManager) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, rankRes] = await Promise.all([
        fetchMyGamification(),
        fetchMyRank()
      ]);

      if (profileRes && profileRes.success) {
        setProfile(profileRes.data);
      }
      if (rankRes && rankRes.success) {
        setRankData(rankRes.data);
      }
    } catch (err) {
      setError(err.message || 'Error loading gamification profile.');
    } finally {
      setIsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time listener: updates Total XP, Level, Progress, Rank, and History Ledger live
  useEffect(() => {
    if (isManager || !user?.id) return;

    const unsubscribe = gamificationRealtimeClient.subscribe((event, data) => {
      if (event === 'xp_updated' && data.userId === user.id) {
        setProfile((prev) => ({
          ...(prev || {}),
          totalXP: data.totalXP,
          currentLevel: data.currentLevel ?? prev?.currentLevel,
          levelName: data.levelName ?? prev?.levelName,
          icon: data.icon ?? prev?.icon,
          progressPercentage: data.progressPercentage ?? prev?.progressPercentage,
          xpRemaining: data.xpRemaining ?? prev?.xpRemaining,
          rank: data.rank ?? prev?.rank
        }));

        // Fetch fresh rank standing asynchronously
        fetchMyRank().then((res) => {
          if (res?.success && res.data) {
            setRankData(res.data);
          }
        }).catch(() => {});

        // Refresh child widgets (charts, timeline, ledger)
        setRealtimeRefreshKey((k) => k + 1);

        // Show live badge notice
        const delta = data.deltaXP ? (data.deltaXP > 0 ? `+${data.deltaXP} XP` : `${data.deltaXP} XP`) : 'XP Updated';
        setRealtimeNotification(`⚡ Real-time: ${delta} (${data.reason || 'Activity verified'})`);
        setTimeout(() => setRealtimeNotification(null), 5000);
      }

      if (event === 'level_up' && data.userId === user.id) {
        setLevelUpData({
          currentLevel: data.currentLevel,
          levelName: data.levelName,
          icon: data.icon || '🏆',
          totalXP: data.totalXP,
          nextLevel: data.nextLevel,
          nextLevelName: data.nextLevelName
        });
      }

      if (event === 'leaderboard_updated') {
        fetchMyRank().then((res) => {
          if (res?.success && res.data) {
            setRankData(res.data);
          }
        }).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [isManager, user?.id]);


  if (isManager) {
    return (
      <div className="layout-content-area" style={{ maxWidth: '820px', margin: '2rem auto' }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ color: 'var(--text-highlight)', margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '1.6rem' }}>
            Administrative Governance Account
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 1.75rem auto', lineHeight: 1.6, fontSize: '0.95rem' }}>
            As a <strong>{user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'}</strong>, your role is to configure, audit, and manage game points and level progression for creators. Administrative accounts manage the ecosystem and do not hold personal player points or compete on the leaderboard.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onNavigateToNav && (
              <>
                <button
                  type="button"
                  className="btn-portal-primary"
                  onClick={() => onNavigateToNav('game-points')}
                >
                  🎮 Open Game Points Manager
                </button>
                <button
                  type="button"
                  className="btn-portal-secondary"
                  onClick={() => onNavigateToNav('dashboard')}
                >
                  📊 Go to Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="gamepoints-dashboard-container">
        <div className="gamepoints-dashboard-banner glass-panel">
          <div className="skeleton" style={{ height: '36px', width: '280px', borderRadius: '6px', marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ height: '18px', width: '420px', borderRadius: '4px' }} />
        </div>
        <div className="gamepoints-kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gamepoints-dashboard-container">
        <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--status-error)' }}>
          <h3 style={{ margin: 0, color: 'var(--status-error)' }}>⚠️ Unable to Load Game Points</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1rem 0' }}>{error}</p>
          <button type="button" className="btn-portal-primary" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalXP = 0,
    currentLevel = 1,
    levelName = 'Novice',
    icon = '🌱',
    xpIntoCurrentLevel = 0,
    xpRemaining = 250,
    nextLevel = 2,
    nextLevelName = null,
    progressPercentage = 0,
    isMaxLevel = false,
    recentXP = 0
  } = profile || {};

  const currentRank = rankData?.rank ?? profile?.rank ?? 1;
  const totalParticipants = rankData?.totalParticipants ?? profile?.totalParticipants ?? 1;
  const percentileAhead = rankData?.percentileAhead ?? profile?.percentileAhead ?? 100;
  const pointsToNextRank = rankData?.pointsToNextRank ?? profile?.pointsToNextRank ?? 0;

  return (
    <div className="gamepoints-dashboard-container">
      {/* ====================================================================
          1. Header Banner
          ==================================================================== */}
      <div className="gamepoints-dashboard-banner glass-panel">
        <div className="gamepoints-banner-content">
          <div className="gamepoints-banner-badge">
            <span className="gamepoints-banner-dot" />
            <span>Personal Gamification Command Center</span>
          </div>
          <h1 className="gamepoints-banner-title">
            <span className="gamepoints-banner-icon">🎮</span> GAME POINTS
          </h1>
          <p className="gamepoints-banner-description">
            Your authoritative level progression, real-time leaderboard standing, and verified activity history.
          </p>
        </div>

        {/* Action Controls */}
        <div className="gamepoints-banner-actions">
          <div className="gamepoints-subnav-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              className={`gamepoints-subnav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span>📊</span> Personal Dashboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'leaderboard'}
              className={`gamepoints-subnav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <span>🏆</span> Community Leaderboard
            </button>
          </div>

          {onNavigateToNav && (
            <button
              type="button"
              className="btn-portal-primary"
              onClick={() => onNavigateToNav('submit-activity')}
            >
              <span>➕</span> Submit Activity (+XP)
            </button>
          )}
        </div>
      </div>

      {/* Real-time live activity pill */}
      {realtimeNotification && (
        <div
          style={{
            margin: '1rem 0',
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.15), rgba(168, 85, 247, 0.15))',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '10px',
            color: '#38bdf8',
            fontWeight: 600,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <span>{realtimeNotification}</span>
        </div>
      )}

      {activeTab === 'leaderboard' ? (
        <div style={{ marginTop: '1.5rem' }}>
          <Leaderboard />
        </div>
      ) : (

        <>
          {/* ====================================================================
              2. Key Metrics & Personal KPI Cards Grid (Matches Requirements 2 & Example)
              ==================================================================== */}
          <div className="gamepoints-kpi-grid">
            {/* 🏆 CURRENT LEVEL CARD */}
            <div className="gamepoints-kpi-card level-card glass-panel">
              <div className="gamepoints-kpi-header">
                <div className="gamepoints-kpi-title-wrap">
                  <span className="gamepoints-kpi-icon">🏆</span>
                  <span className="gamepoints-kpi-title">Current Level</span>
                </div>
                <span className="gamepoints-level-badge-pill">Tier {currentLevel}</span>
              </div>

              <div className="gamepoints-level-display">
                <div className="gamepoints-level-big-icon">{icon}</div>
                <div className="gamepoints-level-text-group">
                  <div className="gamepoints-level-number-tag">LEVEL {currentLevel}</div>
                  <div className="gamepoints-level-title">{levelName}</div>
                  <div className="gamepoints-level-xp-value">
                    {totalXP.toLocaleString()} <span className="xp-unit">XP</span>
                  </div>
                </div>
              </div>

              {/* Progress bar into next level */}
              <div className="gamepoints-progress-section">
                <div className="gamepoints-progress-bar-bg">
                  <div
                    className="gamepoints-progress-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                  />
                </div>
                <div className="gamepoints-progress-labels">
                  <span className="progress-remaining-text">
                    {isMaxLevel
                      ? 'Maximum Level Attained! 👑'
                      : `${xpRemaining.toLocaleString()} XP to Level ${nextLevel || currentLevel + 1}`}
                  </span>
                  <span className="progress-percent-text">{progressPercentage}%</span>
                </div>
              </div>
            </div>

            {/* 🥇 YOUR POSITION / RANK CARD */}
            <div className="gamepoints-kpi-card position-card glass-panel">
              <div className="gamepoints-kpi-header">
                <div className="gamepoints-kpi-title-wrap">
                  <span className="gamepoints-kpi-icon">🥇</span>
                  <span className="gamepoints-kpi-title">Your Position</span>
                </div>
                <span className="gamepoints-rank-standing-pill">
                  {currentRank === 1 ? '👑 Top Creator' : `#${currentRank} Ranked`}
                </span>
              </div>

              <div className="gamepoints-position-display">
                <div className="gamepoints-rank-big-number">#{currentRank}</div>
                <div className="gamepoints-rank-of-total">
                  out of <strong>{totalParticipants.toLocaleString()}</strong> users
                </div>
              </div>

              <div className="gamepoints-percentile-box">
                <div className="gamepoints-percentile-label">You are currently ahead of:</div>
                <div className="gamepoints-percentile-stat">
                  <span className="percentile-number">{percentileAhead}%</span>
                  <span className="percentile-caption">of participants</span>
                </div>
                {pointsToNextRank > 0 && currentRank > 1 && (
                  <div className="gamepoints-next-rank-hint">
                    ⚡ {pointsToNextRank} XP needed to reach #{currentRank - 1}
                  </div>
                )}
              </div>
            </div>

            {/* ⭐ TOTAL XP & STATS CARD */}
            <div className="gamepoints-kpi-card stats-card glass-panel">
              <div className="gamepoints-kpi-header">
                <div className="gamepoints-kpi-title-wrap">
                  <span className="gamepoints-kpi-icon">⭐</span>
                  <span className="gamepoints-kpi-title">Total Verified XP</span>
                </div>
                <span className="gamepoints-status-pill verified">Audited</span>
              </div>

              <div className="gamepoints-stat-big-val">
                {totalXP.toLocaleString()}
                <span className="stat-unit">XP</span>
              </div>
              <p className="gamepoints-stat-sub">Strictly synchronized with verified social submissions ledger</p>

              <div className="gamepoints-stat-breakdown-row">
                <div className="stat-sub-item">
                  <span className="stat-sub-label">Verified Points</span>
                  <span className="stat-sub-val">{totalXP.toLocaleString()} Pts</span>
                </div>
                <div className="stat-sub-item">
                  <span className="stat-sub-label">Rank Status</span>
                  <span className="stat-sub-val highlight">
                    Top {Math.max(1, 100 - percentileAhead)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 🔥 RECENT XP & COMMUNITY CARD */}
            <div className="gamepoints-kpi-card activity-card glass-panel">
              <div className="gamepoints-kpi-header">
                <div className="gamepoints-kpi-title-wrap">
                  <span className="gamepoints-kpi-icon">🔥</span>
                  <span className="gamepoints-kpi-title">Recent XP (30 Days)</span>
                </div>
                <span className="gamepoints-status-pill recent">Active</span>
              </div>

              <div className="gamepoints-stat-big-val gain">
                +{recentXP.toLocaleString()}
                <span className="stat-unit">XP</span>
              </div>
              <p className="gamepoints-stat-sub">Earned from newly approved Instagram, LinkedIn, &amp; Facebook activities</p>

              <div className="gamepoints-stat-breakdown-row">
                <div className="stat-sub-item">
                  <span className="stat-sub-label">Participants</span>
                  <span className="stat-sub-val">{totalParticipants} users</span>
                </div>
                <div className="stat-sub-item">
                  <span className="stat-sub-label">Platform Engine</span>
                  <span className="stat-sub-val">Dynamic 50+</span>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================================
              3. USER XP GRAPH (Requirement 3: 7D, 30D, 3M, 6M, All Time)
              ==================================================================== */}
          <div style={{ marginTop: '2rem' }}>
            <UserXPChart key={`chart-${realtimeRefreshKey}`} />
          </div>

          {/* ====================================================================
              4. POSITION / RANK TIMELINE (Requirement 4: My Position Over Time)
              ==================================================================== */}
          <div style={{ marginTop: '2rem' }}>
            <PositionTimeline key={`pos-${realtimeRefreshKey}`} />
          </div>

          {/* ====================================================================
              5. LEVEL TIMELINE (Requirement 6: Dynamic Level Journey from DB)
              ==================================================================== */}
          <div style={{ marginTop: '2rem' }}>
            <DynamicLevelTimeline key={`level-${realtimeRefreshKey}`} />
          </div>

          {/* ====================================================================
              6. XP HISTORY (Requirement 5: Itemized Ledger with Pagination)
              ==================================================================== */}
          <div style={{ marginTop: '2rem' }}>
            <XPHistoryLedger key={`ledger-${realtimeRefreshKey}`} />
          </div>
        </>
      )}

      {/* Real-time Level Up Celebration Modal */}
      {levelUpData && (
        <LevelUpModal
          levelData={levelUpData}
          onClose={() => setLevelUpData(null)}
        />
      )}
    </div>
  );
}

