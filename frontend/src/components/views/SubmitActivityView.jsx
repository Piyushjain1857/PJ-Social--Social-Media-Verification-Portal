import React, { useState, useRef } from 'react';
import { createSubmission } from '../../services/api';

const PLATFORMS = [
  {
    id: 'INSTAGRAM',
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    placeholder: 'https://instagram.com/p/DF123abc456',
    hint: 'e.g. post permalink or creator reel URL',
  },
  {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    placeholder: 'https://linkedin.com/feed/update/urn:li:activity:71625344901',
    hint: 'e.g. company post update or article link',
  },
  {
    id: 'FACEBOOK',
    name: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    placeholder: 'https://facebook.com/stories/109283749219',
    hint: 'e.g. post link, group update, or story permalink',
  },
];

const ACTIONS = [
  {
    id: 'LIKE',
    name: 'Like / Upvote',
    icon: '❤️',
    description: 'Liked post or reacted to official creator update',
  },
  {
    id: 'COMMENT',
    name: 'Comment',
    icon: '💬',
    description: 'Posted relevant feedback or joined discussion thread',
  },
  {
    id: 'STORY',
    name: '24-hr Story',
    icon: '📱',
    description: 'Shared official campaign content to active 24-hr story',
  },
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function SubmitActivityView({ onNavigateToNav }) {
  // Form State
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [actionType, setActionType] = useState('LIKE');
  const [postUrl, setPostUrl] = useState('');
  const [description, setDescription] = useState('');

  // Evidence File / URL State
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Status & Progress State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const fileInputRef = useRef(null);

  // Active platform details
  const activePlatform = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];

  // ─── File Handling ────────────────────────────────────────────────────────
  const handleFileSelection = (selectedFile) => {
    setErrorMessage(null);
    setValidationErrors((prev) => ({ ...prev, screenshot: null }));

    if (!selectedFile) return;

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setErrorMessage('Invalid file format. Please select an image (JPEG, PNG, WebP, GIF).');
      return;
    }

    // Check File Size
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Selected image is ${sizeMb} MB. Maximum allowed file size is 5 MB.`);
      return;
    }

    setFile(selectedFile);
    setIsUrlMode(false);
    setExternalUrl('');

    // Generate local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ─── Validation ──────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};

    // Validate URL
    if (!postUrl.trim()) {
      errors.postUrl = 'Target post or profile URL is required.';
    } else {
      try {
        const parsed = new URL(postUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errors.postUrl = 'URL must start with http:// or https://';
        }
      } catch {
        errors.postUrl = 'Please enter a valid, complete web URL.';
      }
    }

    // Validate Screenshot Evidence
    if (isUrlMode) {
      if (!externalUrl.trim()) {
        errors.screenshot = 'Please provide an image screenshot link or upload a file.';
      } else {
        try {
          const parsed = new URL(externalUrl.trim());
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            errors.screenshot = 'Screenshot link must start with http:// or https://';
          }
        } catch {
          errors.screenshot = 'Please enter a valid URL for the screenshot.';
        }
      }
    } else if (!file) {
      errors.screenshot = 'A screenshot image file is required as evidence for admin review.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Form Submission ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let payload;

      if (!isUrlMode && file) {
        // Multipart FormData upload with progress
        payload = new FormData();
        payload.append('platform', platform);
        payload.append('actionType', actionType);
        payload.append('postUrl', postUrl.trim());
        payload.append('screenshot', file);
        if (description.trim()) {
          payload.append('description', description.trim());
        }
      } else {
        // JSON payload with external screenshot URL
        payload = {
          platform,
          actionType,
          postUrl: postUrl.trim(),
          screenshotUrl: externalUrl.trim(),
          description: description.trim() || undefined,
        };
      }

      const res = await createSubmission(payload, (percent) => {
        setUploadProgress(percent);
      });

      if (res.success) {
        setSubmissionResult(res.data);
        // Reset form inputs
        setPostUrl('');
        setDescription('');
        handleClearFile();
        setExternalUrl('');
      } else {
        setErrorMessage(res.message || 'Failed to submit activity evidence.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Submission error. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleResetForm = () => {
    setSubmissionResult(null);
    setErrorMessage(null);
    setValidationErrors({});
    handleClearFile();
    setPostUrl('');
    setDescription('');
  };

  // ─── Render Success View ──────────────────────────────────────────────────
  if (submissionResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '780px', margin: '0 auto' }}>
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            borderTop: '4px solid var(--status-success)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--status-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'var(--status-success)',
            }}
          >
            ✓
          </div>

          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--text-highlight)' }}>
              Activity Evidence Queued Successfully!
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '520px' }}>
              Your social media activity evidence has been received with status{' '}
              <strong style={{ color: 'var(--status-warning)' }}>PENDING</strong> and queued for manual administrator moderation review.
            </p>
          </div>

          {/* Submission Details Card */}
          <div
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Reference ID
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-highlight)', marginTop: '0.2rem' }}>
                {submissionResult.id}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Platform &amp; Action
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-highlight)', fontWeight: 600, marginTop: '0.2rem' }}>
                {submissionResult.platform} · {submissionResult.actionType}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Review Status
              </div>
              <div style={{ marginTop: '0.2rem' }}>
                <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                  ⏳ PENDING REVIEW
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Submission Time
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {new Date(submissionResult.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Notice Callout */}
          <div
            style={{
              padding: '0.9rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              textAlign: 'left',
              width: '100%',
            }}
          >
            🛡️ <strong>Verification Protocol Notice:</strong> Screenshots are retained as proof for human administrator evaluation. Submissions remain PENDING until an authorized administrator verifies engagement authenticity.
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigateToNav('my-submissions')}
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
            >
              📋 View in My Submissions →
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetForm}
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
            >
              ➕ Submit Another Activity
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render Main Form ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Policy & System Disclaimer Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderLeft: '4px solid var(--status-warning)',
          background: 'rgba(245, 158, 11, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>
              Evidence Submission Protocol (Human Admin Review)
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Uploaded screenshots serve strictly as <strong>evidence for human administrator review</strong>. The portal does not claim that a screenshot automatically or instantaneously proves that an engagement occurred. Every submission is recorded with <strong>PENDING</strong> status until an authorized moderator inspects your proof.
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div
          className="glass-panel"
          style={{
            padding: '1rem 1.25rem',
            borderLeft: '4px solid var(--status-error)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--status-error)' }}>
            <span>✕</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{errorMessage}</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setErrorMessage(null)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Form Title & Subtitle */}
        <div>
          <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.35rem', color: 'var(--text-highlight)', fontWeight: 800 }}>
            ➕ Submit Activity Evidence
          </h2>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Select your platform, specify the action, provide the target post URL, and upload your screenshot proof.
          </p>
        </div>

        {/* ── 1. Platform Selection ── */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.65rem' }}>
            1. Select Social Media Platform <span style={{ color: 'var(--status-error)' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
            {PLATFORMS.map((p) => {
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlatform(p.id);
                    setValidationErrors((prev) => ({ ...prev, postUrl: null }));
                  }}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? `${p.color}18` : 'rgba(255, 255, 255, 0.03)',
                    border: `2px solid ${isSelected ? p.color : 'var(--border-subtle)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? `0 0 20px ${p.color}25` : 'none',
                  }}
                >
                  <span style={{ fontSize: '1.5rem', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {p.icon}
                  </span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? 'var(--text-highlight)' : 'var(--text-primary)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {isSelected ? '✓ Selected' : 'Click to select'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. Action Type Selection ── */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-highlight)', marginBottom: '0.65rem' }}>
            2. Verified Action Type <span style={{ color: 'var(--status-error)' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
            {ACTIONS.map((a) => {
              const isSelected = actionType === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActionType(a.id)}
                  style={{
                    padding: '0.95rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? '0 0 16px var(--primary-glow)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '1.15rem' }}>{a.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--text-highlight)' : 'var(--text-primary)' }}>
                        {a.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 800 }}>✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    {a.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. Post / Profile URL Input ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label htmlFor="post-url-input" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
              3. Official Post / Profile URL <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {activePlatform.hint}
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--text-muted)' }}>
              🔗
            </span>
            <input
              id="post-url-input"
              type="url"
              className="input-field"
              placeholder={activePlatform.placeholder}
              value={postUrl}
              onChange={(e) => {
                setPostUrl(e.target.value);
                setValidationErrors((prev) => ({ ...prev, postUrl: null }));
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.6rem',
                borderColor: validationErrors.postUrl ? 'var(--status-error)' : undefined,
              }}
              required
            />
          </div>
          {validationErrors.postUrl && (
            <div style={{ color: 'var(--status-error)', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
              ⚠️ {validationErrors.postUrl}
            </div>
          )}
        </div>

        {/* ── 4. Screenshot Evidence Upload ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
              4. Proof Screenshot Evidence <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsUrlMode(!isUrlMode);
                  setValidationErrors((prev) => ({ ...prev, screenshot: null }));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  color: 'var(--primary-light)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {isUrlMode ? '📁 Switch to File Upload' : '🔗 Or provide image link'}
              </button>
            </div>
          </div>

          {!isUrlMode ? (
            <div>
              {/* Drag & Drop File Zone */}
              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragOver ? 'var(--primary)' : validationErrors.screenshot ? 'var(--status-error)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragOver ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.015)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelection(e.target.files[0]);
                      }
                    }}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    📸
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-highlight)' }}>
                    {isDragOver ? 'Drop image screenshot here' : 'Click to browse or drag & drop proof image'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Accepts PNG, JPG, JPEG, WebP, GIF (Max 5 MB)
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className="badge badge-user" style={{ fontSize: '0.7rem' }}>
                      Evidence required for moderation
                    </span>
                  </div>
                </div>
              ) : (
                /* Selected File Preview Card */
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    gap: '1.25rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle)',
                      background: '#000',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Screenshot evidence preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>✓ ATTACHED</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(file.size / 1024).toFixed(0)} KB · {file.type.split('/')[1]?.toUpperCase()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.92rem',
                        color: 'var(--text-highlight)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '380px',
                      }}
                    >
                      {file.name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      Image loaded ready for secure upload and server inspection.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleClearFile}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                  >
                    ✕ Remove &amp; Replace
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* External Image Link Input Mode */
            <div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--text-muted)' }}>
                  🖼️
                </span>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://images.unsplash.com/... or public screenshot link"
                  value={externalUrl}
                  onChange={(e) => {
                    setExternalUrl(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, screenshot: null }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    borderColor: validationErrors.screenshot ? 'var(--status-error)' : undefined,
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
                Paste a public image link directly showing proof of like, comment or story engagement.
              </span>
            </div>
          )}

          {validationErrors.screenshot && (
            <div style={{ color: 'var(--status-error)', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
              ⚠️ {validationErrors.screenshot}
            </div>
          )}
        </div>

        {/* ── 5. Optional Context / Description ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label htmlFor="description-input" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-highlight)' }}>
              5. Additional Context / Account Handle <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {description.length} / 1000
            </span>
          </div>
          <textarea
            id="description-input"
            className="input-field"
            rows="3"
            maxLength={1000}
            placeholder="e.g. Liked product announcement from registered handle @my_creator_account within 2 hours of post publishing."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* ── 6. Live Upload Progress Indicator (When Uploading) ── */}
        {isSubmitting && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-highlight)', fontWeight: 600 }}>
                {uploadProgress < 100 ? 'Uploading Screenshot Evidence...' : 'Processing Submission & Enqueuing Review...'}
              </span>
              <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>
                {uploadProgress}%
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                  borderRadius: 3,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* ── 7. Submission Actions ── */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            All submissions are strictly authenticated and associated with your creator profile.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={isSubmitting}
              onClick={() => onNavigateToNav('dashboard')}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{
                padding: '0.65rem 1.75rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                background: 'var(--role-user)',
                color: '#07090e',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Submitting Evidence...
                </>
              ) : (
                'Submit Activity Evidence →'
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
