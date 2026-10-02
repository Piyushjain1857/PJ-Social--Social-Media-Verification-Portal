import React, { useState } from 'react';
import { submitSuperAdminAdjustXP } from '../../../services/superAdminGamificationApi';

export default function SuperAdminXPAdjustmentModal({
  user,
  isOpen,
  onClose,
  onSuccess
}) {
  const [step, setStep] = useState('input'); // 'input' | 'confirm'
  const [type, setType] = useState('ADD'); // 'ADD' | 'REMOVE'
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState('Super Admin institutional merit award');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !user) return null;

  const currentXP = user.totalXP ?? user.totalPoints ?? 0;
  const numAmount = Number(amount);
  const isValidInteger = !isNaN(numAmount) && numAmount > 0 && Number.isInteger(numAmount);
  const parsedAmount = isValidInteger ? numAmount : 0;
  const delta = type === 'REMOVE' ? -parsedAmount : parsedAmount;
  const projectedXP = Math.max(0, currentXP + delta);

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    if (!isValidInteger || parsedAmount <= 0) {
      setError('Adjustment amount must be a positive integer greater than zero.');
      return;
    }
    if (!reason || !reason.trim() || reason.trim().length < 3) {
      setError('Please provide a mandatory justification reason (at least 3 characters).');
      return;
    }
    if (type === 'REMOVE') {
      if (currentXP <= 0) {
        setError('Creator currently has 0 XP balance and cannot have XP deducted.');
        return;
      }
      if (parsedAmount > currentXP) {
        setError(`Cannot deduct ${parsedAmount} XP. User only has ${currentXP.toLocaleString()} XP balance.`);
        return;
      }
    }
    setError(null);
    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    if (!isConfirmed) {
      setError('You must acknowledge the compliance confirmation checkbox before executing this adjustment.');
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
      setStep('input');
    } finally {
      setIsSubmitting(false);
    }
  };

  const QUICK_AMOUNTS = [25, 50, 100, 250, 500, 1000];

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#0d1527',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.12)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>👑</span> Super Admin Governance
            </div>
            <h3 style={{ margin: '0.2rem 0 0 0', color: 'var(--text-highlight)', fontSize: '1.3rem', fontWeight: 800 }}>
              Manual XP Balance Adjustment
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* User Snapshot Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-highlight)', fontSize: '0.95rem' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {user.email} · ID: {user.id ? `${user.id.slice(0, 8)}…` : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Current Balance</div>
            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.1rem' }}>
              {currentXP.toLocaleString()} XP
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}
          >
            {error}
          </div>
        )}

        {step === 'confirm' ? (
          /* Step 2: Confirmation Dialog */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fef3c7'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                <span>⚠️</span> Confirmation Required (Super Admin Governance)
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#fde68a', lineHeight: 1.45 }}>
                You are about to execute an audited <strong>SUPER_ADMIN_ADJUSTMENT</strong>. This will create an immutable <code>PointTransaction</code>, update creator balances, recalculate levels/rank, and record a permanent <code>AuditLog</code>.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target User:</span>
                <strong style={{ color: 'var(--text-highlight)' }}>{user.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Action:</span>
                <strong style={{ color: type === 'ADD' ? '#34d399' : '#f87171' }}>
                  {type === 'ADD' ? `➕ Add +${parsedAmount} XP Reward` : `➖ Deduct -${parsedAmount} XP`}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reason:</span>
                <span style={{ color: 'var(--text-secondary)', maxWidth: '65%', textAlign: 'right' }}>"{reason.trim()}"</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Actor:</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>Super Admin</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date &amp; Time:</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{new Date().toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Balance Impact:</span>
                <span>
                  <span style={{ color: 'var(--text-secondary)' }}>{currentXP.toLocaleString()} XP</span>
                  {' ➔ '}
                  <strong style={{ color: type === 'ADD' ? '#34d399' : '#f87171' }}>{projectedXP.toLocaleString()} XP</strong>
                </span>
              </div>
            </div>

            {/* Compliance Confirmation Checkbox */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.85rem',
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
                style={{ fontSize: '0.82rem', color: '#fef3c7', cursor: 'pointer', lineHeight: 1.45 }}
              >
                <strong>Compliance Declaration:</strong> I confirm this manual XP adjustment adheres to portal policies and institutional audit standards.
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-portal-secondary"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
              >
                ← Back to Edit
              </button>
              <button
                type="button"
                className="btn-portal-primary"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || !isConfirmed}
                style={{
                  background: type === 'ADD'
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  borderColor: type === 'ADD' ? '#10b981' : '#ef4444',
                  fontWeight: 800,
                  opacity: (!isConfirmed || isSubmitting) ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Recording Audit & XP...' : `✓ Confirm & Execute ${type === 'ADD' ? 'Reward' : 'Deduction'}`}
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Input Form */
          <form onSubmit={handleProceedToConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Adjustment Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
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
                  <span>➕</span> Add XP (Reward)
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Amount (XP)
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      style={{
                        background: Number(amount) === amt ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        color: Number(amount) === amt ? '#fbbf24' : 'var(--text-muted)',
                        padding: '0.15rem 0.45rem',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="number"
                min="1"
                max="100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: type === 'ADD' ? '#6ee7b7' : '#fca5a5',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  textAlign: 'center'
                }}
              />
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
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                Mandatory Justification Reason <span style={{ color: '#f87171' }}>*</span>
              </label>
              <textarea
                rows="2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the institutional reason for audit trail…"
                required
                minLength={3}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: '#fff',
                  fontSize: '0.88rem'
                }}
              />
            </div>

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
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderColor: '#f59e0b',
                  color: '#000',
                  fontWeight: 800
                }}
              >
                Proceed to Confirmation →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
