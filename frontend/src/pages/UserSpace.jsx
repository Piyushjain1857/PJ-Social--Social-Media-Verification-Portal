import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMySubmissions,
  createSubmission,
  fetchMyNotifications,
  testRestrictedEndpoint
} from '../services/api';

export default function UserSpace({ onNavigate }) {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'create' | 'notifications' | 'rbac-test'
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // New submission form state
  const [formData, setFormData] = useState({
    platform: 'INSTAGRAM',
    actionType: 'LIKE',
    postUrl: '',
    screenshotUrl: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // RBAC test probe state
  const [rbacTestResult, setRbacTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  const loadUserData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [subRes, notifRes] = await Promise.all([
        fetchMySubmissions(),
        fetchMyNotifications()
      ]);
      if (subRes.success) setSubmissions(subRes.data || []);
      if (notifRes.success) setNotifications(notifRes.data || []);
    } catch (err) {
      setApiError(err.message || 'Failed to load user records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleCreateSubmission = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const result = await createSubmission(formData);
      if (result.success) {
        setSuccessMessage('Activity submission created successfully and queued for admin verification!');
        setFormData({
          platform: 'INSTAGRAM',
          actionType: 'LIKE',
          postUrl: '',
          screenshotUrl: '',
          description: ''
        });
        setActiveTab('submissions');
        await loadUserData();
      }
    } catch (err) {
      setApiError(err.message || 'Failed to create submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const runRbacTest = async (endpoint, label) => {
    setTestingEndpoint(true);
    setRbacTestResult(null);
    try {
      const res = await testRestrictedEndpoint(endpoint);
      setRbacTestResult({
        endpoint,
        label,
        ...res
      });
    } catch (err) {
      setRbacTestResult({
        endpoint,
        label,
        allowed: false,
        status: err.status || 403,
        message: err.message,
        data: err.data
      });
    } finally {
      setTestingEndpoint(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'APPROVED') return <span className="badge badge-success">✓ APPROVED</span>;
    if (status === 'REJECTED') return <span className="badge badge-error">✕ REJECTED</span>;
    return <span className="badge badge-warning">⏳ PENDING REVIEW</span>;
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--role-user)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-user">ROLE: CREATOR USER</span>
              <span className="badge badge-success">ACCOUNT ACTIVE</span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>🚀 Creator Activity Workspace</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Logged in as <strong>{user?.name}</strong> ({user?.email}). You have permissions to submit activity proof, view your own submissions, and access your profile & notifications.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('portal')}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              Public Landing
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={logout}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'var(--status-error)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
          style={{
            background: activeTab === 'submissions' ? 'var(--role-user)' : 'transparent',
            color: activeTab === 'submissions' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'submissions' ? 'var(--role-user)' : 'var(--border-subtle)',
            fontSize: '0.88rem'
          }}
        >
          📋 My Submissions ({submissions.length})
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
          style={{
            background: activeTab === 'create' ? 'var(--role-user)' : 'transparent',
            color: activeTab === 'create' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'create' ? 'var(--role-user)' : 'var(--border-subtle)',
            fontSize: '0.88rem'
          }}
        >
          ➕ Submit Activity Proof
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
          style={{
            background: activeTab === 'notifications' ? 'var(--role-user)' : 'transparent',
            color: activeTab === 'notifications' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'notifications' ? 'var(--role-user)' : 'var(--border-subtle)',
            fontSize: '0.88rem'
          }}
        >
          🔔 Notifications ({notifications.length})
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'rbac-test' ? 'active' : ''}`}
          onClick={() => setActiveTab('rbac-test')}
          style={{
            background: activeTab === 'rbac-test' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            color: activeTab === 'rbac-test' ? 'var(--status-error)' : 'var(--text-secondary)',
            borderColor: activeTab === 'rbac-test' ? 'var(--status-error)' : 'var(--border-subtle)',
            fontSize: '0.88rem'
          }}
        >
          🛡️ RBAC API Defense Probe
        </button>
      </div>

      {/* Status Alerts */}
      {successMessage && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)' }}>
          {successMessage}
        </div>
      )}
      {apiError && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)' }}>
          {apiError}
        </div>
      )}

      {/* TAB 1: My Submissions */}
      {activeTab === 'submissions' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>My Verified Activities</h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={loadUserData}
              disabled={isLoading}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📤</div>
              <p>No activity submissions found.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveTab('create')}
                style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}
              >
                Submit Your First Activity Proof
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    padding: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-outline" style={{ fontWeight: 600 }}>
                        {sub.platform}
                      </span>
                      <span className="badge badge-outline">
                        {sub.actionType}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        ID: {sub.id}
                      </span>
                    </div>
                    <div>
                      {getStatusBadge(sub.status)}
                    </div>
                  </div>

                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>
                    {sub.description || 'No description provided.'}
                  </p>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    <strong>Post URL:</strong>{' '}
                    <a
                      href={sub.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--brand-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                      {sub.postUrl}
                    </a>
                  </div>

                  {sub.reviews && sub.reviews.length > 0 && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>
                        🛡️ Moderator Feedback ({sub.reviews[0].adminName || 'Admin'}):
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {sub.reviews[0].feedback || 'No written feedback attached.'}
                      </p>
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    Submitted on {new Date(sub.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Submit Activity Proof */}
      {activeTab === 'create' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '700px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>
            Submit Social Media Activity Proof
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Permission Granted: <strong>USER</strong> role is authorized to submit proof via <code style={{ color: 'var(--brand-primary)' }}>POST /api/submissions</code>.
          </p>

          <form onSubmit={handleCreateSubmission}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    outline: 'none'
                  }}
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="FACEBOOK">Facebook</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Action Type
                </label>
                <select
                  value={formData.actionType}
                  onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    outline: 'none'
                  }}
                >
                  <option value="LIKE">Like / Reaction</option>
                  <option value="COMMENT">Comment</option>
                  <option value="STORY">24h Story Share</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Target Post / Story URL *
              </label>
              <input
                type="url"
                required
                placeholder="https://instagram.com/p/... or https://linkedin.com/feed/..."
                value={formData.postUrl}
                onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Screenshot Proof URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/screenshot.jpg"
                value={formData.screenshotUrl}
                onChange={(e) => setFormData({ ...formData, screenshotUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Activity Description & Verification Notes
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe your interaction (e.g. Liked official launch announcement post)."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ padding: '0.7rem 1.5rem' }}
              >
                {submitting ? 'Submitting...' : 'Submit Activity Proof →'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('submissions')}
                style={{ padding: '0.7rem 1.25rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Profile & Notifications */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Identity Tile */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.15rem', marginBottom: '1rem' }}>
              Creator Profile Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="detail-tile">
                <div className="detail-label">Full Name</div>
                <div className="detail-value">{user?.name}</div>
              </div>
              <div className="detail-tile">
                <div className="detail-label">Account Email</div>
                <div className="detail-value">{user?.email}</div>
              </div>
              <div className="detail-tile">
                <div className="detail-label">Assigned Role</div>
                <div className="detail-value" style={{ color: 'var(--role-user)' }}>{user?.role}</div>
              </div>
              <div className="detail-tile">
                <div className="detail-label">User ID</div>
                <div className="detail-value" style={{ fontSize: '0.82rem' }}>{user?.id}</div>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.15rem', marginBottom: '1rem' }}>
              Notifications & Activity Updates
            </h3>
            {notifications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No notifications received yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '0.9rem',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--role-user)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-highlight)' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: RBAC API Defense Probe */}
      {activeTab === 'rbac-test' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-error">LIVE SECURITY DEFENSE TESTING</span>
            <span className="badge badge-outline">SERVER-ENFORCED</span>
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Backend Role Middleware Enforcement Probe</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            The prompt requires: <em>"Do not rely only on frontend hiding. Every protected API must be secured by backend middleware. Test each role against restricted endpoints."</em>
            <br />
            Click below to issue live requests with your current <strong>USER</strong> token against restricted backend endpoints.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={testingEndpoint}
              onClick={() => runRbacTest('/submissions', 'GET /api/submissions (Admin Review Queue)')}
              style={{ fontSize: '0.85rem' }}
            >
              🔒 Probe /api/submissions (Expect 403)
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={testingEndpoint}
              onClick={() => runRbacTest('/users', 'GET /api/users (User Directory)')}
              style={{ fontSize: '0.85rem' }}
            >
              🔒 Probe /api/users (Expect 403)
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={testingEndpoint}
              onClick={() => runRbacTest('/superadmin/audit-logs', 'GET /api/superadmin/audit-logs (Super Admin Audit Logs)')}
              style={{ fontSize: '0.85rem' }}
            >
              🔒 Probe /api/superadmin/audit-logs (Expect 403)
            </button>
          </div>

          {testingEndpoint && (
            <div style={{ padding: '1rem', color: 'var(--brand-primary)', fontSize: '0.9rem' }}>
              Sending authenticated HTTP request to backend...
            </div>
          )}

          {rbacTestResult && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: rbacTestResult.status === 403 ? '1px solid var(--status-error)' : '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-highlight)' }}>
                  Target: {rbacTestResult.label}
                </span>
                <span className={`badge ${rbacTestResult.status === 403 ? 'badge-error' : 'badge-success'}`}>
                  HTTP STATUS {rbacTestResult.status} {rbacTestResult.status === 403 ? 'FORBIDDEN' : 'OK'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: rbacTestResult.status === 403 ? 'var(--status-error)' : 'var(--status-success)' }}>
                {rbacTestResult.status === 403 ? (
                  <>🛡️ <strong>Backend Blocked Request:</strong> Server role middleware intercepted and rejected the unauthorized request as expected.</>
                ) : (
                  <>✓ Request authorized by server.</>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Server Response Payload:
              </div>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: '#e2e8f0',
                  overflowX: 'auto',
                  margin: 0
                }}
              >
                {JSON.stringify(rbacTestResult.data || rbacTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
