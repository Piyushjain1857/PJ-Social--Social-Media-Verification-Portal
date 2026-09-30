import React, { useState } from 'react';
import { createSubmission } from '../../services/api';

export default function SubmitActivityView({ onNavigateToNav }) {
  const [formData, setFormData] = useState({
    platform: 'INSTAGRAM',
    actionType: 'LIKE',
    postUrl: '',
    screenshotUrl: '',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await createSubmission(formData);
      if (res.success) {
        setSuccessMessage('Activity proof submitted successfully! It is now pending admin moderation review.');
        setFormData({
          platform: 'INSTAGRAM',
          actionType: 'LIKE',
          postUrl: '',
          screenshotUrl: '',
          description: ''
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit activity proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '750px' }}>
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-user)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
          ➕ Submit Social Media Activity Proof
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Provide the post link and proof screenshot of your engagement (like, comment, story, or subscription) to earn verified creator credits.
        </p>
      </div>

      {successMessage && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>✓ {successMessage}</div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigateToNav('my-submissions')}
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
          >
            View My Submissions →
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', fontSize: '0.9rem' }}>
          ✕ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Social Platform
            </label>
            <select
              className="input-field"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              style={{ width: '100%', padding: '0.65rem 0.85rem' }}
              required
            >
              <option value="INSTAGRAM">📸 Instagram</option>
              <option value="YOUTUBE">▶️ YouTube</option>
              <option value="TWITTER">🐦 X (Twitter)</option>
              <option value="TIKTOK">🎵 TikTok</option>
              <option value="LINKEDIN">💼 LinkedIn</option>
              <option value="FACEBOOK">👥 Facebook</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Action Type
            </label>
            <select
              className="input-field"
              value={formData.actionType}
              onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
              style={{ width: '100%', padding: '0.65rem 0.85rem' }}
              required
            >
              <option value="LIKE">Like / Upvote</option>
              <option value="COMMENT">Comment</option>
              <option value="SHARE">Share / Repost</option>
              <option value="STORY">24-hr Story</option>
              <option value="SUBSCRIBE">Follow / Subscribe</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Target Post / Profile URL
          </label>
          <input
            type="url"
            className="input-field"
            placeholder="https://instagram.com/p/..."
            value={formData.postUrl}
            onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
            style={{ width: '100%', padding: '0.65rem 0.85rem' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Proof Screenshot URL (Public image link or Unsplash preview)
          </label>
          <input
            type="url"
            className="input-field"
            placeholder="https://images.unsplash.com/... or hosted screenshot URL"
            value={formData.screenshotUrl}
            onChange={(e) => setFormData({ ...formData, screenshotUrl: e.target.value })}
            style={{ width: '100%', padding: '0.65rem 0.85rem' }}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
            Tip: You can use any valid image URL or paste an image link to show proof of like/comment.
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Description or Account Handle
          </label>
          <textarea
            className="input-field"
            rows="3"
            placeholder="e.g. Liked from verified handle @creator_official within 10 minutes of release."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ padding: '0.65rem 1.75rem', background: 'var(--role-user)', color: '#07090e', fontWeight: 700 }}
          >
            {isSubmitting ? 'Submitting Proof...' : 'Submit Activity Proof →'}
          </button>
        </div>
      </form>
    </div>
  );
}
