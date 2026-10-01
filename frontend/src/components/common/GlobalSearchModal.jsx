import React, { useState, useEffect, useRef } from 'react';
import { fetchGlobalSearch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function GlobalSearchModal({ isOpen, onClose, onNavigateToNav }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetchGlobalSearch(query.trim(), 5);
        if (res && res.success) {
          setResults(res);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.warn('Global search query error:', err.message);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen]);

  // Flatten items for keyboard navigation
  const flatItems = [];
  if (results && results.categories) {
    const { submissions = [], users = [], admins = [], socialAccounts = [], notifications = [] } = results.categories;
    submissions.forEach(item => flatItems.push({ ...item, categoryKey: 'submissions', categoryLabel: 'Submissions', categoryIcon: '📋' }));
    users.forEach(item => flatItems.push({ ...item, categoryKey: 'users', categoryLabel: 'Users', categoryIcon: '👥' }));
    admins.forEach(item => flatItems.push({ ...item, categoryKey: 'admins', categoryLabel: 'Admins', categoryIcon: '🛡️' }));
    socialAccounts.forEach(item => flatItems.push({ ...item, categoryKey: 'socialAccounts', categoryLabel: 'Official Accounts', categoryIcon: '🏛️' }));
    notifications.forEach(item => flatItems.push({ ...item, categoryKey: 'notifications', categoryLabel: 'Notifications', categoryIcon: '🔔' }));
  }

  // Handle keyboard events (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex(prev => (prev + 1) % flatItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelectItem(flatItems[selectedIndex]);
      }
    }
  };

  const handleSelectItem = (item) => {
    onClose();
    if (onNavigateToNav && item.navTarget) {
      onNavigateToNav(item.navTarget, { searchItem: item, query });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="portal-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      style={{
        zIndex: 9999,
        background: 'rgba(5, 7, 12, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '8vh'
      }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          background: 'rgba(13, 17, 26, 0.95)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          animation: 'modalSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search submissions, users, official channels, notifications..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-highlight)',
              fontSize: '1.05rem',
              fontWeight: 500,
              fontFamily: 'inherit'
            }}
          />

          {isLoading && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Searching...
            </span>
          )}

          {query && !isLoading && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults(null); }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: 'var(--text-muted)',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}

          <kbd
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              fontFamily: 'monospace'
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          {!query.trim() && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.6 }}>⚡</div>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Global Portal Search
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', maxWidth: '380px', marginInline: 'auto' }}>
                Search across submissions, accounts, notifications, and directories with instant server-side indexing.
              </p>
            </div>
          )}

          {query.trim() && !isLoading && results && results.totalMatches === 0 && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.6 }}>🔍</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-highlight)', fontWeight: 600 }}>
                No matching results found
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No records matched &quot;{query}&quot;. Try a different keyword, account handle, or submission URL.
              </p>
            </div>
          )}

          {query.trim() && flatItems.length > 0 && (
            <div>
              {/* Category Breakdown Header */}
              <div style={{ padding: '0.25rem 0.5rem 0.5rem 0.5rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Found {results?.totalMatches || flatItems.length} match{(results?.totalMatches || flatItems.length) === 1 ? '' : 'es'}</span>
                <span>Role: {user?.role || 'USER'}</span>
              </div>

              {flatItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.categoryKey}-${item.id}-${idx}`}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: isSelected ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                      transition: 'background 0.12s ease',
                      gap: '0.75rem',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          flexShrink: 0
                        }}
                      >
                        {item.categoryIcon}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-highlight)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text-muted)'
                            }}
                          >
                            {item.categoryLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {item.status && (
                        <span
                          className={`badge ${item.status === 'APPROVED' ? 'badge-success' : item.status === 'REJECTED' ? 'badge-error' : item.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}
                          style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}
                        >
                          {item.status}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: isSelected ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                        →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <span>VeriSocial Global Index</span>
        </div>
      </div>
    </div>
  );
}
