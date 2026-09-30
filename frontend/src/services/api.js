/**
 * API Service for Social Media Verification Portal
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('auth_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
};

// Health & Telemetry
export const fetchHealth = async () => {
  const startTime = performance.now();
  try {
    const res = await apiFetch('/health');
    const latency = Math.round(performance.now() - startTime);
    return {
      success: true,
      latency,
      data: res.data,
      raw: res,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latency,
      error: error.message,
      status: error.status || 500,
    };
  }
};

export const fetchDatabaseStatus = async () => {
  const startTime = performance.now();
  try {
    const res = await apiFetch('/database/status');
    const latency = Math.round(performance.now() - startTime);
    return {
      success: true,
      latency,
      data: res.data,
      raw: res,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latency,
      error: error.message,
      status: error.status || 500,
    };
  }
};

export const fetchPortalInfo = async () => {
  return await apiFetch('/info');
};

// Authentication Endpoints
export const loginUser = async (email, password) => {
  return await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = async (name, email, password) => {
  return await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
};

export const fetchCurrentUser = async () => {
  return await apiFetch('/auth/me', {
    method: 'GET',
  });
};

export const fetchUserProfile = async () => {
  return await apiFetch('/users/profile', {
    method: 'GET',
  });
};

export const logoutUser = async () => {
  try {
    return await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } catch {
    return { success: true };
  }
};

// Submissions Endpoints
export const fetchMySubmissions = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.platform) params.append('platform', filters.platform);

  const query = params.toString();
  const url = query ? `/submissions/my?${query}` : '/submissions/my';
  return await apiFetch(url);
};

export const fetchAllSubmissions = async () => {
  return await apiFetch('/submissions');
};

export const createSubmission = (submissionData, onProgress) => {
  const url = `${BASE_URL}/submissions`;
  const token = localStorage.getItem('auth_token');

  // If payload is FormData, use XMLHttpRequest for real upload progress tracking
  if (submissionData instanceof FormData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            const error = new Error(data.message || `Upload failed with status ${xhr.status}`);
            error.status = xhr.status;
            error.code = data.code;
            reject(error);
          }
        } catch {
          reject(new Error(`Failed to parse server response (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload. Please check your connection.'));
      xhr.send(submissionData);
    });
  }

  // Fallback for standard JSON payload
  return apiFetch('/submissions', {
    method: 'POST',
    body: JSON.stringify(submissionData),
  });
};

export const reviewSubmission = async (id, status, feedback) => {
  return await apiFetch(`/submissions/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, feedback }),
  });
};

export const approveSubmission = async (id, feedback = '') => {
  return await apiFetch(`/reviews/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
};

export const rejectSubmission = async (id, feedback) => {
  return await apiFetch(`/reviews/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
};

// User Directory & Role Management Endpoints
export const fetchUsers = async () => {
  return await apiFetch('/users');
};

export const updateUserRole = async (userId, role) => {
  return await apiFetch(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

// Notifications Endpoints
export const fetchNotifications = async () => {
  return await apiFetch('/notifications');
};

export const fetchMyNotifications = async () => {
  return await apiFetch('/notifications');
};

export const markNotificationRead = async (id) => {
  return await apiFetch(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
};

export const markAllNotificationsRead = async () => {
  return await apiFetch('/notifications/read-all', {
    method: 'PATCH',
  });
};

// Dashboard Endpoints
export const fetchUserDashboard = async () => {
  return await apiFetch('/dashboard/user');
};

export const fetchAdminDashboard = async () => {
  return await apiFetch('/dashboard/admin');
};

// Review Queue Endpoints (ADMIN, SUPER_ADMIN)
export const fetchPendingReviews = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.platform && filters.platform !== 'ALL') params.append('platform', filters.platform);
  if (filters.actionType && filters.actionType !== 'ALL') params.append('actionType', filters.actionType);
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const query = params.toString();
  return await apiFetch(query ? `/reviews/pending?${query}` : '/reviews/pending');
};

export const fetchReviewSubmissionDetails = async (id) => {
  return await apiFetch(`/reviews/submission/${id}`);
};

/**
 * Resolve a screenshot reference to a fully-qualified authenticated URL.
 *
 * Internal refs (stored as /api/uploads/screenshots/<filename>) are served
 * through the auth-gated API. The browser will send the Authorization header
 * via XMLHttpRequest (for <img> we use object URLs).
 *
 * External URLs (http/https) pass through unchanged.
 *
 * @param {string|null} screenshotUrl - Raw value from the submission record
 * @returns {string|null}
 */
export const getScreenshotUrl = (screenshotUrl) => {
  if (!screenshotUrl) return null;
  // External URL — leave as-is
  if (screenshotUrl.startsWith('http://') || screenshotUrl.startsWith('https://')) {
    return screenshotUrl;
  }

  const token = localStorage.getItem('auth_token');
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';

  // Internal API ref — route via the API
  if (screenshotUrl.startsWith('/api/uploads/')) {
    return `${screenshotUrl}${tokenQuery}`;
  }
  // Legacy /uploads/<filename> — still route via the new API
  if (screenshotUrl.startsWith('/uploads/')) {
    return `/api${screenshotUrl}${tokenQuery}`;
  }
  return screenshotUrl;
};

/**
 * Fetch a screenshot as a Blob using the stored auth token so <img> tags
 * can display auth-gated images via an object URL.
 * @param {string} screenshotUrl
 * @returns {Promise<string>} Object URL
 */
export const fetchScreenshotObjectUrl = async (screenshotUrl) => {
  const resolvedUrl = getScreenshotUrl(screenshotUrl);
  if (!resolvedUrl) return null;

  // External images: return directly (no auth needed)
  if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
    return resolvedUrl;
  }

  const token = localStorage.getItem('auth_token');
  const response = await fetch(resolvedUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) return null;

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};


// Super Admin Exclusive Endpoints
export const fetchAuditLogs = async () => {
  return await apiFetch('/superadmin/audit-logs');
};

export const fetchSystemStats = async () => {
  return await apiFetch('/superadmin/system-stats');
};

// Super Admin User Management Endpoints
export const fetchSuperAdminUsers = async ({ page = 1, limit = 10, search = '', role = 'ALL', status = 'ALL' } = {}) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (search) params.append('search', search);
  if (role && role !== 'ALL') params.append('role', role);
  if (status && status !== 'ALL') params.append('status', status);

  const qs = params.toString();
  return await apiFetch(qs ? `/superadmin/users?${qs}` : '/superadmin/users');
};

export const fetchSuperAdminUserDetails = async (id) => {
  return await apiFetch(`/superadmin/users/${id}`);
};

export const createSuperAdminUser = async ({ name, email, password, role, status }) => {
  return await apiFetch('/superadmin/users', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, status }),
  });
};

export const updateSuperAdminUser = async (id, updates) => {
  return await apiFetch(`/superadmin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const updateSuperAdminUserStatus = async (id, status) => {
  return await apiFetch(`/superadmin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const deleteSuperAdminUser = async (id) => {
  return await apiFetch(`/superadmin/users/${id}`, {
    method: 'DELETE',
  });
};

// Direct Restricted Endpoint Probe (for live in-app testing of 403 Forbidden responses)
export const testRestrictedEndpoint = async (endpoint, options = {}) => {
  try {
    const data = await apiFetch(endpoint, options);
    return {
      allowed: true,
      status: 200,
      data
    };
  } catch (error) {
    return {
      allowed: false,
      status: error.status || 403,
      code: error.code,
      message: error.message,
      data: error.data
    };
  }
};

