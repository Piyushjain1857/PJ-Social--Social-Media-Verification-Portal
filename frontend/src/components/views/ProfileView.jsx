import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchMyProfile, updateMyProfile, changeUserPassword } from '../../services/api';
import { fetchMyGamification } from '../../services/gamificationApi';
import LevelProgressCard from '../gamification/LevelProgressCard';

const PERSONALIZATION_KEY = 'user_portal_personalization';

const THEME_ACCENTS = [
  { id: 'indigo', name: 'Electric Indigo', primary: '#6366f1', light: '#818cf8', dark: '#4f46e5', glow: 'rgba(99, 102, 241, 0.35)', icon: '🟣' },
  { id: 'cyan', name: 'Cyber Cyan', primary: '#06b6d4', light: '#22d3ee', dark: '#0891b2', glow: 'rgba(6, 182, 212, 0.35)', icon: '🔷' },
  { id: 'emerald', name: 'Neo Emerald', primary: '#10b981', light: '#34d399', dark: '#059669', glow: 'rgba(16, 185, 129, 0.35)', icon: '🟢' },
  { id: 'rose', name: 'Sunset Rose', primary: '#f43f5e', light: '#fb7185', dark: '#e11d48', glow: 'rgba(244, 63, 94, 0.35)', icon: '🌹' },
  { id: 'violet', name: 'Royal Violet', primary: '#a855f7', light: '#c084fc', dark: '#9333ea', glow: 'rgba(168, 85, 247, 0.35)', icon: '🔮' },
  { id: 'gold', name: 'Radiant Gold', primary: '#f59e0b', light: '#fbbf24', dark: '#d97706', glow: 'rgba(245, 158, 11, 0.35)', icon: '👑' }
];

const AVATAR_ICONS = ['👑', '🛡️', '⚡', '🚀', '🦅', '💎', '🎯', '🌌', '🦁', '🐉', '✨', '🎓'];

const AVATAR_GRADIENTS = [
  { id: 'indigo', name: 'Indigo Aura', gradient: 'linear-gradient(135deg, #6366f1, #06b6d4)' },
  { id: 'sunset', name: 'Sunset Blaze', gradient: 'linear-gradient(135deg, #f43f5e, #fb923c)' },
  { id: 'emerald', name: 'Emerald Forest', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  { id: 'amethyst', name: 'Royal Amethyst', gradient: 'linear-gradient(135deg, #a855f7, #6366f1)' },
  { id: 'gold', name: 'Golden Sun', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'obsidian', name: 'Dark Obsidian', gradient: 'linear-gradient(135deg, #334155, #0f172a)' }
];

const METRIC_CONFIG = {
  totalUsers: { icon: '👥', label: 'Total Creators', subtitle: 'Registered creators' },
  totalAdmins: { icon: '🛡️', label: 'Platform Admins', subtitle: 'Authorized moderators' },
  totalSubmissions: { icon: '📊', label: 'Total Submissions', subtitle: 'Lifetime verifications' },
  pendingReview: { icon: '⏳', label: 'Pending Review', subtitle: 'Awaiting inspection' },
  approvedSubmissions: { icon: '✅', label: 'Verified Proof', subtitle: 'Approved & credited' },
  rejectedSubmissions: { icon: '❌', label: 'Flagged Proof', subtitle: 'Non-compliant logs' }
};

const DEFAULT_PERSONALIZATION = {
  accentTheme: 'indigo',
  avatarIcon: '👑',
  avatarGradient: 'indigo',
  avatarPhoto: null,
  statusHeadline: '',
  bio: '',
  socialHandles: {
    instagram: '',
    linkedin: '',
    facebook: '',
    twitter: '',
    github: ''
  },
  confettiEnabled: true,
  soundEffects: true,
  compactMode: false,
  highGlossBlur: true
};

export default function ProfileView({ onNavigateToNav }) {
  const { user, login, logout, updateUserContext } = useAuth();
  const fileInputRef = React.useRef(null);

  // Profile data & telemetry
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Gamification data (USER only)
  const [gamificationData, setGamificationData] = useState(null);

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
  const [toastMessage, setToastMessage] = useState(null);

  // Active Tab: 'details' | 'personalization' | 'security'
  const [activeTab, setActiveTab] = useState('details');

  // Personalization State
  const [personalization, setPersonalization] = useState(() => {
    try {
      const saved = localStorage.getItem(PERSONALIZATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clear out any legacy hardcoded placeholder data
        const dummyPatterns = ['piyush.jain', 'piyush-jain', 'piyushjain_dev', 'piyushjain'];
        if (parsed.socialHandles) {
          Object.keys(parsed.socialHandles).forEach(k => {
            const val = parsed.socialHandles[k];
            if (typeof val === 'string' && dummyPatterns.some(p => val.toLowerCase().includes(p.toLowerCase()))) {
              parsed.socialHandles[k] = '';
            }
          });
        }
        if (parsed.statusHeadline === 'Institutional Super Administrator & Security Officer') {
          parsed.statusHeadline = '';
        }
        if (parsed.bio === 'Overseeing social media verification policies, gamification progression, and university audit integrity.') {
          parsed.bio = '';
        }
        const cleaned = { ...DEFAULT_PERSONALIZATION, ...parsed };
        localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    } catch (e) {
      console.warn('Could not load personalization preferences:', e);
    }
    return DEFAULT_PERSONALIZATION;
  });

  // Ensure default handles/dummy handles are cleared so by default value is none
  useEffect(() => {
    const dummyPatterns = ['piyush.jain', 'piyush-jain', 'piyushjain_dev', 'piyushjain'];
    if (personalization?.socialHandles) {
      let needsCleanup = false;
      const current = { ...personalization.socialHandles };
      Object.keys(current).forEach(k => {
        const val = current[k];
        if (typeof val === 'string' && dummyPatterns.some(p => val.toLowerCase().includes(p.toLowerCase()))) {
          current[k] = '';
          needsCleanup = true;
        }
      });
      if (needsCleanup) {
        const cleaned = {
          ...personalization,
          socialHandles: current
        };
        setPersonalization(cleaned);
        try {
          localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(cleaned));
          window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: cleaned }));
        } catch (e) {}
      }
    }
  }, [personalization]);

  const [copiedId, setCopiedId] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetchMyProfile();
      if (res.success && res.user) {
        setProfileData(res.user);
        setEditedName(res.user.name || '');
        if (res.stats) setStats(res.stats);

        // Fetch gamification for USER role
        if (res.user.role === 'USER') {
          try {
            const gamRes = await fetchMyGamification();
            if (gamRes && gamRes.success && gamRes.data) {
              setGamificationData(gamRes.data);
            }
          } catch (gamErr) {
            // silent - gamification is supplementary
          }
        }
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

  // Apply theme accent to CSS root variables
  const applyThemeAccent = (themeObj) => {
    document.documentElement.style.setProperty('--primary', themeObj.primary);
    document.documentElement.style.setProperty('--primary-light', themeObj.light);
    document.documentElement.style.setProperty('--primary-dark', themeObj.dark);
    document.documentElement.style.setProperty('--primary-glow', themeObj.glow);
    document.documentElement.style.setProperty('--primary-glow-strong', themeObj.glow);
  };

  const handleSelectAccent = (themeObj) => {
    const updated = {
      ...personalization,
      accentTheme: themeObj.id,
      accentColorPrimary: themeObj.primary,
      accentColorLight: themeObj.light,
      accentColorDark: themeObj.dark,
      accentColorGlow: themeObj.glow
    };
    setPersonalization(updated);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(updated));
    applyThemeAccent(themeObj);
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: updated }));
    showToast(`🎨 Theme updated to ${themeObj.name}!`);
  };

  const handleSelectAvatarIcon = (icon) => {
    const updated = { ...personalization, avatarIcon: icon };
    setPersonalization(updated);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: updated }));
    showToast(`Avatar symbol updated to ${icon}`);
  };

  const handleSelectAvatarGradient = (gradId) => {
    const updated = { ...personalization, avatarGradient: gradId };
    setPersonalization(updated);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: updated }));
    showToast('Avatar aura gradient updated!');
  };

  const handleUpdateSocial = (platform, value) => {
    const updated = {
      ...personalization,
      socialHandles: {
        ...personalization.socialHandles,
        [platform]: value.trim()
      }
    };
    setPersonalization(updated);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: updated }));
  };

  const handleClearAllSocial = () => {
    const updated = {
      ...personalization,
      socialHandles: {
        instagram: '',
        linkedin: '',
        facebook: '',
        twitter: '',
        github: ''
      }
    };
    setPersonalization(updated);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: updated }));
    showToast('All social handles cleared.');
  };

  const handleSaveHeadlineBio = (e) => {
    e.preventDefault();
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(personalization));
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: personalization }));
    showToast('✓ Headline and bio saved successfully!');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('⚠️ Please select an image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('⚠️ File exceeds 8MB. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxSize = 360;
          let width = img.width;
          let height = img.height;

          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = Math.min(minDim, maxSize);
          canvas.height = Math.min(minDim, maxSize);

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);

          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          const updated = {
            ...personalization,
            avatarPhoto: optimizedDataUrl
          };
          setPersonalization(updated);
          localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: updated }));
          showToast('✓ Profile photo uploaded and applied across portal!');
        } catch (err) {
          console.error('Image compression error:', err);
          showToast('⚠️ Failed to process image.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    const updated = {
      ...personalization,
      avatarPhoto: null
    };
    setPersonalization(updated);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: updated }));
    showToast('Profile photo removed (default avatar restored).');
  };

  const handleResetPersonalization = () => {
    setPersonalization(DEFAULT_PERSONALIZATION);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(DEFAULT_PERSONALIZATION));
    const defaultTheme = THEME_ACCENTS.find(t => t.id === DEFAULT_PERSONALIZATION.accentTheme);
    if (defaultTheme) applyThemeAccent(defaultTheme);
    window.dispatchEvent(new CustomEvent('portal-personalization-updated', { detail: DEFAULT_PERSONALIZATION }));
    showToast('Personalization reset to default styling.');
  };

  const handleCopyId = () => {
    const idToCopy = profileData?.id || user?.id;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
      showToast('Account ID copied to clipboard!');
    }
  };

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

  const currentGradient = AVATAR_GRADIENTS.find(g => g.id === personalization.avatarGradient)?.gradient || AVATAR_GRADIENTS[0].gradient;
  const currentAccent = THEME_ACCENTS.find(t => t.id === personalization.accentTheme) || THEME_ACCENTS[0];

  if (isLoading && !profileData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div className="status-dot checking" style={{ width: '20px', height: '20px', margin: '0 auto 1rem auto' }} />
          <h3>Loading Profile Credentials…</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Retrieving authenticated identity from database</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div className="portal-alert portal-alert-success" style={{ margin: 0 }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {loadError && (
        <div className="portal-alert portal-alert-error" style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {loadError}</span>
          <button type="button" className="btn-secondary" onClick={loadProfile} style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── 1. Hero Profile Card with Personalization Badges ── */}
      {/* ── 1. Hero Profile Card with Personalization Badges ── */}
      <div
        className="profile-hero-card"
        style={{
          borderLeft: `4px solid ${currentAccent.primary}`,
          boxShadow: `0 16px 36px -10px rgba(0, 0, 0, 0.5), 0 0 20px -6px ${currentAccent.glow}`
        }}
      >
        {/* Hidden File Input for Profile Photo Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          style={{ display: 'none' }}
          onChange={handlePhotoUpload}
        />

        <div className="profile-hero-left">
          {/* Avatar with Camera Trigger Badge & Emblem */}
          <div className="profile-avatar-wrapper">
            <div
              className="profile-avatar-frame"
              style={{
                background: currentGradient,
                boxShadow: `0 10px 28px ${currentAccent.glow}`
              }}
              onClick={() => fileInputRef.current?.click()}
              title="Click to change profile picture"
            >
              {personalization.avatarPhoto ? (
                <img
                  src={personalization.avatarPhoto}
                  alt={profileData?.name || user?.name || 'Profile'}
                  className="profile-avatar-img"
                />
              ) : (
                <span className="profile-avatar-initial">
                  {personalization.avatarIcon || (profileData?.name ? profileData.name.charAt(0).toUpperCase() : 'U')}
                </span>
              )}

              {/* Integrated Camera Badge */}
              <button
                type="button"
                className="profile-camera-badge"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                title="Upload new photo"
              >
                📷
              </button>

              {/* Corner Emblem */}
              {personalization.avatarPhoto && personalization.avatarIcon && (
                <span className="profile-emblem-badge">
                  {personalization.avatarIcon}
                </span>
              )}
            </div>

            {personalization.avatarPhoto && (
              <button
                type="button"
                className="profile-remove-photo-btn"
                onClick={handleRemovePhoto}
                title="Remove photo and restore avatar emblem"
              >
                ✕ Remove
              </button>
            )}
          </div>

          {/* User Details & Identity */}
          <div className="profile-identity-info">
            <div className="profile-identity-header">
              <h2 className="profile-user-name">
                {profileData?.name || user?.name}
              </h2>
              <div className="profile-badge-row">
                <span
                  className="profile-role-pill"
                  style={{
                    background: roleInfo.bg,
                    border: `1px solid ${roleInfo.border}`,
                    color: roleInfo.color
                  }}
                >
                  <span>{roleInfo.icon}</span>
                  <span>{roleInfo.title}</span>
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  ● ACTIVE
                </span>
              </div>
            </div>

            {/* Custom Status Headline (only if set) */}
            {personalization.statusHeadline && (
              <div className="profile-headline-text" style={{ color: currentAccent.light }}>
                <span>✨</span>
                <span>{personalization.statusHeadline}</span>
              </div>
            )}

            {/* Email & ID Row */}
            <div className="profile-meta-row">
              <span className="profile-meta-item">
                <span>✉️</span>
                <span>{profileData?.email || user?.email}</span>
              </span>
              <span className="profile-meta-dot">•</span>
              <span className="profile-meta-item">
                <span>ID:</span>
                <code className="profile-id-code">{profileData?.id || user?.id}</code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="profile-copy-btn"
                  title="Copy Account ID"
                >
                  {copiedId ? '✓ Copied' : '📋 Copy'}
                </button>
              </span>
            </div>

            {/* Connected Social Chips (only shown if configured by user) */}
            {Object.values(personalization.socialHandles || {}).some(h => Boolean(h && h.trim())) && (
              <div className="profile-social-row">
                {personalization.socialHandles.instagram && (
                  <a
                    href={`https://instagram.com/${personalization.socialHandles.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-social-chip"
                  >
                    <span>📸</span>
                    <span>@{personalization.socialHandles.instagram}</span>
                  </a>
                )}
                {personalization.socialHandles.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${personalization.socialHandles.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-social-chip"
                  >
                    <span>💼</span>
                    <span>{personalization.socialHandles.linkedin}</span>
                  </a>
                )}
                {personalization.socialHandles.twitter && (
                  <a
                    href={`https://twitter.com/${personalization.socialHandles.twitter}`}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-social-chip"
                  >
                    <span>🐦</span>
                    <span>@{personalization.socialHandles.twitter}</span>
                  </a>
                )}
                {personalization.socialHandles.github && (
                  <a
                    href={`https://github.com/${personalization.socialHandles.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-social-chip"
                  >
                    <span>🐙</span>
                    <span>{personalization.socialHandles.github}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Header Actions (Pinned neatly on right) */}
        <div className="profile-actions-bar">
          <button
            type="button"
            className="btn-secondary profile-action-btn"
            onClick={() => setActiveTab('personalization')}
            title="Customize themes, avatar, and headline"
          >
            <span>🎨</span> Personalize
          </button>
          <button
            type="button"
            className="btn-secondary profile-action-btn"
            onClick={loadProfile}
            disabled={isLoading}
            title="Refresh profile data"
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
            <span>{isLoading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            className="btn-danger profile-action-btn"
            onClick={() => setShowLogoutConfirm(true)}
            id="profile-logout-btn"
          >
            <span>⎋</span> Logout
          </button>
        </div>
      </div>

      {/* ── 2. Live Telemetry Metrics Cards ── */}
      {stats && (
        <div className="profile-stat-grid">
          {Object.entries(stats).map(([key, val]) => {
            const cfg = METRIC_CONFIG[key] || {
              icon: '📊',
              label: key.replace(/([A-Z])/g, ' $1').trim(),
              subtitle: 'Platform Activity'
            };
            return (
              <div
                key={key}
                className="profile-stat-card"
                style={{
                  borderTop: `3px solid ${currentAccent.primary}`
                }}
              >
                <div
                  className="profile-stat-icon-box"
                  style={{
                    color: currentAccent.light,
                    borderColor: `${currentAccent.primary}33`
                  }}
                >
                  {cfg.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="profile-stat-label">
                    {cfg.label}
                  </span>
                  <span className="profile-stat-num">
                    {val}
                  </span>
                  <span className="profile-stat-sub">
                    {cfg.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 2b. XP Level Card (USER role only) ── */}
      {gamificationData && (profileData?.role || user?.role) === 'USER' && (
        <LevelProgressCard
          totalXP={gamificationData.totalXP || 0}
          currentLevel={gamificationData.currentLevel || 1}
          levelName={gamificationData.levelName || 'Novice'}
          icon={gamificationData.icon || '🌱'}
          nextLevel={gamificationData.nextLevel}
          nextLevelName={gamificationData.nextLevelName}
          nextLevelRequiredXP={gamificationData.nextLevelRequiredXP || 0}
          xpIntoCurrentLevel={gamificationData.xpIntoCurrentLevel || 0}
          xpRemaining={gamificationData.xpRemaining || 0}
          progressPercentage={gamificationData.progressPercentage || 0}
          isMaxLevel={gamificationData.isMaxLevel || false}
          currentLevelStartXP={gamificationData.currentLevelStartXP || 0}
          onViewJourney={onNavigateToNav ? () => onNavigateToNav('points') : null}
        />
      )}

      {/* ── 3. Profile Navigation Tabs ── */}
      <div className="profile-tab-bar">
        <button
          type="button"
          className={`profile-tab-pill ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <span>👤</span> Account Details &amp; Profile
        </button>

        <button
          type="button"
          className={`profile-tab-pill ${activeTab === 'personalization' ? 'active' : ''}`}
          onClick={() => setActiveTab('personalization')}
        >
          <span>🎨</span> Preferences &amp; Personalization
        </button>

        <button
          type="button"
          className={`profile-tab-pill ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <span>🔒</span> Security &amp; Password
        </button>
      </div>

      {/* ── 4. TAB 1: Account Details & Permissions Matrix ── */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Account Details & Editable Bio */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title">
                <span style={{ fontSize: '1.35rem' }}>📝</span>
                <div>
                  <h3>Profile Information</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Registered identity credentials and editable bio fields
                  </div>
                </div>
              </div>
            </div>

            {/* Name Success / Error Alerts */}
            {nameSuccessMsg && (
              <div className="portal-alert portal-alert-success" style={{ margin: 0 }}>
                <span>✓</span>
                <span>{nameSuccessMsg}</span>
              </div>
            )}
            {nameErrorMsg && (
              <div className="portal-alert portal-alert-error" style={{ margin: 0 }}>
                <span>⚠️</span>
                <span>{nameErrorMsg}</span>
              </div>
            )}

            {/* Full Name */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Full Name (Allowed Profile Field)
                </label>
                {!isEditingName && (
                  <button
                    type="button"
                    onClick={() => { setIsEditingName(true); setNameErrorMsg(null); }}
                    style={{ background: 'none', border: 'none', color: currentAccent.light, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
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
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
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
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  {profileData?.name || user?.name}
                </div>
              )}
            </div>

            {/* Email Address */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email Address
                </label>
                <span style={{ fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                  🔒 Protected Identifier
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {profileData?.email || user?.email}
              </div>
            </div>

            {/* Assigned Role */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned Platform Role
                </label>
                <span style={{ fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                  🔒 Super Admin Governed
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
            </div>

            {/* Public Bio */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                Personal Bio &amp; Campus Mission
              </label>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, fontStyle: 'italic' }}>
                "{personalization.bio || 'No public bio set. Customize it in the Personalization tab!'}"
              </p>
            </div>

            {/* Quick Personalization & Theme Bar */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Accent &amp; Persona Styling
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('personalization')}
                  style={{ background: 'none', border: 'none', color: currentAccent.light, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  🎨 Customize Full Persona →
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {THEME_ACCENTS.map(theme => {
                    const isSelected = personalization.accentTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectAccent(theme)}
                        title={theme.name}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: theme.primary,
                          border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                          boxShadow: isSelected ? `0 0 10px ${theme.glow}` : 'none',
                          cursor: 'pointer',
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s ease',
                          padding: 0
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Emblem: <strong>{personalization.avatarIcon}</strong></span>
                  <span>•</span>
                  <span>Theme: <strong style={{ color: currentAccent.light }}>{currentAccent.name}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Role Permissions Matrix */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title">
                <span style={{ fontSize: '1.35rem' }}>🛡️</span>
                <div>
                  <h3>Role Permissions Matrix</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Active security clearances enforced for role <strong>{currentRole}</strong>
                  </div>
                </div>
              </div>
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
                    borderRadius: '8px',
                    background: perm.granted ? 'rgba(255, 255, 255, 0.03)' : 'rgba(244, 63, 94, 0.03)',
                    border: `1px solid ${perm.granted ? 'var(--border-subtle)' : 'rgba(244, 63, 94, 0.15)'}`
                  }}
                >
                  <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>
                    {perm.granted ? '✅' : '🚫'}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: perm.granted ? '#ffffff' : 'var(--text-muted)' }}>
                      {perm.label}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {perm.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TAB 2: Personalization & Themes (NEW) ── */}
      {activeTab === 'personalization' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Theme & Styling Controls */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title">
                <span style={{ fontSize: '1.35rem' }}>🎨</span>
                <div>
                  <h3>Theme &amp; Accent Personalization</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Customize interface accent luminescence and glowing highlights
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Profile Photo Upload Section */}
            <div style={{ padding: '1.15rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Profile Photo / Picture Upload
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '20px',
                    background: currentGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 16px ${currentAccent.glow}`,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  {personalization.avatarPhoto ? (
                    <img
                      src={personalization.avatarPhoto}
                      alt="Uploaded Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>
                      {personalization.avatarIcon || (profileData?.name ? profileData.name.charAt(0).toUpperCase() : 'U')}
                    </span>
                  )}
                  {personalization.avatarPhoto && personalization.avatarIcon && (
                    <span style={{ position: 'absolute', bottom: '2px', right: '3px', fontSize: '0.95rem' }}>
                      {personalization.avatarIcon}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.2rem' }}>
                    {personalization.avatarPhoto ? 'Custom Profile Photo Active' : 'No Photo Uploaded (Using Aura Emblem)'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                    Supported formats: PNG, JPG, or WebP. Automatically center-cropped and synchronized with the sidebar and navbar.
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span>📁</span> {personalization.avatarPhoto ? 'Choose New Photo' : 'Upload Profile Photo'}
                    </button>
                    {personalization.avatarPhoto && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleRemovePhoto}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', color: '#fb7185' }}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Accent Palette Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Select Portal Accent Theme
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}>
                {THEME_ACCENTS.map(theme => {
                  const isSelected = personalization.accentTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      className={`theme-swatch ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectAccent(theme)}
                      style={{
                        borderColor: isSelected ? theme.primary : 'var(--border-subtle)',
                        boxShadow: isSelected ? `0 0 16px ${theme.glow}` : 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: theme.primary,
                          boxShadow: `0 0 8px ${theme.primary}`
                        }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                        {theme.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Avatar Icon / Symbol Customizer */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Personal Avatar Emblem
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {AVATAR_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`avatar-badge-btn ${personalization.avatarIcon === icon ? 'active' : ''}`}
                    onClick={() => handleSelectAvatarIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Aura Gradient */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Avatar Aura Gradient
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}>
                {AVATAR_GRADIENTS.map(grad => {
                  const isSelected = personalization.avatarGradient === grad.id;
                  return (
                    <div
                      key={grad.id}
                      onClick={() => handleSelectAvatarGradient(grad.id)}
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? `2px solid ${currentAccent.primary}` : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: isSelected ? `0 0 12px ${currentAccent.glow}` : 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          background: grad.gradient
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: isSelected ? '#ffffff' : 'var(--text-secondary)', fontWeight: isSelected ? 700 : 500 }}>
                        {grad.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Social Media Connected Handles */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  Public Profile Social Handles
                </label>
                {Object.values(personalization.socialHandles || {}).some(h => Boolean(h && h.trim())) && (
                  <button
                    type="button"
                    onClick={handleClearAllSocial}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      textDecoration: 'underline'
                    }}
                    title="Clear all configured social links"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem', width: '24px' }}>📸</span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Instagram handle (e.g. your_handle)"
                    value={personalization.socialHandles.instagram || ''}
                    onChange={(e) => handleUpdateSocial('instagram', e.target.value)}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem', width: '24px' }}>💼</span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="LinkedIn username or URL (e.g. your-profile)"
                    value={personalization.socialHandles.linkedin || ''}
                    onChange={(e) => handleUpdateSocial('linkedin', e.target.value)}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem', width: '24px' }}>🐦</span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Twitter/X handle (e.g. your_handle)"
                    value={personalization.socialHandles.twitter || ''}
                    onChange={(e) => handleUpdateSocial('twitter', e.target.value)}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem', width: '24px' }}>🐙</span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="GitHub username (e.g. your_username)"
                    value={personalization.socialHandles.github || ''}
                    onChange={(e) => handleUpdateSocial('github', e.target.value)}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Headline and Bio Form */}
            <form onSubmit={handleSaveHeadlineBio} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Custom Profile Headline
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Senior Verification Officer"
                  value={personalization.statusHeadline}
                  onChange={(e) => setPersonalization(prev => ({ ...prev, statusHeadline: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Personal Statement / Bio
                </label>
                <textarea
                  rows={3}
                  className="input-field"
                  placeholder="Tell students and reviewers about your campus focus..."
                  value={personalization.bio}
                  onChange={(e) => setPersonalization(prev => ({ ...prev, bio: e.target.value }))}
                  style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleResetPersonalization}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                >
                  Reset Defaults
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                >
                  Save Personalization
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Identity Badge Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="preview-id-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: currentAccent.light, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span>🪪</span>
                  <span>Live Platform ID Card Preview</span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  VERIFIED IDENT
                </span>
              </div>

              {/* Card Body */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '20px',
                    background: currentGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: personalization.avatarIcon ? '2.2rem' : '2rem',
                    boxShadow: `0 8px 24px ${currentAccent.glow}`,
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {personalization.avatarPhoto ? (
                    <img
                      src={personalization.avatarPhoto}
                      alt="Identity Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    personalization.avatarIcon || (profileData?.name ? profileData.name.charAt(0).toUpperCase() : 'U')
                  )}
                  {personalization.avatarPhoto && personalization.avatarIcon && (
                    <span style={{ position: 'absolute', bottom: '2px', right: '3px', fontSize: '1rem', lineHeight: 1 }}>
                      {personalization.avatarIcon}
                    </span>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.3rem', color: '#ffffff', fontWeight: 800 }}>
                    {profileData?.name || user?.name}
                  </h4>
                  {personalization.statusHeadline && (
                    <div style={{ fontSize: '0.82rem', color: currentAccent.light, fontWeight: 600 }}>
                      {personalization.statusHeadline}
                    </div>
                  )}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {profileData?.email || user?.email}
                  </div>
                </div>

                {personalization.bio && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, fontStyle: 'italic', maxWidth: '280px' }}>
                    "{personalization.bio}"
                  </p>
                )}

                {/* Social Handles Showcase */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.25rem' }}>
                  {personalization.socialHandles.instagram && (
                    <span className="profile-social-chip">
                      📸 @{personalization.socialHandles.instagram}
                    </span>
                  )}
                  {personalization.socialHandles.linkedin && (
                    <span className="profile-social-chip">
                      💼 {personalization.socialHandles.linkedin}
                    </span>
                  )}
                  {personalization.socialHandles.twitter && (
                    <span className="profile-social-chip">
                      🐦 @{personalization.socialHandles.twitter}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Role: {currentRole}</span>
                <span>Active Accent: {currentAccent.name}</span>
              </div>
            </div>

            {/* Achievement Badges Showcase */}
            <div className="settings-section-card">
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🏆</span> Institutional Badges
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🥇</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Early Pioneer</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verified System Auditor</div>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Zero Infractions</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>100% Policy Compliance</div>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>⚡</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Level Master</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Progression Architect</div>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🏛️</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Official College</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Channel Guardian</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TAB 3: Security & Password ── */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Change Password Card */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title">
                <span style={{ fontSize: '1.35rem' }}>🔑</span>
                <div>
                  <h3>Change Account Password</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Verify existing password and set a secure replacement
                  </div>
                </div>
              </div>
            </div>

            {passSuccessMsg && (
              <div className="portal-alert portal-alert-success" style={{ margin: 0 }}>
                <span>✓</span>
                <span>{passSuccessMsg}</span>
              </div>
            )}
            {passErrorMsg && (
              <div className="portal-alert portal-alert-error" style={{ margin: 0 }}>
                <span>⚠️</span>
                <span>{passErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  Current Password <span style={{ color: 'var(--status-rejected)' }}>*</span>
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
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    {showCurrentPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  New Password <span style={{ color: 'var(--status-rejected)' }}>*</span>
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
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    {showNewPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && (
                  <div style={{ fontSize: '0.74rem', marginTop: '0.35rem', color: newPassword.length >= 8 ? '#34d399' : 'var(--text-muted)' }}>
                    {newPassword.length >= 8 ? '✓ Length requirement satisfied' : `• ${8 - newPassword.length} more characters needed`}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  Confirm New Password <span style={{ color: 'var(--status-rejected)' }}>*</span>
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
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    {showConfirmPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && (
                  <div style={{ fontSize: '0.74rem', marginTop: '0.35rem', color: newPassword === confirmPassword ? '#34d399' : '#f87171' }}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '⚠️ Passwords do not match'}
                  </div>
                )}
              </div>

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

          {/* Security Best Practices */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title">
                <span style={{ fontSize: '1.35rem' }}>🛡️</span>
                <div>
                  <h3>Security Specifications</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Hardened cryptographic standards &amp; session guardrails
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Password Encryption:</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Bcrypt (Salt 10 Rounds)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Credential Exposure:</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Zero Passwords Exposed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role Governance:</span>
                <span style={{ color: '#a855f7', fontWeight: 600 }}>Server-Side Validated</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Audit Stream:</span>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>Immutable DB Persistence</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Logout Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div
          className="portal-modal-backdrop"
          onClick={() => setShowLogoutConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '440px', borderTop: '4px solid var(--status-rejected)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⎋</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-highlight)' }}>
                  Sign Out of VeriSocial?
                </h3>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                ✕
              </button>
            </div>

            <div className="portal-modal-body">
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to end your active authenticated session as <strong style={{ color: '#ffffff' }}>{profileData?.email || user?.email}</strong>?
              </p>
            </div>

            <div className="portal-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
