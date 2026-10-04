import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset, verifyResetToken, confirmPasswordReset } from '../services/api';

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

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot-password' | 'reset-password'
  const [formData, setFormData] = useState({
    name: '',
    email: 'superadmin@portal.com',
    password: 'SuperAdmin123!',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Reset password state
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  // Check URL parameters for password reset token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let token = params.get('token');
    if (!token && window.location.hash.includes('token=')) {
      const hashQuery = window.location.hash.split('?')[1] || '';
      const hashParams = new URLSearchParams(hashQuery);
      token = hashParams.get('token');
    }

    if (token) {
      setIsVerifyingToken(true);
      setLocalError('');
      verifyResetToken(token)
        .then((res) => {
          if (res.success && res.valid) {
            setResetToken(token);
            setMode('reset-password');
          } else {
            setLocalError(res.message || 'This password reset link is invalid or has expired.');
            setMode('login');
          }
        })
        .catch((err) => {
          setLocalError(err.message || 'The password reset link is invalid or has expired.');
          setMode('login');
        })
        .finally(() => {
          setIsVerifyingToken(false);
        });
    }
  }, []);

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
    setSuccessBanner('');
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
    setSuccessBanner('');
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
    setSuccessBanner('');
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

  // Handle Request Password Reset
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessBanner('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotEmail.trim() || !emailRegex.test(forgotEmail.trim())) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setIsSubmitting(false);
      if (res.success) {
        setForgotSubmitted(true);
      } else {
        setLocalError(res.message || 'Failed to submit password reset request.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setLocalError(err.message || 'Unable to request password reset. Please try again.');
    }
  };

  // Handle Confirm Password Reset
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessBanner('');

    if (!resetNewPassword) {
      setLocalError('Please enter a new password.');
      return;
    }

    if (resetNewPassword.length < 8) {
      setLocalError('New password must be at least 8 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setLocalError('New password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmPasswordReset({
        token: resetToken,
        newPassword: resetNewPassword,
        confirmPassword: resetConfirmPassword,
      });
      setIsSubmitting(false);

      if (res.success) {
        setSuccessBanner('Your password was changed successfully! You can now sign in with your new credentials.');
        setMode('login');
        setResetToken('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setFormData((prev) => ({ ...prev, password: '' }));

        // Clean query param from URL without page reload
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.replaceState({}, document.title, url.pathname + url.hash);
        } catch {}
      } else {
        setLocalError(res.message || 'Password reset failed.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setLocalError(err.message || 'Password reset failed. The token may be expired or invalid.');
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3.5rem) clamp(0.75rem, 3vw, 1.5rem)', maxWidth: '580px' }}>
      <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-logo-icon" style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', fontSize: '1.5rem' }}>
            {mode === 'forgot-password' ? '🔐' : mode === 'reset-password' ? '🔑' : '🛡️'}
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', marginBottom: '0.4rem' }}>
            {mode === 'login' && 'Account Authentication'}
            {mode === 'register' && 'Create Creator Account'}
            {mode === 'forgot-password' && 'Reset Your Password'}
            {mode === 'reset-password' && 'Set New Password'}
          </h2>
          <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-secondary)' }}>
            {mode === 'login' && 'Sign in to access your role-governed verification workspace.'}
            {mode === 'register' && 'Register for community social activity verification.'}
            {mode === 'forgot-password' && 'Enter your email to receive a secure, short-lived reset link.'}
            {mode === 'reset-password' && 'Choose a strong replacement password for your account.'}
          </p>
        </div>

        {/* Token Verification Spinner */}
        {isVerifyingToken && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--primary-light)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ⏳ Validating password reset link...
          </div>
        )}

        {/* Mode Toggle Tabs (Visible on login & register) */}
        {(mode === 'login' || mode === 'register') && (
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', padding: '0.3rem', borderRadius: 'var(--radius-full)', marginBottom: '1.75rem' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setLocalError(''); setSuccessBanner(''); clearError(); }}
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
              onClick={() => { setMode('register'); setLocalError(''); setSuccessBanner(''); clearError(); }}
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
        )}

        {/* Success Alert Banner */}
        {successBanner && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>✓ {successBanner}</span>
            <button
              type="button"
              onClick={() => setSuccessBanner('')}
              style={{ color: '#34d399', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

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
              style={{ color: 'var(--status-error)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── 1. LOGIN & REGISTER FORM ── */}
        {(mode === 'login' || mode === 'register') && (
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

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="auth-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ fontSize: '0.78rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer' }}
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

            {/* Forgot Password Link (login only) */}
            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setForgotEmail(formData.email || '');
                    setLocalError('');
                    setSuccessBanner('');
                    clearError();
                    setForgotSubmitted(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-light)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* {mode === 'register' && (
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                🛡️ <strong>Server-Enforced Role:</strong> Public registrations are automatically assigned the <code>USER</code> role. Administrative roles (<code>SUPER_ADMIN</code>, <code>ADMIN</code>) are strictly provisioned by platform governors.
              </div>
            )} */}

            <button
              type="submit"
              id="auth-submit-btn"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: mode === 'register' ? 0 : '0.5rem' }}
            >
              <span>{isSubmitting ? 'Authenticating...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}</span>
            </button>
          </form>
        )}

        {/* ── 2. FORGOT PASSWORD FLOW ── */}
        {mode === 'forgot-password' && (
          <div>
            {forgotSubmitted ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Check Your Email</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  If an account exists with the address <strong>{forgotEmail}</strong>, we have dispatched a password reset link.
                  The link is cryptographically secured, single-use, and valid for <strong>1 hour</strong>.
                </p>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
                  💡 <em>Didn't receive the email? Check your spam folder or wait 5 minutes before submitting another request.</em>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setMode('login');
                    setForgotSubmitted(false);
                    setLocalError('');
                  }}
                  style={{ width: '100%', padding: '0.8rem' }}
                >
                  ← Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="forgot-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-highlight)' }}>
                    Your Account Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
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
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    We will send a cryptographically verified, single-use reset link.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting || !forgotEmail.trim()}
                    style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                  >
                    <span>{isSubmitting ? 'Dispatching Reset Link…' : 'Send Password Reset Link →'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setMode('login');
                      setLocalError('');
                    }}
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem' }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── 3. RESET PASSWORD FLOW ── */}
        {mode === 'reset-password' && (
          <form onSubmit={handleResetPasswordSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="reset-new-pass" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetNewPass(!showResetNewPass)}
                  style={{ fontSize: '0.78rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showResetNewPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="reset-new-pass"
                type={showResetNewPass ? 'text' : 'password'}
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
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
              {resetNewPassword && (
                <div style={{ fontSize: '0.74rem', marginTop: '0.35rem', color: resetNewPassword.length >= 8 ? '#34d399' : 'var(--text-muted)' }}>
                  {resetNewPassword.length >= 8 ? '✓ Length requirement satisfied' : `• ${8 - resetNewPassword.length} more characters needed`}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="reset-confirm-pass" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)' }}>
                  Confirm New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                  style={{ fontSize: '0.78rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showResetConfirmPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="reset-confirm-pass"
                type={showResetConfirmPass ? 'text' : 'password'}
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
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
              {resetConfirmPassword && (
                <div style={{ fontSize: '0.74rem', marginTop: '0.35rem', color: resetNewPassword === resetConfirmPassword ? '#34d399' : '#f87171' }}>
                  {resetNewPassword === resetConfirmPassword ? '✓ Passwords match' : '⚠️ Passwords do not match'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || resetNewPassword.length < 8 || resetNewPassword !== resetConfirmPassword}
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
              >
                <span>{isSubmitting ? 'Updating Password…' : 'Reset Password & Proceed →'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setMode('login');
                  setLocalError('');
                }}
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem' }}
              >
                Cancel &amp; Return to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Demo Roles Quick Switcher (only on login mode) */}
        {mode === 'login' && (
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
        )}
      </div>
    </div>
  );
}
