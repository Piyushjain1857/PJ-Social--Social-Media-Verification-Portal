import React, { useState, useEffect } from 'react';
import { fetchSuperAdminAuditLogs } from '../../../services/superAdminGamificationApi';

export default function SuperAdminAuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalLogs: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  const loadLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchSuperAdminAuditLogs({
        page,
        limit: 15,
        action: actionFilter,
        actor: actorFilter
      });
      if (res && res.success) {
        setLogs(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Could not load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [actionFilter, actorFilter]);

  return (
    <div className="superadmin-audit-logs-view">
      {/* Header and Filter Controls */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              placeholder="Filter by Actor name or email…"
              className="input-portal"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.84rem' }}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="input-portal"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.84rem' }}
            >
              <option value="">All Gamification Actions</option>
              <option value="GAMIFICATION_RULE_UPDATE">Rule Updates (LIKE, COMMENT, STORY)</option>
              <option value="SUPER_ADMIN_XP_ADJUSTMENT">Super Admin XP Adjustments</option>
              <option value="XP_ADJUSTMENT">Admin XP Adjustments</option>
              <option value="LEVEL_CREATE">Level Creation</option>
              <option value="LEVEL_UPDATE">Level Modification</option>
              <option value="LEVEL_DELETE">Level Deletion</option>
              <option value="LEVELS_GENERATE">Levels Bulk Generation</option>
            </select>
          </div>

          {(actionFilter || actorFilter) && (
            <button
              type="button"
              onClick={() => { setActionFilter(''); setActorFilter(''); }}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clear
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing <strong>{logs.length}</strong> of <strong>{pagination.totalLogs || 0}</strong> compliance audit records
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
            <div>Loading system compliance audit trail...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit logs found matching filter criteria.
          </div>
        ) : (
          <>
            <div className="table-responsive admin-desktop-points-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Actor</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Entity</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>Audit Details</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reason / Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const meta = log.metadata || {};
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }} className="table-row-hover">
                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
                          {log.actor}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: log.action.includes('SUPER') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: log.action.includes('SUPER') ? '#f59e0b' : '#a5b4fc',
                              border: `1px solid ${log.action.includes('SUPER') ? 'rgba(245, 158, 11, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {log.entity} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: '320px' }}>
                          {log.details}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem' }}>
                          {meta.reason && (
                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              "{meta.reason}"
                            </div>
                          )}
                          {meta.deltaXP !== undefined && (
                            <div style={{ fontWeight: 800, color: meta.deltaXP >= 0 ? '#10b981' : '#f87171', marginTop: '0.2rem' }}>
                              Delta: {meta.deltaXP > 0 ? `+${meta.deltaXP}` : meta.deltaXP} XP
                            </div>
                          )}
                          {meta.previousValue !== undefined && meta.newValue !== undefined && (
                            <div style={{ color: '#38bdf8', marginTop: '0.2rem' }}>
                              {meta.previousValue} → {meta.newValue}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="admin-mobile-points-cards">
              {logs.map((log) => (
                <div key={log.id} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{log.actor}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>{log.action}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.details}</div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || 1}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => loadLogs(pagination.page - 1)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: pagination.page <= 1 ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1',
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadLogs(pagination.page + 1)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: pagination.page >= pagination.totalPages ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1',
                    cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
