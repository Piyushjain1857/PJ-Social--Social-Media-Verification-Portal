import React, { useState, useEffect } from 'react';
import {
  sendSuperAdminTestEmail,
  fetchSuperAdminEmailLogs,
  fetchSuperAdminEmailStatus,
  fetchSuperAdminEmailTemplates
} from '../services/api';

export default function SuperAdminEmailPanel() {
  // Telemetry & Status
  const [mailStatus, setMailStatus] = useState(null);
  const [templates, setTemplates] = useState([]);

  // Test Email state
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Email Logs state
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [templateFilter, setTemplateFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Loading & error
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Load telemetry & templates
  useEffect(() => {
    loadMailStatus();
    loadTemplates();
  }, []);

  // Load logs on filter / page change
  useEffect(() => {
    loadLogs();
  }, [page, statusFilter, templateFilter]);

  const loadMailStatus = async () => {
    try {
      const res = await fetchSuperAdminEmailStatus();
      if (res.success) {
        setMailStatus(res.data);
      }
    } catch (err) {
      console.warn('Could not load email telemetry:', err.message);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetchSuperAdminEmailTemplates();
      if (res.success) {
        setTemplates(res.data || []);
      }
    } catch (err) {
      console.warn('Could not load email templates:', err.message);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const res = await fetchSuperAdminEmailLogs({
        page,
        limit,
        search,
        status: statusFilter,
        template: templateFilter,
        startDate,
        endDate
      });

      if (res.success) {
        setLogs(res.data || []);
        setTotalCount(res.pagination?.totalCount || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      setLogsError(err.message || 'Failed to load email logs.');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setTemplateFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setTimeout(() => {
      loadLogs();
    }, 0);
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testRecipient || !testRecipient.trim()) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendSuperAdminTestEmail(testRecipient.trim());
      setTestResult({
        success: res.success,
        message: res.message,
        data: res.data
      });
      // Refresh logs after sending test email
      loadLogs();
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to send test email.'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* 1. System Telemetry & Transporter Status Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #6366f1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                {mailStatus?.provider || 'Gmail SMTP'}
              </span>
              <span className={`badge ${mailStatus?.isConfigured ? 'badge-success' : 'badge-warning'}`}>
                {mailStatus?.isConfigured ? '● Active SMTP Configured' : '● Development Simulation Mode'}
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem' }}>
              📧 Transactional Email Delivery System
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Sender: <strong>{mailStatus?.user || 'socialportal.mailer@gmail.com'}</strong> &bull; Host: <code>{mailStatus?.host || 'smtp.gmail.com'}:{mailStatus?.port || 465}</code> (SSL/TLS: {mailStatus?.isSecure ? 'Yes' : 'No'})
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
            🔒 <strong>Zero Credential Exposure:</strong> SMTP credentials and Google App Passwords are strictly isolated inside the Node.js backend.
          </div>
        </div>
      </div>

      {/* 2. Super Admin Test Email Sender */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🧪</span> Dispatch Protected Test Email
        </h4>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Verify the end-to-end Nodemailer pipeline, HTML template rendering, and delivery logging by sending an authentic test email to any inbox.
        </p>

        <form onSubmit={handleSendTestEmail} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            placeholder="Enter target recipient (e.g. test@gmail.com)"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            required
            style={{
              flex: '1 1 300px',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isSendingTest || !testRecipient.trim()}
            style={{
              padding: '0.65rem 1.4rem',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
            }}
          >
            {isSendingTest ? (
              <>
                <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
                Sending...
              </>
            ) : (
              <>
                <span>✈️</span> Send Test Email
              </>
            )}
          </button>
        </form>

        {testResult && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1.2rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              background: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${testResult.success ? 'var(--status-success)' : 'var(--status-error)'}`,
              color: testResult.success ? 'var(--status-success)' : 'var(--status-error)'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              {testResult.success ? '✓ Delivery Dispatched' : '✕ Delivery Failed'}
            </div>
            <div>{testResult.message}</div>
            {testResult.data?.messageId && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Message ID: <code>{testResult.data.messageId}</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search Input */}
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              placeholder="Search recipient, subject, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(30, 41, 59, 0.95)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">SENT (Success)</option>
              <option value="FAILED">FAILED (Error)</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          {/* Template Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={templateFilter}
              onChange={(e) => {
                setTemplateFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(30, 41, 59, 0.95)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              <option value="ALL">All Templates</option>
              {templates.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="From Date"
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(30, 41, 59, 0.95)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="To Date"
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(30, 41, 59, 0.95)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            />
          </div>

          {/* Filter Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Filter
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetFilters}
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn-refresh-pill"
              onClick={loadLogs}
              title="Refresh logs"
              disabled={isLoadingLogs}
            >
              <svg
                className={`refresh-icon-svg ${isLoadingLogs ? 'spinning' : ''}`}
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Logs Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem' }}>
            📜 Transactional Email Logs ({totalCount})
          </h4>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing page {page} of {totalPages || 1}
          </span>
        </div>

        {logsError && (
          <div style={{ padding: '1rem', color: 'var(--status-error)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
            {logsError}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Recipient</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Template</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Subject</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Sent At</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingLogs ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }}></div>
                  Loading delivery logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No transactional email logs found matching criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isSent = log.status === 'SENT';
                const isFailed = log.status === 'FAILED';
                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Status Badge */}
                    <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap' }}>
                      <span
                        className="badge"
                        style={{
                          background: isSent
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isFailed
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                          color: isSent
                            ? 'var(--status-success)'
                            : isFailed
                            ? 'var(--status-error)'
                            : '#f59e0b',
                          border: `1px solid ${
                            isSent
                              ? 'rgba(16, 185, 129, 0.3)'
                              : isFailed
                              ? 'rgba(239, 68, 68, 0.3)'
                              : 'rgba(245, 158, 11, 0.3)'
                          }`
                        }}
                      >
                        {isSent ? '✓ SENT' : isFailed ? '✕ FAILED' : '⏳ PENDING'}
                      </span>
                    </td>

                    {/* Recipient */}
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.recipient}
                    </td>

                    {/* Template */}
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#a5b4fc',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace'
                        }}
                      >
                        {log.template}
                      </span>
                    </td>

                    {/* Subject */}
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.subject}
                    </td>

                    {/* Sent At / Created At */}
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Inspect Button */}
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setSelectedLog(log)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 5. Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
              >
                &larr; Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Inspection Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                ✉️ Email Delivery Dossier
              </h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedLog(null)}
                style={{ padding: '0.3rem 0.7rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>LOG ID</span>
                <code>{selectedLog.id}</code>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>STATUS</span>
                <span className={`badge ${selectedLog.status === 'SENT' ? 'badge-success' : selectedLog.status === 'FAILED' ? 'badge-danger' : 'badge-warning'}`}>
                  {selectedLog.status}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>RECIPIENT</span>
                <strong>{selectedLog.recipient}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>TEMPLATE</span>
                <code>{selectedLog.template}</code>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>SUBJECT</span>
                <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem' }}>{selectedLog.subject}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>MESSAGE ID</span>
                <code>{selectedLog.messageId || '(None generated)'}</code>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>TIMESTAMP</span>
                <div>Sent: {selectedLog.sentAt ? new Date(selectedLog.sentAt).toLocaleString() : 'Not Dispatched'}</div>
                <div>Recorded: {new Date(selectedLog.createdAt).toLocaleString()}</div>
              </div>

              {selectedLog.error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', borderRadius: '6px', padding: '0.85rem' }}>
                  <span style={{ color: 'var(--status-error)', fontWeight: 600, display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    ERROR CAUSE (SANITIZED):
                  </span>
                  <pre style={{ margin: 0, color: 'var(--status-error)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {selectedLog.error}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedLog(null)}
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
