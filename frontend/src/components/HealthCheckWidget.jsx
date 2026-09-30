import React, { useState } from 'react';

export default function HealthCheckWidget({ apiStatus, onRefresh }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = JSON.stringify(apiStatus.raw || apiStatus.data || { error: apiStatus.error }, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="container" id="health-check">
      <div className="section-header">
        <span className="section-tag">System Diagnostics</span>
        <h2 className="section-title">Backend Health-Check API</h2>
        <p>
          Real-time telemetry querying the Express.js backend at <code>/api/health</code>.
          Monitors latency, database connection status, and service uptime.
        </p>
      </div>

      <div className="health-section">
        <div className="glass-panel health-info-panel">
          <div className="health-info-header">
            <h3>API Status Monitor</h3>
            <p>Direct communication channel between Vite React frontend and Express backend.</p>

            <div className="health-status-badge-row">
              <span className={`badge ${apiStatus.healthy ? 'badge-success' : 'badge-outline'}`}>
                <span className={`status-dot ${apiStatus.loading ? 'checking' : apiStatus.healthy ? 'online' : 'offline'}`} />
                {apiStatus.loading ? 'Pinging...' : apiStatus.healthy ? 'Service Operational' : 'Service Unreachable'}
              </span>

              {apiStatus.latency !== null && (
                <span className="badge badge-outline">
                  ⚡ {apiStatus.latency} ms
                </span>
              )}
            </div>

            <div className="health-details-grid">
              <div className="detail-tile">
                <div className="detail-label">Service Name</div>
                <div className="detail-value">
                  {apiStatus.data?.service || 'Social Media Portal API'}
                </div>
              </div>

              <div className="detail-tile">
                <div className="detail-label">Environment</div>
                <div className="detail-value">
                  {apiStatus.data?.environment || 'development'}
                </div>
              </div>

              <div className="detail-tile">
                <div className="detail-label">Uptime</div>
                <div className="detail-value">
                  {apiStatus.data?.uptimeSeconds !== undefined ? `${apiStatus.data.uptimeSeconds}s` : 'N/A'}
                </div>
              </div>

              <div className="detail-tile">
                <div className="detail-label">Database Status</div>
                <div className="detail-value">
                  {apiStatus.data?.database?.status || 'PostgreSQL (Prisma)'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="refresh-health-btn"
              className="btn-primary"
              onClick={onRefresh}
              disabled={apiStatus.loading}
              style={{ fontSize: '0.88rem', padding: '0.7rem 1.3rem' }}
            >
              <span>{apiStatus.loading ? 'Querying API...' : 'Ping /api/health'}</span>
              <span>🔄</span>
            </button>

            <button
              type="button"
              id="copy-payload-btn"
              className="btn-secondary"
              onClick={handleCopy}
              style={{ fontSize: '0.88rem', padding: '0.7rem 1.3rem' }}
            >
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              <span>📋</span>
            </button>
          </div>
        </div>

        <div className="glass-panel health-console-panel">
          <div className="console-header">
            <div className="console-dots">
              <span className="console-dot red" />
              <span className="console-dot yellow" />
              <span className="console-dot green" />
            </div>
            <div className="console-title">GET /api/health Response</div>
            <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>JSON</span>
          </div>

          <div className="console-body">
            <pre>
              {JSON.stringify(
                apiStatus.raw || apiStatus.data || {
                  status: apiStatus.healthy ? 'healthy' : 'disconnected',
                  error: apiStatus.error || 'Backend not reached on port 5000',
                  hint: 'Run "npm run dev" or "npm run dev:backend" from the project root.'
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
