import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchMyProfile, updateMyProfile, changeUserPassword } from '../../services/api';

export default function ProfileView({ onNavigateToNav }) {
  const { user, login, logout, updateUserContext } = useAuth();

  // Profile data & telemetry
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccessMsg, setNameSuccessMsg] = useState(null);
  const [nameErrorMsg, setNameErrorMsg] = useState(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState(null);
  const [passErrorMsg, setPassErrorMsg] = useState(null);

  // Logout Confirmation Modal/State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Quick switch feedback
  const [switchFeedback, setSwitchFeedback] = useState(null);

  // Active Tab: 'details' | 'security'
  const [activeTab, setActiveTab] = useState('details');

  const loadProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetchMyProfile();
      if (res.success && res.user) {
        setProfileData(res.user);
        setEditedName(res.user.name || '');
        if (res.stats) setStats(res.stats);
      } else {
        throw new Error(res.message || 'Failed to load profile data.');
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load user profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.id, user?.role]);

  // Handle Escape key to dismiss logout modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showLogoutConfirm) {
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutConfirm]);

  // Handle Edit Name Save
  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameErrorMsg(null);
    setNameSuccessMsg(null);

    const trimmed = editedName.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 70) {
      setNameErrorMsg('Full Name must be between 2 and 70 characters.');
      return;
    }

    if (trimmed === profileData?.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const res = await updateMyProfile({ name: trimmed });
      if (res.success && res.user) {
        setProfileData(prev => ({ ...prev, name: res.user.name }));
        if (updateUserContext) {
          updateUserContext({ name: res.user.name });
        }
        setIsEditingName(false);
        setNameSuccessMsg('Your full name has been updated successfully!');
        setTimeout(() => setNameSuccessMsg(null), 4000);
      } else {
        throw new Error(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      setNameErrorMsg(err.message || 'Failed to save profile changes.');
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle Cancel Edit Name
  const handleCancelEditName = () => {
    setEditedName(profileData?.name || '');
    setIsEditingName(false);
    setNameErrorMsg(null);
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassErrorMsg(null);
    setPassSuccessMsg(null);

    if (!currentPassword) {
      setPassErrorMsg('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setPassErrorMsg('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPassErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('New password and confirmation password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPassErrorMsg('New password must be different from your current password.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changeUserPassword({
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (res.success) {
        setPassSuccessMsg('Password changed successfully! Your account security credentials have been updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPassSuccessMsg(null), 5000);
      } else {
        throw new Error(res.message || 'Failed to change password.');
      }
    } catch (err) {
      setPassErrorMsg(err.message || 'Failed to change password. Please check your credentials.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Handle Logout Confirmation
  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  // Role Switch Simulation for quick testing of all 3 roles
  const handleRoleSwitch = async (email, password) => {
    setSwitchFeedback(`Switching to ${email}...`);
    const res = await login(email, password);
    if (res.success) {
      setSwitchFeedback(`Active session switched to ${res.user.role}!`);
      setTimeout(() => setSwitchFeedback(null), 3000);
    } else {
      setSwitchFeedback(`Switch failed: ${res.error}`);
    }
  };

  const currentRole = profileData?.role || user?.role || 'USER';

  const getRoleStyle = (role) => {
    if (role === 'SUPER_ADMIN') {
      return {
        bg: 'var(--role-superadmin-bg)',
        border: 'var(--role-superadmin-border)',
        color: 'var(--role-superadmin)',
        badgeClass: 'badge-superadmin',
        title: 'Super Administrator',
        icon: '👑'
      };
    }
    if (role === 'ADMIN') {
      return {
        bg: 'var(--role-admin-bg)',
        border: 'var(--role-admin-border)',
        color: 'var(--role-admin)',
        badgeClass: 'badge-admin',
        title: 'Admin Moderator',
        icon: '🛡️'
      };
    }
    return {
      bg: 'var(--role-user-bg)',
      border: 'var(--role-user-border)',
      color: 'var(--role-user)',
      badgeClass: 'badge-user',
      title: 'Creator User',
      icon: '🚀'
    };
  };

  const roleInfo = getRoleStyle(currentRole);

  const getRolePermissions = (role) => {
    if (role === 'SUPER_ADMIN') {
      return [
        { label: 'Platform Governance', desc: 'Full root access to system settings, databases, and policies', granted: true },
        { label: 'Role Management', desc: 'Authorize and reassign roles across USER, ADMIN, and SUPER_ADMIN', granted: true },
        { label: 'Official Social Accounts', desc: 'Configure and curate official college social media accounts', granted: true },
        { label: 'Audit Telemetry', desc: 'Inspect immutable system event logs and moderation audit trail', granted: true },
        { label: 'Self Role Modification', desc: 'Protected: Self-role reassignment prevented via profile', granted: false },
      ];
    }
    if (role === 'ADMIN') {
      return [
        { label: 'Moderation Queue', desc: 'Review, approve, or reject creator activity submissions', granted: true },
        { label: 'Submissions Repository', desc: 'Inspect platform submissions, filter by status and date', granted: true },
        { label: 'User Directory', desc: 'Inspect registered users and verified activity history', granted: true },
        { label: 'Role Escalation', desc: 'Strictly Forbidden: Admins cannot alter user roles or elevate permissions', granted: false },
        { label: 'System Audit Logs', desc: 'Forbidden: Security audit stream restricted to Super Admins', granted: false },
      ];
    }
    return [
      { label: 'Submit Proof', desc: 'Submit social engagement proof (likes, comments, stories)', granted: true },
      { label: 'My Submissions', desc: 'Track live status and feedback on your own submissions', granted: true },
      { label: 'Notifications', desc: 'Receive real-time alerts when your submissions are reviewed', granted: true },
      { label: 'Moderation Queue', desc: 'Forbidden: Creators cannot review or verify submissions', granted: false },
      { label: 'Staff Directory', desc: 'Forbidden: User directory access restricted to authorized staff', granted: false },
    ];
  };

  const permissions = getRolePermissions(currentRole);

  if (isLoading && !profileData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1050px' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div className="status-dot checking" style={{ width: '20px', height: '20px', margin: '0 auto 1rem auto' }} />
          <h3>Loading Profile Credentials…</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Retrieving authenticated identity from PostgreSQL</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1080px' }}>
      {/* Toast Feedback */}
      {switchFeedback && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--primary)', color: 'var(--primary-light)', fontSize: '0.9rem' }}>
          {switchFeedback}
        </div>
      )}

      {loadError && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {loadError}</span>
          <button type="button" className="btn-secondary" onClick={loadProfile} style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>Retry</button>
        </div>
      )}

      {/* ── 1. Profile Header Hero ── */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          borderLeft: `4px solid ${roleInfo.color}`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Avatar with role gradient */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${roleInfo.color} 0%, var(--primary) 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#fff',
              boxShadow: `0 8px 28px ${roleInfo.bg}`,
              border: `2px solid rgba(255, 255, 255, 0.2)`
            }}
          >
            {profileData?.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
                {profileData?.name || user?.name}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: roleInfo.bg,
                  border: `1px solid ${roleInfo.border}`,
                  color: roleInfo.color,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{roleInfo.icon}</span>
                <span>{roleInfo.title}</span>
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                ● ACTIVE
              </span>
            </div>

            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>✉️ {profileData?.email || user?.email}</span>
              <span>•</span>
              <span>ID: <code style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>{profileData?.id || user?.id}</code></span>
            </p>
          </div>
        </div>

        {/* Quick Header Actions: Refresh & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadProfile}
            title="Refresh profile data"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>🔄</span> Refresh
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setShowLogoutConfirm(true)}
            id="profile-logout-btn"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <span>⎋</span> Logout
          </button>
        </div>
      </div>

      {/* ── 2. Role Summary Statistics (Live DB Metrics) ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.entries(stats).map(([key, val]) => (
            <div
              key={key}
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                borderTop: `3px solid ${roleInfo.color}`,
                transition: 'transform 0.2s ease',
              }}
            >
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700 }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. Navigation Tabs within Profile ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          style={{
            padding: '0.6rem 1.25rem',
            background: activeTab === 'details' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'details' ? `2px solid ${roleInfo.color}` : '2px solid transparent',
            color: activeTab === 'details' ? 'var(--text-highlight)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'details' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>👤</span> Account Details &amp; Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            padding: '0.6rem 1.25rem',
            background: activeTab === 'security' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'security' ? `2px solid ${roleInfo.color}` : '2px solid transparent',
            color: activeTab === 'security' ? 'var(--text-highlight)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'security' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🔒</span> Security &amp; Password
        </button>
      </div>

      {/* ── 4. Tab A: Account Details & Editable Profile ── */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Editable & Protected Fields */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📝</span> Profile Information
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                View your registered credentials and modify allowed profile fields.
              </p>
            </div>

            {/* Success & Error Banners */}
            {nameSuccessMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--status-success)', fontSize: '0.88rem' }}>
                ✓ {nameSuccessMsg}
              </div>
            )}
            {nameErrorMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--status-error)', fontSize: '0.88rem' }}>
                ⚠️ {nameErrorMsg}
              </div>
            )}

            {/* Field: Full Name (Editable) */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Full Name (Allowed Profile Field)
                </label>
                {!isEditingName && (
                  <button
                    type="button"
                    onClick={() => { setIsEditingName(true); setNameErrorMsg(null); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    ✏️ Edit Name
                  </button>
                )}
              </div>

              {isEditingName ? (
                <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={isSavingName}
                    maxLength={70}
                    autoFocus
                    style={{ width: '100%', fontSize: '0.95rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {editedName.length}/70 characters
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelEditName}
                        disabled={isSavingName}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSavingName || !editedName.trim()}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.95rem' }}
                      >
                        {isSavingName ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                  {profileData?.name || user?.name}
                </div>
              )}
            </div>

            {/* Field: Email Address (Protected) */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email Address
                </label>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  🔒 Protected Identifier
                </span>
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {profileData?.email || user?.email}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                Primary login credential. Cannot be changed to protect verification audit logs.
              </span>
            </div>

            {/* Field: Role (Protected) */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned Platform Role
                </label>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  🔒 Super Admin Managed
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    background: roleInfo.bg,
                    border: `1px solid ${roleInfo.border}`,
                    color: roleInfo.color
                  }}
                >
                  {roleInfo.icon} {currentRole}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                Role privilege escalations are strictly prevented. Only Super Administrators can alter user access levels.
              </span>
            </div>

            {/* Account Metadata Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Account Status</div>
                <div style={{ color: 'var(--status-success)', fontWeight: 700 }}>ACTIVE</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Member Since</div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Role Permissions Matrix */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🛡️</span> Role Permissions Matrix
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Active security clearances enforced for role <strong>{currentRole}</strong> across portal endpoints.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {permissions.map((perm, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: perm.granted ? 'rgba(255, 255, 255, 0.03)' : 'rgba(244, 63, 94, 0.03)',
                    border: `1px solid ${perm.granted ? 'var(--border-subtle)' : 'rgba(244, 63, 94, 0.15)'}`
                  }}
                >
                  <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>
                    {perm.granted ? '✅' : '🚫'}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: perm.granted ? 'var(--text-highlight)' : 'var(--text-muted)' }}>
                      {perm.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {perm.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Link to Change Password or Log out */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('security')}
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
              >
                🔒 Change Password
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => setShowLogoutConfirm(true)}
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
              >
                ⎋ Logout Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Tab B: Security & Change Password ── */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Change Password Card */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔑</span> Change Account Password
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Verify your existing password and choose a secure replacement. Passwords must be at least 8 characters.
              </p>
            </div>

            {/* Feedback Banners */}
            {passSuccessMsg && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: 'var(--status-success)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                ✓ {passSuccessMsg}
              </div>
            )}
            {passErrorMsg && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.35)', color: 'var(--status-error)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                ⚠️ {passErrorMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.4rem' }}>
                  Current Password <span style={{ color: 'var(--status-error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="input-field"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password to verify"
                    disabled={isChangingPass}
                    required
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                    title={showCurrentPass ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.4rem' }}>
                  New Password <span style={{ color: 'var(--status-error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    disabled={isChangingPass}
                    required
                    minLength={8}
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                    title={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: newPassword.length >= 8 ? 'var(--status-success)' : 'var(--text-muted)' }}>
                    {newPassword.length >= 8 ? '✓ Length requirement satisfied' : `• ${8 - newPassword.length} more characters needed`}
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.4rem' }}>
                  Confirm New Password <span style={{ color: 'var(--status-error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    disabled={isChangingPass}
                    required
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                    title={showConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: newPassword === confirmPassword ? 'var(--status-success)' : 'var(--status-error)' }}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '⚠️ Passwords do not match'}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary"
                disabled={isChangingPass || !currentPassword || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                style={{ marginTop: '0.5rem', padding: '0.7rem 1.25rem', fontWeight: 700 }}
              >
                {isChangingPass ? 'Verifying & Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Right Column: Security Best Practices & Sign Out Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Session Security Guardrails */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🛡️</span> Security Specifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Password Encryption:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Bcrypt (Salt 10 Rounds)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Credential Leaks:</span>
                  <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>Zero Passwords Exposed</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Role Governance:</span>
                  <span style={{ color: 'var(--role-superadmin)', fontWeight: 600 }}>Self-Change Prohibited</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Token Lifespan:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>24 Hours Rolling</span>
                </div>
              </div>
            </div>

            {/* Logout Session Card */}
            <div className="glass-panel" style={{ padding: '1.75rem', borderLeft: '4px solid #f43f5e' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🚪</span> Session Sign Out
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Terminate your current authenticated session and remove stored cryptographic tokens from this browser.
              </p>

              <button
                type="button"
                className="btn-danger"
                onClick={() => setShowLogoutConfirm(true)}
                style={{ padding: '0.65rem 1.25rem', width: '100%', fontWeight: 700 }}
              >
                Sign Out of VeriSocial
              </button>
            </div>

            {/* Quick Role Simulation for testing all 3 roles */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', color: 'var(--text-highlight)' }}>
                ⚡ Test Other Roles
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Switch roles to verify that Super Admin, Admin, and Normal User all share the same profile interface:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="dropdown-item-btn"
                  onClick={() => handleRoleSwitch('superadmin@portal.com', 'SuperAdmin123!')}
                  style={{ fontSize: '0.82rem' }}
                >
                  <span>👑</span> <span>Super Admin (superadmin@portal.com)</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item-btn"
                  onClick={() => handleRoleSwitch('admin@portal.com', 'Admin123!')}
                  style={{ fontSize: '0.82rem' }}
                >
                  <span>🛡️</span> <span>Admin Moderator (admin@portal.com)</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item-btn"
                  onClick={() => handleRoleSwitch('user@portal.com', 'User123!')}
                  style={{ fontSize: '0.82rem' }}
                >
                  <span>🚀</span> <span>Creator User (user@portal.com)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Logout Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div
          className="portal-modal-backdrop"
          onClick={() => setShowLogoutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Sign Out"
        >
          <div
            className="portal-modal-card"
            style={{
              maxWidth: '440px',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-body" style={{ padding: '2rem 1.75rem 1.25rem 1.75rem', alignItems: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>
                ⎋
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-highlight)', fontSize: '1.3rem' }}>
                Sign Out of VeriSocial?
              </h3>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Are you sure you want to end your session as <strong>{profileData?.name || user?.name}</strong> ({currentRole})?
              </p>
            </div>

            <div className="portal-modal-footer" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, minWidth: '100px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmLogout}
                style={{ flex: 1, minWidth: '100px', fontWeight: 700 }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
