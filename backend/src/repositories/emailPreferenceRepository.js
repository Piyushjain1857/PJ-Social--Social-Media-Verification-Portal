const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory fallback map: userId -> preferences
const inMemoryEmailPreferences = new Map();

const DEFAULT_PREFERENCES = {
  accountSecurity: true,
  submissionUpdates: true,
  gamificationUpdates: true,
  announcements: true
};

/**
 * Retrieve user email preferences, automatically provisioning defaults if none exist
 * @param {string} userId
 * @returns {Promise<Object>} Email preferences object
 */
const getUserEmailPreferences = async (userId) => {
  if (!userId) return { ...DEFAULT_PREFERENCES };

  try {
    const dbStatus = await checkDatabaseConnection();
    if (dbStatus.isConnected && prisma?.emailPreference) {
      let prefs = await prisma.emailPreference.findUnique({
        where: { userId }
      });

      if (!prefs) {
        return {
          accountSecurity: DEFAULT_PREFERENCES.accountSecurity,
          submissionUpdates: DEFAULT_PREFERENCES.submissionUpdates,
          gamificationUpdates: DEFAULT_PREFERENCES.gamificationUpdates,
          announcements: DEFAULT_PREFERENCES.announcements,
          updatedAt: null
        };
      }

      return {
        accountSecurity: prefs.accountSecurity,
        submissionUpdates: prefs.submissionUpdates,
        gamificationUpdates: prefs.gamificationUpdates,
        announcements: prefs.announcements,
        updatedAt: prefs.updatedAt
      };
    }
  } catch (err) {
    console.warn('[emailPreferenceRepository] Falling back to in-memory store:', err.message);
  }

  if (!inMemoryEmailPreferences.has(userId)) {
    inMemoryEmailPreferences.set(userId, { ...DEFAULT_PREFERENCES, updatedAt: new Date() });
  }

  return { ...inMemoryEmailPreferences.get(userId) };
};

/**
 * Update user email preferences
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<Object>} Updated email preferences
 */
const updateUserEmailPreferences = async (userId, updates = {}) => {
  if (!userId) throw new Error('User ID is required to update email preferences');

  const cleanUpdates = {};
  if (typeof updates.accountSecurity === 'boolean') {
    cleanUpdates.accountSecurity = updates.accountSecurity;
  }
  if (typeof updates.submissionUpdates === 'boolean') {
    cleanUpdates.submissionUpdates = updates.submissionUpdates;
  }
  if (typeof updates.gamificationUpdates === 'boolean') {
    cleanUpdates.gamificationUpdates = updates.gamificationUpdates;
  }
  if (typeof updates.announcements === 'boolean') {
    cleanUpdates.announcements = updates.announcements;
  }

  try {
    const dbStatus = await checkDatabaseConnection();
    if (dbStatus.isConnected && prisma?.emailPreference) {
      const updated = await prisma.emailPreference.upsert({
        where: { userId },
        create: {
          userId,
          ...DEFAULT_PREFERENCES,
          ...cleanUpdates
        },
        update: cleanUpdates
      });

      return {
        accountSecurity: updated.accountSecurity,
        submissionUpdates: updated.submissionUpdates,
        gamificationUpdates: updated.gamificationUpdates,
        announcements: updated.announcements,
        updatedAt: updated.updatedAt
      };
    }
  } catch (err) {
    console.warn('[emailPreferenceRepository] In-memory update fallback:', err.message);
  }

  const existing = inMemoryEmailPreferences.get(userId) || { ...DEFAULT_PREFERENCES };
  const merged = { ...existing, ...cleanUpdates, updatedAt: new Date() };
  inMemoryEmailPreferences.set(userId, merged);
  return merged;
};

module.exports = {
  DEFAULT_PREFERENCES,
  getUserEmailPreferences,
  updateUserEmailPreferences,
  inMemoryEmailPreferences
};
