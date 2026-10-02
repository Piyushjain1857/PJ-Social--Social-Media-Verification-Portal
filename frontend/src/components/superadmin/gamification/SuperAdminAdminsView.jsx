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
          className="btn-refresh-pill"
          onClick={onRefresh}
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

      {/* Grid of Admin Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {admins.map((adm) => {
          const isSuperAdmin = adm.role === 'SUPER_ADMIN';

          return (
            <div
              key={adm.id}
              className={`superadmin-admin-card ${isSuperAdmin ? 'superadmin' : 'admin'}`}
              style={{
                borderColor: selectedAdmin?.id === adm.id ? '#38bdf8' : undefined,
                cursor: 'pointer'
              }}
              onClick={() => setSelectedAdmin(adm)}
            >
              {/* Header: Admin Avatar, Name, Email, Role */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: isSuperAdmin
                        ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
                        : 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      boxShadow: isSuperAdmin
                        ? '0 0 14px rgba(236, 72, 153, 0.35)'
                        : '0 0 14px rgba(99, 102, 241, 0.35)'
                    }}
                  >
                    {adm.name ? adm.name[0].toUpperCase() : 'A'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-highlight)', fontSize: '1rem' }}>
                      {adm.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {adm.email}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    padding: '0.22rem 0.65rem',
                    borderRadius: '9999px',
                    background: isSuperAdmin ? 'rgba(236, 72, 153, 0.18)' : 'rgba(99, 102, 241, 0.18)',
                    color: isSuperAdmin ? '#f472b6' : '#a5b4fc',
                    border: `1px solid ${isSuperAdmin ? 'rgba(236, 72, 153, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`
                  }}
                >
                  {adm.role}
                </span>
              </div>

              {/* Performance Stats KPI Grid (4 micro-stat chips) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.65rem'
                }}
              >
                <div className="superadmin-admin-stat-chip">
                  <span className="superadmin-admin-stat-label">Actions Performed</span>
                  <span className="superadmin-admin-stat-val" style={{ color: 'var(--text-highlight)' }}>
                    {adm.actionsPerformed}
                  </span>
                </div>

                <div className="superadmin-admin-stat-chip">
                  <span className="superadmin-admin-stat-label">XP Adjustments</span>
                  <span className="superadmin-admin-stat-val" style={{ color: '#38bdf8' }}>
                    {adm.xpAdjustmentsCount}
                  </span>
                </div>

                <div className="superadmin-admin-stat-chip">
                  <span className="superadmin-admin-stat-label">Users Modified</span>
                  <span className="superadmin-admin-stat-val" style={{ color: '#a855f7' }}>
                    {adm.usersModifiedCount} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>creators</span>
                  </span>
                </div>

                <div className="superadmin-admin-stat-chip">
                  <span className="superadmin-admin-stat-label">Net Points Impact</span>
                  <span className="superadmin-admin-stat-val" style={{ color: adm.totalXPAwarded >= adm.totalXPDeducted ? '#10b981' : '#f87171' }}>
                    +{adm.totalXPAwarded} / -{adm.totalXPDeducted}
                  </span>
                </div>
              </div>

              {/* Last Activity */}
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Last Activity:</span>{' '}
                <span style={{ color: 'var(--text-highlight)' }}>{adm.lastActivity || 'No recent activity'}</span>
              </div>

              {/* Bottom Inspection Action Button */}
              <button
                type="button"
                className="superadmin-btn-adjust"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.6rem 1rem',
                  marginTop: 'auto',
                  width: '100%',
                  justifyContent: 'center',
                  background: isSuperAdmin
                    ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.25) 100%)'
                    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(56, 189, 248, 0.25) 100%)',
                  borderColor: isSuperAdmin ? 'rgba(236, 72, 153, 0.4)' : 'rgba(99, 102, 241, 0.4)',
                  color: isSuperAdmin ? '#f472b6' : '#a5b4fc'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAdmin(adm);
                }}
              >
                <span>🔍</span> Inspect Admin Audit Log ({adm.recentAuditLogs?.length || 0}) →
              </button>
            </div>
          );
        })}
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
