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
/**
 * Computes cumulative XP thresholds for each active level.
 * Handles variable/dynamic XP requirements per level.
 * 
 * Example:
 * Level 1 = 100 XP -> cumulativeStartXP: 0,   cumulativeEndXP: 99
 * Level 2 = 150 XP -> cumulativeStartXP: 100, cumulativeEndXP: 249
 * Level 3 = 250 XP -> cumulativeStartXP: 250, cumulativeEndXP: 499
 * Level 4 = 500 XP -> cumulativeStartXP: 500, cumulativeEndXP: 999
 * 
 * Deactivated levels (isActive: false) are excluded.
 * 
 * @param {Array} levels - Level records
 * @returns {Array} Active levels enriched with cumulativeStartXP and cumulativeEndXP
 */
const buildLevelThresholds = (levels) => {
  if (!levels || !Array.isArray(levels) || levels.length === 0) {
    return [];
  }

  // Filter only active levels and sort by levelNumber ascending
  const activeLevels = levels
    .filter(lvl => lvl && lvl.isActive !== false)
    .sort((a, b) => (parseInt(a.levelNumber, 10) || 0) - (parseInt(b.levelNumber, 10) || 0));

  if (activeLevels.length === 0) {
    return [];
  }

  let runningXP = 0;
  return activeLevels.map((lvl, index) => {
    const startXP = runningXP;
    const reqXP = Math.max(1, parseInt(lvl.xpRequired, 10) || 100);
    const endXP = startXP + reqXP - 1;
    runningXP += reqXP;

    return {
      ...lvl,
      levelNumber: parseInt(lvl.levelNumber, 10) || (index + 1),
      xpRequired: reqXP,
      cumulativeStartXP: startXP,
      cumulativeEndXP: endXP,
      isLast: index === activeLevels.length - 1
    };
  });
};

/**
 * Authoritative single backend function for level calculation.
 * Fully dynamic and supports arbitrary XP requirements per level.
 * 
 * Returns all required fields:
 * - currentLevel
 * - levelName
 * - currentLevelStartXP
 * - currentLevelEndXP
 * - nextLevel
 * - nextLevelStartXP
 * - xpIntoLevel
 * - xpRequiredForLevel
 * - xpRemaining
 * - progressPercentage
 * 
 * Handles:
 * - 0 XP
 * - exact threshold
 * - one XP before threshold
 * - one XP after threshold
 * - maximum level
 * - no active levels
 * - deactivated levels
 * 
 * @param {number} xp - User total XP
 * @param {Array} [customLevels=null] - Optional pre-loaded levels
 * @returns {Object} Complete level computation object
 */
const calculateUserLevel = (xp = 0, customLevels = null) => {
  const totalXP = Math.max(0, parseInt(xp, 10) || 0);
  const rawLevels = (customLevels && Array.isArray(customLevels))
    ? customLevels
    : (cachedLevels && cachedLevels.length > 0 ? cachedLevels : DEFAULT_FALLBACK_LEVELS);

  const thresholds = buildLevelThresholds(rawLevels);

  // Handle: no active levels (or empty level records)
  if (!thresholds || thresholds.length === 0) {
    return {
      currentLevel: 1,
      levelName: 'Novice',
      currentLevelStartXP: 0,
      currentLevelEndXP: 0,
      nextLevel: null,
      nextLevelStartXP: null,
      xpIntoLevel: 0,
      xpRequiredForLevel: 0,
      xpRemaining: 0,
      progressPercentage: 0,

      // Backward compatibility aliases
      totalXP,
      level: 1,
      name: 'Novice',
      icon: '🌱',
      badge: '🌱',
      color: '#94a3b8',
      description: 'Default tier (no active levels configured)',
      nextLevelName: null,
      nextLevelRequiredXP: null,
      nextLevelDeltaXP: 0,
      nextLevelTargetXP: null,
      targetNextLevelXP: null,
      xpIntoCurrentLevel: 0,
      pointsToNextLevel: 0,
      currentPoints: totalXP,
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
  const nextLevelObj = !currentLevelObj.isLast && currentIndex + 1 < thresholds.length
    ? thresholds[currentIndex + 1]
    : null;

  const isMaxLevel = !nextLevelObj; // User has reached the maximum configured level

  const currentLevelStartXP = currentLevelObj.cumulativeStartXP;
  const currentLevelEndXP = currentLevelObj.cumulativeEndXP;
  const xpRequiredForLevel = currentLevelObj.xpRequired;

  const nextLevel = nextLevelObj ? nextLevelObj.levelNumber : null;
  const nextLevelStartXP = nextLevelObj ? nextLevelObj.cumulativeStartXP : null;

  const xpIntoLevel = Math.max(0, totalXP - currentLevelStartXP);

  let xpRemaining = 0;
  let progressPercentage = 0;

  if (nextLevelObj) {
    // Normal progression towards next level
    xpRemaining = Math.max(0, nextLevelStartXP - totalXP);
    progressPercentage = Math.min(100, Math.max(0, Math.floor((xpIntoLevel / xpRequiredForLevel) * 100)));
  } else {
    // Maximum level reached
    if (totalXP <= currentLevelEndXP) {
      xpRemaining = Math.max(0, (currentLevelEndXP + 1) - totalXP);
      progressPercentage = Math.min(100, Math.max(0, Math.floor((xpIntoLevel / xpRequiredForLevel) * 100)));
    } else {
      // User has overflowed / completed maximum level
      xpRemaining = 0;
      progressPercentage = 100;
    }
  }

  return {
    // 10 Authoritative Return Properties (explicitly required)
    currentLevel: currentLevelObj.levelNumber,
    levelName: currentLevelObj.name,
    currentLevelStartXP,
    currentLevelEndXP,
    nextLevel,
    nextLevelStartXP,
    xpIntoLevel,
    xpRequiredForLevel,
    xpRemaining,
    progressPercentage,

    // Backward-compatible properties & aliases
    totalXP,
    level: currentLevelObj.levelNumber,
    name: currentLevelObj.name,
    icon: currentLevelObj.icon || '⭐',
    badge: currentLevelObj.icon || '⭐',
    color: currentLevelObj.color || '#38bdf8',
    description: currentLevelObj.description,
    nextLevelName: nextLevelObj ? nextLevelObj.name : null,
    nextLevelRequiredXP: nextLevelObj ? nextLevelObj.xpRequired : null,
    nextLevelDeltaXP: nextLevelObj ? nextLevelObj.xpRequired : xpRequiredForLevel,
    nextLevelTargetXP: nextLevelStartXP,
    targetNextLevelXP: nextLevelStartXP,
    xpIntoCurrentLevel: xpIntoLevel,
    pointsToNextLevel: xpRemaining,
    currentPoints: totalXP,
    isMaxLevel
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
  const sorted = [...activeLevels]
    .filter(l => l && l.isActive !== false)
    .sort((a, b) => a.levelNumber - b.levelNumber);
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
 * @returns {Object} Progress details
 */
const getLevelProgress = (xp = 0, levels = null) => {
  const result = calculateUserLevel(xp, levels);
  return {
    currentLevel: result.currentLevel,
    levelName: result.levelName,
    currentLevelStartXP: result.currentLevelStartXP,
    currentLevelEndXP: result.currentLevelEndXP,
    nextLevel: result.nextLevel,
    nextLevelStartXP: result.nextLevelStartXP,
    nextLevelRequiredXP: result.nextLevelRequiredXP,
    xpIntoLevel: result.xpIntoLevel,
    xpIntoCurrentLevel: result.xpIntoCurrentLevel,
    xpRequiredForLevel: result.xpRequiredForLevel,
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
        select: { id: true, name: true, role: true, totalXP: true, totalPoints: true }
      });

      if (user && user.role !== 'USER') {
        const totalParticipants = await prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } });
        return {
          userId,
          name: user.name,
          role: user.role,
          isParticipant: false,
          totalXP: 0,
          currentLevel: 0,
          levelName: user.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator',
          message: 'Administrators and Super Administrators manage game points and do not participate as players.',
          rank: null,
          totalParticipants,
          percentileAhead: null,
          recentXP: 0,
          currentLevelStartXP: 0,
          nextLevel: null,
          nextLevelName: null,
          nextLevelMinXP: 0,
          xpIntoCurrentLevel: 0,
          xpRemaining: 0,
          progressPercentage: 0,
          isMaxLevel: true
        };
      }

      if (user) {
        totalXP = user.totalXP ?? user.totalPoints ?? 0;
      }
    } catch (err) {
      console.warn('[LevelService] Error reading user totalXP:', err.message);
    }
  }

  // 3. Compute level progression using dynamic active level records
  const levelData = calculateUserLevel(totalXP, activeLevels);

  // 4. Calculate recent XP (past 30 days) and rank metrics
  let recentXP = 0;
  let rankMetrics = null;

  if (dbStatus.isConnected && prisma) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentSum = await prisma.pointTransaction.aggregate({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
        _sum: { xp: true }
      });
      recentXP = recentSum._sum.xp || 0;
    } catch (err) {
      console.warn('[LevelService] Error calculating recent XP:', err.message);
    }
  }

  try {
    rankMetrics = await getUserRankMetrics(userId);
  } catch (err) {
    console.warn('[LevelService] Error calculating rank metrics:', err.message);
  }

  return {
    totalXP: levelData.totalXP,
    currentLevel: levelData.currentLevel,
    levelName: levelData.levelName,
    currentLevelStartXP: levelData.currentLevelStartXP,
    currentLevelEndXP: levelData.currentLevelEndXP,
    nextLevel: levelData.nextLevel,
    nextLevelStartXP: levelData.nextLevelStartXP,
    nextLevelRequiredXP: levelData.nextLevelRequiredXP,
    nextLevelTargetXP: levelData.nextLevelTargetXP,
    xpIntoLevel: levelData.xpIntoLevel,
    xpIntoCurrentLevel: levelData.xpIntoCurrentLevel,
    xpRequiredForLevel: levelData.xpRequiredForLevel,
    xpRemaining: levelData.xpRemaining,
    progressPercentage: levelData.progressPercentage,
    icon: levelData.icon,
    isMaxLevel: levelData.isMaxLevel,
    description: levelData.description,
    recentXP,
    rank: rankMetrics?.rank || 1,
    totalParticipants: rankMetrics?.totalParticipants || 1,
    percentileAhead: rankMetrics?.percentileAhead ?? 100,
    pointsToNextRank: rankMetrics?.pointsToNextRank || 0,
    usersBehind: rankMetrics?.usersBehind || 0
  };
};

/**
 * Retrieve user's authoritative leaderboard rank, total participants, and percentile.
 * Only counts eligible users (role: 'USER', status: 'ACTIVE').
 * Fully calculated on PostgreSQL/backend.
 * 
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getUserRankMetrics = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to calculate rank metrics.');
  }

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, totalXP: true, totalPoints: true, createdAt: true, role: true, status: true }
      });

      if (!user) {
        throw new Error('User not found.');
      }

      // Total eligible participants
      const totalParticipants = await prisma.user.count({
        where: { role: 'USER', status: 'ACTIVE' }
      });

      // Administrators and Super Administrators do not have a player rank
      if (user.role !== 'USER') {
        return {
          rank: null,
          totalParticipants,
          usersBehind: 0,
          usersAhead: 0,
          percentileAhead: null,
          totalXP: 0,
          pointsToNextRank: 0,
          nextRank: null,
          isParticipant: false,
          role: user.role,
          message: 'Administrative roles manage game points and do not participate in rankings'
        };
      }

      const userXP = Math.max(0, user.totalXP ?? user.totalPoints ?? 0);

      // Users ahead: higher totalXP, or same XP but created earlier (tie-breaker)
      const usersAhead = await prisma.user.count({
        where: {
          role: 'USER',
          status: 'ACTIVE',
          OR: [
            { totalXP: { gt: userXP } },
            {
              totalXP: userXP,
              createdAt: { lt: user.createdAt }
            }
          ]
        }
      });

      const rank = usersAhead + 1;

      // Users behind
      const usersBehind = await prisma.user.count({
        where: {
          role: 'USER',
          status: 'ACTIVE',
          OR: [
            { totalXP: { lt: userXP } },
            {
              totalXP: userXP,
              createdAt: { gt: user.createdAt }
            }
          ]
        }
      });

      // Calculate real percentile ahead of participants
      // e.g. Rank 24 of 486 -> ahead of 95% of participants
      const effectiveTotal = Math.max(1, totalParticipants);
      const percentileAhead = effectiveTotal > 1
        ? Math.min(100, Math.max(0, Math.round((usersBehind / (effectiveTotal - 1)) * 100)))
        : 100;

      // Find user directly ahead in rank to calculate XP needed to overtake
      const userAbove = await prisma.user.findFirst({
        where: {
          role: 'USER',
          status: 'ACTIVE',
          OR: [
            { totalXP: { gt: userXP } },
            {
              totalXP: userXP,
              createdAt: { lt: user.createdAt }
            }
          ]
        },
        orderBy: [
          { totalXP: 'asc' },
          { createdAt: 'desc' }
        ],
        select: { totalXP: true }
      });

      const pointsToNextRank = userAbove ? Math.max(1, (userAbove.totalXP - userXP) + 1) : 0;

      return {
        rank,
        totalParticipants,
        usersBehind,
        usersAhead,
        percentileAhead,
        totalXP: userXP,
        pointsToNextRank,
        nextRank: rank > 1 ? rank - 1 : null
      };
    } catch (err) {
      console.warn('[LevelService] Error calculating user rank metrics from DB:', err.message);
    }
  }

  return {
    rank: 1,
    totalParticipants: 1,
    usersBehind: 0,
    usersAhead: 0,
    percentileAhead: 100,
    totalXP: 0,
    pointsToNextRank: 0,
    nextRank: null
  };
};

/**
 * Retrieve user's XP progression over time with configurable timeframes:
 * '7d', '30d', '3m' (or '90d'), '6m' (or '180d'), 'all'.
 * Returns an array of chronological data points with Date, cumulative XP, and Level at that point.
 * 
 * @param {string} userId
 * @param {string} [timeframe='30d']
 * @returns {Promise<Object>}
 */
const getUserXPChartData = async (userId, timeframe = '30d') => {
  if (!userId) {
    throw new Error('User ID is required to fetch chart data.');
  }

  const activeLevels = await getActiveLevels();
  const dbStatus = await checkDatabaseConnection();

  let transactions = [];
  let userCreatedAt = new Date();

  if (dbStatus.isConnected && prisma) {
    try {
      const [user, txs] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, createdAt: true, totalXP: true, totalPoints: true }
        }),
        prisma.pointTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: { id: true, xp: true, points: true, createdAt: true, actionType: true }
        })
      ]);

      if (user && user.role !== 'USER') {
        return {
          isParticipant: false,
          role: user.role,
          message: 'Administrators manage game points and do not generate player XP graphs.',
          data: []
        };
      }

      if (user) {
        userCreatedAt = user.createdAt;
      }
      transactions = txs || [];
    } catch (err) {
      console.warn('[LevelService] Error fetching transactions for chart:', err.message);
    }
  }

  const now = new Date();
  const cleanTf = (timeframe || '30d').toLowerCase();

  // Determine interval and points
  const points = [];
  let daysBack = 30;
  let intervalDays = 1;

  if (cleanTf === '7d' || cleanTf === '7_days') {
    daysBack = 7;
    intervalDays = 1;
  } else if (cleanTf === '30d' || cleanTf === '30_days') {
    daysBack = 30;
    intervalDays = 1;
  } else if (cleanTf === '3m' || cleanTf === '90d' || cleanTf === '3_months') {
    daysBack = 90;
    intervalDays = 3;
  } else if (cleanTf === '6m' || cleanTf === '180d' || cleanTf === '6_months') {
    daysBack = 180;
    intervalDays = 7;
  } else if (cleanTf === 'all' || cleanTf === 'all_time') {
    const earliestDate = transactions.length > 0
      ? new Date(transactions[0].createdAt)
      : new Date(userCreatedAt);
    const diffDays = Math.max(7, Math.ceil((now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)));
    daysBack = Math.min(730, diffDays); // Up to 2 years
    intervalDays = Math.max(1, Math.ceil(daysBack / 30));
  }

  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  // Pre-calculate cumulative XP before startDate
  let runningXP = 0;
  for (const tx of transactions) {
    const txDate = new Date(tx.createdAt);
    if (txDate < startDate) {
      runningXP += (tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points) || 0;
    }
  }

  let txIndex = 0;
  // Advance txIndex to first transaction inside the window
  while (txIndex < transactions.length && new Date(transactions[txIndex].createdAt) < startDate) {
    txIndex++;
  }

  // Generate bucket dates
  let currentDate = new Date(startDate);
  while (currentDate <= now) {
    const bucketEnd = new Date(currentDate);
    bucketEnd.setHours(23, 59, 59, 999);

    let xpGainedInInterval = 0;
    while (txIndex < transactions.length && new Date(transactions[txIndex].createdAt) <= bucketEnd) {
      const tx = transactions[txIndex];
      const val = (tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points) || 0;
      runningXP += val;
      xpGainedInInterval += val;
      txIndex++;
    }

    const levelData = calculateUserLevel(runningXP, activeLevels);

    points.push({
      date: currentDate.toISOString().split('T')[0],
      label: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: currentDate.getTime(),
      xp: runningXP,
      xpGained: xpGainedInInterval,
      level: levelData.currentLevel,
      levelName: levelData.levelName,
      icon: levelData.icon
    });

    currentDate = new Date(currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }

  // Ensure today's end state is included as final point if not already
  if (points.length === 0 || points[points.length - 1].date !== now.toISOString().split('T')[0]) {
    while (txIndex < transactions.length) {
      const tx = transactions[txIndex];
      runningXP += (tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points) || 0;
      txIndex++;
    }
    const finalLevel = calculateUserLevel(runningXP, activeLevels);
    points.push({
      date: now.toISOString().split('T')[0],
      label: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: now.getTime(),
      xp: runningXP,
      xpGained: 0,
      level: finalLevel.currentLevel,
      levelName: finalLevel.levelName,
      icon: finalLevel.icon
    });
  }

  const startXP = points.length > 0 ? points[0].xp : 0;
  const endXP = points.length > 0 ? points[points.length - 1].xp : 0;

  return {
    timeframe: cleanTf,
    points,
    summary: {
      startingXP: startXP,
      endingXP: endXP,
      netXPGained: Math.max(0, endXP - startXP),
      dataPointsCount: points.length,
      currentLevel: points.length > 0 ? points[points.length - 1].level : 1,
      currentLevelName: points.length > 0 ? points[points.length - 1].levelName : 'Novice'
    }
  };
};

/**
 * Retrieve user's position/rank over monthly intervals.
 * Section: "📊 My Position Over Time"
 * Returns chronological timeline: January #87, February #63, March #41, April #24...
 * Along with trajectory trend (upward, downward, stable) and rank change.
 * 
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getUserRankHistory = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to fetch rank history.');
  }

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, createdAt: true, role: true, totalXP: true, totalPoints: true }
      });

      if (!currentUser) {
        throw new Error('User not found.');
      }

      if (currentUser.role !== 'USER') {
        return {
          isParticipant: false,
          role: currentUser.role,
          trend: 'not_applicable',
          initialRank: null,
          currentRank: null,
          rankDiff: 0,
          timeline: [],
          message: 'Administrators and Super Administrators manage game points and do not participate in rankings.'
        };
      }

      const now = new Date();
      // Generate the last 4 to 6 months
      const months = [];
      const numMonths = 5; // e.g. 5 months back to current
      for (let i = numMonths; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const cutoff = endOfMonth > now ? now : endOfMonth;
        months.push({
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          monthLong: d.toLocaleDateString('en-US', { month: 'long' }),
          year: d.getFullYear(),
          cutoff
        });
      }

      // Query rank at each monthly cutoff
      const timeline = await Promise.all(months.map(async (m) => {
        // User cumulative XP at cutoff
        const userTxSum = await prisma.pointTransaction.aggregate({
          where: { userId, createdAt: { lte: m.cutoff } },
          _sum: { xp: true }
        });
        const uXP = userTxSum._sum.xp || 0;

        // Group total XP for all eligible users at that cutoff
        const group = await prisma.pointTransaction.groupBy({
          by: ['userId'],
          where: {
            createdAt: { lte: m.cutoff },
            user: { role: 'USER', status: 'ACTIVE' }
          },
          _sum: { xp: true }
        });

        // Total eligible users who existed on platform by that date
        const totalEligible = await prisma.user.count({
          where: {
            role: 'USER',
            status: 'ACTIVE',
            createdAt: { lte: m.cutoff }
          }
        });

        const effectiveTotal = Math.max(1, Math.max(totalEligible, group.length));

        // Users ahead of current user at cutoff
        const ahead = group.filter(g => (g._sum.xp || 0) > uXP).length;
        const rank = ahead + 1;
        const behind = Math.max(0, effectiveTotal - rank);
        const percentileAhead = effectiveTotal > 1
          ? Math.min(100, Math.max(0, Math.round((behind / (effectiveTotal - 1)) * 100)))
          : 100;

        return {
          month: m.month,
          monthLong: m.monthLong,
          year: m.year,
          period: `${m.monthLong} ${m.year}`,
          rank,
          xp: uXP,
          totalParticipants: effectiveTotal,
          percentileAhead
        };
      }));

      // Calculate trend and position change
      const firstSnapshot = timeline[0];
      const latestSnapshot = timeline[timeline.length - 1];

      let trend = 'stable';
      let rankChange = 0;
      if (firstSnapshot && latestSnapshot) {
        // Note: Lower rank number means higher position! (e.g. rank 24 is better than rank 87)
        rankChange = firstSnapshot.rank - latestSnapshot.rank;
        if (rankChange > 0) {
          trend = 'upward';
        } else if (rankChange < 0) {
          trend = 'downward';
        }
      }

      return {
        timeline,
        currentRank: latestSnapshot ? latestSnapshot.rank : 1,
        initialRank: firstSnapshot ? firstSnapshot.rank : 1,
        rankChange: Math.abs(rankChange),
        trend,
        summary: trend === 'upward'
          ? `You have moved up ${Math.abs(rankChange)} positions over time!`
          : trend === 'downward'
          ? `Position adjusted by ${Math.abs(rankChange)} ranks.`
          : `Position is holding steady at #${latestSnapshot?.rank || 1}.`
      };
    } catch (err) {
      console.warn('[LevelService] Error calculating rank history:', err.message);
    }
  }

  return {
    timeline: [],
    currentRank: 1,
    initialRank: 1,
    rankChange: 0,
    trend: 'stable',
    summary: 'No rank history recorded yet.'
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
  getUserRankMetrics,
  getUserXPChartData,
  getUserRankHistory,
  invalidateLevelsCache
};
