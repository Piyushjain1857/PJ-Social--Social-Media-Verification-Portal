/**
 * Super Admin Transactional Email Management API Client
 * Social Media Activity Verification Portal
 */

const API_BASE = '/api/super-admin/email';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/**
 * Fetch high-level delivery metrics (Today, Week, Month, Status breakdown, Success rate)
 */
export const fetchEmailOverview = async () => {
  const res = await fetch(`${API_BASE}/overview`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch email overview: ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch time-series and categorical analytics
 */
export const fetchEmailAnalytics = async (days = 14) => {
  const res = await fetch(`${API_BASE}/analytics?days=${days}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch email analytics: ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch paginated, filtered, searchable email delivery logs
 */
export const fetchEmailLogs = async ({
  page = 1,
  limit = 10,
  search = '',
  status = 'ALL',
  template = 'ALL',
  startDate = '',
  endDate = ''
} = {}) => {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  if (search) params.set('search', search);
  if (status && status !== 'ALL') params.set('status', status);
  if (template && template !== 'ALL') params.set('template', template);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const res = await fetch(`${API_BASE}/logs?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch email logs: ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch single email log details by ID
 */
export const fetchEmailLogDetails = async (id) => {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch email log details: ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch failed email logs
 */
export const fetchFailedEmails = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  if (search) params.set('search', search);

  const res = await fetch(`${API_BASE}/failed?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch failed emails: ${res.status}`);
  }
  return await res.json();
};

/**
 * Retry delivery of a failed email log
 */
export const retryEmailDelivery = async (id) => {
  const res = await fetch(`${API_BASE}/retry/${id}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to retry email delivery: ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch safe system telemetry and global event toggles
 */
export const fetchEmailSettings = async () => {
  const res = await fetch(`${API_BASE}/settings`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch email settings: ${res.status}`);
  }
  return await res.json();
};

/**
 * Update Super Admin global event toggles
 */
export const updateEventToggles = async (toggles) => {
  const res = await fetch(`${API_BASE}/settings/events`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(toggles)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update event toggles: ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch template configurations
 */
export const fetchTemplateConfigs = async () => {
  const res = await fetch(`${API_BASE}/templates/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch template configs: ${res.status}`);
  }
  return await res.json();
};

/**
 * Update a specific template configuration
 */
export const updateTemplateConfig = async (templateKey, data) => {
  const res = await fetch(`${API_BASE}/templates/config/${encodeURIComponent(templateKey)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update template config: ${res.status}`);
  }
  return await res.json();
};

/**
 * Send an operational test email with chosen template
 */
export const sendSuperAdminTestEmail = async (recipient, template = 'TEST_EMAIL') => {
  const res = await fetch(`${API_BASE}/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipient, template })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to send test email: ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch available template keys
 */
export const fetchAvailableTemplates = async () => {
  const res = await fetch(`${API_BASE}/templates`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch templates: ${res.status}`);
  }
  return await res.json();
};
