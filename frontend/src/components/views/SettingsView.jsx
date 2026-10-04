import React, { useState, useEffect } from 'react';
import { CameraIcon } from '../common/SocialIcons';

const STORAGE_KEY = 'portal_governance_settings';

const DEFAULT_SETTINGS = {
  // 1. Verification & Review Policy
  submissionCooldownMinutes: 5,
  maxDailySubmissions: 20,
  requireScreenshotProof: true,
  requireFeedbackOnReject: true,
  autoApproveVerifiedCreators: false,
  duplicateUrlDetectionDays: 14,
  allowCreatorSubmissionEdit: false,

  // 2. Gamification & XP System Rules
  likeXpReward: 1,
  commentXpReward: 2,
  storyXpReward: 2,
  leaderboardScope: 'PUBLIC',
  levelUpAlerts: true,
  deductXpOnRevoke: true,
  dailyXpCap: 50,

  // 3. Security, Auth & RBAC Governance
  sessionTimeoutHours: 24,
  twoFactorRequirement: 'OPTIONAL',
  maxFailedLogins: 5,
  auditLogRetentionDays: 90,
  enforceStrictRbac: true, // Immutable
  soleSuperAdminProtection: true, // Immutable

  // 4. Notifications & Maintenance
  inAppAlerts: true,
  adminQueueDailyDigest: true,
  systemMaintenanceMode: false,
  maintenanceNotice: 'System scheduled maintenance tonight from 02:00 to 03:00 UTC.',

  // 5. System Engine & Caching
  cacheDurationSeconds: 30,
  defaultItemsPerPage: 12,
  enableLatencyDiagnostics: true,
  databasePersistence: 'POSTGRESQL_PRISMA'
};

export default function SettingsView() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not load saved settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [savedSettings, setSavedSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState('verification');
  const [feedback, setFeedback] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedSettings(settings);
      showToast('Platform security and governance settings updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to save settings to browser storage.', 'error');
    }
  };

  const handleDiscard = () => {
    setSettings(savedSettings);
    showToast('Unsaved changes discarded.', 'info');
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setSavedSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setIsResetConfirmOpen(false);
    showToast('Platform settings reset to default factory policies.', 'info');
  };

  const handleExportConfig = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `pjsocial_portal_settings_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Configuration exported as JSON file.', 'success');
    } catch (err) {
      showToast('Failed to export settings configuration.', 'error');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Hero Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.35rem 1.65rem',
          borderLeft: '4px solid var(--role-superadmin)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(13, 18, 31, 0.75) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.45rem',
                flexShrink: 0
              }}
            >
              ⚙️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-highlight)', fontWeight: 700 }}>
                  Portal Security &amp; Verification Policies
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}
                >
                  LIVE ENFORCEMENT
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  CONFIG v2.4
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                Central configuration engine for verification anti-abuse cooldowns, XP mechanics, and platform governance.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleExportConfig}
              title="Download current settings as JSON"
              style={{ fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
            >
              📥 Export JSON
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsResetConfirmOpen(true)}
              title="Reset all settings to factory default"
              style={{ fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
            >
              ↺ Reset Defaults
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              style={{
                fontSize: '0.86rem',
                padding: '0.55rem 1.25rem',
                opacity: hasUnsavedChanges ? 1 : 0.65,
                boxShadow: hasUnsavedChanges ? '0 0 20px var(--primary-glow)' : 'none'
              }}
            >
              💾 Save All Settings
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Floating Banner */}
      {hasUnsavedChanges && (
        <div
          className="glass-panel"
          style={{
            padding: '0.85rem 1.25rem',
            borderLeft: '4px solid #f59e0b',
            background: 'rgba(245, 158, 11, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontSize: '0.88rem', color: '#fbbf24', fontWeight: 600 }}>
              You have unsaved changes in your portal configuration.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDiscard}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Discard Changes
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.95rem' }}
            >
              Save Now
            </button>
          </div>
        </div>
      )}

      {/* Live Toast Feedback Alert */}
      {feedback && (
        <div
          className={`portal-alert ${
            feedback.type === 'success'
              ? 'portal-alert-success'
              : feedback.type === 'error'
              ? 'portal-alert-error'
              : 'portal-alert-info'
          }`}
          style={{ margin: 0 }}
        >
          <span>{feedback.type === 'success' ? '✓' : feedback.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Quick Telemetry Overview Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div
          className="stat-metric-card"
          style={{
            borderTop: '3px solid #6366f1',
            background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(13, 18, 31, 0.6) 100%)'
          }}
        >
          <div className="stat-metric-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            ⏱️
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Anti-Abuse Cooldown
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginTop: '0.1rem' }}>
              {settings.submissionCooldownMinutes} min
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Waiting time between claims
            </span>
          </div>
        </div>

        <div
          className="stat-metric-card"
          style={{
            borderTop: '3px solid #10b981',
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 18, 31, 0.6) 100%)'
          }}
        >
          <div className="stat-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            📊
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Daily Creator Quota
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#34d399', marginTop: '0.1rem' }}>
              {settings.maxDailySubmissions} / day
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Max verified submissions
            </span>
          </div>
        </div>

        <div
          className="stat-metric-card"
          style={{
            borderTop: '3px solid #06b6d4',
            background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.08) 0%, rgba(13, 18, 31, 0.6) 100%)'
          }}
        >
          <div className="stat-metric-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            🛡️
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              RBAC Guardrails
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#22d3ee', marginTop: '0.1rem' }}>
              Enforced
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Server-side strict validation
            </span>
          </div>
        </div>

        <div
          className="stat-metric-card"
          style={{
            borderTop: `3px solid ${settings.systemMaintenanceMode ? '#f59e0b' : '#a855f7'}`,
            background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(13, 18, 31, 0.6) 100%)'
          }}
        >
          <div className="stat-metric-icon" style={{ background: settings.systemMaintenanceMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)', color: settings.systemMaintenanceMode ? '#fbbf24' : '#c084fc' }}>
            {settings.systemMaintenanceMode ? '🚧' : '⚡'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Portal Mode
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: settings.systemMaintenanceMode ? '#fbbf24' : '#c084fc', marginTop: '0.1rem' }}>
              {settings.systemMaintenanceMode ? 'Maintenance' : 'Live / Active'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {settings.databasePersistence}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {[
          { id: 'verification', label: 'Verification Policy', icon: '⚖️' },
          { id: 'gamification', label: 'Gamification & XP', icon: '🎮' },
          { id: 'security', label: 'Security & RBAC', icon: '🔒' },
          { id: 'notifications', label: 'Alerts & Notices', icon: '🔔' },
          { id: 'engine', label: 'Engine & Performance', icon: '⚡' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ====================================================================
          SECTION 1: VERIFICATION & REVIEW POLICY
          ==================================================================== */}
      {activeTab === 'verification' && (
        <div className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-title">
              <span style={{ fontSize: '1.4rem' }}>⚖️</span>
              <div>
                <h3>Verification &amp; Moderation Policies</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Parameters governing activity claims, cooldown timers, evidence requirements, and reviewer obligations.
                </div>
              </div>
            </div>
          </div>

          {/* Control 1: Cooldown Timer */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>⏱️</span>
                <span>Submission Cooldown Period</span>
              </label>
              <div className="settings-control-desc">
                Enforces minimum elapsed time between verification claims from the same creator to eliminate spam bots.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="input-field"
                  value={settings.submissionCooldownMinutes}
                  onChange={(e) => updateSetting('submissionCooldownMinutes', Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                  style={{ width: '85px', textAlign: 'center', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>minutes</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[1, 5, 10, 15, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    className={`settings-preset-chip ${settings.submissionCooldownMinutes === mins ? 'active' : ''}`}
                    onClick={() => updateSetting('submissionCooldownMinutes', mins)}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Control 2: Maximum Daily Submissions */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>📊</span>
                <span>Maximum Daily Submissions per Creator</span>
              </label>
              <div className="settings-control-desc">
                Daily hard limit for activity submissions per student account before quota resets at midnight.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="5"
                  max="100"
                  className="input-field"
                  value={settings.maxDailySubmissions}
                  onChange={(e) => updateSetting('maxDailySubmissions', Math.max(5, Math.min(100, parseInt(e.target.value) || 5)))}
                  style={{ width: '85px', textAlign: 'center', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>claims / day</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[10, 20, 35, 50].map(quota => (
                  <button
                    key={quota}
                    type="button"
                    className={`settings-preset-chip ${settings.maxDailySubmissions === quota ? 'active' : ''}`}
                    onClick={() => updateSetting('maxDailySubmissions', quota)}
                  >
                    {quota}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Control 3: Screenshot Proof Requirement */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <CameraIcon size={18} style={{ color: 'var(--primary)' }} />
                <span>Require Screenshot Proof on All Submissions</span>
              </label>
              <div className="settings-control-desc">
                When enabled, creators must supply a valid image proof URL alongside the target post URL.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.requireScreenshotProof}
                onChange={(e) => updateSetting('requireScreenshotProof', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          {/* Control 4: Rejection Feedback Requirement */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>📝</span>
                <span>Mandate Explanatory Feedback on Rejections</span>
              </label>
              <div className="settings-control-desc">
                Reviewers cannot reject a submission without entering explicit, constructive notes explaining the reason.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.requireFeedbackOnReject}
                onChange={(e) => updateSetting('requireFeedbackOnReject', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          {/* Control 5: Duplicate Post Detection Window */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>🔍</span>
                <span>Duplicate URL Detection Window</span>
              </label>
              <div className="settings-control-desc">
                Prevents creators from claiming points on the exact same post URL if submitted within N days.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                className="input-field"
                value={settings.duplicateUrlDetectionDays}
                onChange={(e) => updateSetting('duplicateUrlDetectionDays', parseInt(e.target.value))}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value={7}>7 Days Window</option>
                <option value={14}>14 Days Window (Standard)</option>
                <option value={30}>30 Days Window</option>
                <option value={60}>60 Days Window</option>
                <option value={0}>Disabled</option>
              </select>
            </div>
          </div>

          {/* Control 6: Allow Submission Edits While Pending */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>✏️</span>
                <span>Allow Creator Proof Updates While Pending</span>
              </label>
              <div className="settings-control-desc">
                Permits creators to correct proof URLs or notes before a moderator begins reviewing the claim.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.allowCreatorSubmissionEdit}
                onChange={(e) => updateSetting('allowCreatorSubmissionEdit', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 2: GAMIFICATION & XP SYSTEM RULES
          ==================================================================== */}
      {activeTab === 'gamification' && (
        <div className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-title">
              <span style={{ fontSize: '1.4rem' }}>🎮</span>
              <div>
                <h3>Gamification &amp; XP Engine Rules</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Define reward yields per verified action, leaderboard visibility, and milestone alerts.
                </div>
              </div>
            </div>
          </div>

          {/* XP Action Yields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', padding: '0.5rem 0' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '3px solid #ec4899' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.4rem' }}>❤️</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase' }}>LIKE ACTION</span>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  XP Yield on Approval
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    value={settings.likeXpReward}
                    onChange={(e) => updateSetting('likeXpReward', parseInt(e.target.value) || 1)}
                    style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>XP</span>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '3px solid #3b82f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.4rem' }}>💬</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>COMMENT ACTION</span>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  XP Yield on Approval
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    value={settings.commentXpReward}
                    onChange={(e) => updateSetting('commentXpReward', parseInt(e.target.value) || 2)}
                    style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>XP</span>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '3px solid #a855f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <CameraIcon size={24} style={{ color: '#a855f7' }} />
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase' }}>STORY ACTION</span>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  XP Yield on Approval
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    value={settings.storyXpReward}
                    onChange={(e) => updateSetting('storyXpReward', parseInt(e.target.value) || 2)}
                    style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Control: Daily XP Cap */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>🛡️</span>
                <span>Daily XP Earning Cap per Creator</span>
              </label>
              <div className="settings-control-desc">
                Maximum XP points a single creator account can accumulate in one calendar day.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                min="20"
                max="250"
                className="input-field"
                value={settings.dailyXpCap}
                onChange={(e) => updateSetting('dailyXpCap', parseInt(e.target.value) || 50)}
                style={{ width: '90px', textAlign: 'center', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>XP / day</span>
            </div>
          </div>

          {/* Control: Leaderboard Scope */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>🏆</span>
                <span>Leaderboard Visibility Scope</span>
              </label>
              <div className="settings-control-desc">
                Governs whether full ranking lists are globally visible or limited to top performers.
              </div>
            </div>
            <select
              className="input-field"
              value={settings.leaderboardScope}
              onChange={(e) => updateSetting('leaderboardScope', e.target.value)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="PUBLIC">Global Leaderboard (All Creators)</option>
              <option value="TOP_50">Top 50 Performers Only</option>
              <option value="PRIVATE">Role Restricted (Admins Only)</option>
            </select>
          </div>

          {/* Control: Milestone Notifications */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>⚡</span>
                <span>Level-Up Milestone Alert Broadcasts</span>
              </label>
              <div className="settings-control-desc">
                Dispatch portal celebration notifications whenever a creator crosses an XP level tier threshold.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.levelUpAlerts}
                onChange={(e) => updateSetting('levelUpAlerts', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          {/* Control: Deduct XP on Revocation */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>↩️</span>
                <span>Automatic XP Clawback on Approval Revocation</span>
              </label>
              <div className="settings-control-desc">
                If an approved submission is revoked during an audit, automatically debit the awarded XP from the creator.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.deductXpOnRevoke}
                onChange={(e) => updateSetting('deductXpOnRevoke', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 3: SECURITY, AUTH & ACCESS CONTROL
          ==================================================================== */}
      {activeTab === 'security' && (
        <div className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-title">
              <span style={{ fontSize: '1.4rem' }}>🔒</span>
              <div>
                <h3>Security, Auth &amp; Governance Guardrails</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Institutional identity policies, session lifespans, and immutable privilege safeguards.
                </div>
              </div>
            </div>
          </div>

          {/* Control: Session Inactivity Timeout */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>🕒</span>
                <span>Session Inactivity Timeout</span>
              </label>
              <div className="settings-control-desc">
                Duration of inactivity before an authenticated session is revoked requiring re-login.
              </div>
            </div>
            <select
              className="input-field"
              value={settings.sessionTimeoutHours}
              onChange={(e) => updateSetting('sessionTimeoutHours', parseInt(e.target.value))}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value={1}>1 Hour (High Security)</option>
              <option value={4}>4 Hours</option>
              <option value={8}>8 Hours (Standard Shift)</option>
              <option value={24}>24 Hours (Default)</option>
              <option value={72}>72 Hours</option>
            </select>
          </div>

          {/* Control: Max Failed Sign-ins */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>🛑</span>
                <span>Failed Login Attempt Threshold</span>
              </label>
              <div className="settings-control-desc">
                Number of incorrect password attempts permitted before triggering temporary 15-minute lock.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                min="3"
                max="10"
                className="input-field"
                value={settings.maxFailedLogins}
                onChange={(e) => updateSetting('maxFailedLogins', parseInt(e.target.value) || 5)}
                style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>attempts</span>
            </div>
          </div>

          {/* Control: Audit Log Retention */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>📜</span>
                <span>Audit Trail Retention Period</span>
              </label>
              <div className="settings-control-desc">
                Retention lifecycle for immutable security logs tracking level creations, approvals, and user updates.
              </div>
            </div>
            <select
              className="input-field"
              value={settings.auditLogRetentionDays}
              onChange={(e) => updateSetting('auditLogRetentionDays', parseInt(e.target.value))}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days (Recommended)</option>
              <option value={180}>180 Days (Half Year)</option>
              <option value={365}>365 Days (Full Year Compliance)</option>
            </select>
          </div>

          {/* Immutable Safeguard 1: Strict RBAC */}
          <div className="settings-control-row" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div className="settings-control-info">
              <label className="settings-control-label" style={{ color: '#a5b4fc' }}>
                <span>🛡️</span>
                <span>Strict Server-Side RBAC Enforcement</span>
                <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', fontWeight: 700 }}>
                  IMMUTABLE
                </span>
              </label>
              <div className="settings-control-desc">
                Hardened middleware permanently enforces role checks (SUPER_ADMIN, ADMIN, USER) on all API endpoints.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.enforceStrictRbac}
                disabled
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          {/* Immutable Safeguard 2: Sole Super Admin Protection */}
          <div className="settings-control-row" style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div className="settings-control-info">
              <label className="settings-control-label" style={{ color: '#86efac' }}>
                <span>👑</span>
                <span>Sole Super Administrator Lockout Safeguard</span>
                <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.25)', color: '#a7f3d0', fontWeight: 700 }}>
                  ACTIVE PROTECTED
                </span>
              </label>
              <div className="settings-control-desc">
                Prevents accidental demotion, deactivation, or self-deletion of the portal's active Super Administrator.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.soleSuperAdminProtection}
                disabled
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 4: ALERTS, WEBHOOKS & NOTICES
          ==================================================================== */}
      {activeTab === 'notifications' && (
        <div className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-title">
              <span style={{ fontSize: '1.4rem' }}>🔔</span>
              <div>
                <h3>Alerts, Broadcasts &amp; Notifications</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Manage instant user alerts, reviewer digests, and global maintenance broadcast banners.
                </div>
              </div>
            </div>
          </div>

          {/* In-App Instant Notifications */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>🔔</span>
                <span>In-App Realtime Notification Bell Alerts</span>
              </label>
              <div className="settings-control-desc">
                Dispatches real-time bell notifications to creators when their submissions are approved or rejected.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.inAppAlerts}
                onChange={(e) => updateSetting('inAppAlerts', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          {/* Review Queue Daily Digest */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>📬</span>
                <span>Moderator Queue Daily Digest</span>
              </label>
              <div className="settings-control-desc">
                Generates a daily morning reminder for administrators detailing pending review queue backlog.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.adminQueueDailyDigest}
                onChange={(e) => updateSetting('adminQueueDailyDigest', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>

          {/* System Maintenance Banner Mode */}
          <div className="settings-control-row" style={{ alignItems: 'flex-start' }}>
            <div className="settings-control-info">
              <label className="settings-control-label" style={{ color: settings.systemMaintenanceMode ? '#fbbf24' : '#ffffff' }}>
                <span>🚧</span>
                <span>Portal-Wide Maintenance Notice Banner</span>
              </label>
              <div className="settings-control-desc">
                Displays a prominent warning banner at the top of the portal for all logged-in students and administrators.
              </div>

              {settings.systemMaintenanceMode && (
                <div style={{ marginTop: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24', marginBottom: '0.35rem' }}>
                    Broadcast Banner Message
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={settings.maintenanceNotice}
                    onChange={(e) => updateSetting('maintenanceNotice', e.target.value)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
              )}
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.systemMaintenanceMode}
                onChange={(e) => updateSetting('systemMaintenanceMode', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 5: ENGINE & PERFORMANCE
          ==================================================================== */}
      {activeTab === 'engine' && (
        <div className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-title">
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <div>
                <h3>System Engine &amp; Cache Performance</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Database persistence, client telemetry latency diagnostics, and query cache settings.
                </div>
              </div>
            </div>
          </div>

          {/* Database Persistence */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>🗄️</span>
                <span>Active Database Architecture</span>
              </label>
              <div className="settings-control-desc">
                Primary persistence engine backing user profiles, levels, official accounts, and audit ledgers.
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.35rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#38bdf8' }}>
              {settings.databasePersistence}
            </div>
          </div>

          {/* Cache Duration */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>💾</span>
                <span>Dashboard Telemetry Cache Window</span>
              </label>
              <div className="settings-control-desc">
                Frequency for invalidating and recalculating heavy aggregation metrics.
              </div>
            </div>
            <select
              className="input-field"
              value={settings.cacheDurationSeconds}
              onChange={(e) => updateSetting('cacheDurationSeconds', parseInt(e.target.value))}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value={10}>10 Seconds (Ultra Live)</option>
              <option value={30}>30 Seconds (Balanced Default)</option>
              <option value={60}>60 Seconds</option>
              <option value={300}>5 Minutes (High Traffic Mode)</option>
            </select>
          </div>

          {/* Default Items Per Page */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>📄</span>
                <span>Default Repository Pagination Limit</span>
              </label>
              <div className="settings-control-desc">
                Standard items-per-page grid size across Submissions, Official Accounts, and User directories.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[9, 12, 18, 24].map(limit => (
                <button
                  key={limit}
                  type="button"
                  className={`settings-preset-chip ${settings.defaultItemsPerPage === limit ? 'active' : ''}`}
                  onClick={() => updateSetting('defaultItemsPerPage', limit)}
                >
                  {limit} items
                </button>
              ))}
            </div>
          </div>

          {/* Latency Diagnostics */}
          <div className="settings-control-row">
            <div className="settings-control-info">
              <label className="settings-control-label">
                <span>📡</span>
                <span>Real-Time API Latency Diagnostics</span>
              </label>
              <div className="settings-control-desc">
                Displays live backend response times in milliseconds in the portal status pill badge.
              </div>
            </div>
            <label className="settings-toggle-switch">
              <input
                type="checkbox"
                checked={settings.enableLatencyDiagnostics}
                onChange={(e) => updateSetting('enableLatencyDiagnostics', e.target.checked)}
              />
              <span className="settings-toggle-slider" />
            </label>
          </div>
        </div>
      )}

      {/* Floating Save Actions Footer */}
      <div
        className="glass-panel"
        style={{
          padding: '1.15rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderTop: '2px solid rgba(99, 102, 241, 0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            {hasUnsavedChanges
              ? '⚠️ Unsaved modifications pending'
              : '✓ All settings in sync with browser persistence'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {hasUnsavedChanges && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDiscard}
              style={{ fontSize: '0.85rem', padding: '0.55rem 1.15rem' }}
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            style={{
              fontSize: '0.88rem',
              padding: '0.6rem 1.6rem',
              fontWeight: 700,
              opacity: hasUnsavedChanges ? 1 : 0.65
            }}
          >
            💾 Save Settings
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div
          className="portal-modal-backdrop"
          onClick={() => setIsResetConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '460px', borderTop: '4px solid var(--status-rejected)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.4rem' }}>↺</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
                  Reset All Settings to Factory Defaults?
                </h3>
              </div>
              <button
                type="button"
                className="portal-modal-close-btn"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="portal-modal-body">
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This action will restore all submission cooldowns, XP action yields, daily quotas, and system alerts to their factory baseline configuration.
              </p>
            </div>

            <div className="portal-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleResetToDefaults}
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
