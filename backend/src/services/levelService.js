const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory fallback levels if DB is empty or disconnected
const DEFAULT_FALLBACK_LEVELS = Array.from({ length: 50 }, (_, i) => {
  const levelNum = i + 1;
  return {
    id: `level-${levelNum}`,
    levelNumber: levelNum,
    name: levelNum === 16 ? 'Contributor' : levelNum === 1 ? 'Novice' : levelNum === 50 ? 'VeriSocial Legend' : `Level ${levelNum}`,
    xpRequired: 250,
    icon: levelNum === 16 ? '🚀' : levelNum >= 40 ? '👑' : levelNum >= 25 ? '💎' : levelNum >= 10 ? '⚡' : '🌱',
    description: `Level ${levelNum} rank achievement`,
    isActive: true
  };
});

// Cache for active levels to optimize performance
let cachedLevels = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Invalidate in-memory cache of levels (call when Super Admin modifies levels)
 */
const invalidateLevelsCache = () => {
  cachedLevels = null;
  lastCacheTime = 0;
};

/**
 * Fetch all active Level records ordered by levelNumber ASC.
 * Uses database configuration dynamically.
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Array>} Array of active level records
 */
const getActiveLevels = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedLevels && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedLevels;
  }

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const records = await prisma.level.findMany({
        where: { isActive: true },
        orderBy: { levelNumber: 'asc' }
      });

      if (records && records.length > 0) {
        cachedLevels = records;
        lastCacheTime = now;
        return records;
      }
    } catch (err) {
      console.warn('[LevelService] Error querying levels from database, using fallback:', err.message);
    }
  }

  return DEFAULT_FALLBACK_LEVELS;
};

/**
 * Computes cumulative XP thresholds for each level.
 * Handles variable/dynamic XP requirements per level.
 * Example:
 * Level 1 requires 100 XP -> start 0, end 99
 * Level 2 requires 150 XP -> start 100, end 249
 * Level 3 requires 250 XP -> start 250, end 499
 * 
 * @param {Array} levels - Sorted active level records
 * @returns {Array} Levels enriched with cumulativeStartXP and cumulativeEndXP
 */
const buildLevelThresholds = (levels) => {
  if (!levels || levels.length === 0) {
    return [];
  }

  let runningXP = 0;
  return levels.map((lvl, index) => {
    const startXP = runningXP;
    const reqXP = Math.max(1, parseInt(lvl.xpRequired, 10) || 250);
    const endXP = startXP + reqXP - 1;
    runningXP += reqXP;

    return {
      ...lvl,
      xpRequired: reqXP,
      cumulativeStartXP: startXP,
      cumulativeEndXP: endXP,
      isLast: index === levels.length - 1
    };
  });
};

/**
 * Calculate user level, current XP into level, XP remaining, and progress percentage.
 * Fully dynamic and supports arbitrary XP requirements per level.
 * 
 * @param {number} xp - User total XP
 * @param {Array} [customLevels=null] - Optional pre-loaded levels
 * @returns {Object} Complete level computation object
 */
const calculateUserLevel = (xp = 0, customLevels = null) => {
  const totalXP = Math.max(0, parseInt(xp, 10) || 0);
  const levels = customLevels && customLevels.length > 0 ? customLevels : (cachedLevels || DEFAULT_FALLBACK_LEVELS);
  const thresholds = buildLevelThresholds(levels);

  if (thresholds.length === 0) {
    return {
      totalXP,
      currentLevel: 1,
      levelName: 'Novice',
      icon: '🌱',
      currentLevelStartXP: 0,
      nextLevel: null,
      nextLevelName: null,
      nextLevelRequiredXP: 250,
      xpIntoCurrentLevel: 0,
      xpRemaining: 250,
      progressPercentage: 0,
      isMaxLevel: false
    };
  }

  // Find corresponding level based on cumulative thresholds
  let currentLevelObj = thresholds[0];

  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (t.isLast) {
      if (totalXP >= t.cumulativeStartXP) {
        currentLevelObj = t;
        break;
      }
    } else {
      if (totalXP >= t.cumulativeStartXP && totalXP <= t.cumulativeEndXP) {
        currentLevelObj = t;
        break;
      }
    }
  }

  const currentIndex = thresholds.findIndex(t => t.levelNumber === currentLevelObj.levelNumber);
  const isMaxLevel = currentLevelObj.isLast && totalXP > currentLevelObj.cumulativeEndXP;
  const nextLevelObj = !currentLevelObj.isLast && currentIndex + 1 < thresholds.length
    ? thresholds[currentIndex + 1]
    : null;

  const currentLevelStartXP = currentLevelObj.cumulativeStartXP;
  const xpIntoCurrentLevel = Math.max(0, totalXP - currentLevelStartXP);
  const nextLevelRequiredXP = currentLevelObj.xpRequired;

  let xpRemaining = 0;
  let progressPercentage = 100;

  if (nextLevelObj) {
    xpRemaining = Math.max(0, nextLevelRequiredXP - xpIntoCurrentLevel);
    progressPercentage = Math.min(100, Math.max(0, Math.floor((xpIntoCurrentLevel / nextLevelRequiredXP) * 100)));
  } else {
    // Highest level reached
    if (totalXP <= currentLevelObj.cumulativeEndXP) {
      xpRemaining = Math.max(0, currentLevelObj.cumulativeEndXP + 1 - totalXP);
      progressPercentage = Math.min(100, Math.max(0, Math.floor((xpIntoCurrentLevel / nextLevelRequiredXP) * 100)));
    } else {
      xpRemaining = 0;
      progressPercentage = 100;
    }
  }

  return {
    totalXP,
    currentLevel: currentLevelObj.levelNumber,
    levelName: currentLevelObj.name,
    icon: currentLevelObj.icon || '⭐',
    description: currentLevelObj.description,
    currentLevelStartXP,
    nextLevel: nextLevelObj ? nextLevelObj.levelNumber : null,
    nextLevelName: nextLevelObj ? nextLevelObj.name : null,
    nextLevelRequiredXP: nextLevelObj ? nextLevelRequiredXP : null,
    xpIntoCurrentLevel,
    xpRemaining,
    progressPercentage,
    isMaxLevel: !nextLevelObj && totalXP > currentLevelObj.cumulativeEndXP
  };
};

/**
 * Get next level object for a given levelNumber
 * @param {number} currentLevelNumber
 * @param {Array} [levels=null]
 * @returns {Object|null}
 */
const getNextLevel = (currentLevelNumber, levels = null) => {
  const activeLevels = levels || cachedLevels || DEFAULT_FALLBACK_LEVELS;
  const sorted = [...activeLevels].sort((a, b) => a.levelNumber - b.levelNumber);
  const idx = sorted.findIndex(l => l.levelNumber === parseInt(currentLevelNumber, 10));
  if (idx !== -1 && idx + 1 < sorted.length) {
    return sorted[idx + 1];
  }
  return null;
};

/**
 * Get progress details toward the next level for given XP
 * @param {number} xp
 * @param {Array} [levels=null]
 * @returns {Object} { progressPercentage, xpIntoCurrentLevel, xpRemaining, currentLevelStartXP, nextLevelRequiredXP }
 */
const getLevelProgress = (xp = 0, levels = null) => {
  const result = calculateUserLevel(xp, levels);
  return {
    currentLevel: result.currentLevel,
    levelName: result.levelName,
    currentLevelStartXP: result.currentLevelStartXP,
    nextLevel: result.nextLevel,
    nextLevelRequiredXP: result.nextLevelRequiredXP,
    xpIntoCurrentLevel: result.xpIntoCurrentLevel,
    xpRemaining: result.xpRemaining,
    progressPercentage: result.progressPercentage,
    isMaxLevel: result.isMaxLevel
  };
};

/**
 * Get required XP to advance from currentLevelNumber to the next level
 * @param {number} currentLevelNumber
 * @param {Array} [levels=null]
 * @returns {number|null}
 */
const getXPRequiredForNextLevel = (currentLevelNumber, levels = null) => {
  const activeLevels = levels || cachedLevels || DEFAULT_FALLBACK_LEVELS;
  const target = activeLevels.find(l => l.levelNumber === parseInt(currentLevelNumber, 10));
  return target ? (parseInt(target.xpRequired, 10) || 250) : null;
};

/**
 * Calculate user total XP from verified transactions and ensure synchronization
 * with cached User.totalXP.
 * Transactions remain the strict source of truth for XP history.
 * 
 * @param {string} userId
 * @returns {Promise<{ totalXP: number, transactionCount: number, isSynchronized: boolean }>}
 */
const calculateUserXP = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to calculate user XP.');
  }

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      // Calculate true XP from transactions
      const txSumResult = await prisma.pointTransaction.aggregate({
        where: { userId },
        _sum: { xp: true },
        _count: { id: true }
      });

      const verifiedTotalXP = txSumResult._sum.xp || 0;
      const transactionCount = txSumResult._count.id || 0;

      // Check cached totalXP on user record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, totalXP: true, totalPoints: true }
      });

      let isSynchronized = true;
      if (user && user.totalXP !== verifiedTotalXP) {
        isSynchronized = false;
        // Synchronize cached totalXP with the verified transaction audit sum
        await prisma.user.update({
          where: { id: userId },
          data: {
            totalXP: verifiedTotalXP,
            totalPoints: verifiedTotalXP
          }
        });
      }

      return {
        totalXP: verifiedTotalXP,
        transactionCount,
        isSynchronized
      };
    } catch (err) {
      console.warn('[LevelService] Error calculating user XP from DB:', err.message);
    }
  }

  return { totalXP: 0, transactionCount: 0, isSynchronized: true };
};

/**
 * Retrieve user's full gamification profile:
 * - totalXP
 * - currentLevel
 * - levelName
 * - currentLevelStartXP
 * - nextLevel
 * - nextLevelRequiredXP
 * - xpIntoCurrentLevel
 * - xpRemaining
 * - progressPercentage
 * 
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getUserGamificationProfile = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  // 1. Fetch active levels from database
  const activeLevels = await getActiveLevels();

  // 2. Fetch or synchronize user's XP from transactions
  let totalXP = 0;
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, totalXP: true, totalPoints: true }
      });

      if (user) {
        totalXP = user.totalXP ?? user.totalPoints ?? 0;
      }
    } catch (err) {
      console.warn('[LevelService] Error reading user totalXP:', err.message);
    }
  }

  // 3. Compute level progression using dynamic active level records
  const levelData = calculateUserLevel(totalXP, activeLevels);

  return {
    totalXP: levelData.totalXP,
    currentLevel: levelData.currentLevel,
    levelName: levelData.levelName,
    currentLevelStartXP: levelData.currentLevelStartXP,
    nextLevel: levelData.nextLevel,
    nextLevelRequiredXP: levelData.nextLevelRequiredXP,
    xpIntoCurrentLevel: levelData.xpIntoCurrentLevel,
    xpRemaining: levelData.xpRemaining,
    progressPercentage: levelData.progressPercentage,
    icon: levelData.icon,
    isMaxLevel: levelData.isMaxLevel,
    description: levelData.description
  };
};

module.exports = {
  DEFAULT_FALLBACK_LEVELS,
  getActiveLevels,
  buildLevelThresholds,
  calculateUserLevel,
  getNextLevel,
  getLevelProgress,
  getXPRequiredForNextLevel,
  calculateUserXP,
  getUserGamificationProfile,
  invalidateLevelsCache
};
