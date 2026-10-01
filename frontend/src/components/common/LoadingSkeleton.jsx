import React from 'react';

/**
 * Reusable Loading Skeleton for Table Rows & Card Lists
 */
export default function LoadingSkeleton({
  rows = 4,
  height = '48px',
  type = 'table'
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', margin: '0.75rem 0' }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={`skel-${idx}`}
          style={{
            height,
            width: '100%',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonShimmer 1.5s infinite linear',
            border: '1px solid var(--border-subtle)'
          }}
        />
      ))}
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
