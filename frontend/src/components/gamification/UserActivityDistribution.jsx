import React, { useState, useEffect } from 'react';
import { fetchMyActivityDistribution, fetchUserActivityDistribution } from '../../services/gamificationApi';

export default function UserActivityDistribution({ userId = null, initialData = null }) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = userId
        ? await fetchUserActivityDistribution(userId)
        : await fetchMyActivityDistribution();
      if (res && res.success) {
        setData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load activity distribution.');
      }
    } catch (err) {
      setError(err.message || 'Error loading activity breakdown.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData || userId) {
      loadData();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>⌛</div>
        <div>Calculating activity distribution telemetry from PostgreSQL…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderRadius: '16px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <h4 style={{ color: '#f87171', margin: '0 0 0.5rem 0' }}>Could Not Load Activity Distribution</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>{error}</p>
        <button type="button" className="btn-portal-secondary" onClick={loadData}>
          🔄 Retry Telemetry
        </button>
      </div>
    );
  }

  const activities = data?.activities || [];
  const totalXP = data?.totalPositiveXP || data?.totalXP || 0;
  const totalActions = data?.totalActions || 0;

  if (activities.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '16px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
        <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-highlight)' }}>No Activity Distribution Data</h4>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          This creator has not completed verified social media submissions or received point adjustments yet.
        </p>
      </div>
    );
  }

  return (
    <div className="gamepoints-activity-distribution glass-panel" style={{ padding: '1.75rem', borderRadius: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎯</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
              Activity & XP Distribution Breakdown
            </h3>
            <span className="gamepoints-badge-live">PostgreSQL Aggregated</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Real distribution of awarded experience points across verified channels and actions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Actions</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-highlight)' }}>{totalActions.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sum Earned</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{totalXP.toLocaleString()} XP</div>
          </div>
        </div>
      </div>

      {/* Proportional Segmented Progress Bar */}
      <div
        style={{
          display: 'flex',
          height: '14px',
          borderRadius: '999px',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.05)',
          marginBottom: '1.75rem',
          padding: '2px',
          gap: '2px'
        }}
        title="Proportional XP Contribution Bar"
      >
        {activities.map((act) => {
          if (act.percentage <= 0) return null;
          return (
            <div
              key={`bar-${act.actionType}`}
              style={{
                width: `${Math.max(2, act.percentage)}%`,
                background: act.color || '#38bdf8',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }}
              title={`${act.name}: ${act.totalXP} XP (${act.percentage}%)`}
            />
          );
        })}
      </div>

      {/* Grid of Activity Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem'
        }}
      >
        {activities.map((act) => (
          <div
            key={act.actionType}
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: `1px solid rgba(255, 255, 255, 0.06)`,
              borderLeft: `4px solid ${act.color || '#38bdf8'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s, background 0.2s'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{act.icon}</span> {act.name}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.07)',
                    color: act.color || '#38bdf8'
                  }}
                >
                  {act.percentage}%
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.5rem 0' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: act.color || '#38bdf8' }}>
                  {act.totalXP.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>XP total</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span>{act.count.toLocaleString()} actions</span>
              <span>Avg {act.averageXP} XP/action</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
