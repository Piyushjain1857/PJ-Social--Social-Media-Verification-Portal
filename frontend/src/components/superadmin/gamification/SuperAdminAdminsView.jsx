import React, { useState } from 'react';

export default function SuperAdminAdminsView({
  admins = [],
  isLoading,
  onRefresh
}) {
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  if (isLoading) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
        <div>Loading Admin gamification activity &amp; oversight metrics...</div>
      </div>
    );
  }

  return (
    <div className="superadmin-admins-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.2rem' }}>
            🛡️ Administrative Moderator Activity &amp; Governance
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Super Admin oversight of moderation throughput, XP adjustments executed, and compliance audit trail
          </p>
        </div>
        <button
          type="button"
          className="btn-portal-secondary"
          onClick={onRefresh}
          style={{ fontSize: '0.82rem' }}
        >
          🔄 Refresh Activity
        </button>
      </div>

      {/* Grid of Admin Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {admins.map((adm) => (
          <div
            key={adm.id}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: selectedAdmin?.id === adm.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={() => setSelectedAdmin(adm)}
          >
            {/* Header: Admin Avatar, Name, Email, Role */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: adm.role === 'SUPER_ADMIN'
                      ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
                      : 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}
                >
                  {adm.name ? adm.name[0].toUpperCase() : 'A'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-highlight)', fontSize: '0.98rem' }}>
                    {adm.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {adm.email}
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  background: adm.role === 'SUPER_ADMIN' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: adm.role === 'SUPER_ADMIN' ? '#f472b6' : '#a5b4fc',
                  border: `1px solid ${adm.role === 'SUPER_ADMIN' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                }}
              >
                {adm.role}
              </span>
            </div>

            {/* Performance Stats KPI Pill Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.65rem',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.85rem',
                borderRadius: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Actions Performed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
                  {adm.actionsPerformed}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>XP Adjustments</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  {adm.xpAdjustmentsCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Users Modified</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a855f7' }}>
                  {adm.usersModifiedCount} creators
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Net Points Impact</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: adm.totalXPAwarded >= adm.totalXPDeducted ? '#10b981' : '#f87171' }}>
                  +{adm.totalXPAwarded} / -{adm.totalXPDeducted}
                </div>
              </div>
            </div>

            {/* Last Activity */}
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <strong>Last Activity:</strong> {adm.lastActivity}
            </div>

            <button
              type="button"
              className="btn-portal-secondary"
              style={{ fontSize: '0.78rem', marginTop: 'auto', width: '100%' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAdmin(adm);
              }}
            >
              🔍 Inspect Admin Audit Log ({adm.recentAuditLogs?.length || 0})
            </button>
          </div>
        ))}
      </div>

      {/* Admin Audit Details Modal / Drawer */}
      {selectedAdmin && (
        <div className="modal-backdrop" onClick={() => setSelectedAdmin(null)}>
          <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontSize: '1.2rem' }}>
                  🛡️ Admin Activity History: {selectedAdmin.name}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedAdmin.email} • {selectedAdmin.role}
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedAdmin(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Overview Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Actions</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-highlight)' }}>{selectedAdmin.actionsPerformed}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Adjustments</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>{selectedAdmin.xpAdjustmentsCount}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Awarded</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>+{selectedAdmin.totalXPAwarded}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Deducted</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>-{selectedAdmin.totalXPDeducted}</div>
              </div>
            </div>

            {/* Recent Audit Logs */}
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-highlight)', fontSize: '0.95rem' }}>
              Recent XP Adjustments &amp; System Actions
            </h4>

            {(!selectedAdmin.recentAuditLogs || selectedAdmin.recentAuditLogs.length === 0) ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No manual XP adjustments recorded for this administrator.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '300px', overflowY: 'auto' }}>
                {selectedAdmin.recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.85rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, color: '#38bdf8' }}>{log.action}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      {log.details}
                    </div>
                    {log.metadata?.reason && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Reason: "{log.metadata.reason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                type="button"
                className="btn-portal-secondary"
                onClick={() => setSelectedAdmin(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
