import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchSystemStats,
  fetchAuditLogs,
  fetchUsers,
  updateUserRole,
  fetchAllSubmissions
} from '../services/api';
import SuperAdminEmailPanel from '../components/SuperAdminEmailPanel';

export default function SuperAdminSpace({ onNavigate }) {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'roles' | 'audit' | 'submissions' | 'emails'
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [statsRes, auditRes, usersRes, subRes] = await Promise.all([
        fetchSystemStats(),
        fetchAuditLogs(),
        fetchUsers(),
        fetchAllSubmissions()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data || []);
      if (usersRes.success) setUsersList(usersRes.data || []);
      if (subRes.success) setSubmissions(subRes.data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load system governance data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        setStatusMessage(`User role successfully updated to ${newRole}.`);
        await loadData();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update user role.');
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-superadmin">ROLE: SUPER ADMIN</span>
              <span className="badge badge-success">UNRESTRICTED AUTHORITY</span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>👑 Super Admin Governance Console</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Logged in as <strong>{user?.name}</strong> ({user?.email}). Full system access: manage user roles, audit platform telemetry, supervise moderation, and configure system policies.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('portal')}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              Public Landing
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={logout}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'var(--status-error)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{
            background: activeTab === 'overview' ? 'var(--role-superadmin)' : 'transparent',
            color: activeTab === 'overview' ? '#000' : 'var(--text-secondary)',
            borderColor: activeTab === 'overview' ? 'var(--role-superadmin)' : 'var(--border-subtle)',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          📊 System Overview & Stats
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
          style={{
            background: activeTab === 'roles' ? 'var(--role-superadmin)' : 'transparent',
            color: activeTab === 'roles' ? '#000' : 'var(--text-secondary)',
            borderColor: activeTab === 'roles' ? 'var(--role-superadmin)' : 'var(--border-subtle)',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          👥 Role Governance ({usersList.length})
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
          style={{
            background: activeTab === 'audit' ? 'var(--role-superadmin)' : 'transparent',
            color: activeTab === 'audit' ? '#000' : 'var(--text-secondary)',
            borderColor: activeTab === 'audit' ? 'var(--role-superadmin)' : 'var(--border-subtle)',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          📜 Security Audit Trail ({auditLogs.length})
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
          style={{
            background: activeTab === 'submissions' ? 'var(--role-superadmin)' : 'transparent',
            color: activeTab === 'submissions' ? '#000' : 'var(--text-secondary)',
            borderColor: activeTab === 'submissions' ? 'var(--role-superadmin)' : 'var(--border-subtle)',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          🛡️ All Submissions ({submissions.length})
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'emails' ? 'active' : ''}`}
          onClick={() => setActiveTab('emails')}
          style={{
            background: activeTab === 'emails' ? 'var(--role-superadmin)' : 'transparent',
            color: activeTab === 'emails' ? '#000' : 'var(--text-secondary)',
            borderColor: activeTab === 'emails' ? 'var(--role-superadmin)' : 'var(--border-subtle)',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          📧 Email Delivery Logs & Test
        </button>
      </div>

      {/* Messages */}
      {statusMessage && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)' }}>
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)' }}>
          {errorMessage}
        </div>
      )}

      {/* TAB 1: System Overview & Stats */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Accounts</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                {stats?.totalUsers || usersList.length}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                SUPER_ADMIN ({stats?.roleBreakdown?.SUPER_ADMIN || 1}) · ADMIN ({stats?.roleBreakdown?.ADMIN || 1}) · USER ({stats?.roleBreakdown?.USER || 1})
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Submissions</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
                {stats?.totalSubmissions || submissions.length}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Across Instagram, LinkedIn & Facebook
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Platform Governance</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--role-superadmin)' }}>
                TIER-1 FULL
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--status-success)', marginTop: '0.25rem' }}>
                ✓ RBAC Middleware Enforced
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Direct System Diagnostic Tools</h3>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onNavigate('dev-dashboard')}
                style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              >
                🗄️ Open Dev DB & Telemetry Console →
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              As a Super Administrator, you have authorization to inspect relational tables (Users, SocialAccounts, Submissions, Reviews, Notifications), view Prisma schema constraints, and verify database pool health.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Role Governance */}
      {activeTab === 'roles' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>User Role & Authority Management</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Exclusive Super Admin Capability: Promote or reassign platform roles. (Admins are strictly forbidden from modifying Super Admin privileges).
              </p>
            </div>
            <button
              type="button"
              className="btn-refresh-pill"
              onClick={loadData}
              disabled={isLoading}
            >
              <svg
                className={`refresh-icon-svg ${isLoading ? 'spinning' : ''}`}
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
              <span>{isLoading ? 'Refreshing…' : 'Refresh Data'}</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Current Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Account Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role Reassignment Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-superadmin' : u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`} style={{ fontSize: '0.75rem' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontSize: '0.8rem',
                            outline: 'none'
                          }}
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          (Instant Server Sync)
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Security Audit Trail */}
      {activeTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Platform Security & RBAC Audit Logs</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Protected via <code style={{ color: 'var(--brand-primary)' }}>GET /api/superadmin/audit-logs</code>. Blocked from USER and ADMIN with 403 Forbidden.
              </p>
            </div>
            <button
              type="button"
              className="btn-refresh-pill"
              onClick={loadData}
              disabled={isLoading}
            >
              <svg
                className={`refresh-icon-svg ${isLoading ? 'spinning' : ''}`}
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
              <span>{isLoading ? 'Refreshing…' : 'Refresh Data'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--role-superadmin)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-outline" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {log.event}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Actor: <strong style={{ color: 'var(--text-highlight)' }}>{log.actor}</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {log.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Platform Submissions Supervision */}
      {activeTab === 'submissions' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem' }}>All Platform Activity Submissions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {submissions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-outline">{sub.platform}</span>
                    <span className="badge badge-outline">{sub.actionType}</span>
                    <span style={{ fontWeight: 600 }}>{sub.userName || sub.user?.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({sub.userEmail || sub.user?.email})</span>
                  </div>
                  <span className={`badge ${sub.status === 'APPROVED' ? 'badge-success' : sub.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                    {sub.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {sub.description || 'No description provided.'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Post URL:{' '}
                  <a href={sub.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'underline' }}>
                    {sub.postUrl}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Transactional Email Delivery Logs & Test */}
      {activeTab === 'emails' && (
        <SuperAdminEmailPanel />
      )}
    </div>
  );
}
