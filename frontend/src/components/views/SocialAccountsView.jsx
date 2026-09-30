import React, { useState } from 'react';

export default function SocialAccountsView() {
  const [platforms, setPlatforms] = useState([
    {
      id: 'instagram',
      name: 'Instagram Graph API',
      icon: '📸',
      version: 'v19.0',
      status: 'CONNECTED',
      actions: ['Post Likes', 'Comment Engagement', '24-hr Stories'],
      creatorsCount: 142,
      autoVerification: true
    },
    {
      id: 'youtube',
      name: 'YouTube Data API',
      icon: '▶️',
      version: 'v3',
      status: 'CONNECTED',
      actions: ['Video Comments', 'Channel Subscriptions', 'Community Likes'],
      creatorsCount: 98,
      autoVerification: false
    },
    {
      id: 'twitter',
      name: 'X (Twitter) API',
      icon: '🐦',
      version: 'v2.1',
      status: 'CONNECTED',
      actions: ['Retweets', 'Quote Tweets', 'Profile Follows'],
      creatorsCount: 110,
      autoVerification: true
    },
    {
      id: 'tiktok',
      name: 'TikTok Display API',
      icon: '🎵',
      version: 'v1.3',
      status: 'ACTIVE',
      actions: ['Video Hashtags', 'Audio Duets', 'Sound Usage'],
      creatorsCount: 86,
      autoVerification: false
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Community API',
      icon: '💼',
      version: 'v2',
      status: 'CONNECTED',
      actions: ['Article Reactions', 'Thought Leadership Comments'],
      creatorsCount: 64,
      autoVerification: false
    },
    {
      id: 'facebook',
      name: 'Facebook Pages API',
      icon: '👥',
      version: 'v18.0',
      status: 'CONNECTED',
      actions: ['Page Posts', 'Event Shares', 'Community Follows'],
      creatorsCount: 45,
      autoVerification: true
    }
  ]);

  const [notification, setNotification] = useState(null);

  const toggleAutoVerify = (id) => {
    setPlatforms(prev => prev.map(p => {
      if (p.id === id) {
        const next = !p.autoVerification;
        setNotification(`Auto-verification for ${p.name} set to ${next ? 'ENABLED' : 'MANUAL REVIEW'}.`);
        setTimeout(() => setNotification(null), 3000);
        return { ...p, autoVerification: next };
      }
      return p;
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
          🔗 Supported Social Media Platforms & API Connectors
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Configure verified third-party social integrations, webhook endpoints, and automated verification rules.
        </p>
      </div>

      {notification && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem' }}>
          {notification}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {platforms.map(p => (
          <div key={p.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span style={{ fontSize: '2rem' }}>{p.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-highlight)' }}>{p.name}</h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>API {p.version}</div>
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                {p.status}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div><strong>Supported Actions:</strong> {p.actions.join(', ')}</div>
              <div><strong>Connected Creators:</strong> {p.creatorsCount} verified profiles</div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Auto-Verification:
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toggleAutoVerify(p.id)}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  color: p.autoVerification ? 'var(--status-success)' : 'var(--text-muted)',
                  borderColor: p.autoVerification ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'
                }}
              >
                {p.autoVerification ? '✓ Automated' : '⏳ Manual Review'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
