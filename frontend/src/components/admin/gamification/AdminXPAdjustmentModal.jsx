import React, { useState } from 'react';
import { submitAdminAdjustXP } from '../../../services/adminGamificationApi';

export default function AdminXPAdjustmentModal({
  user,
  isOpen,
  onClose,
  onSuccess
}) {
  const [type, setType] = useState('ADD'); // 'ADD' | 'REMOVE'
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState('Event participation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !user) return null;

  const currentXP = user.totalXP ?? user.totalPoints ?? 0;
  const parsedAmount = Math.max(1, parseInt(amount, 10) || 0);
  const delta = type === 'REMOVE' ? -parsedAmount : parsedAmount;
  const projectedXP = Math.max(0, currentXP + delta);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || !reason.trim() || reason.trim().length < 3) {
      setError('Please provide a meaningful justification reason (at least 3 characters).');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Adjustment amount must be a positive integer greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitAdminAdjustXP(user.id, {
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

  const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '520px',
          background: '#0b1120',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-highlight)' }}>
              ✏️ Adjust User XP
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Creates an immutable, audited XP transaction for creator
            </p>
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
            ×
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
            <div style={{ fontWeight: 700, color: 'var(--text-highlight)' }}>{user.name}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{user.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Current Balance</div>
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

        <form onSubmit={handleSubmit}>
          {/* Adjustment Type Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Adjustment Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setType('ADD')}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: type === 'ADD' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: type === 'ADD' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: type === 'ADD' ? '#34d399' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>➕</span> Add XP Bonus
              </button>
              <button
                type="button"
                onClick={() => setType('REMOVE')}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: type === 'REMOVE' ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: type === 'REMOVE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: type === 'REMOVE' ? '#f87171' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>➖</span> Remove XP
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
                      background: amount === amt ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: amount === amt ? '#818cf8' : 'var(--text-muted)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
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
              max="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600
              }}
            />
          </div>

          {/* Reason Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Justification Reason <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Event participation, Hackathon winner, Duplicate activity correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Balance Preview */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px dashed rgba(99, 102, 241, 0.3)',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.88rem'
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Projected Balance:</span>
            <span>
              <strong style={{ color: 'var(--text-muted)' }}>{currentXP.toLocaleString()} XP</strong>
              {' ➔ '}
              <strong style={{ color: type === 'ADD' ? '#34d399' : '#f87171' }}>
                {projectedXP.toLocaleString()} XP
              </strong>
              {' '}
              <span style={{ fontSize: '0.8rem', color: type === 'ADD' ? '#34d399' : '#f87171' }}>
                ({delta > 0 ? '+' : ''}{delta} XP)
              </span>
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
              disabled={isSubmitting}
              style={{
                background: type === 'ADD' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                borderColor: type === 'ADD' ? '#10b981' : '#ef4444'
              }}
            >
              {isSubmitting ? 'Adjusting XP...' : `Confirm ${type === 'ADD' ? 'Bonus' : 'Deduction'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
