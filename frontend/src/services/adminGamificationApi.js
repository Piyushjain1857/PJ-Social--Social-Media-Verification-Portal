/**
 * Admin Gamification & User XP Governance API Service
 * Communicates with backend /api/admin/gamification endpoints
 */

const API_BASE = '/api';

const getToken = () => {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
};

async function authFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.code = data?.code;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Fetch platform-wide gamification analytics, distribution, and telemetry
 */
export const fetchAdminGamificationAnalytics = async () => {
  return await authFetch('/admin/gamification/analytics');
};

/**
 * List creators with gamification status, search, filters, sorting, and pagination
 * @param {Object} params - { page, limit, search, level, minXP, maxXP, status, sortBy }
 */
export const fetchAdminGamificationUsers = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return await authFetch(`/admin/gamification/users${qs ? `?${qs}` : ''}`);
};

/**
 * Fetch comprehensive gamification dossier for a single creator
 * @param {string} userId
 */
export const fetchAdminGamificationUserDetails = async (userId) => {
  if (!userId) throw new Error('User ID is required.');
  return await authFetch(`/admin/gamification/users/${userId}`);
};

/**
 * Manually adjust creator XP with reason justification
 * @param {string} userId
 * @param {Object} payload - { type: 'ADD' | 'REMOVE', amount: number, reason: string }
 */
export const submitAdminAdjustXP = async (userId, { type = 'ADD', amount, reason }) => {
  if (!userId) throw new Error('Target user ID is required.');
  return await authFetch(`/admin/gamification/users/${userId}/adjust-xp`, {
    method: 'POST',
    body: JSON.stringify({ type, amount, reason })
  });
};

/**
 * Fetch paginated XP transactions history for a specific creator
 * @param {string} userId
 * @param {Object} params - { page, limit, actionType }
 */
export const fetchAdminUserXPHistory = async (userId, params = {}) => {
  if (!userId) throw new Error('User ID is required.');
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return await authFetch(`/admin/gamification/users/${userId}/history${qs ? `?${qs}` : ''}`);
};
