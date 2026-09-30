import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    email: 'superadmin@portal.com',
    password: 'SuperAdmin123!',
    icon: '👑',
    badgeClass: 'badge-superadmin',
  },
  {
    role: 'ADMIN',
    label: 'Admin Moderator',
    email: 'admin@portal.com',
    password: 'Admin123!',
    icon: '🛡️',
    badgeClass: 'badge-admin',
  },
  {
    role: 'USER',
    label: 'Normal User',
    email: 'user@portal.com',
    password: 'User123!',
    icon: '🚀',
    badgeClass: 'badge-user',
  },
];

export default function LoginPage({ onNavigate }) {
  const { user, isAuthenticated, login, register, error: authError, clearError } = useAuth();

  // If already authenticated, redirect straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      onNavigate('dashboard');
    }
  }, [isAuthenticated, onNavigate]);

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [formData, setFormData] = useState({
    name: '',
    email: 'superadmin@portal.com',
    password: 'SuperAdmin123!',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setLocalError('');
    clearError();
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSelectDemo = (demo, autoLogin = false) => {
    setMode('login');
    setLocalError('');
    clearError();
    setFormData((prev) => ({
      ...prev,
      email: demo.email,
      password: demo.password,
    }));

    if (autoLogin) {
      triggerLogin(demo.email, demo.password);
    }
  };

  const triggerLogin = async (email, password) => {
    setIsSubmitting(true);
    setLocalError('');
    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success && res.user) {
      onNavigate('dashboard');
    } else {
      setLocalError(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!formData.password) {
      setLocalError('Please enter your password.');
      return;
    }

    if (mode === 'register') {
      const trimmedName = formData.name.trim();
      if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 70) {
        setLocalError('Full name must be between 2 and 70 characters.');
        return;
      }
      if (formData.password.length < 8) {
        setLocalError('Password must be at least 8 characters long.');
        return;
      }

      setIsSubmitting(true);
      const res = await register(trimmedName, formData.email.trim(), formData.password);
      setIsSubmitting(false);

      if (res.success && res.user) {
        onNavigate('dashboard');
      } else {
        setLocalError(res.error || 'Registration failed.');
      }
    } else {
      await triggerLogin(formData.email, formData.password);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3.5rem) clamp(0.75rem, 3vw, 1.5rem)', maxWidth: '580px' }}>
      <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-logo-icon" style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', fontSize: '1.5rem' }}>
            🛡️
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', marginBottom: '0.4rem' }}>
            {mode === 'login' ? 'Account Authentication' : 'Create Creator Account'}
          </h2>
          <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-secondary)' }}>
            {mode === 'login'
              ? 'Sign in to access your role-governed verification workspace.'
              : 'Register for community social activity verification.'}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', padding: '0.3rem', borderRadius: 'var(--radius-full)', marginBottom: '1.75rem' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setLocalError(''); clearError(); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              fontSize: '0.88rem',
              background: mode === 'login' ? 'var(--primary)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setLocalError(''); clearError(); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              fontSize: '0.88rem',
              background: mode === 'register' ? 'var(--primary)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {displayedError && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: 'var(--status-error)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>⚠️ {displayedError}</span>
            <button
              type="button"
              onClick={() => { setLocalError(''); clearError(); }}
              style={{ color: 'var(--status-error)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="reg-name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-highlight)' }}>
                Full Name
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Alex Morgan"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-highlight)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-highlight)' }}>
              Email Address
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@portal.com"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-highlight)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="auth-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ fontSize: '0.78rem', color: 'var(--primary-light)', cursor: 'pointer' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-highlight)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          {mode === 'register' && (
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🛡️ <strong>Server-Enforced Role:</strong> Public registrations are automatically assigned the <code>USER</code> role. Administrative roles (<code>SUPER_ADMIN</code>, <code>ADMIN</code>) are strictly provisioned by platform governors.
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
          >
            <span>{isSubmitting ? 'Authenticating...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}</span>
          </button>
        </form>

        {/* Demo Roles Quick Switcher */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', textAlign: 'center' }}>
            ⚡ 1-Click Demo Accounts (Test All 3 Roles)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {DEMO_ACCOUNTS.map((demo) => (
              <div
                key={demo.role}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '160px', flex: '1 1 auto' }}>
                  <span style={{ fontSize: '1.25rem' }}>{demo.icon}</span>
                  <div>
                    <span className={`badge ${demo.badgeClass}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                      {demo.label}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', wordBreak: 'break-all' }}>
                      {demo.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', flex: '0 0 auto' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleSelectDemo(demo, false)}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', minHeight: '34px' }}
                  >
                    Fill
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleSelectDemo(demo, true)}
                    disabled={isSubmitting}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', minHeight: '34px' }}
                  >
                    Instant Login
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
