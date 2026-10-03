import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchEmailOverview,
  fetchEmailAnalytics,
  fetchEmailLogs,
  fetchEmailLogDetails,
  fetchFailedEmails,
  retryEmailDelivery,
  fetchEmailSettings,
  updateEventToggles,
  fetchTemplateConfigs,
  updateTemplateConfig,
  sendSuperAdminTestEmail,
  fetchAvailableTemplates
} from '../../services/emailAdminApi';

const AVAILABLE_TEST_TEMPLATES = [
  { key: 'TEST_EMAIL', label: 'Operational Test Email', icon: '🧪' },
  { key: 'ACCOUNT_CREATED', label: 'Account Created Welcome', icon: '🎉' },
  { key: 'LOGIN_NOTIFICATION', label: 'Login Notification Alert', icon: '🛡️' },
  { key: 'PASSWORD_CHANGED', label: 'Password Changed Confirmation', icon: '🔑' },
  { key: 'PASSWORD_RESET', label: 'Password Reset Request', icon: '🔄' },
  { key: 'SUBMISSION_APPROVED', label: 'Submission Approved (+XP)', icon: '✅' },
  { key: 'SUBMISSION_REJECTED', label: 'Submission Rejected', icon: '❌' },
  { key: 'CLARIFICATION_REQUEST', label: 'Clarification Required', icon: '💬' },
  { key: 'XP_AWARDED', label: 'XP Earned Alert', icon: '⚡' },
  { key: 'LEVEL_UP', label: 'Level Up Celebration', icon: '🏆' }
];

// Sleek SVG Icon components for clean enterprise UI
const RefreshIcon = ({ className = '' }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ChartBarIcon = ({ className = '' }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const LogsListIcon = ({ className = '' }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const AlertTriangleIcon = ({ className = '' }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SettingsIcon = ({ className = '' }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ShieldIcon = ({ className = '' }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CalendarDaysIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="8" cy="15" r="1" />
    <circle cx="12" cy="15" r="1" />
    <circle cx="16" cy="15" r="1" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const GaugeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function SuperAdminEmailCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [feedback, setFeedback] = useState(null);

  // Overview & Analytics State
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(14);

  // Email Logs State
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    template: 'ALL',
    startDate: '',
    endDate: ''
  });
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  // Failed Emails State
  const [failedEmails, setFailedEmails] = useState([]);
  const [failedPagination, setFailedPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [retryingIds, setRetryingIds] = useState(new Set());

  // Settings & Templates State
  const [settings, setSettings] = useState(null);
  const [templateConfigs, setTemplateConfigs] = useState([]);
  const [editingTemplateKey, setEditingTemplateKey] = useState(null);
  const [templateDraft, setTemplateDraft] = useState({ subject: '', customHeader: '', customNotes: '', isEnabled: true });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Send Test Email Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testForm, setTestForm] = useState({
    recipient: '',
    template: 'TEST_EMAIL',
    isSubmitting: false,
    result: null
  });

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Load Overview Data
  const loadOverviewAndAnalytics = useCallback(async () => {
    try {
      const [ovRes, anRes] = await Promise.all([
        fetchEmailOverview(),
        fetchEmailAnalytics(analyticsDays)
      ]);
      setOverview(ovRes.data);
      setAnalytics(anRes.data);
    } catch (err) {
      console.error('Failed to load email overview/analytics:', err);
      showToast(err.message, 'error');
    }
  }, [analyticsDays]);

  // Load Logs Data
  const loadLogs = useCallback(async (page = 1) => {
    try {
      const res = await fetchEmailLogs({
        page,
        limit: pagination.limit,
        search: filters.search,
        status: filters.status,
        template: filters.template,
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      setLogs(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load email logs:', err);
      showToast(err.message, 'error');
    }
  }, [filters, pagination.limit]);

  // Load Failed Emails
  const loadFailedEmails = useCallback(async (page = 1) => {
    try {
      const res = await fetchFailedEmails({ page, limit: failedPagination.limit });
      setFailedEmails(res.data || []);
      setFailedPagination(res.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load failed emails:', err);
    }
  }, [failedPagination.limit]);

  // Load Settings & Templates
  const loadSettingsAndTemplates = useCallback(async () => {
    try {
      const [stRes, tcRes, tmplRes] = await Promise.all([
        fetchEmailSettings(),
        fetchTemplateConfigs(),
        fetchAvailableTemplates()
      ]);
      setSettings(stRes.data);
      setTemplateConfigs(tcRes.data || []);
      setAvailableTemplates(tmplRes.data || []);
    } catch (err) {
      console.error('Failed to load email settings/templates:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([
        loadOverviewAndAnalytics(),
        loadLogs(1),
        loadFailedEmails(1),
        loadSettingsAndTemplates()
      ]);
      setIsLoading(false);
      setLastSyncedAt(new Date());
    };
    init();
  }, [loadOverviewAndAnalytics, loadLogs, loadFailedEmails, loadSettingsAndTemplates]);

  // Handle Tab Change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'overview') loadOverviewAndAnalytics();
    if (tabId === 'logs') loadLogs(pagination.page);
    if (tabId === 'failed') loadFailedEmails(1);
    if (tabId === 'templates' || tabId === 'telemetry') loadSettingsAndTemplates();
  };

  // High-performance Manual Refresh with smooth tactile spin
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadOverviewAndAnalytics(),
        loadLogs(pagination.page),
        loadFailedEmails(failedPagination.page),
        loadSettingsAndTemplates()
      ]);
      setLastSyncedAt(new Date());
      showToast('Telemetry refreshed & synchronized.', 'success');
    } catch (err) {
      showToast('Failed to refresh email telemetry', 'error');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 450);
    }
  };

  // Retry an email
  const handleRetryEmail = async (id, recipient) => {
    setRetryingIds(prev => new Set([...prev, id]));
    try {
      const res = await retryEmailDelivery(id);
      if (res.success) {
        showToast(`Retried delivery for ${recipient || 'recipient'}. New status: SENT!`, 'success');
      } else {
        showToast(`Retry attempt recorded: ${res.message || 'Delivery error'}`, 'warning');
      }
      await Promise.all([loadFailedEmails(failedPagination.page), loadLogs(pagination.page), loadOverviewAndAnalytics()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Inspect log
  const handleInspectLog = async (logId) => {
    try {
      const res = await fetchEmailLogDetails(logId);
      setSelectedLog(res.data);
      setIsLogDrawerOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Event Toggle Update
  const handleToggleEvent = async (eventKey, currentValue) => {
    if (!settings?.eventToggles) return;
    setIsSavingSettings(true);
    try {
      const updatedToggles = {
        ...settings.eventToggles,
        [eventKey]: !currentValue
      };
      const res = await updateEventToggles(updatedToggles);
      setSettings(prev => ({
        ...prev,
        eventToggles: res.data
      }));
      showToast(`Email event "${eventKey}" updated to ${!currentValue ? 'ENABLED' : 'DISABLED'}.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Start editing template
  const handleStartEditTemplate = (tmpl) => {
    setEditingTemplateKey(tmpl.templateKey);
    setTemplateDraft({
      subject: tmpl.subject || '',
      customHeader: tmpl.customHeader || '',
      customNotes: tmpl.customNotes || '',
      isEnabled: tmpl.isEnabled !== false
    });
  };

  // Save template edit
  const handleSaveTemplateEdit = async (templateKey) => {
    try {
      const res = await updateTemplateConfig(templateKey, templateDraft);
      setTemplateConfigs(prev => prev.map(t => t.templateKey === templateKey ? res.data : t));
      setEditingTemplateKey(null);
      showToast(`Template "${templateKey}" updated successfully.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Send Test Email Submission
  const handleSendTestEmailSubmit = async (e) => {
    e.preventDefault();
    if (!testForm.recipient) {
      showToast('Please enter a recipient email address', 'warning');
      return;
    }

    setTestForm(prev => ({ ...prev, isSubmitting: true, result: null }));
    try {
      const res = await sendSuperAdminTestEmail(testForm.recipient, testForm.template);
      setTestForm(prev => ({
        ...prev,
        isSubmitting: false,
        result: res
      }));
      if (res.success) {
        showToast(`Test email (${testForm.template}) dispatched to ${testForm.recipient}!`, 'success');
      } else {
        showToast(res.message || 'Test email delivery failure recorded in logs', 'warning');
      }
      loadLogs(1);
      loadOverviewAndAnalytics();
    } catch (err) {
      setTestForm(prev => ({
        ...prev,
        isSubmitting: false,
        result: { success: false, message: err.message }
      }));
      showToast(err.message, 'error');
    }
  };

  // Computed max daily total for chart scaling
  const maxDailyVolume = useMemo(() => {
    if (!analytics?.daily || analytics.daily.length === 0) return 10;
    return Math.max(...analytics.daily.map(d => d.total || 0), 10);
  }, [analytics]);

  return (
    <div className="superadmin-email-center" style={{ padding: '1.25rem', color: '#f8fafc' }}>
      {/* Toast Notification */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            background: feedback.type === 'error' ? '#881337' : feedback.type === 'warning' ? '#78350f' : '#064e3b',
            border: `1px solid ${feedback.type === 'error' ? '#f43f5e' : feedback.type === 'warning' ? '#f59e0b' : '#10b981'}`,
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 500,
            maxWidth: '420px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span>{feedback.type === 'error' ? '❌' : feedback.type === 'warning' ? '⚠️' : '✅'}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Banner & Actions Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              📧
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Email Management & Control Center
            </h1>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(192, 132, 252, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(192, 132, 252, 0.3)',
                letterSpacing: '0.5px'
              }}
            >
              Super Admin Exclusive
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
            Authoritative transactional delivery pipeline, real-time audit ledger, analytics, and event policy controls.
          </p>
        </div>

        {/* Action Buttons: Polished SVG Refresh & Send Test Email */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`email-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title={`Last synced: ${lastSyncedAt.toLocaleTimeString()}`}
            aria-label="Refresh telemetry data"
          >
            <RefreshIcon className={`refresh-spin-icon ${isRefreshing ? 'is-spinning' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="email-send-test-btn"
            onClick={() => {
              setTestForm({
                recipient: settings?.telemetry?.sender?.match(/<([^>]+)>/)?.[1] || 'user@portal.com',
                template: 'TEST_EMAIL',
                isSubmitting: false,
                result: null
              });
              setIsTestModalOpen(true);
            }}
          >
            <SendIcon />
            <span>Send Test Email</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs with Modern SVGs */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        {[
          { id: 'overview', label: 'Overview & Analytics', icon: <ChartBarIcon className="tab-icon-svg" /> },
          { id: 'logs', label: 'Email Logs', icon: <LogsListIcon className="tab-icon-svg" />, count: overview?.total },
          { id: 'failed', label: 'Failed Deliveries', icon: <AlertTriangleIcon className="tab-icon-svg" />, count: overview?.failed, isAlert: Boolean(overview?.failed > 0) },
          { id: 'templates', label: 'Templates & Event Toggles', icon: <SettingsIcon className="tab-icon-svg" /> },
          { id: 'telemetry', label: 'System & SMTP Status', icon: <ShieldIcon className="tab-icon-svg" /> }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`email-nav-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '1px 7px',
                    borderRadius: '10px',
                    background: tab.isAlert ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255,255,255,0.1)',
                    color: tab.isAlert ? '#fda4af' : '#cbd5e1',
                    border: tab.isAlert ? '1px solid rgba(244,63,94,0.4)' : 'none',
                    fontWeight: 700
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: OVERVIEW & ANALYTICS
          ===================================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Section 1: Delivery Velocity (4 Balanced Columns) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Throughput & Delivery Velocity
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Auto-syncs with PostgreSQL ledger
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.9rem'
              }}
            >
              {/* Card 1: Emails Sent Today */}
              <div className="email-stat-card accent-cyan">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Emails Sent Today</span>
                  <div className="stat-icon-badge">
                    <CalendarIcon />
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.02em' }}>
                  {overview?.sentToday ?? '...'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Active 24h rolling window
                </div>
              </div>

              {/* Card 2: Sent This Week */}
              <div className="email-stat-card accent-indigo">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Sent This Week</span>
                  <div className="stat-icon-badge">
                    <CalendarDaysIcon />
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#818cf8', letterSpacing: '-0.02em' }}>
                  {overview?.sentThisWeek ?? '...'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Trailing 7 days cumulative
                </div>
              </div>

              {/* Card 3: Sent This Month */}
              <div className="email-stat-card accent-purple">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Sent This Month</span>
                  <div className="stat-icon-badge">
                    <TrendingUpIcon />
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc', letterSpacing: '-0.02em' }}>
                  {overview?.sentThisMonth ?? '...'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Trailing 30 days total volume
                </div>
              </div>

              {/* Card 4: Delivery Success Rate */}
              <div className="email-stat-card accent-emerald">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Delivery Success Rate</span>
                  <div className="stat-icon-badge">
                    <GaugeIcon />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                    {overview?.deliverySuccessRate ?? '100'}%
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700 }}>
                    HEALTHY
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Confirmed SMTP transactions
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pipeline Status Ledger (3 Balanced Columns) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pipeline Status Breakdown
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '0.9rem'
              }}
            >
              {/* Card 5: Successful */}
              <div className="email-stat-card accent-emerald">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Successful Deliveries</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Delivered to recipient inbox</span>
                  </div>
                  <div className="stat-icon-badge" style={{ background: 'rgba(52, 211, 153, 0.1)' }}>
                    <CheckCircleIcon />
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
                  {overview?.successful ?? '...'}
                </div>
              </div>

              {/* Card 6: Failed Deliveries */}
              <div className="email-stat-card accent-rose">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Failed Deliveries</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Retry available in error tab</span>
                  </div>
                  <div className="stat-icon-badge" style={{ background: 'rgba(244, 63, 94, 0.1)' }}>
                    <XCircleIcon />
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f43f5e', letterSpacing: '-0.02em' }}>
                  {overview?.failed ?? '...'}
                </div>
              </div>

              {/* Card 7: Pending Queue */}
              <div className="email-stat-card accent-amber">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>Pending in Queue</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Active connection worker batch</span>
                  </div>
                  <div className="stat-icon-badge" style={{ background: 'rgba(251, 191, 36, 0.1)' }}>
                    <ClockIcon />
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
                  {overview?.pending ?? '...'}
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Visual Charts Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            {/* Chart 1: Emails Per Day Time-Series */}
            <div className="email-glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUpIcon />
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Emails Per Day (Past {analyticsDays} Days)
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setAnalyticsDays(days)}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.74rem',
                        fontWeight: analyticsDays === days ? 700 : 500,
                        background: analyticsDays === days ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: analyticsDays === days ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Bar visualization */}
              <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '6px', paddingTop: '10px' }}>
                {analytics?.daily?.map((d, i) => {
                  const heightPercent = Math.max(8, Math.round((d.total / maxDailyVolume) * 100));
                  const isFailedOnly = d.total > 0 && d.sent === 0 && d.failed > 0;
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        height: '100%',
                        justifyContent: 'flex-end'
                      }}
                      title={`${d.date}: ${d.total} emails (${d.sent} sent, ${d.failed} failed)`}
                    >
                      <span style={{ fontSize: '0.62rem', color: '#64748b' }}>
                        {d.total > 0 ? d.total : ''}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPercent}%`,
                          borderRadius: '4px 4px 0 0',
                          background: isFailedOnly
                            ? '#f43f5e'
                            : d.failed > 0
                            ? 'linear-gradient(to top, #6366f1, #f43f5e)'
                            : 'linear-gradient(to top, #4f46e5, #818cf8)',
                          opacity: d.total > 0 ? 0.95 : 0.25,
                          boxShadow: d.total > 0 ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '1.1rem', fontSize: '0.74rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#6366f1', borderRadius: '3px' }} /> Delivered
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#f43f5e', borderRadius: '3px' }} /> Failed
                </span>
              </div>
            </div>

            {/* Chart 2: Success vs Failure & Category Distribution */}
            <div className="email-glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <GaugeIcon />
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#f1f5f9' }}>
                  Delivery Ratio & Domain Distribution
                </h3>
              </div>

              {/* Progress bar ratio */}
              <div style={{ marginBottom: '1.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.45rem' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Delivered: {analytics?.summary?.sent || 0}</span>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>Failed: {analytics?.summary?.failed || 0}</span>
                </div>
                <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
                  <div
                    style={{
                      width: `${analytics?.summary?.successRate || 100}%`,
                      background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                  <div
                    style={{
                      width: `${100 - (analytics?.summary?.successRate || 100)}%`,
                      background: '#f43f5e',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              {/* Event Categories */}
              <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Volume by Event Domain
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {analytics?.byCategory?.map((cat, idx) => {
                  const maxCat = Math.max(...(analytics.byCategory.map(c => c.count) || [1]), 1);
                  const pct = Math.round((cat.count / maxCat) * 100);
                  const colors = {
                    SECURITY: '#38bdf8',
                    ACTIVITY: '#818cf8',
                    GAMIFICATION: '#c084fc',
                    SYSTEM: '#34d399'
                  };
                  return (
                    <div key={idx} style={{ fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{cat.category}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{cat.count}</span>
                      </div>
                      <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: colors[cat.category] || '#6366f1', borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Breakdown by Template */}
          <div className="email-glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <LogsListIcon />
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#f1f5f9' }}>
                Delivery Breakdown by Template
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {analytics?.byTemplate?.slice(0, 10).map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.85rem 1.1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#e2e8f0' }}>{t.template}</div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                      <span style={{ color: '#34d399' }}>✓ {t.sent} sent</span>
                      {t.failed > 0 && <span style={{ color: '#f87171', marginLeft: '8px' }}>✕ {t.failed} failed</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#818cf8' }}>
                    {t.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: EMAIL LOGS TABLE
          ===================================================================== */}
      {activeTab === 'logs' && (
        <div className="email-glass-panel">
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            {/* Search Input */}
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search recipient, subject, or message ID..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') loadLogs(1); }}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.9rem',
                  fontSize: '0.84rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={e => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
              }}
              style={{
                padding: '0.55rem 0.9rem',
                fontSize: '0.84rem',
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">SENT (Success)</option>
              <option value="FAILED">FAILED (Error)</option>
              <option value="PENDING">PENDING</option>
            </select>

            {/* Template Filter */}
            <select
              value={filters.template}
              onChange={e => {
                setFilters(prev => ({ ...prev, template: e.target.value }));
              }}
              style={{
                padding: '0.55rem 0.9rem',
                fontSize: '0.84rem',
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            >
              <option value="ALL">All Templates</option>
              {availableTemplates.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Date Filters */}
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              title="From Date"
              style={{
                padding: '0.48rem 0.75rem',
                fontSize: '0.82rem',
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#cbd5e1'
              }}
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              title="To Date"
              style={{
                padding: '0.48rem 0.75rem',
                fontSize: '0.82rem',
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#cbd5e1'
              }}
            />

            <button
              type="button"
              onClick={() => loadLogs(1)}
              style={{
                padding: '0.55rem 1.1rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
              }}
            >
              Apply Filter
            </button>

            <button
              type="button"
              onClick={() => {
                setFilters({ search: '', status: 'ALL', template: 'ALL', startDate: '', endDate: '' });
                setTimeout(() => loadLogs(1), 50);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem' }}>Recipient</th>
                  <th style={{ padding: '0.75rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem' }}>Template</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Sent At</th>
                  <th style={{ padding: '0.75rem' }}>Message ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No email delivery logs match the selected filters.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const isSent = log.status === 'SENT';
                    const isFailed = log.status === 'FAILED';
                    return (
                      <tr
                        key={log.id}
                        onClick={() => handleInspectLog(log.id)}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.75rem', color: '#f1f5f9', fontWeight: 600 }}>
                          {log.recipient}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#cbd5e1', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.subject}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(99,102,241,0.12)',
                              color: '#a5b4fc',
                              border: '1px solid rgba(99,102,241,0.25)',
                              fontWeight: 600
                            }}
                          >
                            {log.template}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: isSent ? 'rgba(16,185,129,0.15)' : isFailed ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                              color: isSent ? '#34d399' : isFailed ? '#f87171' : '#fbbf24',
                              border: `1px solid ${isSent ? 'rgba(16,185,129,0.3)' : isFailed ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                              fontWeight: 700
                            }}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                          {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() + ' ' + new Date(log.sentAt).toLocaleDateString() : new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.74rem', fontFamily: 'monospace' }}>
                          {log.messageId ? log.messageId.slice(0, 16) + '...' : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectLog(log.id);
                            }}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '6px',
                              color: '#cbd5e1',
                              cursor: 'pointer'
                            }}
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
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <div>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total logs)
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadLogs(pagination.page - 1)}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: pagination.page <= 1 ? '#475569' : '#ffffff',
                  cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                &larr; Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadLogs(pagination.page + 1)}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: pagination.page >= pagination.totalPages ? '#475569' : '#ffffff',
                  cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: FAILED EMAILS & RETRY
          ===================================================================== */}
      {activeTab === 'failed' && (
        <div className="email-glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangleIcon />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>
                  Failed Email Deliveries ({failedPagination.totalCount})
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Failed dispatches captured by fault-tolerant error boundaries. Click "Retry" to safely re-dispatch via SMTP.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem' }}>Recipient</th>
                  <th style={{ padding: '0.75rem' }}>Template</th>
                  <th style={{ padding: '0.75rem' }}>Failure Reason</th>
                  <th style={{ padding: '0.75rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Retry Action</th>
                </tr>
              </thead>
              <tbody>
                {failedEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#34d399', fontWeight: 600 }}>
                      🎉 Zero failed emails found! All transactional dispatches are currently successful.
                    </td>
                  </tr>
                ) : (
                  failedEmails.map(item => {
                    const isRetryingThis = retryingIds.has(item.id);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.75rem', color: '#f1f5f9', fontWeight: 600 }}>
                          {item.recipient}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(244,63,94,0.12)', color: '#f87171', border: '1px solid rgba(244,63,94,0.3)', fontWeight: 600 }}>
                            {item.template}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#fda4af', maxWidth: '300px', fontSize: '0.78rem', wordBreak: 'break-word' }}>
                          {item.error || 'Connection or credential error'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={isRetryingThis}
                            onClick={() => handleRetryEmail(item.id, item.recipient)}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: isRetryingThis ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#ffffff',
                              cursor: isRetryingThis ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: isRetryingThis ? 'none' : '0 2px 8px rgba(244, 63, 94, 0.35)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <RefreshIcon className={isRetryingThis ? 'refresh-spin-icon is-spinning' : ''} />
                            <span>{isRetryingThis ? 'Retrying...' : 'Retry'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: TEMPLATES & EVENT TOGGLES
          ===================================================================== */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section A: Global Event Toggles */}
          <div className="email-glass-panel">
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SettingsIcon />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                  Super Admin Global Event Toggles
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Globally enable or disable optional email notifications. Security-critical emails cannot be disabled.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {[
                { key: 'loginNotification', label: 'Login Notification Alerts', desc: 'Alerts creators on new device / IP sign-ins', isOptional: true },
                { key: 'submissionApproval', label: 'Submission Approval Emails', desc: 'Notifies creators when submissions are approved', isOptional: true },
                { key: 'submissionRejection', label: 'Submission Rejection Emails', desc: 'Notifies creators with moderation feedback', isOptional: true },
                { key: 'xpEarned', label: 'XP Earned Notifications', desc: 'Dispatches when activity XP points are granted', isOptional: true },
                { key: 'levelUp', label: 'Level Up Celebrations', desc: 'Congratulates creators on crossing level tiers', isOptional: true },
                { key: 'announcements', label: 'Platform Announcements', desc: 'Broadcasts institutional portal announcements', isOptional: true },
                { key: 'passwordReset', label: 'Password Reset Emails', desc: 'Single-use cryptographically hashed reset links', isOptional: false },
                { key: 'passwordChanged', label: 'Password Changed Confirmations', desc: 'Security audit receipts upon password updates', isOptional: false },
                { key: 'accountSecurity', label: 'Account Security Alerts', desc: 'Deactivation / reactivation status alerts', isOptional: false }
              ].map(event => {
                const isEnabled = settings?.eventToggles ? settings.eventToggles[event.key] !== false : true;
                return (
                  <div
                    key={event.key}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>{event.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{event.desc}</div>
                    </div>
                    {event.isOptional ? (
                      <button
                        type="button"
                        disabled={isSavingSettings}
                        onClick={() => handleToggleEvent(event.key, isEnabled)}
                        style={{
                          padding: '4px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          borderRadius: '16px',
                          background: isEnabled ? '#10b981' : 'rgba(255,255,255,0.1)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {isEnabled ? 'Enabled ✓' : 'Disabled ✕'}
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(99,102,241,0.15)',
                          color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.3)'
                        }}
                      >
                        🔒 Locked ON
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Template Customization */}
          <div className="email-glass-panel">
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogsListIcon />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                  Template Subject & Content Customization
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Customize email subjects and preheaders. Content is automatically sanitized to prevent script injection.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {templateConfigs.map(tmpl => {
                const isEditing = editingTemplateKey === tmpl.templateKey;
                return (
                  <div
                    key={tmpl.templateKey}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#e2e8f0' }}>{tmpl.name}</span>
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                          {tmpl.category}
                        </span>
                      </div>

                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Subject Line:</label>
                          <input
                            type="text"
                            value={templateDraft.subject}
                            onChange={e => setTemplateDraft(prev => ({ ...prev, subject: e.target.value }))}
                            style={{
                              padding: '0.45rem',
                              fontSize: '0.82rem',
                              background: '#0f172a',
                              border: '1px solid #6366f1',
                              borderRadius: '6px',
                              color: '#ffffff'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0.4rem 0' }}>
                          <span style={{ color: '#64748b' }}>Subject: </span>
                          <span style={{ fontStyle: 'italic' }}>"{tmpl.subject}"</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingTemplateKey(null)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.74rem',
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '6px',
                              color: '#94a3b8',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveTemplateEdit(tmpl.templateKey)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: '#10b981',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#ffffff',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditTemplate(tmpl)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '6px',
                            color: '#cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit Subject
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: SYSTEM & SMTP STATUS TELEMETRY
          ===================================================================== */}
      {activeTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="email-glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ShieldIcon />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                Live SMTP Infrastructure Telemetry
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Email Provider', value: settings?.telemetry?.provider || 'Gmail', status: 'Active' },
                { label: 'Configured Sender', value: settings?.telemetry?.sender || 'pjsocialmediaportal@gmail.com', status: 'Primary' },
                { label: 'SMTP Authentication', value: settings?.telemetry?.smtpStatus || 'Configured ✓', isSuccess: settings?.telemetry?.hasSmtp },
                { label: 'OAuth2 Authentication', value: settings?.telemetry?.oauthStatus || 'Not Configured ✕', isSuccess: settings?.telemetry?.hasOAuth },
                { label: 'SMTP Host & Port', value: `${settings?.telemetry?.host || 'smtp.gmail.com'}:${settings?.telemetry?.port || 465}`, status: 'SSL/TLS' },
                { label: 'Connection Pooling', value: 'Active (max 3 conns, 100 msgs)', isSuccess: true }
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.isSuccess === false ? '#f87171' : '#f1f5f9' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy & Zero-Secret Exposure Guarantee */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}
          >
            <span style={{ fontSize: '1.6rem' }}>🔐</span>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.92rem', color: '#a5b4fc', fontWeight: 700 }}>
                Enterprise Zero-Exposure Security Policy
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                Under no circumstances are Google App Passwords, SMTP tokens, client secrets, or user credentials exposed to the frontend, stored in client-accessible memory, or recorded in audit logs. All transmission runs backend-authoritative on Node.js with automated secret masking.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          EMAIL DETAILS INSPECT DRAWER / MODAL
          ===================================================================== */}
      {isLogDrawerOpen && selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem'
          }}
          onClick={() => setIsLogDrawerOpen(false)}
        >
          <div
            style={{
              background: '#0d111a',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔍</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Email Delivery Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Status: </span>
                <span style={{ fontWeight: 700, color: selectedLog.status === 'SENT' ? '#34d399' : '#f87171' }}>
                  {selectedLog.status}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Recipient: </span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{selectedLog.recipient}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Subject: </span>
                <span style={{ color: '#cbd5e1' }}>{selectedLog.subject}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Template: </span>
                <span style={{ color: '#818cf8', fontWeight: 600 }}>{selectedLog.template}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Created At: </span>
                <span style={{ color: '#94a3b8' }}>{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Sent At: </span>
                <span style={{ color: '#94a3b8' }}>{selectedLog.sentAt ? new Date(selectedLog.sentAt).toLocaleString() : 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Message ID: </span>
                <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>{selectedLog.messageId || 'None'}</span>
              </div>
              {selectedLog.entityId && (
                <div>
                  <span style={{ color: '#64748b' }}>Entity ID (Deduplication Key): </span>
                  <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>{selectedLog.entityId}</span>
                </div>
              )}
              {selectedLog.error && (
                <div style={{ padding: '0.75rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px' }}>
                  <span style={{ color: '#f87171', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Failure Reason:</span>
                  <span style={{ color: '#fda4af', fontSize: '0.78rem', wordBreak: 'break-word' }}>{selectedLog.error}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              {selectedLog.status === 'FAILED' && (
                <button
                  type="button"
                  onClick={() => {
                    handleRetryEmail(selectedLog.id, selectedLog.recipient);
                    setIsLogDrawerOpen(false);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: '#f43f5e',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Retry Email Delivery
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsLogDrawerOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SEND TEST EMAIL MODAL
          ===================================================================== */}
      {isTestModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem'
          }}
          onClick={() => setIsTestModalOpen(false)}
        >
          <div
            style={{
              background: '#0d111a',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📧</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Send Operational Test Email</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTestEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                  Recipient Email Address:
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. pjsocialmediaportal@gmail.com"
                  value={testForm.recipient}
                  onChange={e => setTestForm(prev => ({ ...prev, recipient: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.86rem',
                    background: '#07090e',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                  Choose Transactional Email Template:
                </label>
                <select
                  value={testForm.template}
                  onChange={e => setTestForm(prev => ({ ...prev, template: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.86rem',
                    background: '#07090e',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                >
                  {AVAILABLE_TEST_TEMPLATES.map(t => (
                    <option key={t.key} value={t.key}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {testForm.result && (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    background: testForm.result.success ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                    border: `1px solid ${testForm.result.success ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                    color: testForm.result.success ? '#34d399' : '#f87171'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                    {testForm.result.success ? '✅ Dispatch Success!' : '❌ Dispatch Failed'}
                  </div>
                  <div>{testForm.result.message}</div>
                  {testForm.result.data?.messageId && (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', marginTop: '4px', color: '#94a3b8' }}>
                      Message ID: {testForm.result.data.messageId}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.84rem',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testForm.isSubmitting}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    background: testForm.isSubmitting ? '#4338ca' : '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    cursor: testForm.isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                  }}
                >
                  {testForm.isSubmitting ? 'Sending...' : '🚀 Dispatch Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
