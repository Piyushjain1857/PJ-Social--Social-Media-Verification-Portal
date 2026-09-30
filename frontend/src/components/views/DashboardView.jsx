import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSystemStats,
  fetchAuditLogs,
  fetchAllSubmissions,
  fetchUsers,
  fetchMySubmissions
} from '../../services/api';

export default function DashboardView({ onNavigateToNav }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    systemStats: null,
    auditLogs: [],
    allSubmissions: [],
    usersList: [],
    mySubmissions: []
  });

  const role = user?.role || 'USER';

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (role === 'SUPER_ADMIN') {
          const [statsRes, logsRes, subsRes, usersRes] = await Promise.all([
            fetchSystemStats(),
            fetchAuditLogs(),
            fetchAllSubmissions(),
            fetchUsers()
          ]);
          if (isMounted) {
            setData({
              systemStats: statsRes.success ? statsRes.data : null,
              auditLogs: logsRes.success ? logsRes.data || [] : [],
              allSubmissions: subsRes.success ? subsRes.data || [] : [],
              usersList: usersRes.success ? usersRes.data || [] : [],
              mySubmissions: []
            });
          }
        } else if (role === 'ADMIN') {
          const [subsRes, usersRes] = await Promise.all([
            fetchAllSubmissions(),
            fetchUsers()
          ]);
          if (isMounted) {
            setData({
              systemStats: null,
              auditLogs: [],
              allSubmissions: subsRes.success ? subsRes.data || [] : [],
              usersList: usersRes.success ? usersRes.data || [] : [],
              mySubmissions: []
            });
          }
        } else {
          // USER
          const mySubsRes = await fetchMySubmissions();
          if (isMounted) {
            setData({
              systemStats: null,
              auditLogs: [],
              allSubmissions: [],
              usersList: [],
              mySubmissions: mySubsRes.success ? mySubsRes.data || [] : []
            });
          }
        }
      } catch (err) {
        console.warn('Dashboard data fetch warning:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();
    return () => { isMounted = false; };
  }, [role]);

  // Derived counts
  const pendingSubmissions = (role === 'USER' ? data.mySubmissions : data.allSubmissions)
    .filter(s => s.status === 'PENDING');
  const approvedSubmissions = (role === 'USER' ? data.mySubmissions : data.allSubmissions)
    .filter(s => s.status === 'APPROVED');
  const rejectedSubmissions = (role === 'USER' ? data.mySubmissions : data.allSubmissions)
    .filter(s => s.status === 'REJECTED');

  // =========================================================================
  // SUPER_ADMIN Dashboard
  // =========================================================================
  if (role === 'SUPER_ADMIN') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Top KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--role-superadmin)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Registered Users</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-highlight)', margin: '0.25rem 0' }}>
              {data.usersList.length || 3}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Full platform accounts</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--role-admin)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Active Administrators</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-highlight)', margin: '0.25rem 0' }}>
              {data.usersList.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length || 2}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Super Admin & Moderators</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-warning)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Verification</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-warning)', margin: '0.25rem 0' }}>
              {pendingSubmissions.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Awaiting review</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-success)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Submissions</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-success)', margin: '0.25rem 0' }}>
              {data.allSubmissions.length || 3}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Proof verifications logged</div>
          </div>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-highlight)' }}>⚡ Governance Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigateToNav('users')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>👥</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Manage Users</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role assignment & permissions</div>
              </div>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigateToNav('admins')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Admin Directory</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Moderation clearances</div>
              </div>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigateToNav('submissions')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>📋</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Inspect Submissions</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All platform activities</div>
              </div>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigateToNav('social-accounts')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>🔗</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Social Accounts</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform API configurations</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)' }}>🔒 Recent System Audit Log</h3>
            <span className="badge badge-superadmin" style={{ fontSize: '0.72rem' }}>SUPER ADMIN ONLY</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem' }}>Timestamp</th>
                  <th style={{ padding: '0.65rem' }}>Actor</th>
                  <th style={{ padding: '0.65rem' }}>Action</th>
                  <th style={{ padding: '0.65rem' }}>Target</th>
                  <th style={{ padding: '0.65rem' }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLogs.slice(0, 4).map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.65rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                      {log.actorEmail}
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      <span className="badge badge-superadmin" style={{ fontSize: '0.7rem' }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>{log.target}</td>
                    <td style={{ padding: '0.65rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ADMIN Dashboard
  // =========================================================================
  if (role === 'ADMIN') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Moderator KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-warning)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Queue Awaiting Review
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-warning)', margin: '0.25rem 0' }}>
              {pendingSubmissions.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Needs moderator verification</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-success)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Approved Submissions
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-success)', margin: '0.25rem 0' }}>
              {approvedSubmissions.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Verified engagement proofs</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-error)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Rejected Submissions
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-error)', margin: '0.25rem 0' }}>
              {rejectedSubmissions.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Invalid / missing proof</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--role-admin)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Total Submissions
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--role-admin)', margin: '0.25rem 0' }}>
              {data.allSubmissions.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Lifetime platform activities</div>
          </div>
        </div>

        {/* Moderator Actions Banner */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
              ⚖️ Submissions Queue Ready for Moderation
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              You have {pendingSubmissions.length} creator activity proofs awaiting verification review.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigateToNav('review-submissions')}
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}
          >
            Open Review Queue ({pendingSubmissions.length}) →
          </button>
        </div>

        {/* Verification Guidelines Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', color: 'var(--text-highlight)' }}>📋 Verification Review Standard Operating Procedures</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>Verify creator handle in screenshot matches account registration.</li>
            <li>Confirm timestamp of engagement is within valid active campaign window.</li>
            <li>For Stories, ensure post proof shows at least 50 views or 2 hours active duration.</li>
            <li>Always provide clear, constructive feedback when rejecting a submission.</li>
          </ul>
        </div>
      </div>
    );
  }

  // =========================================================================
  // USER (Creator) Dashboard
  // =========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Creator KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--role-user)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Submitted Activities
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-highlight)', margin: '0.25rem 0' }}>
            {data.mySubmissions.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Engagement proofs logged</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-success)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Approved Verifications
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-success)', margin: '0.25rem 0' }}>
            {approvedSubmissions.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Verified creator points</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--status-warning)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Pending Admin Review
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-warning)', margin: '0.25rem 0' }}>
            {pendingSubmissions.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>In review queue</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Creator Trust Score
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-light)', margin: '0.25rem 0' }}>
            {data.mySubmissions.length > 0 ? `${Math.round((approvedSubmissions.length / data.mySubmissions.length) * 100)}%` : '100%'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Approval compliance rate</div>
        </div>
      </div>

      {/* Action CTA Banner */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', borderLeft: '4px solid var(--role-user)' }}>
        <div>
          <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
            🚀 Submit New Social Engagement Proof
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Earn verification credits by submitting screenshots of your likes, comments, stories, or subscriptions.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onNavigateToNav('submit-activity')}
          style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, background: 'var(--role-user)', color: '#07090e' }}
        >
          ➕ Submit Activity Proof →
        </button>
      </div>

      {/* Recent Submissions Feed */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)' }}>📋 Recent Submissions</h3>
          <button
            type="button"
            className="nav-link"
            onClick={() => onNavigateToNav('my-submissions')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            View All ({data.mySubmissions.length}) →
          </button>
        </div>

        {data.mySubmissions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No activity proof submitted yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.mySubmissions.slice(0, 3).map((sub) => (
              <div
                key={sub.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>
                    {sub.platform === 'INSTAGRAM' ? '📸' : sub.platform === 'LINKEDIN' ? '💼' : sub.platform === 'FACEBOOK' ? '👥' : '🌐'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-highlight)' }}>
                      {sub.platform} • {sub.actionType}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {sub.description || sub.postUrl}
                    </div>
                  </div>
                </div>

                <div>
                  {sub.status === 'APPROVED' && <span className="badge badge-success">✓ APPROVED</span>}
                  {sub.status === 'REJECTED' && <span className="badge badge-error">✕ REJECTED</span>}
                  {sub.status === 'PENDING' && <span className="badge badge-warning">⏳ PENDING</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
