/**
 * Gamification & XP Level API Service
 * Communicates with backend /api/gamification endpoints
 */

const API_BASE = '/api';

const getToken = () => {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
};

/**
 * Helper to fetch with JWT token from localStorage
 */
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
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Fetch authenticated creator's Gamification XP & Level Profile
 * Returns: { totalXP, currentLevel, levelName, currentLevelStartXP, nextLevel, nextLevelRequiredXP, xpIntoCurrentLevel, xpRemaining, progressPercentage, icon }
 */
export const fetchMyGamification = async () => {
  return await authFetch('/gamification/me');
};

/**
 * Fetch paginated XP transactions history for authenticated user
 * @param {Object} [params] - { page, limit, actionType, startDate, endDate, sortBy, sortOrder }
 */
export const fetchMyXPHistory = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return await authFetch(`/gamification/me/history${queryString ? `?${queryString}` : ''}`);
};

/**
 * Fetch full level journey for the current user (all levels with completed/current/locked status)
 * Returns: { journey: Array, totalLevels, currentLevel, totalXP, isMaxLevel }
 */
export const fetchMyLevelJourney = async () => {
  return await authFetch('/gamification/me/journey');
};

/**
 * Fetch configured active levels and cumulative thresholds
 */
export const fetchGamificationLevels = async () => {
  return await authFetch('/gamification/levels');
};

/**
 * Fetch authenticated creator's XP Progression Chart data
 * @param {string} [timeframe='30d'] - '7d', '30d', '3m', '6m', 'all'
 */
export const fetchMyXPChart = async (timeframe = '30d') => {
  return await authFetch(`/gamification/me/chart?timeframe=${encodeURIComponent(timeframe)}`);
};

/**
 * Fetch authenticated creator's activity distribution breakdown
 */
export const fetchMyActivityDistribution = async () => {
  return await authFetch('/gamification/me/activity-distribution');
};

/**
 * Fetch authenticated creator's current rank, total participants, and percentile
 */
export const fetchMyRank = async () => {
  return await authFetch('/gamification/me/rank');
};

/**
 * Fetch authenticated creator's monthly position / rank timeline over time
 */
export const fetchMyRankHistory = async () => {
  return await authFetch('/gamification/me/rank-history');
};

/**
 * Admin / Super Admin: Fetch target user's gamification XP & level profile
 * @param {string} userId
 */
export const fetchUserGamification = async (userId) => {
  return await authFetch(`/gamification/user/${userId}`);
};

/**
 * Admin / Super Admin: Fetch target user's XP progression chart data
 */
export const fetchUserXPChart = async (userId, timeframe = '30d') => {
  return await authFetch(`/gamification/user/${userId}/chart?timeframe=${encodeURIComponent(timeframe)}`);
};

/**
 * Admin / Super Admin: Fetch target user's activity distribution breakdown
 */
export const fetchUserActivityDistribution = async (userId) => {
  return await authFetch(`/gamification/user/${userId}/activity-distribution`);
};

/**
 * Admin / Super Admin: Fetch target user's rank metrics
 */
export const fetchUserRank = async (userId) => {
  return await authFetch(`/gamification/user/${userId}/rank`);
};

/**
 * Admin / Super Admin: Fetch target user's rank timeline
 */
export const fetchUserRankHistory = async (userId) => {
  return await authFetch(`/gamification/user/${userId}/rank-history`);
};

/**
 * Admin / Super Admin: Fetch target user's level progression journey
 */
export const fetchUserLevelJourney = async (userId) => {
  return await authFetch(`/gamification/user/${userId}/journey`);
};

/**
 * Super Admin Level Management API Methods (/api/admin/levels)
 */
export const fetchAdminLevels = async () => {
  return await authFetch('/admin/levels');
};

export const fetchLevelConfiguration = async () => {
  return await authFetch('/admin/levels/configuration');
};

export const createAdminLevel = async (levelData) => {
  return await authFetch('/admin/levels', {
    method: 'POST',
    body: JSON.stringify(levelData)
  });
};

export const updateAdminLevel = async (id, levelData) => {
  return await authFetch(`/admin/levels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(levelData)
  });
};

export const updateAdminLevelStatus = async (id, isActive) => {
  return await authFetch(`/admin/levels/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive })
  });
};

export const deleteAdminLevel = async (id, options = {}) => {
  return await authFetch(`/admin/levels/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(options)
  });
};

export const generateAdminLevels = async (options = {}) => {
  return await authFetch('/admin/levels/generate', {
    method: 'POST',
    body: JSON.stringify(options)
  });
};

export default {
  fetchMyGamification,
  fetchMyXPChart,
  fetchMyRank,
  fetchMyRankHistory,
  fetchMyXPHistory,
  fetchMyLevelJourney,
  fetchMyActivityDistribution,
  fetchGamificationLevels,
  fetchUserGamification,
  fetchUserXPChart,
  fetchUserActivityDistribution,
  fetchUserRank,
  fetchUserRankHistory,
  fetchAdminLevels,
  fetchLevelConfiguration,
  createAdminLevel,
  updateAdminLevel,
  updateAdminLevelStatus,
  deleteAdminLevel,
  generateAdminLevels
};

