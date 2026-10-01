import React from 'react';

/**
 * Reusable Empty State Display
 * Shown when search or filter combinations yield zero records, or a queue is empty.
 */
export default function EmptyState({
  icon = '🔍',
  title = 'No records found',
  description = 'No matching entries match your current search terms or active filters.',
  onClearFilters = null,
  clearLabel = 'Clear all filters',
  onAction = null,
  actionText = null,
  children = null
}) {
  const handleAction = onClearFilters || onAction;
  const label = actionText || clearLabel;
  return (
    <div
      className="glass-panel"
      style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.85rem',
        marginTop: '1rem',
        border: '1px dashed var(--border-subtle)',
        background: 'rgba(13, 17, 26, 0.4)'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          marginBottom: '0.3rem'
        }}
      >
        {icon}
      </div>

      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-highlight)' }}>
        {title}
      </h4>

      <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
        {description}
      </p>

      {handleAction && (
        <button
          type="button"
          className="btn-secondary"
          onClick={handleAction}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--primary-light)',
            borderColor: 'var(--primary)'
          }}
        >
          <span>✕</span>
          <span>{label}</span>
        </button>
      )}

      {children}
    </div>
  );
}
