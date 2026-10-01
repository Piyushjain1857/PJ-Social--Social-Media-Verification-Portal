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

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    const error = new Error('Network connection error. Please verify the backend service is running.');
    error.status = 0;
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { message: 'Unable to parse server response as JSON.' };
    }
  } else {
    const text = await response.text();
    data = { message: text || `HTTP error ${response.status}` };
  }

  if (!response.ok) {
    // 401: Unauthorized / Session Expiration
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      window.dispatchEvent(
        new CustomEvent('auth:session_expired', {
          detail: {
            status: 401,
            code: data.code || 'SESSION_EXPIRED',
            message: data.message || 'Your session has expired. Please sign in again.'
          }
        })
      );
    } else if (response.status === 403) {
      window.dispatchEvent(
        new CustomEvent('auth:forbidden', {
          detail: {
            status: 403,
            code: data.code || 'FORBIDDEN',
            message: data.message || 'Access denied. You do not have permission for this resource.'
          }
        })
      );
    }

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

export const fetchMyProfile = async () => {
  return await apiFetch('/users/me', {
    method: 'GET',
  });
};

export const updateMyProfile = async (profileData) => {
  return await apiFetch('/users/me', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const changeUserPassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  return await apiFetch('/users/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
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
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters.platform && filters.platform !== 'ALL') params.append('platform', filters.platform);
  if (filters.actionType && filters.actionType !== 'ALL') params.append('actionType', filters.actionType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const query = params.toString();
  const url = query ? `/submissions/my?${query}` : '/submissions/my';
  return await apiFetch(url);
};

export const fetchAllSubmissions = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters.platform && filters.platform !== 'ALL') params.append('platform', filters.platform);
  if (filters.actionType && filters.actionType !== 'ALL') params.append('actionType', filters.actionType);
  if (filters.reviewerId) params.append('reviewerId', filters.reviewerId);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const query = params.toString();
  const url = query ? `/submissions?${query}` : '/submissions';
  return await apiFetch(url);
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
export const fetchUsers = async (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.append('page', params.page);
  if (params.limit) q.append('limit', params.limit);
  if (params.search) q.append('search', params.search);
  if (params.role && params.role !== 'ALL') q.append('role', params.role);
  if (params.status && params.status !== 'ALL') q.append('status', params.status);
  if (params.startDate) q.append('startDate', params.startDate);
  if (params.endDate) q.append('endDate', params.endDate);
  if (params.sortBy) q.append('sortBy', params.sortBy);
  if (params.sortOrder) q.append('sortOrder', params.sortOrder);

  const qs = q.toString();
  return await apiFetch(qs ? `/users?${qs}` : '/users');
};

export const updateUserRole = async (userId, role) => {
  return await apiFetch(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

// Notifications Endpoints
export const fetchNotifications = async (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.append('page', params.page);
  if (params.limit) q.append('limit', params.limit);
  if (params.search) q.append('search', params.search);
  if (params.type && params.type !== 'ALL') q.append('type', params.type);
  if (params.isRead !== undefined && params.isRead !== 'ALL') q.append('isRead', params.isRead);
  if (params.startDate) q.append('startDate', params.startDate);
  if (params.endDate) q.append('endDate', params.endDate);
  if (params.sortBy) q.append('sortBy', params.sortBy);
  if (params.sortOrder) q.append('sortOrder', params.sortOrder);

  const qs = q.toString();
  return await apiFetch(qs ? `/notifications?${qs}` : '/notifications');
};

export const fetchMyNotifications = async (params = {}) => {
  return await fetchNotifications(params);
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

export const fetchSuperAdminDashboard = async () => {
  return await apiFetch('/dashboard/super-admin');
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

export const fetchReviewSubmissionDetails = async (id, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters.platform && filters.platform !== 'ALL') params.append('platform', filters.platform);
  if (filters.actionType && filters.actionType !== 'ALL') params.append('actionType', filters.actionType);
  if (filters.search) params.append('search', filters.search);

  const qs = params.toString();
  return await apiFetch(qs ? `/reviews/submission/${id}?${qs}` : `/reviews/submission/${id}`);
};

export const addReviewInternalNote = async (id, note) => {
  return await apiFetch(`/reviews/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
};

export const requestReviewClarification = async (id, message) => {
  return await apiFetch(`/reviews/${id}/clarification`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
};

export const fetchReviewQueueNavigation = async (id, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters.platform && filters.platform !== 'ALL') params.append('platform', filters.platform);
  if (filters.actionType && filters.actionType !== 'ALL') params.append('actionType', filters.actionType);
  if (filters.search) params.append('search', filters.search);

  const qs = params.toString();
  return await apiFetch(qs ? `/reviews/${id}/navigation?${qs}` : `/reviews/${id}/navigation`);
};

export const fetchReviewHistory = async (id) => {
  return await apiFetch(`/reviews/${id}/history`);
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
export const fetchSuperAdminUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  role = 'ALL',
  status = 'ALL',
  startDate,
  endDate,
  sortBy,
  sortOrder
} = {}) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (search) params.append('search', search);
  if (role && role !== 'ALL') params.append('role', role);
  if (status && status !== 'ALL') params.append('status', status);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

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

// Official Social Media Accounts (Active Accounts for Submissions)
export const fetchActiveOfficialAccounts = async (platform) => {
  const qs = platform && platform !== 'ALL' ? `?platform=${encodeURIComponent(platform)}` : '';
  return await apiFetch(`/social-accounts/active${qs}`);
};

export const fetchOfficialAccountById = async (id) => {
  return await apiFetch(`/social-accounts/${id}`);
};

// Unified Global Search API
export const fetchGlobalSearch = async (query, limit = 5) => {
  if (!query || !query.trim()) {
    return {
      success: true,
      query: '',
      totalMatches: 0,
      categories: { submissions: [], users: [], admins: [], socialAccounts: [], notifications: [] }
    };
  }
  return await apiFetch(`/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
};

// General Official Social Accounts (available to all authenticated users)
export const fetchSocialAccounts = async ({
  platform,
  status,
  search,
  page,
  limit,
  startDate,
  endDate,
  sortBy,
  sortOrder
} = {}) => {
  const params = new URLSearchParams();
  if (platform && platform !== 'ALL') params.append('platform', platform);
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  const qs = params.toString();
  return await apiFetch(qs ? `/social-accounts?${qs}` : '/social-accounts');
};

// Super Admin Official Social Accounts Management (SUPER_ADMIN only)
export const fetchSuperAdminSocialAccounts = async ({
  platform,
  status,
  search,
  page,
  limit,
  startDate,
  endDate,
  sortBy,
  sortOrder
} = {}) => {
  const params = new URLSearchParams();
  if (platform && platform !== 'ALL') params.append('platform', platform);
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  const qs = params.toString();
  return await apiFetch(qs ? `/superadmin/social-accounts?${qs}` : '/superadmin/social-accounts');
};

export const createSuperAdminSocialAccount = async (accountData) => {
  return await apiFetch('/superadmin/social-accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
};

export const updateSuperAdminSocialAccount = async (id, updates) => {
  return await apiFetch(`/superadmin/social-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const updateSuperAdminSocialAccountStatus = async (id, isActive) => {
  return await apiFetch(`/superadmin/social-accounts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
};

export const deleteSuperAdminSocialAccount = async (id) => {
  return await apiFetch(`/superadmin/social-accounts/${id}`, {
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Gamification & Points API Endpoints (/api/points)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Fetch authenticated creator's points summary, recent transactions, and activity breakdown.
 * @returns {Promise<{ success: boolean, data: { totalPoints: number, recentTransactions: Array, breakdown: Object } }>}
 */
export const fetchMyPoints = async () => {
  return await apiFetch('/points/me');
};

/**
 * Fetch paginated point transactions for current user.
 * @param {Object} [params] - { page, limit, actionType, startDate, endDate, sortBy, sortOrder }
 */
export const fetchMyPointsHistory = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return await apiFetch(`/points/me/history${queryString ? `?${queryString}` : ''}`);
};

/**
 * Fetch points summary for a specific user (Admin / Super Admin only).
 * @param {string} userId
 */
export const fetchUserPoints = async (userId) => {
  return await apiFetch(`/points/user/${userId}`);
};

/**
 * Manually adjust a user's points balance (Super Admin only).
 * @param {Object} payload - { userId, points, reason }
 */
export const adjustUserPoints = async ({ userId, points, reason }) => {
  return await apiFetch('/points/adjust', {
    method: 'POST',
    body: JSON.stringify({ userId, points, reason })
  });
};

/**
 * Fetch portal-wide leaderboard with timeframe filters and pagination.
 * @param {Object} [params] - { timeframe: 'all_time' | 'this_month' | 'this_week', page, limit }
 */
export const fetchLeaderboard = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return await apiFetch(`/leaderboard${queryString ? `?${queryString}` : ''}`);
};

/**
 * Fetch authenticated user's current ranking and difference to next rank.
 * @param {string} [timeframe='all_time']
 */
export const fetchMyRank = async (timeframe = 'all_time') => {
  return await apiFetch(`/points/me/rank?timeframe=${encodeURIComponent(timeframe)}`);
};

/**
 * Super Admin: Fetch global point transactions audit log.
 * @param {Object} [params] - { page, limit, search, actionType, startDate, endDate, sortBy, sortOrder }
 */
export const fetchAllPointTransactions = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return await apiFetch(`/points/all${queryString ? `?${queryString}` : ''}`);
};

/**
 * Admin & Super Admin: Fetch creators gamification overview list.
 * @param {Object} [params] - { page, limit, search }
 */
export const fetchAdminGamificationOverview = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return await apiFetch(`/points/admin/overview${queryString ? `?${queryString}` : ''}`);
};

/**
 * Gamification XP & Level Engine API Methods (/api/gamification)
 */
export const fetchMyGamification = async () => {
  return await apiFetch('/gamification/me');
};

export const fetchMyXPHistory = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return await apiFetch(`/gamification/me/history${queryString ? `?${queryString}` : ''}`);
};

export const fetchGamificationLevels = async () => {
  return await apiFetch('/gamification/levels');
};

export const fetchUserGamification = async (userId) => {
  return await apiFetch(`/gamification/user/${userId}`);
};

/**
 * Super Admin Level Management API Methods (/api/admin/levels)
 */
export const fetchAdminLevels = async () => {
  return await apiFetch('/admin/levels');
};

export const fetchLevelConfiguration = async () => {
  return await apiFetch('/admin/levels/configuration');
};

export const createAdminLevel = async (levelData) => {
  return await apiFetch('/admin/levels', {
    method: 'POST',
    body: JSON.stringify(levelData)
  });
};

export const updateAdminLevel = async (id, levelData) => {
  return await apiFetch(`/admin/levels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(levelData)
  });
};

export const updateAdminLevelStatus = async (id, isActive) => {
  return await apiFetch(`/admin/levels/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive })
  });
};

export const deleteAdminLevel = async (id, options = {}) => {
  return await apiFetch(`/admin/levels/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(options)
  });
};

export const generateAdminLevels = async (options = {}) => {
  return await apiFetch('/admin/levels/generate', {
    method: 'POST',
    body: JSON.stringify(options)
  });
};


