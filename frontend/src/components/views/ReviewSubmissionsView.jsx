import React, { useState, useEffect } from 'react';
import { fetchAllSubmissions, reviewSubmission } from '../../services/api';

export default function ReviewSubmissionsView() {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [verdict, setVerdict] = useState('APPROVED');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadPending = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllSubmissions();
      if (res.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load moderation queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const pendingList = submissions.filter(s => s.status === 'PENDING');

  const openReviewModal = (sub, defaultVerdict) => {
    setSelectedSub(sub);
    setVerdict(defaultVerdict);
    setFeedback(
      defaultVerdict === 'APPROVED'
        ? 'Verified activity engagement matches criteria.'
        : 'Proof missing timestamp or required handle verification.'
    );
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await reviewSubmission(selectedSub.id, verdict, feedback);
      if (res.success) {
        setSuccessMessage(`Submission ${selectedSub.id} has been ${verdict}.`);
        setSelectedSub(null);
        await loadPending();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Moderation Queue Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-admin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
            ⚖️ Verification Moderation Queue
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            {pendingList.length} submissions awaiting verification approval. Review screenshots and confirm engagement compliance.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadPending}
          disabled={isLoading}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh Queue'}
        </button>
      </div>

      {successMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem' }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', fontSize: '0.9rem' }}>
          {errorMessage}
        </div>
      )}

      {/* Pending Items List */}
      {pendingList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-highlight)' }}>Queue is Clear!</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            All creator activity submissions have been verified and processed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingList.map((sub) => (
            <div key={sub.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>
                    {sub.platform === 'INSTAGRAM' ? '📸' : sub.platform === 'LINKEDIN' ? '💼' : sub.platform === 'FACEBOOK' ? '👥' : '🌐'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-highlight)' }}>
                      {sub.userName || 'Creator User'} ({sub.userEmail || 'user@portal.com'})
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {sub.platform} • Action: <strong>{sub.actionType}</strong> • Submitted: {new Date(sub.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openReviewModal(sub, 'APPROVED')}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'var(--status-success)' }}
                  >
                    ✓ Quick Approve
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openReviewModal(sub, 'REJECTED')}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'var(--status-error)' }}
                  >
                    ✕ Quick Reject
                  </button>
                </div>
              </div>

              {sub.description && (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <strong>Creator Note:</strong> {sub.description}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem' }}>
                <div>
                  <strong>Target Link: </strong>
                  <a href={sub.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>
                    {sub.postUrl}
                  </a>
                </div>

                {sub.screenshotUrl && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => openReviewModal(sub, 'APPROVED')}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Inspect Screenshot Proof 🖼️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedSub && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={() => setSelectedSub(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: '650px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-highlight)' }}>
                Review Submission: {selectedSub.platform} ({selectedSub.actionType})
              </h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedSub(null)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {selectedSub.screenshotUrl && (
              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verification Proof:</strong>
                <div style={{ marginTop: '0.5rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={selectedSub.screenshotUrl} alt="Submission Proof" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Verification Verdict
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="verdict"
                      value="APPROVED"
                      checked={verdict === 'APPROVED'}
                      onChange={() => setVerdict('APPROVED')}
                    />
                    <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>✓ Approve Submission</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="verdict"
                      value="REJECTED"
                      checked={verdict === 'REJECTED'}
                      onChange={() => setVerdict('REJECTED')}
                    />
                    <span style={{ color: 'var(--status-error)', fontWeight: 600 }}>✕ Reject Submission</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Feedback for Creator
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter constructive verification notes..."
                  required
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedSub(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                  style={{
                    background: verdict === 'APPROVED' ? 'var(--status-success)' : 'var(--status-error)'
                  }}
                >
                  {isSubmitting ? 'Submitting...' : `Confirm ${verdict}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
