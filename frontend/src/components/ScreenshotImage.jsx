import React, { useState, useEffect, useCallback } from 'react';
import { fetchScreenshotObjectUrl } from '../services/api';

/**
 * ScreenshotImage
 * ---------------
 * Displays an auth-gated screenshot evidence image.
 *
 * - Fetches the image using the stored JWT token (works for internal /api/uploads/... refs)
 * - External http(s) URLs are used directly
 * - Shows a loading skeleton, then the image
 * - Clicking opens a full-screen lightbox with zoom and keyboard close (Escape)
 * - Revokes the object URL on unmount to prevent memory leaks
 *
 * Props:
 *   screenshotUrl  {string}  Raw screenshotUrl from submission record
 *   alt            {string}  Alt text
 *   thumbnailStyle {object}  Additional style for the thumbnail container
 *   showLightbox   {boolean} Whether clicking opens a full-screen lightbox (default true)
 */
export default function ScreenshotImage({
  screenshotUrl: rawUrl,
  src,
  alt = 'Screenshot evidence',
  thumbnailStyle = {},
  style = {},
  showLightbox = true,
}) {
  const screenshotUrl = rawUrl || src;
  const combinedThumbStyle = { ...thumbnailStyle, ...style };
  const [objectUrl, setObjectUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!screenshotUrl) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    let revoked = false;
    let createdObjectUrl = null;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const url = await fetchScreenshotObjectUrl(screenshotUrl);
        if (revoked) return;
        if (!url) {
          setHasError(true);
        } else {
          createdObjectUrl = url;
          setObjectUrl(url);
        }
      } catch {
        if (!revoked) setHasError(true);
      } finally {
        if (!revoked) setIsLoading(false);
      }
    };

    load();

    return () => {
      revoked = true;
      // Revoke blob URLs (external http URLs don't need revocation)
      if (createdObjectUrl && createdObjectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [screenshotUrl]);

  // Keyboard handler for lightbox
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setLightboxOpen(false);
  }, []);

  useEffect(() => {
    if (lightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, handleKeyDown]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-sm)',
          animation: 'shimmer 1.5s infinite',
          ...thumbnailStyle,
        }}
        aria-label="Loading screenshot..."
      />
    );
  }

  // ── Error / missing state ─────────────────────────────────────────────────
  if (hasError || !objectUrl) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.3rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          ...thumbnailStyle,
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🖼️</span>
        <span>No preview</span>
      </div>
    );
  }

  // ── Thumbnail + Lightbox ───────────────────────────────────────────────────
  return (
    <>
      <div
        role={showLightbox ? 'button' : undefined}
        tabIndex={showLightbox ? 0 : undefined}
        aria-label={showLightbox ? 'Click to view full screenshot' : undefined}
        onClick={() => showLightbox && setLightboxOpen(true)}
        onKeyDown={(e) => { if (showLightbox && (e.key === 'Enter' || e.key === ' ')) setLightboxOpen(true); }}
        style={{
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          cursor: showLightbox ? 'zoom-in' : 'default',
          position: 'relative',
          ...combinedThumbStyle,
        }}
      >
        <img
          src={objectUrl}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
        {showLightbox && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'all 0.15s ease',
              fontSize: '1.2rem',
            }}
            className="screenshot-hover-overlay"
          >
            🔍
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot lightbox"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
            style={{
              position: 'fixed',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              transition: 'background 0.15s ease',
            }}
          >
            ✕
          </button>

          {/* Hint */}
          <div
            style={{
              position: 'fixed',
              bottom: '1.25rem',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            Press Esc or click outside to close
          </div>

          {/* Full image */}
          <img
            src={objectUrl}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
              animation: 'scaleIn 0.15s ease',
            }}
            draggable={false}
          />

          {/* Label */}
          <div
            style={{
              marginTop: '1rem',
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.05)',
              padding: '0.3rem 0.8rem',
              borderRadius: '999px',
              pointerEvents: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Screenshot Evidence — Submitted for Admin Review
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .screenshot-hover-overlay:hover {
          opacity: 1 !important;
          background: rgba(0,0,0,0.35) !important;
        }
      `}</style>
    </>
  );
}
