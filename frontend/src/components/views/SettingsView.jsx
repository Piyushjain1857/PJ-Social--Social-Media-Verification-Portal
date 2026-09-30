import React, { useState } from 'react';

export default function SettingsView() {
  const [settings, setSettings] = useState({
    submissionCooldownMinutes: 5,
    maxDailySubmissions: 20,
    requireScreenshotProof: true,
    requireFeedbackOnReject: true,
    enforceStrictRbac: true,
    sessionTimeoutHours: 24,
    databasePersistence: 'HYBRID_PRISMA_MEMORY'
  });

  const [savedFeedback, setSavedFeedback] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSavedFeedback('Verification platform settings saved successfully!');
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px' }}>
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
          ⚙️ Portal Security & Verification Policies
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Configure global verification parameters, anti-abuse cooldowns, and platform governance policies.
        </p>
      </div>

      {savedFeedback && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem' }}>
          ✓ {savedFeedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Submission Cooldown Period (Minutes)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            className="input-field"
            value={settings.submissionCooldownMinutes}
            onChange={(e) => setSettings({ ...settings, submissionCooldownMinutes: parseInt(e.target.value) || 1 })}
            style={{ maxWidth: '200px' }}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
            Enforces waiting time between submissions per creator to prevent spam.
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Maximum Daily Submissions per Creator
          </label>
          <input
            type="number"
            min="1"
            max="100"
            className="input-field"
            value={settings.maxDailySubmissions}
            onChange={(e) => setSettings({ ...settings, maxDailySubmissions: parseInt(e.target.value) || 1 })}
            style={{ maxWidth: '200px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={settings.requireScreenshotProof}
              onChange={(e) => setSettings({ ...settings, requireScreenshotProof: e.target.checked })}
            />
            <span>Require screenshot proof URL for all activity submissions</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={settings.requireFeedbackOnReject}
              onChange={(e) => setSettings({ ...settings, requireFeedbackOnReject: e.target.checked })}
            />
            <span>Mandate explanatory notes when moderators reject a submission</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={settings.enforceStrictRbac}
              disabled
            />
            <span style={{ color: 'var(--role-superadmin)', fontWeight: 600 }}>
              Strict Server-Side RBAC Enforcement (Active - Immutable)
            </span>
          </label>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.75rem' }}>
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
