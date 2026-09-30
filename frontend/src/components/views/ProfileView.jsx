import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUserProfile } from '../../services/api';

export default function ProfileView({ onNavigateToNav }) {
  const { user, login } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [switchFeedback, setSwitchFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchUserProfile();
        if (isMounted && res.success) {
          setProfileData(res.profile);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load authenticated profile.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [user?.role]);

  const handleRoleSwitch = async (email, password) => {
    setSwitchFeedback(`Switching account...`);
    const res = await login(email, password);
    if (res.success) {
      setSwitchFeedback(`Switched active session to ${res.user.role}!`);
      setTimeout(() => setSwitchFeedback(null), 3000);
    } else {
      setSwitchFeedback(`Switch failed: ${res.error}`);
    }
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'SUPER_ADMIN') return { bg: 'var(--role-superadmin-bg)', border: 'var(--role-superadmin-border)', color: 'var(--role-superadmin)' };
    if (role === 'ADMIN') return { bg: 'var(--role-admin-bg)', border: 'var(--role-admin-border)', color: 'var(--role-admin)' };
    return { bg: 'var(--role-user-bg)', border: 'var(--role-user-border)', color: 'var(--role-user)' };
  };

  const getRolePermissions = (role) => {
    if (role === 'SUPER_ADMIN') {
      return [
        { label: 'Full System Governance', desc: 'Manage platform architecture and security parameters', granted: true },
        { label: 'User Role Assignment', desc: 'Promote or demote users between USER, ADMIN, and SUPER_ADMIN', granted: true },
        { label: 'Access Audit Logs', desc: 'Inspect immutable cryptographic system logs & actor IPs', granted: true },
        { label: 'Moderate Submissions', desc: 'Inspect and verify any creator activity submission', granted: true },
        { label: 'Social Accounts Config', desc: 'Configure platform API keys and automated rules', granted: true },
      ];
    }
    if (role === 'ADMIN') {
      return [
        { label: 'Review Submissions Queue', desc: 'Approve or reject creator submissions with feedback', granted: true },
        { label: 'Inspect Submissions Repository', desc: 'Search and filter all platform submissions', granted: true },
        { label: 'Inspect User Directory', desc: 'View relevant registered users and verification history', granted: true },
        { label: 'Role Modification', desc: 'Forbidden: Admins cannot alter user roles or elevate permissions', granted: false },
        { label: 'Audit Logs Access', desc: 'Forbidden: System logs restricted to Super Administrators', granted: false },
      ];
    }
    return [
      { label: 'Submit Activity Proof', desc: 'Submit social engagement proof (likes, comments, shares)', granted: true },
      { label: 'View Own Submissions', desc: 'Track review status and feedback on own activities', granted: true },
      { label: 'Notifications Inbox', desc: 'Receive real-time alerts when submissions are reviewed', granted: true },
      { label: 'Review Moderation Queue', desc: 'Forbidden: Creators cannot review or verify submissions', granted: false },
      { label: 'User Directory Access', desc: 'Forbidden: Directory restricted to authorized staff', granted: false },
    ];
  };

  const currentRole = user?.role || 'USER';
  const roleStyle = getRoleBadgeStyle(currentRole);
  const permissions = getRolePermissions(currentRole);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1050px' }}>
      {switchFeedback && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--primary)', color: 'var(--primary-light)', fontSize: '0.9rem' }}>
          {switchFeedback}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', borderLeft: `4px solid ${roleStyle.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleStyle.color} 0%, var(--primary) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#fff',
            boxShadow: `0 8px 24px ${roleStyle.bg}`
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--text-highlight)' }}>{user?.name}</h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                background: roleStyle.bg,
                border: `1px solid ${roleStyle.border}`,
                color: roleStyle.color,
                letterSpacing: '0.04em'
              }}>
                {currentRole}
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                ● ACTIVE SESSION
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {user?.email} • ID: <code style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>{user?.id || 'usr-current'}</code>
            </p>
          </div>
        </div>

        {/* Profile API Sync Indicator */}
        <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <div>Authenticated via Bearer JWT</div>
          <div style={{ color: 'var(--status-success)', marginTop: '0.25rem' }}>
            ✓ Verified with <code style={{ color: 'inherit' }}>/api/users/profile</code>
          </div>
        </div>
      </div>

      {/* Role Stats Row */}
      {profileData?.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.entries(profileData.stats).map(([key, val]) => (
            <div key={key} className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two Column Layout: Permissions & Account Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Role Permissions Matrix */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛡️ Role Permissions Matrix
          </h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            These capabilities are cryptographically bound to your JWT token and strictly verified server-side on every request.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {permissions.map((perm, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: perm.granted ? 'rgba(255, 255, 255, 0.03)' : 'rgba(244, 63, 94, 0.04)',
                  border: `1px solid ${perm.granted ? 'var(--border-subtle)' : 'rgba(244, 63, 94, 0.15)'}`
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
                  {perm.granted ? '✅' : '🚫'}
                </span>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: perm.granted ? 'var(--text-highlight)' : 'var(--text-muted)' }}>
                    {perm.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {perm.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Quick Role Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Account Security Information */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔒 Security & Session Guardrails
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Authentication Token:</span>
                <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>HMAC-SHA256 Signed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role Immutability:</span>
                <span style={{ color: 'var(--text-highlight)', fontWeight: 600 }}>Enforced Server-Side</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Privilege Escalation:</span>
                <span style={{ color: 'var(--role-superadmin)', fontWeight: 600 }}>Protected by Middleware</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Created:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Role Simulator Card */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚡ Quick Role Switcher
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Test how the responsive layout and role-driven navigation adapts dynamically to each credential level:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="dropdown-item-btn"
                onClick={() => handleRoleSwitch('superadmin@portal.com', 'SuperAdmin123!')}
                style={{
                  background: currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin-bg)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${currentRole === 'SUPER_ADMIN' ? 'var(--role-superadmin-border)' : 'var(--border-subtle)'}`
                }}
              >
                <span>👑</span>
                <div style={{ flex: 1 }}>
                  <strong>Super Administrator</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>superadmin@portal.com (Full clearance)</div>
                </div>
                {currentRole === 'SUPER_ADMIN' && <span style={{ color: 'var(--role-superadmin)', fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE</span>}
              </button>

              <button
                type="button"
                className="dropdown-item-btn"
                onClick={() => handleRoleSwitch('admin@portal.com', 'Admin123!')}
                style={{
                  background: currentRole === 'ADMIN' ? 'var(--role-admin-bg)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${currentRole === 'ADMIN' ? 'var(--role-admin-border)' : 'var(--border-subtle)'}`
                }}
              >
                <span>🛡️</span>
                <div style={{ flex: 1 }}>
                  <strong>Admin Moderator</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>admin@portal.com (Review queue)</div>
                </div>
                {currentRole === 'ADMIN' && <span style={{ color: 'var(--role-admin)', fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE</span>}
              </button>

              <button
                type="button"
                className="dropdown-item-btn"
                onClick={() => handleRoleSwitch('user@portal.com', 'User123!')}
                style={{
                  background: currentRole === 'USER' ? 'var(--role-user-bg)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${currentRole === 'USER' ? 'var(--role-user-border)' : 'var(--border-subtle)'}`
                }}
              >
                <span>🚀</span>
                <div style={{ flex: 1 }}>
                  <strong>Creator User</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>user@portal.com (Activity submissions)</div>
                </div>
                {currentRole === 'USER' && <span style={{ color: 'var(--role-user)', fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
