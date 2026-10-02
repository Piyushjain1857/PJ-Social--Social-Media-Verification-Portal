import React, { useState } from 'react';
import { submitSuperAdminAdjustXP } from '../../../services/superAdminGamificationApi';

export default function SuperAdminXPAdjustmentModal({
  user,
  isOpen,
  onClose,
  onSuccess
}) {
  const [type, setType] = useState('ADD'); // 'ADD' | 'REMOVE'
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState('Super Admin institutional merit award');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !user) return null;

  const currentXP = user.totalXP ?? user.totalPoints ?? 0;
  const parsedAmount = Math.max(1, parseInt(amount, 10) || 0);
  const delta = type === 'REMOVE' ? -parsedAmount : parsedAmount;
  const projectedXP = Math.max(0, currentXP + delta);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConfirmed) {
      setError('You must acknowledge the compliance confirmation checkbox before executing this adjustment.');
      return;
    }

    if (!reason || !reason.trim() || reason.trim().length < 3) {
      setError('Please provide a mandatory justification reason (at least 3 characters).');
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Adjustment amount must be a positive integer greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitSuperAdminAdjustXP(user.id, {
        type,
        amount: parsedAmount,
        reason: reason.trim()
      });

      if (res && res.success) {
        if (onSuccess) onSuccess(res.data || res);
        onClose();
      } else {
        throw new Error(res?.message || 'Failed to adjust XP.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while adjusting XP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const QUICK_AMOUNTS = [25, 50, 100, 250, 500, 1000];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>👑</span> Super Admin Governance
            </div>
            <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--text-highlight)', fontSize: '1.25rem' }}>
              Manual XP Balance Adjustment
            </h3>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Advisory Warning */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fef3c7',
            fontSize: '0.84rem',
            lineHeight: 1.45,
            marginBottom: '1.25rem'
          }}
        >
          <strong>⚠️ Institutional Audit Notice:</strong> You are about to directly modify this user's XP balance. This operation creates an immutable <code>PointTransaction</code> and a permanent <code>AuditLog</code> with your Super Admin credentials.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Target User Info */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-highlight)', fontSize: '0.95rem' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {user.email} (ID: {user.id.slice(0, 8)}…)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Current Balance</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                {currentXP.toLocaleString()} XP
              </div>
            </div>
          </div>

          {/* Adjustment Type Toggle */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.84rem' }}>
              Adjustment Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setType('ADD')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: `1px solid ${type === 'ADD' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: type === 'ADD' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                  color: type === 'ADD' ? '#6ee7b7' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>➕</span> Add XP (Bonus / Reward)
              </button>

              <button
                type="button"
                onClick={() => setType('REMOVE')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: `1px solid ${type === 'REMOVE' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: type === 'REMOVE' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                  color: type === 'REMOVE' ? '#fca5a5' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>➖</span> Remove XP (Deduction)
              </button>
            </div>
          </div>

          {/* Amount Selector */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.84rem' }}>
              XP Amount
            </label>
            <input
              type="number"
              min="1"
              max="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-portal"
              placeholder="e.g. 50"
              required
              style={{
                width: '100%',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: type === 'ADD' ? '#6ee7b7' : '#fca5a5',
                textAlign: 'center'
              }}
            />

            {/* Quick Amount Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  style={{
                    flex: '1 1 50px',
                    padding: '0.35rem 0.5rem',
                    background: amount === q ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {type === 'ADD' ? '+' : '-'}{q}
                </button>
              ))}
            </div>
          </div>

          {/* Live Projection Card */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.84rem'
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Projected New Balance:</span>
            <span>
              <del style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>{currentXP.toLocaleString()} XP</del>
              <strong style={{ color: '#38bdf8', fontSize: '1.05rem' }}>{projectedXP.toLocaleString()} XP</strong>
            </span>
          </div>

          {/* Reason Input */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.84rem' }}>
              Mandatory Justification Reason <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              className="input-portal"
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the institutional reason for audit trail…"
              required
              style={{ width: '100%', fontSize: '0.84rem' }}
            />
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.75rem',
              background: 'rgba(245, 158, 11, 0.06)',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}
          >
            <input
              type="checkbox"
              id="superadmin-confirm-checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              style={{ marginTop: '0.2rem', cursor: 'pointer', accentColor: '#f59e0b' }}
            />
            <label
              htmlFor="superadmin-confirm-checkbox"
              style={{ fontSize: '0.8rem', color: '#fef3c7', cursor: 'pointer', lineHeight: 1.4 }}
            >
              <strong>You are about to modify this user's XP.</strong> I confirm this manual adjustment complies with institutional audit guidelines and policy rules.
            </label>
          </div>

          {error && (
            <div className="alert-box error" style={{ fontSize: '0.84rem' }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-portal-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-portal-primary"
              disabled={isSubmitting || !isConfirmed}
              style={{
                background: type === 'ADD'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff',
                fontWeight: 800
              }}
            >
              {isSubmitting ? 'Recording Audit…' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
