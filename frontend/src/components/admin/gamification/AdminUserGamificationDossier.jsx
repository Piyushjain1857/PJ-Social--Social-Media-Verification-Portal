import React, { useState, useEffect } from 'react';
import { fetchAdminGamificationUserDetails } from '../../../services/adminGamificationApi';
import UserXPChart from '../../gamification/UserXPChart';
import PositionTimeline from '../../gamification/PositionTimeline';
import DynamicLevelTimeline from '../../gamification/DynamicLevelTimeline';
import XPHistoryLedger from '../../gamification/XPHistoryLedger';
import UserActivityDistribution from '../../gamification/UserActivityDistribution';

export default function AdminUserGamificationDossier({
  userId,
  onBack,
  onAdjustXP
}) {
  const [dossier, setDossier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDossierTab, setActiveDossierTab] = useState('overview'); // 'overview' | 'activity' | 'levels' | 'rank' | 'history'

  const loadDossier = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminGamificationUserDetails(userId);
      if (res && res.success) {
        setDossier(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load user gamification dossier.');
      }
    } catch (err) {
      setError(err.message || 'Error loading creator dossier.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadDossier();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
        <div>Loading creator gamification dossier...</div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <h3 style={{ color: '#f87171', margin: '0 0 0.5rem 0' }}>Could Not Load Dossier</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{error}</p>
        <button type="button" className="btn-portal-secondary" onClick={onBack}>
          ← Back to Users Directory
        </button>
      </div>
    );
  }

  const { user, profile } = dossier;
  const progressPct = Math.min(100, Math.max(0, profile?.progressPercentage || 0));

  return (
    <div className="admin-user-gamification-dossier" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div
        className="admin-dash-panel"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn-portal-secondary"
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
          >
            ← Back to Users
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-highlight)', letterSpacing: '-0.01em' }}>
                {user.name}
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  background: user.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${user.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  color: user.status === 'ACTIVE' ? '#34d399' : '#f87171',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}
              >
                ● {user.status}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {user.email} · <span style={{ fontFamily: 'var(--font-mono, monospace)', opacity: 0.85 }}>ID: {user.id}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAdjustXP(user)}
          className="btn-portal-primary"
          style={{ fontSize: '0.85rem' }}
        >
          ✏️ Adjust User XP
        </button>
      </div>

      {/* Hero Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Level Hero Card */}
        <div
          className="admin-dash-panel"
          style={{
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.06) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.12)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  CURRENT PROGRESSION
                </span>
                <h3 style={{ margin: '0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-highlight)', letterSpacing: '-0.02em' }}>
                  LEVEL {profile.currentLevel}
                </h3>
                <div style={{ fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 600 }}>
                  {profile.icon || '🌱'} {profile.levelName}
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 2px 8px rgba(250, 204, 21, 0.3))' }}>
                🏆
              </div>
            </div>

            <div style={{ margin: '1.25rem 0 0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.88rem', marginBottom: '0.45rem' }}>
                <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.35rem', fontFamily: 'var(--font-mono, monospace)' }}>
                  {(profile.totalXP || 0).toLocaleString()} XP
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
                  {progressPct}% to Level {profile.nextLevel || (profile.currentLevel + 1)}
                </span>
              </div>
              <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #38bdf8, #818cf8, #a855f7)',
                    borderRadius: '6px',
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {profile.isMaxLevel ? (
              <span style={{ color: '#facc15', fontWeight: 700 }}>★ Maximum Apex Tier Reached</span>
            ) : (
              <span><strong style={{ color: '#e2e8f0' }}>{profile.xpRemaining} XP</strong> to Level {profile.nextLevel || (profile.currentLevel + 1)}</span>
            )}
          </div>
        </div>

        {/* Position & Rank Card */}
        <div
          className="admin-dash-panel"
          style={{
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(234, 179, 8, 0.1)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#fde047', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  LEADERBOARD STANDING
                </span>
                <h3 style={{ margin: '0.25rem 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-highlight)', letterSpacing: '-0.02em' }}>
                  CREATOR POSITION
                </h3>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                  Platform-wide ranking
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 2px 8px rgba(250, 204, 21, 0.4))' }}>
                🥇
              </div>
            </div>

            <div style={{ margin: '1rem 0' }}>
              <div style={{ fontSize: '2.75rem', fontWeight: 800, color: '#facc15', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)', textShadow: '0 0 20px rgba(250, 204, 21, 0.3)' }}>
                #{profile.rank || '—'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.45rem' }}>
                out of <strong>{profile.totalParticipants || 0}</strong> participants
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.95rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.85rem'
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Ahead of: </span>
            <strong style={{ color: '#4ade80' }}>
              {profile.percentileAhead != null ? `${profile.percentileAhead}%` : '100%'}
            </strong>
            <span style={{ color: 'var(--text-muted)' }}> of participants</span>
          </div>
        </div>
      </div>

      {/* Dossier Section Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.45rem',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '0.4rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveDossierTab('overview')}
          className={`gamepoints-subnav-btn ${activeDossierTab === 'overview' ? 'active' : ''}`}
        >
          <span>📈</span> XP Progression Graph
        </button>
        <button
          type="button"
          onClick={() => setActiveDossierTab('activity')}
          className={`gamepoints-subnav-btn ${activeDossierTab === 'activity' ? 'active' : ''}`}
        >
          <span>🎯</span> Activity Distribution
        </button>
        <button
          type="button"
          onClick={() => setActiveDossierTab('levels')}
          className={`gamepoints-subnav-btn ${activeDossierTab === 'levels' ? 'active' : ''}`}
        >
          <span>⚡</span> Level Progression
        </button>
        <button
          type="button"
          onClick={() => setActiveDossierTab('rank')}
          className={`gamepoints-subnav-btn ${activeDossierTab === 'rank' ? 'active' : ''}`}
        >
          <span>📊</span> Rank Timeline
        </button>
        <button
          type="button"
          onClick={() => setActiveDossierTab('history')}
          className={`gamepoints-subnav-btn ${activeDossierTab === 'history' ? 'active' : ''}`}
        >
          <span>📜</span> XP Activity History
        </button>
      </div>

      {/* Tab 1: XP Progression Graph */}
      {activeDossierTab === 'overview' && (
        <UserXPChart userId={user.id} />
      )}

      {/* Tab 2: Activity Distribution Breakdown */}
      {activeDossierTab === 'activity' && (
        <UserActivityDistribution userId={user.id} initialData={dossier?.activitySummary} />
      )}

      {/* Tab 3: Level Progression */}
      {activeDossierTab === 'levels' && (
        <DynamicLevelTimeline userXP={profile.totalXP} currentLevel={profile.currentLevel} />
      )}

      {/* Tab 4: Position Timeline */}
      {activeDossierTab === 'rank' && (
        <PositionTimeline userId={user.id} />
      )}

      {/* Tab 5: XP Activity History */}
      {activeDossierTab === 'history' && (
        <XPHistoryLedger targetUserId={user.id} />
      )}
    </div>
  );
}
