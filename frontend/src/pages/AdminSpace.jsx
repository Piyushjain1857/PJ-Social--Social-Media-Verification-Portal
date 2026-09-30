import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllSubmissions,
  reviewSubmission,
  fetchUsers,
  testRestrictedEndpoint
} from '../services/api';

export default function AdminSpace({ onNavigate }) {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'users' | 'rbac-defense'
  const [submissions, setSubmissions] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Review action modal / form state
  const [selectedSubForReview, setSelectedSubForReview] = useState(null);
  const [reviewVerdict, setReviewVerdict] = useState('APPROVED'); // 'APPROVED' | 'REJECTED'
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // RBAC test probe state
  const [rbacTestResult, setRbacTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [subRes, userRes] = await Promise.all([
        fetchAllSubmissions(),
        fetchUsers()
      ]);
      if (subRes.success) setSubmissions(subRes.data || []);
      if (userRes.success) setUsersList(userRes.data || []);
    } catch (err) {
      setActionError(err.message || 'Failed to load moderator data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReviewModal = (sub, defaultStatus) => {
    setSelectedSubForReview(sub);
    setReviewVerdict(defaultStatus);
    setReviewFeedback(
      defaultStatus === 'APPROVED'
        ? 'Verified activity engagement matches criteria.'
        : 'Proof missing timestamp or required handle verification.'
    );
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedSubForReview) return;

    setSubmittingReview(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await reviewSubmission(
        selectedSubForReview.id,
        reviewVerdict,
        reviewFeedback
      );
      if (res.success) {
        setActionSuccess(`Submission #${selectedSubForReview.id} successfully marked as ${reviewVerdict}.`);
        setSelectedSubForReview(null);
        await loadData();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const runRbacTest = async (endpoint, options, label) => {
    setTestingEndpoint(true);
    setRbacTestResult(null);
    try {
      const res = await testRestrictedEndpoint(endpoint, options);
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

  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--role-admin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-admin">ROLE: ADMIN MODERATOR</span>
              <span className="badge badge-success">VERIFICATION AUTHORITY</span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>🛡️ Admin Moderation Workspace</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Logged in as <strong>{user?.name}</strong> ({user?.email}). You have authority to review submissions and view relevant user directories. Cannot manage Super Admin privileges.
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
          className={`btn-secondary ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
          style={{
            background: activeTab === 'queue' ? 'var(--role-admin)' : 'transparent',
            color: activeTab === 'queue' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'queue' ? 'var(--role-admin)' : 'var(--border-subtle)',
            fontSize: '0.88rem'
          }}
        >
          📥 Verification Queue ({submissions.length}) {pendingCount > 0 && <span className="badge badge-warning" style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>{pendingCount} Pending</span>}
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          style={{
            background: activeTab === 'users' ? 'var(--role-admin)' : 'transparent',
            color: activeTab === 'users' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'users' ? 'var(--role-admin)' : 'var(--border-subtle)',
            fontSize: '0.88rem'
          }}
        >
          👥 User Directory ({usersList.length})
        </button>
        <button
          type="button"
          className={`btn-secondary ${activeTab === 'rbac-defense' ? 'active' : ''}`}
          onClick={() => setActiveTab('rbac-defense')}
          style={{
            background: activeTab === 'rbac-defense' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            color: activeTab === 'rbac-defense' ? 'var(--status-error)' : 'var(--text-secondary)',
            borderColor: activeTab === 'rbac-defense' ? 'var(--status-error)' : 'var(--border-subtle)',
            fontSize: '0.88rem'
          }}
        >
          🛡️ Admin Privilege Boundaries (403 Tests)
        </button>
      </div>

      {/* Feedback Messages */}
      {actionSuccess && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)' }}>
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)' }}>
          {actionError}
        </div>
      )}

      {/* TAB 1: Submissions Queue */}
      {activeTab === 'queue' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Platform Activity Verification Queue</h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={loadData}
              disabled={isLoading}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh Queue'}
            </button>
          </div>

          {submissions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No submissions waiting in queue.</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-outline" style={{ fontWeight: 600 }}>
                        {sub.platform}
                      </span>
                      <span className="badge badge-outline">
                        {sub.actionType}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-highlight)' }}>
                        <strong>{sub.userName || sub.user?.name || 'Creator'}</strong> ({sub.userEmail || sub.user?.email})
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

                  {/* Existing Review Verdicts */}
                  {sub.reviews && sub.reviews.length > 0 && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-highlight)', marginBottom: '0.2rem' }}>
                        Review Decision by {sub.reviews[0].adminName || sub.reviews[0].admin?.name || 'Moderator'}:
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        {sub.reviews[0].feedback}
                      </div>
                    </div>
                  )}

                  {/* Review Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Submitted {new Date(sub.createdAt).toLocaleString()}
                    </span>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleOpenReviewModal(sub, 'APPROVED')}
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', background: 'var(--status-success)' }}
                      >
                        ✓ Approve Proof
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleOpenReviewModal(sub, 'REJECTED')}
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', color: 'var(--status-error)', borderColor: 'var(--status-error)' }}
                      >
                        ✕ Reject Proof
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Modal Form */}
      {selectedSubForReview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '540px', width: '100%', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              Confirm Moderation Verdict: {reviewVerdict}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Evaluating activity submission #{selectedSubForReview.id} for{' '}
              <strong>{selectedSubForReview.userName || selectedSubForReview.user?.name}</strong>.
            </p>

            <form onSubmit={handleSubmitReview}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Decision Verdict
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="verdict"
                      value="APPROVED"
                      checked={reviewVerdict === 'APPROVED'}
                      onChange={() => setReviewVerdict('APPROVED')}
                    />
                    Approve
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="verdict"
                      value="REJECTED"
                      checked={reviewVerdict === 'REJECTED'}
                      onChange={() => setReviewVerdict('REJECTED')}
                    />
                    Reject
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Feedback Note for Creator *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedSubForReview(null)}
                  style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submittingReview}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    background: reviewVerdict === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)'
                  }}
                >
                  {submittingReview ? 'Saving Verdict...' : `Confirm ${reviewVerdict}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: User Directory */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Relevant Users & Creators Directory</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Permission Granted: <strong>ADMIN</strong> role is authorized to view registered users and their details.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={loadData}
              disabled={isLoading}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh Users'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>User ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Registered</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-superadmin' : u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`} style={{ fontSize: '0.75rem' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {u.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Admin Privilege Boundaries (403 Tests) */}
      {activeTab === 'rbac-defense' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-error">RESTRICTED PRIVILEGE TESTS</span>
            <span className="badge badge-outline">ADMIN ENFORCEMENT</span>
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Enforcing: Admin Cannot Manage Super Admin Privileges</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            The specification states: <em>"ADMIN: Cannot manage Super Admin privileges. Backend must enforce these permissions at API level."</em>
            <br />
            Click the buttons below to test restricted endpoints using your current <strong>ADMIN</strong> token.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={testingEndpoint}
              onClick={() =>
                runRbacTest(
                  '/users/usr-user-003/role',
                  {
                    method: 'PATCH',
                    body: JSON.stringify({ role: 'SUPER_ADMIN' })
                  },
                  'PATCH /api/users/:id/role -> Elevate to SUPER_ADMIN'
                )
              }
              style={{ fontSize: '0.85rem' }}
            >
              🔒 Probe Role Modification to SUPER_ADMIN (Expect 403)
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={testingEndpoint}
              onClick={() =>
                runRbacTest(
                  '/superadmin/audit-logs',
                  { method: 'GET' },
                  'GET /api/superadmin/audit-logs (Super Admin Governance)'
                )
              }
              style={{ fontSize: '0.85rem' }}
            >
              🔒 Probe Super Admin Audit Logs (Expect 403)
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
                  <>🛡️ <strong>Privilege Escalation Blocked:</strong> Backend middleware intercepted and prevented admin from managing Super Admin privileges.</>
                ) : (
                  <>✓ Authorized by server.</>
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
