import React, { useState, useEffect } from 'react';
import { fetchHealth, fetchDatabaseStatus } from '../services/api';

const MODELS_SCHEMA = [
  {
    name: 'User',
    icon: '👤',
    description: 'Central identity record with 3-tier role governance and account status.',
    fields: [
      { name: 'id', type: 'String (UUID)', attr: '@id @default(uuid())' },
      { name: 'name', type: 'String', attr: 'Required' },
      { name: 'email', type: 'String', attr: '@unique @index' },
      { name: 'password', type: 'String', attr: 'bcrypt hash' },
      { name: 'role', type: 'Role', attr: '@default(USER) @index' },
      { name: 'status', type: 'UserStatus', attr: '@default(ACTIVE) @index' },
      { name: 'createdAt', type: 'DateTime', attr: '@default(now())' },
      { name: 'updatedAt', type: 'DateTime', attr: '@updatedAt' },
    ],
    relations: [
      { target: 'SocialAccount[]', desc: 'Connected creator social profiles' },
      { target: 'Submission[]', desc: 'Activity submissions created by this user' },
      { target: 'Review[]', desc: 'Moderation reviews performed if role is ADMIN' },
      { target: 'Notification[]', desc: 'System alerts and submission updates received' },
    ],
    indexes: ['email (UNIQUE)', 'role', 'status'],
  },
  {
    name: 'SocialAccount',
    icon: '🌐',
    description: 'Official social profiles verified and bound to a specific user.',
    fields: [
      { name: 'id', type: 'String (UUID)', attr: '@id @default(uuid())' },
      { name: 'userId', type: 'String', attr: 'FK -> users.id (CASCADE)' },
      { name: 'platform', type: 'Platform', attr: 'INSTAGRAM, LINKEDIN, FACEBOOK' },
      { name: 'handle', type: 'String', attr: 'Profile handle / username' },
      { name: 'profileUrl', type: 'String?', attr: 'Optional profile link' },
      { name: 'isVerified', type: 'Boolean', attr: '@default(false)' },
      { name: 'createdAt', type: 'DateTime', attr: '@default(now())' },
      { name: 'updatedAt', type: 'DateTime', attr: '@updatedAt' },
    ],
    relations: [
      { target: 'User', desc: 'Account owner (User)' },
      { target: 'Submission[]', desc: 'Official activity submissions linked to this account' },
    ],
    indexes: ['userId', 'platform', '@@unique([userId, platform, handle])'],
  },
  {
    name: 'Submission',
    icon: '📝',
    description: 'Activity evidence submitted by users linked to an official social account.',
    fields: [
      { name: 'id', type: 'String (UUID)', attr: '@id @default(uuid())' },
      { name: 'userId', type: 'String', attr: 'FK -> users.id (CASCADE)' },
      { name: 'socialAccountId', type: 'String', attr: 'FK -> social_accounts.id (RESTRICT)' },
      { name: 'platform', type: 'Platform', attr: 'INSTAGRAM | LINKEDIN | FACEBOOK' },
      { name: 'actionType', type: 'ActionType', attr: 'LIKE | COMMENT | STORY' },
      { name: 'postUrl', type: 'String', attr: 'Direct link to target social media post' },
      { name: 'screenshotUrl', type: 'String?', attr: 'Proof image / cloud storage path' },
      { name: 'description', type: 'String?', attr: 'Context note provided by user' },
      { name: 'status', type: 'SubmissionStatus', attr: '@default(PENDING) [APPROVED, REJECTED]' },
      { name: 'createdAt', type: 'DateTime', attr: '@default(now())' },
      { name: 'updatedAt', type: 'DateTime', attr: '@updatedAt' },
    ],
    relations: [
      { target: 'User', desc: 'Creator who submitted the activity' },
      { target: 'SocialAccount', desc: 'Official social profile used for the action' },
      { target: 'Review[]', desc: 'Audit reviews executed by platform Admins' },
    ],
    indexes: ['userId', 'socialAccountId', '[platform, actionType]', 'status', 'createdAt'],
  },
  {
    name: 'Review',
    icon: '⚖️',
    description: 'Formal verification decisions and audit trail submitted by Admins.',
    fields: [
      { name: 'id', type: 'String (UUID)', attr: '@id @default(uuid())' },
      { name: 'submissionId', type: 'String', attr: 'FK -> submissions.id (CASCADE)' },
      { name: 'adminId', type: 'String', attr: 'FK -> users.id (RESTRICT)' },
      { name: 'status', type: 'SubmissionStatus', attr: 'APPROVED | REJECTED' },
      { name: 'feedback', type: 'String?', attr: 'Reviewer explanation / feedback notes' },
      { name: 'createdAt', type: 'DateTime', attr: '@default(now())' },
      { name: 'updatedAt', type: 'DateTime', attr: '@updatedAt' },
    ],
    relations: [
      { target: 'Submission', desc: 'Target activity submission being evaluated' },
      { target: 'User (Admin)', desc: 'Admin moderator who performed the review' },
    ],
    indexes: ['submissionId', 'adminId', 'status', 'createdAt'],
  },
  {
    name: 'Notification',
    icon: '🔔',
    description: 'Real-time alert records sent to users on submission and review milestones.',
    fields: [
      { name: 'id', type: 'String (UUID)', attr: '@id @default(uuid())' },
      { name: 'userId', type: 'String', attr: 'FK -> users.id (CASCADE)' },
      { name: 'type', type: 'NotificationType', attr: '@default(SYSTEM)' },
      { name: 'title', type: 'String', attr: 'Notification headline' },
      { name: 'message', type: 'String', attr: 'Detailed notification content' },
      { name: 'isRead', type: 'Boolean', attr: '@default(false)' },
      { name: 'metadata', type: 'Json?', attr: 'Context payload (e.g. submissionId)' },
      { name: 'createdAt', type: 'DateTime', attr: '@default(now())' },
      { name: 'updatedAt', type: 'DateTime', attr: '@updatedAt' },
    ],
    relations: [
      { target: 'User', desc: 'Recipient user' },
    ],
    indexes: ['userId', 'isRead', 'createdAt'],
  },
];

const ENUMS_DATA = [
  { name: 'Role', values: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { name: 'UserStatus', values: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
  { name: 'Platform', values: ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'] },
  { name: 'ActionType', values: ['LIKE', 'COMMENT', 'STORY'] },
  { name: 'SubmissionStatus', values: ['PENDING', 'APPROVED', 'REJECTED'] },
  { name: 'NotificationType', values: ['SUBMISSION_UPDATE', 'REVIEW_FEEDBACK', 'ACCOUNT_ALERT', 'SYSTEM'] },
];

export default function DevDatabaseDashboard({ onBackToPortal }) {
  const [dbState, setDbState] = useState({
    loading: true,
    data: null,
    error: null,
    latency: null,
  });

  const [activeModel, setActiveModel] = useState('User');
  const [activeTab, setActiveTab] = useState('models'); // 'models' | 'enums' | 'telemetry'

  const loadDatabaseTelemetry = async () => {
    setDbState((prev) => ({ ...prev, loading: true }));
    const res = await fetchDatabaseStatus();
    if (res.success) {
      setDbState({
        loading: false,
        data: res.data,
        error: null,
        latency: res.latency,
      });
    } else {
      setDbState({
        loading: false,
        data: null,
        error: res.error,
        latency: res.latency,
      });
    }
  };

  useEffect(() => {
    loadDatabaseTelemetry();
  }, []);

  const selectedModelData = MODELS_SCHEMA.find((m) => m.name === activeModel) || MODELS_SCHEMA[0];

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1200px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-superadmin" style={{ fontSize: '0.75rem' }}>DEVELOPMENT ONLY</span>
            <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>POSTGRESQL + PRISMA 6</span>
          </div>
          <h2>Database & API Telemetry Console</h2>
          <p style={{ margin: 0 }}>
            Inspect PostgreSQL schema models, relational constraints, and live database connectivity.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={onBackToPortal}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <span>← Back to Portal Home</span>
        </button>
      </div>

      {/* Dual Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* API Status Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Backend REST Service
              </span>
              <h3 style={{ marginTop: '0.25rem', fontSize: '1.25rem' }}>Express.js API Status</h3>
            </div>
            <span className="badge badge-success">
              <span className="status-dot online" />
              PORT 5001
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="detail-tile">
              <div className="detail-label">Endpoint</div>
              <div className="detail-value" style={{ fontSize: '0.85rem' }}>/api/database/status</div>
            </div>
            <div className="detail-tile">
              <div className="detail-label">Network Latency</div>
              <div className="detail-value" style={{ fontSize: '0.85rem' }}>
                {dbState.latency !== null ? `${dbState.latency} ms` : 'Testing...'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={loadDatabaseTelemetry}
            disabled={dbState.loading}
            style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem 1rem' }}
          >
            <span>{dbState.loading ? 'Pinging Backend...' : 'Ping API & Database'}</span>
            <span>⚡</span>
          </button>
        </div>

        {/* Database Status Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Relational Engine
              </span>
              <h3 style={{ marginTop: '0.25rem', fontSize: '1.25rem' }}>PostgreSQL + Prisma</h3>
            </div>
            {dbState.data?.isConnected ? (
              <span className="badge badge-success">
                <span className="status-dot online" />
                Connected
              </span>
            ) : (
              <span className="badge badge-outline" style={{ color: 'var(--status-warning)', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                <span className="status-dot checking" />
                Awaiting PostgreSQL
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="detail-tile">
              <div className="detail-label">Configured Provider</div>
              <div className="detail-value" style={{ fontSize: '0.85rem' }}>PostgreSQL</div>
            </div>
            <div className="detail-tile">
              <div className="detail-label">Prisma Models</div>
              <div className="detail-value" style={{ fontSize: '0.85rem' }}>5 Models Configured</div>
            </div>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-highlight)' }}>Database URL: </strong>
            <code>{dbState.data?.configuredUrl || 'postgresql://postgres:****@localhost:5432/social_verification_portal'}</code>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={activeTab === 'models' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('models')}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
        >
          <span>5 Schema Models</span>
        </button>
        <button
          type="button"
          className={activeTab === 'enums' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('enums')}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
        >
          <span>6 Enums & Constraints</span>
        </button>
        <button
          type="button"
          className={activeTab === 'telemetry' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('telemetry')}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
        >
          <span>Raw API Payload</span>
        </button>
      </div>

      {/* Tab: Models */}
      {activeTab === 'models' && (
        <div>
          {/* Model pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {MODELS_SCHEMA.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => setActiveModel(m.name)}
                className={`badge ${activeModel === m.name ? 'badge-superadmin' : 'badge-outline'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <span>{m.icon}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>

          {/* Selected Model Card */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '1.75rem' }}>{selectedModelData.icon}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem' }}>model {selectedModelData.name}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>{selectedModelData.description}</p>
              </div>
            </div>

            {/* Fields Table */}
            <div style={{ marginTop: '1.5rem', marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-light)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Attributes & Column Definitions
              </h4>
              <div style={{ overflowX: 'auto', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.03)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Field</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Directives & Constraints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedModelData.fields.map((f, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-highlight)' }}>
                          {f.name}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          {f.type}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                          <code>{f.attr}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Relations and Indexes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-light)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Entity Relationships
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedModelData.relations.map((r, idx) => (
                    <div key={idx} className="detail-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-highlight)', fontWeight: 600 }}>{r.target}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-light)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Performance Indexes
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedModelData.indexes.map((idx, i) => (
                    <span key={i} className="badge badge-outline" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      🔍 @@index({idx})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Enums */}
      {activeTab === 'enums' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {ENUMS_DATA.map((e) => (
            <div key={e.name} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>enum {e.name}</h4>
                <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>{e.values.length} VALUES</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {e.values.map((v) => (
                  <span key={v} className="badge badge-outline" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Raw JSON Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="glass-panel" style={{ padding: '1.75rem', background: '#090c14' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
              GET /api/database/status
            </span>
            <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>
              {dbState.latency !== null ? `${dbState.latency}ms response` : 'Live'}
            </span>
          </div>
          <pre style={{ color: '#38bdf8', fontSize: '0.82rem', maxHeight: '450px', overflowY: 'auto' }}>
            {JSON.stringify(dbState.data || { error: dbState.error || 'Awaiting response...' }, null, 2)}
          </pre>
        </div>
      )}

      {/* Migration Helper Card */}
      <div className="glass-panel" style={{ marginTop: '2.5rem', padding: '1.5rem 2rem', borderLeft: '4px solid var(--primary-light)' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-highlight)' }}>Database Migration Quick Reference</h4>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem' }}>
          When your local PostgreSQL container or service is active, execute these scripts to apply the schema migration and launch Prisma Studio:
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <code style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
            npm run prisma:migrate
          </code>
          <code style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
            npx prisma studio
          </code>
        </div>
      </div>
    </div>
  );
}
