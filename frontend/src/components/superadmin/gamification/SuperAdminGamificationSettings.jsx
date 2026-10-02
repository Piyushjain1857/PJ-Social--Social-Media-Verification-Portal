import React, { useState, useEffect } from 'react';
import {
  fetchGamificationSettings,
  updateGamificationSettings
} from '../../../services/superAdminGamificationApi';
import { gamificationRealtimeClient } from '../../../services/gamificationRealtimeClient';

export default function SuperAdminGamificationSettings({ onSettingsUpdated }) {
  const [settings, setSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editedSettings, setEditedSettings] = useState({});
  const [reason, setReason] = useState('Quarterly creator incentive calibration');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetchGamificationSettings();
      if (res && res.success) {
        setSettings(res.data || []);
        // Initialize editable map
        const map = {};
        (res.data || []).forEach((s) => {
          map[s.activity] = {
            xp: s.xp,
            isActive: s.isActive,
            description: s.description || ''
          };
        });
        setEditedSettings(map);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not load gamification settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();

    // Real-time synchronization when rules are updated
    const unsubscribe = gamificationRealtimeClient.subscribe((event) => {
      if (event === 'rules_updated') {
        loadSettings();
      }
    });

    return () => unsubscribe();
  }, []);


  const handleXPChange = (activity, val) => {
    const parsed = Math.max(0, parseInt(val, 10) || 0);
    setEditedSettings((prev) => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        xp: parsed
      }
    }));
  };

  const handleToggleActive = (activity) => {
    setEditedSettings((prev) => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        isActive: !prev[activity]?.isActive
      }
    }));
  };

  const handleDescriptionChange = (activity, desc) => {
    setEditedSettings((prev) => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        description: desc
      }
    }));
  };

  const handleSaveConfirmed = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const updates = Object.entries(editedSettings).map(([activity, data]) => ({
        activity,
        xp: data.xp,
        isActive: data.isActive,
        description: data.description
      }));

      const res = await updateGamificationSettings(updates, reason);
      if (res && res.success) {
        setFeedback({
          type: 'success',
          text: '✅ Gamification activity points updated and database synchronized! All future submissions will use these updated values.'
        });
        setShowConfirmModal(false);
        await loadSettings();
        if (onSettingsUpdated) onSettingsUpdated();
      } else {
        throw new Error(res?.message || 'Failed to save settings.');
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Error updating settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⌛</div>
        <div>Loading institutional gamification activity rules...</div>
      </div>
    );
  }

  const hasModifications = settings.some((s) => {
    const edited = editedSettings[s.activity];
    return edited && (edited.xp !== s.xp || edited.isActive !== s.isActive || edited.description !== s.description);
  });

  return (
    <div className="superadmin-gamification-settings">
      {/* Header & Notice */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-highlight)', fontWeight: 800, fontSize: '1.25rem' }}>
          ⚙️ Activity XP Points Configuration
        </h3>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Configure dynamic point allocations per social media activity. Stored in database and applied to all future approved submissions.
        </p>
      </div>

      {/* Safety Guardrail Banner */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          fontSize: '0.86rem',
          marginBottom: '1.75rem'
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
        <div style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#38bdf8' }}>Immutable Historical Rule Safety:</strong> Modifying activity point values (e.g. LIKE from 1 → 5 XP) strictly impacts <strong>future approved submissions only</strong>. Historical transactions and existing user XP remain untouched and mathematically preserved.
        </div>
      </div>

      {feedback && (
        <div className={`alert-box ${feedback.type}`} style={{ marginBottom: '1.5rem' }}>
          {feedback.text}
        </div>
      )}

      {/* Activity Settings Table / Cards */}
      <div className="admin-dash-panel" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {settings.map((s) => {
            const current = editedSettings[s.activity] || { xp: s.xp, isActive: s.isActive, description: s.description };
            const isChanged = current.xp !== s.xp || current.isActive !== s.isActive;

            return (
              <div
                key={s.id || s.activity}
                className={`superadmin-rule-row ${isChanged ? 'is-changed' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
                  <div className="superadmin-rule-icon">
                    {s.activity === 'LIKE' ? '👍' : (s.activity === 'COMMENT' ? '💬' : '📱')}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-highlight)', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                        {s.activity}
                      </span>
                      {isChanged && (
                        <span style={{ fontSize: '0.72rem', background: '#38bdf8', color: '#0f172a', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          Modified
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Current active: <strong style={{ color: '#38bdf8' }}>{s.xp} XP</strong> per verification
                    </div>
                  </div>
                </div>

                {/* Description Input */}
                <div style={{ flex: '1 1 260px' }}>
                  <input
                    type="text"
                    className="input-portal"
                    value={current.description}
                    onChange={(e) => handleDescriptionChange(s.activity, e.target.value)}
                    placeholder="Rule description or institutional policy note…"
                    style={{ fontSize: '0.82rem', width: '100%', background: 'rgba(255, 255, 255, 0.03)' }}
                  />
                </div>

                {/* XP Input & Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Points (XP):</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={current.xp}
                      onChange={(e) => handleXPChange(s.activity, e.target.value)}
                      className="input-portal"
                      style={{
                        width: '80px',
                        padding: '0.5rem',
                        fontWeight: 800,
                        color: '#38bdf8',
                        textAlign: 'center',
                        fontSize: '1.05rem',
                        fontFamily: 'var(--font-mono, monospace)',
                        background: 'rgba(56, 189, 248, 0.06)',
                        borderColor: 'rgba(56, 189, 248, 0.25)'
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(s.activity)}
                    className={`superadmin-toggle-active ${current.isActive ? 'active' : 'disabled'}`}
                  >
                    <span>{current.isActive ? '●' : '○'}</span>
                    <span>{current.isActive ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Action & Reason Section */}
      <div className="admin-dash-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-highlight)' }}>
          Policy Change Justification
        </h4>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Every configuration change creates a permanent audit record capturing the Super Admin actor, previous values, new values, and this mandatory justification.
        </p>

        <textarea
          className="input-portal"
          rows="2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="State reason for points adjustment policy (e.g. Campaign incentive, platform milestone recalibration)…"
          style={{ width: '100%', marginBottom: '1.25rem', fontSize: '0.86rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-portal-secondary"
            onClick={loadSettings}
            disabled={isSaving}
          >
            <span>↺</span> Reset Form
          </button>
          <button
            type="button"
            className="btn-portal-primary"
            onClick={() => setShowConfirmModal(true)}
            disabled={!hasModifications || isSaving || !reason.trim()}
          >
            <span>💾</span> Save Gamification Configuration
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-container admin-dash-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '1.75rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-highlight)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span> Confirm Gamification Rules Update
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              You are about to modify global gamification point allocations for all creators. This action will be permanently recorded in the system audit log.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.84rem' }}>
              {settings.map((s) => {
                const updated = editedSettings[s.activity];
                if (!updated || updated.xp === s.xp) return null;
                return (
                  <div key={s.activity} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{s.activity}:</span>
                    <span>
                      <del style={{ color: 'var(--text-muted)' }}>{s.xp} XP</del> → <strong style={{ color: '#38bdf8' }}>{updated.xp} XP</strong>
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                Reason: "{reason}"
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-portal-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-portal-primary"
                onClick={handleSaveConfirmed}
                disabled={isSaving}
              >
                {isSaving ? 'Synchronizing Rules…' : '✓ Confirm & Apply Rules'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
