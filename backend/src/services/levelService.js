const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory fallback levels if DB is empty or disconnected
const DEFAULT_FALLBACK_LEVELS = Array.from({ length: 50 }, (_, i) => {
  const levelNum = i + 1;
  return {
    id: `level-${levelNum}`,
    levelNumber: levelNum,
    name: levelNum === 16 ? 'Contributor' : levelNum === 1 ? 'Novice' : levelNum === 50 ? 'PJ Social Legend' : `Level ${levelNum}`,
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
    usersBehind: rankMetrics?.usersBehind || 0,
    isParticipant: rankMetrics?.isParticipant ?? true
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
const getUserRankMetrics = async (userId, timeframe = 'all_time') => {
  if (!userId) {
    throw new Error('User ID is required to calculate rank metrics.');
  }

  const { prisma, checkDatabaseConnection } = require('../config/db');
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true }});
    if (user && user.role !== 'USER') {
      return {
          rank: null,
          currentRank: null,
          totalParticipants: 0,
          usersBehind: 0,
          usersAhead: 0,
          percentileAhead: null,
          totalXP: 0,
          pointsToNextRank: 0,
          nextRank: null,
          previousRank: null,
          rankChange: '0 positions',
          isParticipant: false,
          role: user.role,
          message: 'Administrative roles manage game points and do not participate in rankings'
      };
    }
  }

  const { getLeaderboardData } = require('../repositories/pointTransactionRepository');
  const fullData = await getLeaderboardData({ timeframe, page: 1, limit: 1000000 });
  
  const list = fullData.leaderboard || [];
  const userIndex = list.findIndex(item => item.userId === userId);
  const totalParticipants = list.length;
  
  let previousRank = null;
  let rankChange = 0;
  
  if (timeframe === 'this_month' || timeframe === 'all_time') {
    const { getUserRankHistory } = module.exports;
    try {
       const history = await getUserRankHistory(userId);
       if (history.timeline && history.timeline.length >= 2) {
           previousRank = history.timeline[history.timeline.length - 2].rank;
       }
    } catch(e) {}
  }

  if (userIndex !== -1) {
    const userRank = userIndex + 1;
    if (previousRank) {
       rankChange = previousRank - userRank; 
    }
    const totalXP = list[userIndex].totalXP || 0;
    const usersBehind = totalParticipants - userRank;
    const percentileAhead = totalParticipants > 1 ? Math.min(100, Math.max(0, Math.round((usersBehind / (totalParticipants - 1)) * 100))) : 100;
    const pointsToNextRank = userIndex > 0 ? Math.max(1, list[userIndex - 1].totalXP - totalXP + 1) : 0;
    
    return {
      currentRank: userRank,
      totalParticipants,
      totalXP,
      previousRank: previousRank || null,
      rankChange: rankChange > 0 ? `+${rankChange} positions` : (rankChange < 0 ? `${rankChange} positions` : '0 positions'),
      rank: userRank,
      percentileAhead,
      pointsToNextRank,
      usersBehind,
      isParticipant: true
    };
  }

  return {
    currentRank: totalParticipants > 0 ? totalParticipants : 1,
    totalParticipants,
    totalXP: 0,
    previousRank: previousRank || null,
    rankChange: '0 positions',
    rank: 1,
    percentileAhead: 100,
    pointsToNextRank: 0,
    usersBehind: 0,
    isParticipant: true
  };
};

/**
 * Retrieve user's XP progression over time
 */
const getUserXPChartData = async (userId, timeframe = "30d") => {
  if (!userId) {
    throw new Error("User ID is required to fetch chart data.");
  }

  const activeLevels = await getActiveLevels();
  const dbStatus = await checkDatabaseConnection();

  if (!dbStatus.isConnected || !prisma) {
    return {
      timeframe,
      points: [],
      summary: {
        startingXP: 0,
        endingXP: 0,
        netXPGained: 0,
        dataPointsCount: 0,
        currentLevel: 1,
        currentLevelName: "Novice",
        currentLevelIcon: "🌱"
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, createdAt: true, totalXP: true }
  });

  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  if (user.role !== "USER") {
    return {
      isParticipant: false,
      role: user.role,
      message: "Administrators manage game points and do not generate player XP graphs.",
      data: []
    };
  }

  const now = new Date();
  const cleanTf = (timeframe || "30d").toLowerCase();

  let daysBack = 30;
  let intervalDays = 1;

  if (cleanTf === "7d" || cleanTf === "7_days") {
    daysBack = 7;
    intervalDays = 1;
  } else if (cleanTf === "30d" || cleanTf === "30_days") {
    daysBack = 30;
    intervalDays = 1;
  } else if (cleanTf === "3m" || cleanTf === "90d" || cleanTf === "3_months") {
    daysBack = 90;
    intervalDays = 1;
  } else if (cleanTf === "6m" || cleanTf === "180d" || cleanTf === "6_months") {
    daysBack = 180;
    intervalDays = 1;
  } else if (cleanTf === "all" || cleanTf === "all_time") {
    const earliestTx = await prisma.pointTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true }
    });
    const firstDate = earliestTx ? new Date(earliestTx.createdAt) : new Date(user.createdAt);
    const diffDays = Math.max(7, Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    daysBack = Math.min(1095, diffDays);
    intervalDays = Math.max(1, Math.ceil(daysBack / 60));
  }

  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDate = new Date(todayUTC.getTime() - (daysBack - 1) * 24 * 60 * 60 * 1000);
  const endDate = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

  // 1. Total XP gained strictly prior to startDate (DB Aggregation)
  const priorResult = await prisma.$queryRaw`
    SELECT COALESCE(SUM(COALESCE("xp", "points", 0)), 0)::int AS prior_xp
    FROM "point_transactions"
    WHERE "userId" = ${userId}
      AND "createdAt" < ${startDate}
  `;
  let runningXP = priorResult[0]?.prior_xp || 0;

  // 2. Grouped daily gains within window [startDate, endDate] (DB Aggregation)
  const dailyRows = await prisma.$queryRaw`
    SELECT 
      TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
      SUM(COALESCE("xp", "points", 0))::int AS xp_gained,
      COUNT(id)::int AS count
    FROM "point_transactions"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${startDate}
      AND "createdAt" <= ${endDate}
    GROUP BY TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY day ASC
  `;

  const dailyMap = new Map();
  if (Array.isArray(dailyRows)) {
    dailyRows.forEach(r => {
      dailyMap.set(r.day, r.xp_gained || 0);
    });
  }

  const points = [];
  let currentDate = new Date(startDate);

  while (currentDate <= todayUTC) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const gained = dailyMap.get(dateStr) || 0;
    runningXP += gained;

    const levelData = calculateUserLevel(runningXP, activeLevels);

    points.push({
      date: dateStr,
      label: currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      timestamp: currentDate.getTime(),
      xp: runningXP,
      xpGained: gained,
      level: levelData.currentLevel,
      levelName: levelData.levelName,
      icon: levelData.icon || "🌱"
    });

    currentDate = new Date(currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }

  if (points.length === 0) {
    const lvl = calculateUserLevel(user.totalXP || 0, activeLevels);
    points.push({
      date: todayUTC.toISOString().split("T")[0],
      label: todayUTC.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      timestamp: todayUTC.getTime(),
      xp: user.totalXP || 0,
      xpGained: 0,
      level: lvl.currentLevel,
      levelName: lvl.levelName,
      icon: lvl.icon || "🌱"
    });
  } else {
    const lastPt = points[points.length - 1];
    const todayStr = todayUTC.toISOString().split("T")[0];
    if (lastPt.date !== todayStr) {
      const lvl = calculateUserLevel(user.totalXP || runningXP, activeLevels);
      points.push({
        date: todayStr,
        label: todayUTC.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        timestamp: todayUTC.getTime(),
        xp: user.totalXP || runningXP,
        xpGained: 0,
        level: lvl.currentLevel,
        levelName: lvl.levelName,
        icon: lvl.icon || "🌱"
      });
    }
  }

  const startXP = points[0].xp;
  const endXP = points[points.length - 1].xp;
  const finalLevel = calculateUserLevel(endXP, activeLevels);

  return {
    timeframe: cleanTf,
    points,
    summary: {
      startingXP: startXP,
      endingXP: endXP,
      netXPGained: Math.max(0, endXP - startXP),
      dataPointsCount: points.length,
      currentLevel: finalLevel.currentLevel,
      currentLevelName: finalLevel.levelName,
      currentLevelIcon: finalLevel.icon || "🌱"
    }
  };
};

/**
 * Retrieve a user's activity distribution breakdown using database aggregation
 */
const getUserActivityDistribution = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch activity distribution.");
  }

  const dbStatus = await checkDatabaseConnection();

  if (!dbStatus.isConnected || !prisma) {
    return {
      userId,
      totalXP: 0,
      totalActions: 0,
      activities: []
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, totalXP: true }
  });

  if (!user || user.role !== "USER") {
    return {
      userId,
      isParticipant: false,
      totalXP: 0,
      totalActions: 0,
      activities: []
    };
  }

  // Database aggregation via groupBy
  const distribution = await prisma.pointTransaction.groupBy({
    by: ["actionType"],
    where: { userId },
    _sum: { xp: true, points: true },
    _count: { id: true }
  });

  const ACTION_CONFIG = {
    LIKE: { name: "Like Reactions", icon: "❤️", color: "#38bdf8" },
    COMMENT: { name: "Comment Verifications", icon: "💬", color: "#a855f7" },
    STORY: { name: "Story Submissions", icon: "📱", color: "#ec4899" },
    BONUS: { name: "Event Bonuses", icon: "🎁", color: "#f59e0b" },
    ADJUSTMENT: { name: "Admin Adjustments", icon: "⚖️", color: "#10b981" },
    ADMIN_ADJUSTMENT: { name: "Admin Adjustments", icon: "⚖️", color: "#10b981" },
    SUPER_ADMIN_ADJUSTMENT: { name: "Super Admin Adjustments", icon: "👑", color: "#6366f1" }
  };

  let totalPositiveXP = 0;
  let totalActions = 0;

  const activities = distribution.map((item) => {
    const rawXP = item._sum?.xp !== undefined && item._sum?.xp !== null ? item._sum.xp : (item._sum?.points || 0);
    const count = item._count?.id || 0;
    if (rawXP > 0) totalPositiveXP += rawXP;
    totalActions += count;
    const cfg = ACTION_CONFIG[item.actionType] || { name: item.actionType, icon: "⚡", color: "#94a3b8" };
    return {
      actionType: item.actionType,
      name: cfg.name,
      icon: cfg.icon,
      color: cfg.color,
      totalXP: rawXP,
      count,
      averageXP: count > 0 ? Math.round((rawXP / count) * 10) / 10 : 0
    };
  });

  const denom = Math.max(1, totalPositiveXP);
  activities.forEach(act => {
    act.percentage = act.totalXP > 0 ? Math.round((act.totalXP / denom) * 100) : 0;
  });

  activities.sort((a, b) => b.totalXP - a.totalXP);

  return {
    userId,
    userName: user.name,
    totalXP: user.totalXP || totalPositiveXP,
    totalPositiveXP,
    totalActions,
    activities
  };
};

const getUserRankHistory = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to fetch rank history.');
  }

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, createdAt: true, role: true }
      });

      if (!currentUser || currentUser.role !== 'USER') {
        return { timeline: [], currentRank: null, initialRank: null, rankChange: 0, trend: 'stable', summary: 'N/A' };
      }

      const now = new Date();
      const months = [];
      const numMonths = 5;
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

      // Fetch all eligible users
      const allUsers = await prisma.user.findMany({
        where: { role: 'USER', status: 'ACTIVE' },
        select: { id: true, createdAt: true }
      });

      // Instead of looping, we could get all transactions and calculate
      const allTxs = await prisma.pointTransaction.findMany({
        where: { user: { role: 'USER', status: 'ACTIVE' } },
        select: { userId: true, xp: true, createdAt: true }
      });

      const timeline = [];
      
      for (const m of months) {
         // Filter txs up to cutoff
         const validTxs = allTxs.filter(tx => tx.createdAt <= m.cutoff);
         
         // Aggregate
         const userMap = new Map();
         allUsers.forEach(u => {
            if (u.createdAt <= m.cutoff) {
               userMap.set(u.id, { xp: 0, maxTime: u.createdAt.getTime() });
            }
         });
         
         for (const tx of validTxs) {
            if (userMap.has(tx.userId)) {
               const udata = userMap.get(tx.userId);
               udata.xp += tx.xp;
               if (tx.createdAt.getTime() > udata.maxTime) {
                  udata.maxTime = tx.createdAt.getTime();
               }
            }
         }
         
         const aggregates = [];
         for (const [uid, data] of userMap.entries()) {
            aggregates.push({ userId: uid, xp: data.xp, maxTime: data.maxTime });
         }
         
         // Tie breaking
         aggregates.sort((a, b) => {
           if (b.xp !== a.xp) return b.xp - a.xp;
           if (a.maxTime !== b.maxTime) return a.maxTime - b.maxTime;
           return a.userId.localeCompare(b.userId);
         });
         
         const idx = aggregates.findIndex(a => a.userId === userId);
         if (idx !== -1) {
            const rank = idx + 1;
            const effectiveTotal = aggregates.length;
            timeline.push({
              month: m.month,
              monthLong: m.monthLong,
              year: m.year,
              period: `${m.monthLong} ${m.year}`,
              rank,
              xp: aggregates[idx].xp,
              totalParticipants: effectiveTotal
            });
         }
      }
      
      // Calculate trend
      const firstSnapshot = timeline[0];
      const latestSnapshot = timeline[timeline.length - 1];

      let trend = 'stable';
      let rankChange = 0;
      if (firstSnapshot && latestSnapshot) {
        rankChange = firstSnapshot.rank - latestSnapshot.rank; // >0 means moved up
        if (rankChange > 0) trend = 'upward';
        else if (rankChange < 0) trend = 'downward';
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
  getUserActivityDistribution,
  getUserRankHistory,
  invalidateLevelsCache
};
