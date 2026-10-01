/**
 * Gamification & XP Level API Service
 * Communicates with backend /api/gamification endpoints
 */

const API_BASE = '/api';

/**
 * Helper to fetch with JWT token from localStorage
 */
async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
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
 * Fetch configured active levels and cumulative thresholds
 */
export const fetchGamificationLevels = async () => {
  return await authFetch('/gamification/levels');
};

/**
 * Admin / Super Admin: Fetch target user's gamification XP & level profile
 * @param {string} userId
 */
export const fetchUserGamification = async (userId) => {
  return await authFetch(`/gamification/user/${userId}`);
};

export default {
  fetchMyGamification,
  fetchMyXPHistory,
  fetchGamificationLevels,
  fetchUserGamification
};
