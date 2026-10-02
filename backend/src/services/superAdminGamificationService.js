const { prisma } = require('../config/db');
const { setActivityPointConfig } = require('./pointsService');
const { calculateUserLevel, recalculateUserGamification, getUserLevelProgress, getActiveLevels, buildLevelThresholds } = require('./levelService');
const { createNotification } = require('../repositories/notificationRepository');

/**
 * Default Institutional Activity Rules
 */
const DEFAULT_RULES = [
  { activity: 'LIKE', xp: 1, isActive: true, description: 'Points awarded for verified social media Like activity' },
  { activity: 'COMMENT', xp: 2, isActive: true, description: 'Points awarded for verified social media Comment activity' },
  { activity: 'STORY', xp: 2, isActive: true, description: 'Points awarded for verified social media Story post' }
];

/**
 * Seeds default gamification activity rules into DB if not yet initialized
 */
const initDefaultGamificationSettings = async () => {
  try {
    if (!prisma?.gamificationSetting) return;
    const count = await prisma.gamificationSetting.count();
    if (count === 0) {
      for (const rule of DEFAULT_RULES) {
        await prisma.gamificationSetting.upsert({
          where: { activity: rule.activity },
          update: {},
          create: rule
        });
        setActivityPointConfig(rule.activity, rule.xp);
      }
    } else {
      const activeSettings = await prisma.gamificationSetting.findMany({ where: { isActive: true } });
      for (const s of activeSettings) {
        setActivityPointConfig(s.activity, s.xp);
      }
    }
  } catch (err) {
    console.warn('[SuperAdminGamification] Warning syncing default rules:', err.message);
  }
};

// Initialize on module load
initDefaultGamificationSettings();

/**
 * ============================================================================
 * 1. GAMIFICATION SETTINGS (Activity Points Rules)
 * ============================================================================
 */
const getGamificationSettings = async () => {
  await initDefaultGamificationSettings();
  const settings = await prisma.gamificationSetting.findMany({
    orderBy: { activity: 'asc' }
  });
  return settings;
};

const updateGamificationSettings = async ({ updates = [], reason = 'Super Admin policy adjustment', adminUser }) => {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error('Updates array is required with at least one rule.');
  }

  const updatedRecords = [];

  for (const item of updates) {
    const activity = item.activity?.toUpperCase()?.trim();
    if (!activity) continue;

    const parsedXP = Math.max(0, parseInt(item.xp, 10) || 0);
    const isActive = item.isActive !== undefined ? Boolean(item.isActive) : true;
    const description = item.description !== undefined ? item.description : null;

    const existing = await prisma.gamificationSetting.findUnique({
      where: { activity }
    });

    const previousXP = existing ? existing.xp : 0;
    const previousActive = existing ? existing.isActive : true;

    const updated = await prisma.gamificationSetting.upsert({
      where: { activity },
      create: {
        activity,
        xp: parsedXP,
        isActive,
        description: description || `Points awarded for ${activity} verification`,
        updatedBy: adminUser.email || adminUser.name || 'Super Admin'
      },
      update: {
        xp: parsedXP,
        isActive,
        description: description !== null ? description : undefined,
        updatedBy: adminUser.email || adminUser.name || 'Super Admin'
      }
    });

    // Update in-memory configuration cache immediately for future transactions
    setActivityPointConfig(activity, isActive ? parsedXP : 0);
    updatedRecords.push(updated);

    // Audit Log Entry
    await prisma.auditLog.create({
      data: {
        actor: adminUser.email || adminUser.name || 'Super Admin',
        action: 'GAMIFICATION_RULE_UPDATE',
        entity: 'GamificationSetting',
        entityId: activity,
        details: `Super Admin ${adminUser.name} updated ${activity} XP rule: ${previousXP} XP → ${parsedXP} XP (Active: ${isActive}). Reason: ${reason}`,
        metadata: {
          activity,
          previousValue: previousXP,
          newValue: parsedXP,
          previousActive,
          newActive: isActive,
          reason,
          actorId: adminUser.id,
          actorRole: adminUser.role,
          timestamp: new Date().toISOString()
        }
      }
    });
  }


  // Broadcast rule change to all connected clients
  try {
    const realtimeService = require('./realtimeGamificationService');
    realtimeService.broadcastRulesUpdated({
      rules: updatedRecords,
      updatedBy: adminUser.name,
      reason,
      timestamp: new Date().toISOString()
    });
  } catch (rtErr) {
    console.warn('[SuperAdminGamification] Realtime broadcast notice:', rtErr.message);
  }

  return updatedRecords;
};


/**
 * ============================================================================
 * 2. OVERVIEW DASHBOARD TELEMETRY
 * ============================================================================
 */
const getSuperAdminOverview = async () => {
  const [
    totalUsers,
    totalXPResult,
    highestXPUser,
    activeLevelsCount,
    totalXPTransactions,
    manualAdjustmentsCount
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.aggregate({
      where: { role: 'USER' },
      _sum: { totalXP: true }
    }),
    prisma.user.findFirst({
      where: { role: 'USER' },
      orderBy: { totalXP: 'desc' },
      select: { id: true, name: true, totalXP: true }
    }),
    prisma.level.count({ where: { isActive: true } }),
    prisma.pointTransaction.count(),
    prisma.pointTransaction.count({
      where: {
        actionType: { in: ['ADJUSTMENT', 'ADMIN_ADJUSTMENT', 'SUPER_ADMIN_ADJUSTMENT'] }
      }
    })
  ]);

  // Active Users: creators with at least 1 point transaction
  const activeTxUsers = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    _count: { id: true }
  });
  const activeUsersCount = activeTxUsers.length;

  const totalXPDistributed = totalXPResult._sum.totalXP || 0;
  const averageXP = totalUsers > 0 ? Math.round(totalXPDistributed / totalUsers) : 0;
  const highestXP = highestXPUser ? highestXPUser.totalXP : 0;

  // Determine highest level reached across users
  let highestLevelReached = 1;
  if (highestXP > 0) {
    const highestLevelObj = calculateUserLevel(highestXP);
    highestLevelReached = highestLevelObj.currentLevel || highestLevelObj.level || 1;
  }

  return {
    totalUsers,
    activeUsers: activeUsersCount,
    totalXPDistributed,
    averageXP,
    highestXP,
    highestLevelReached,
    totalXPTransactions,
    manualAdjustments: manualAdjustmentsCount,
    activeLevels: activeLevelsCount
  };
};

/**
 * ============================================================================
 * 3. ALL USERS TABLE (Server-side Search, Filter, Pagination, XP Velocity)
 * ============================================================================
 */
const getSuperAdminUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  role,
  level,
  minXP,
  maxXP,
  status,
  sortBy = 'xp',
  sortOrder = 'desc'
}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const where = {};

  if (role) {
    where.role = role.toUpperCase();
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { id: { equals: term } }
    ];
  }

  if (minXP !== undefined && minXP !== '' && !isNaN(minXP)) {
    where.totalXP = { ...where.totalXP, gte: parseInt(minXP, 10) };
  }
  if (maxXP !== undefined && maxXP !== '' && !isNaN(maxXP)) {
    where.totalXP = { ...where.totalXP, lte: parseInt(maxXP, 10) };
  }

  // Determine order by
  let orderBy = { totalXP: 'desc' };
  if (sortBy === 'xp') {
    orderBy = { totalXP: sortOrder === 'asc' ? 'asc' : 'desc' };
  } else if (sortBy === 'name') {
    orderBy = { name: sortOrder === 'asc' ? 'asc' : 'desc' };
  } else if (sortBy === 'createdAt') {
    orderBy = { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' };
  }

  const [totalCount, userRecords] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        totalPoints: true,
        totalXP: true,
        createdAt: true,
        pointTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, actionType: true, points: true }
        }
      }
    })
  ]);

  // Compute 7-day and 30-day XP velocity for users
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const userIds = userRecords.map(u => u.id);

  const [weeklyTxs, monthlyTxs] = await Promise.all([
    prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        createdAt: { gte: sevenDaysAgo }
      },
      _sum: { points: true }
    }),
    prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { points: true }
    })
  ]);

  const weeklyMap = new Map();
  weeklyTxs.forEach(w => weeklyMap.set(w.userId, w._sum.points || 0));

  const monthlyMap = new Map();
  monthlyTxs.forEach(m => monthlyMap.set(m.userId, m._sum.points || 0));

  // Compute rank for each user
  const usersWithGamification = await Promise.all(
    userRecords.map(async (u) => {
      const xpVal = u.totalXP ?? u.totalPoints ?? 0;
      const levelObj = calculateUserLevel(xpVal);

      // Real rank query
      const higherCount = await prisma.user.count({
        where: {
          role: 'USER',
          status: 'ACTIVE',
          totalXP: { gt: xpVal }
        }
      });
      const rank = higherCount + 1;

      // Last activity formatting
      const latestTx = u.pointTransactions && u.pointTransactions[0];
      let lastActivity = 'No activity';
      let lastActivityDate = null;
      if (latestTx) {
        lastActivityDate = latestTx.createdAt;
        const diffMs = now - new Date(latestTx.createdAt);
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffHours < 1) lastActivity = 'Just now';
        else if (diffHours < 24) lastActivity = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        else if (diffDays < 7) lastActivity = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        else lastActivity = new Date(latestTx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        totalPoints: u.totalPoints,
        totalXP: xpVal,
        level: levelObj.currentLevel || levelObj.level || 1,
        currentLevel: levelObj.currentLevel || levelObj.level || 1,
        levelName: levelObj.levelName || levelObj.name || 'Novice',
        levelIcon: levelObj.icon || levelObj.badge || '🌱',
        levelColor: levelObj.color || '#38bdf8',
        rank,
        xpThisWeek: weeklyMap.get(u.id) || 0,
        xpThisMonth: monthlyMap.get(u.id) || 0,
        lastActivity,
        lastActivityDate,
        createdAt: u.createdAt
      };
    })
  );

  return {
    users: usersWithGamification,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
      totalUsers: totalCount
    }
  };
};

/**
 * ============================================================================
 * 4. ALL ADMINS GAMIFICATION ACTIVITY
 * ============================================================================
 */
const getSuperAdminAdmins = async () => {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true
    },
    orderBy: { role: 'asc' }
  });

  const adminProfiles = await Promise.all(
    admins.map(async (admin) => {
      // 1. Reviews count performed
      const reviewsCount = await prisma.review.count({
        where: { adminId: admin.id }
      });

      // 2. Audit logs where actor matches admin email or name
      const adjustmentLogs = await prisma.auditLog.findMany({
        where: {
          actor: { in: [admin.email, admin.name] },
          action: { in: ['XP_ADJUSTMENT', 'SUPER_ADMIN_XP_ADJUSTMENT'] }
        },
        orderBy: { timestamp: 'desc' },
        take: 20
      });

      // Total adjustment transactions
      const xpAdjustmentsCount = adjustmentLogs.length;

      // Unique users modified
      const uniqueUsersSet = new Set();
      let totalXPAwarded = 0;
      let totalXPDeducted = 0;

      adjustmentLogs.forEach((log) => {
        if (log.entityId) uniqueUsersSet.add(log.entityId);
        const delta = log.metadata?.deltaXP || 0;
        if (delta > 0) totalXPAwarded += delta;
        else if (delta < 0) totalXPDeducted += Math.abs(delta);
      });

      // Latest activity
      const latestLog = adjustmentLogs[0];
      const latestReview = await prisma.review.findFirst({
        where: { adminId: admin.id },
        orderBy: { createdAt: 'desc' }
      });

      let lastActivity = 'No recent activity';
      let lastActivityTime = null;

      if (latestLog && latestReview) {
        if (new Date(latestLog.timestamp) > new Date(latestReview.createdAt)) {
          lastActivity = `XP Adjustment: ${latestLog.details}`;
          lastActivityTime = latestLog.timestamp;
        } else {
          lastActivity = `Moderation Review: Submission ${latestReview.status}`;
          lastActivityTime = latestReview.createdAt;
        }
      } else if (latestLog) {
        lastActivity = `XP Adjustment: ${latestLog.details}`;
        lastActivityTime = latestLog.timestamp;
      } else if (latestReview) {
        lastActivity = `Moderation Review: Submission ${latestReview.status}`;
        lastActivityTime = latestReview.createdAt;
      }

      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        actionsPerformed: reviewsCount + xpAdjustmentsCount,
        xpAdjustmentsCount,
        usersModifiedCount: uniqueUsersSet.size,
        totalXPAwarded,
        totalXPDeducted,
        lastActivity,
        lastActivityTime,
        recentAuditLogs: adjustmentLogs.slice(0, 5)
      };
    })
  );

  return adminProfiles;
};

/**
 * ============================================================================
 * 5. XP TRANSACTION EXPLORER (Server-side Search, Filters & Pagination)
 * ============================================================================
 */
const getSuperAdminTransactions = async ({
  page = 1,
  limit = 20,
  search = '',
  action,
  userId,
  actor,
  minXP,
  maxXP,
  startDate,
  endDate
}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const where = {};

  if (action) {
    where.actionType = action.toUpperCase();
  }

  if (userId) {
    where.userId = userId;
  }

  if (minXP !== undefined && minXP !== '' && !isNaN(minXP)) {
    where.points = { ...where.points, gte: parseInt(minXP, 10) };
  }

  if (maxXP !== undefined && maxXP !== '' && !isNaN(maxXP)) {
    where.points = { ...where.points, lte: parseInt(maxXP, 10) };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { description: { contains: term, mode: 'insensitive' } },
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } }
    ];
  }

  const [totalCount, records] = await Promise.all([
    prisma.pointTransaction.count({ where }),
    prisma.pointTransaction.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        },
        submission: {
          select: { id: true, platform: true, actionType: true, status: true, postUrl: true }
        }
      }
    })
  ]);

  const transactions = records.map((tx) => {
    const meta = tx.metadata || {};
    const actorName = meta.reviewerName || meta.adminName || meta.actor || 'System Engine';
    const source = tx.submission?.platform || meta.source || (tx.actionType.includes('ADJUSTMENT') ? 'ADMIN_ADJUSTMENT' : 'SYSTEM');
    const reason = meta.reason || tx.description || 'Activity Verification';

    return {
      id: tx.id,
      date: tx.createdAt,
      user: tx.user,
      actor: actorName,
      action: tx.actionType,
      xp: tx.points || tx.xp || 0,
      source,
      reason,
      submission: tx.submission || null,
      status: 'COMPLETED'
    };
  });

  return {
    transactions,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
      totalTransactions: totalCount
    }
  };
};

/**
 * ============================================================================
 * 6. SUPER ADMIN ADVANCED ANALYTICS
 * ============================================================================
 */
const getSuperAdminAnalytics = async () => {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const thirtyDaysAgo = new Date(todayUTC.getTime() - 29 * 24 * 60 * 60 * 1000);
  const twelveWeeksAgo = new Date(todayUTC.getTime() - 83 * 24 * 60 * 60 * 1000);
  const twelveMonthsAgo = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1));

  // 1. Database-aggregated Periodic Telemetry in Parallel
  const [dailyRaw, weeklyRaw, monthlyRaw, activitySums, totalXPObj, totalUsersCount] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
        SUM(COALESCE("xp", "points", 0))::int AS xp,
        COUNT(id)::int AS transactions
      FROM "point_transactions"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ORDER BY day ASC
    `,
    prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('week', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS week_start,
        SUM(COALESCE("xp", "points", 0))::int AS xp,
        COUNT(id)::int AS transactions
      FROM "point_transactions"
      WHERE "createdAt" >= ${twelveWeeksAgo}
      GROUP BY DATE_TRUNC('week', "createdAt" AT TIME ZONE 'UTC')
      ORDER BY week_start ASC
    `,
    prisma.$queryRaw`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS month_key,
        SUM(COALESCE("xp", "points", 0))::int AS xp,
        COUNT(id)::int AS transactions
      FROM "point_transactions"
      WHERE "createdAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt" AT TIME ZONE 'UTC')
      ORDER BY month_key ASC
    `,
    prisma.pointTransaction.groupBy({
      by: ['actionType'],
      _sum: { xp: true, points: true },
      _count: { id: true }
    }),
    prisma.$queryRaw`
      SELECT COALESCE(SUM(COALESCE("xp", "points", 0)), 0)::int AS total_xp,
             COUNT(id)::int AS total_transactions
      FROM "point_transactions"
    `,
    prisma.user.count({ where: { role: 'USER' } })
  ]);

  const totalPlatformXP = totalXPObj[0]?.total_xp || 0;
  const totalTransactionsCount = totalXPObj[0]?.total_transactions || 0;

  // 1a. Fill 30-Day Daily Buckets (Zero-filled if no transactions)
  const dailyMap = new Map();
  (dailyRaw || []).forEach(r => dailyMap.set(r.day, { xp: r.xp || 0, transactions: r.transactions || 0 }));

  // Prior cumulative XP before 30 days ago
  const priorXPObj = await prisma.$queryRaw`
    SELECT COALESCE(SUM(COALESCE("xp", "points", 0)), 0)::int AS prior_xp
    FROM "point_transactions"
    WHERE "createdAt" < ${thirtyDaysAgo}
  `;
  let runningCumulativeXP = priorXPObj[0]?.prior_xp || 0;

  const dailyXP = [];
  const xpGrowth = [];
  for (let i = 0; i < 30; i++) {
    const cur = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = cur.toISOString().split('T')[0];
    const data = dailyMap.get(dateStr) || { xp: 0, transactions: 0 };
    runningCumulativeXP += data.xp;

    const dayObj = {
      date: dateStr,
      label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      xp: data.xp,
      transactions: data.transactions,
      cumulativeXP: runningCumulativeXP
    };

    dailyXP.push(dayObj);
    xpGrowth.push({
      date: dateStr,
      label: dayObj.label,
      xpGained: data.xp,
      cumulativeXP: runningCumulativeXP,
      transactions: data.transactions
    });
  }

  // 1b. Fill 12-Week Weekly Buckets
  const weeklyMap = new Map();
  (weeklyRaw || []).forEach(r => weeklyMap.set(r.week_start, { xp: r.xp || 0, transactions: r.transactions || 0 }));

  const weeklyXP = [];
  let currentMonday = new Date(twelveWeeksAgo);
  // Align to Monday
  const dayOfWeek = currentMonday.getUTCDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  currentMonday.setUTCDate(currentMonday.getUTCDate() + diffToMonday);

  for (let w = 0; w < 12; w++) {
    const weekStartStr = currentMonday.toISOString().split('T')[0];
    const weekEnd = new Date(currentMonday.getTime() + 6 * 24 * 60 * 60 * 1000);
    const wData = weeklyMap.get(weekStartStr) || { xp: 0, transactions: 0 };

    weeklyXP.push({
      period: weekStartStr,
      label: `Wk of ${currentMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`,
      startDate: weekStartStr,
      endDate: weekEnd.toISOString().split('T')[0],
      xp: wData.xp,
      transactions: wData.transactions
    });

    currentMonday.setUTCDate(currentMonday.getUTCDate() + 7);
  }

  // 1c. Fill 12-Month Monthly Buckets
  const monthlyMap = new Map();
  (monthlyRaw || []).forEach(r => monthlyMap.set(r.month_key, { xp: r.xp || 0, transactions: r.transactions || 0 }));

  const monthlyXP = [];
  for (let m = 11; m >= 0; m--) {
    const mDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
    const mKey = mDate.toISOString().slice(0, 7); // YYYY-MM
    const mData = monthlyMap.get(mKey) || { xp: 0, transactions: 0 };

    monthlyXP.push({
      month: mKey,
      label: mDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      year: mDate.getUTCFullYear(),
      xp: mData.xp,
      transactions: mData.transactions
    });
  }

  // Backwards compatibility alias
  const xpOverTime = dailyXP;

  // 2. Activity Contribution Breakdown
  const ACTION_CONFIG = {
    LIKE: { name: 'Like Reactions', icon: '❤️', color: '#38bdf8' },
    COMMENT: { name: 'Comment Verifications', icon: '💬', color: '#a855f7' },
    STORY: { name: 'Story Submissions', icon: '📱', color: '#ec4899' },
    BONUS: { name: 'Event Bonuses', icon: '🎁', color: '#f59e0b' },
    ADJUSTMENT: { name: 'Admin Adjustments', icon: '⚖️', color: '#10b981' },
    ADMIN_ADJUSTMENT: { name: 'Admin Adjustments', icon: '⚖️', color: '#10b981' },
    SUPER_ADMIN_ADJUSTMENT: { name: 'Super Admin Adjustments', icon: '👑', color: '#6366f1' }
  };

  let totalPositiveXPSum = 0;
  activitySums.forEach((a) => {
    const val = a._sum.xp !== undefined && a._sum.xp !== null ? a._sum.xp : (a._sum.points || 0);
    if (val > 0) totalPositiveXPSum += val;
  });
  const actDenom = Math.max(1, totalPositiveXPSum);

  const activityContribution = activitySums.map((a) => {
    const val = a._sum.xp !== undefined && a._sum.xp !== null ? a._sum.xp : (a._sum.points || 0);
    const count = a._count?.id || 0;
    const cfg = ACTION_CONFIG[a.actionType] || { name: a.actionType, icon: '⚡', color: '#94a3b8' };
    return {
      activity: a.actionType,
      name: cfg.name,
      icon: cfg.icon,
      color: cfg.color,
      totalXP: val,
      count,
      averageXP: count > 0 ? Math.round((val / count) * 10) / 10 : 0,
      percentage: Math.round((val / actDenom) * 100)
    };
  }).sort((a, b) => b.totalXP - a.totalXP);

  // 3. XP Distribution Buckets (DB Count Aggregations)
  const [tier1, tier2, tier3, tier4, tier5] = await Promise.all([
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 0, lte: 99 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 100, lte: 499 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 500, lte: 999 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 1000, lte: 4999 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 5000 } } })
  ]);

  const userDenom = Math.max(1, totalUsersCount);
  const xpDistribution = [
    { label: '0 – 99 XP', count: tier1, percentage: Math.round((tier1 / userDenom) * 100), color: '#94a3b8' },
    { label: '100 – 499 XP', count: tier2, percentage: Math.round((tier2 / userDenom) * 100), color: '#38bdf8' },
    { label: '500 – 999 XP', count: tier3, percentage: Math.round((tier3 / userDenom) * 100), color: '#818cf8' },
    { label: '1,000 – 4,999 XP', count: tier4, percentage: Math.round((tier4 / userDenom) * 100), color: '#a855f7' },
    { label: '5,000+ XP', count: tier5, percentage: Math.round((tier5 / userDenom) * 100), color: '#f59e0b' }
  ];

  // 4. Users by Level (DB Aggregation via SQL CASE without pulling raw users)
  let usersByLevel = [];
  try {
    const activeLevels = await getActiveLevels();
    const thresholds = buildLevelThresholds(activeLevels);
    if (thresholds.length > 0) {
      const caseClauses = thresholds.map((t) => {
        if (t.isLast) {
          return `WHEN "totalXP" >= ${t.cumulativeStartXP} THEN ${t.levelNumber}`;
        }
        return `WHEN "totalXP" >= ${t.cumulativeStartXP} AND "totalXP" <= ${t.cumulativeEndXP} THEN ${t.levelNumber}`;
      }).join(' ');

      const rawLevelCounts = await prisma.$queryRawUnsafe(`
        SELECT 
          CASE ${caseClauses} ELSE 1 END AS level,
          COUNT(id)::int AS count
        FROM "users"
        WHERE "role" = 'USER'
        GROUP BY CASE ${caseClauses} ELSE 1 END
        ORDER BY level ASC
      `);

      const countMap = new Map();
      (rawLevelCounts || []).forEach(r => countMap.set(parseInt(r.level, 10), r.count));

      usersByLevel = thresholds.map(t => {
        const count = countMap.get(t.levelNumber) || 0;
        return {
          level: t.levelNumber,
          levelName: t.name,
          icon: t.icon || '🌱',
          count,
          percentage: Math.round((count / userDenom) * 100),
          range: `${t.cumulativeStartXP.toLocaleString()} – ${t.isLast ? 'Apex' : t.cumulativeEndXP.toLocaleString()} XP`
        };
      }).filter(t => t.count > 0 || t.level <= 10);
    }
  } catch (err) {
    console.warn('[SuperAdminGamification] DB UsersByLevel fallback:', err.message);
  }

  // 5. Top 10 Creators
  const topCreators = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { totalXP: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      totalXP: true,
      _count: { select: { submissions: true } }
    }
  });

  const topUsers = topCreators.map((u, index) => {
    const lvl = calculateUserLevel(u.totalXP);
    return {
      rank: index + 1,
      id: u.id,
      name: u.name,
      email: u.email,
      totalXP: u.totalXP,
      level: lvl.currentLevel || lvl.level || 1,
      currentLevel: lvl.currentLevel || lvl.level || 1,
      levelName: lvl.levelName || lvl.name || 'Novice',
      icon: lvl.icon || lvl.badge || '🌱',
      approvedSubmissions: u._count.submissions
    };
  });

  // 6. Fastest Progressing Users (Highest XP gained in last 7 days)
  const sevenDaysAgo = new Date(todayUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fastUsersGroup = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: sevenDaysAgo } },
    _sum: { xp: true, points: true },
    orderBy: { _sum: { xp: 'desc' } },
    take: 5
  });

  const fastestProgressingUsers = await Promise.all(
    fastUsersGroup.map(async (item) => {
      const u = await prisma.user.findUnique({
        where: { id: item.userId },
        select: { id: true, name: true, email: true, totalXP: true }
      });
      const gained = item._sum?.xp !== undefined && item._sum?.xp !== null ? item._sum.xp : (item._sum?.points || 0);
      return {
        id: item.userId,
        name: u?.name || 'Creator',
        email: u?.email || '',
        weeklyXP: gained,
        totalXP: u?.totalXP || 0
      };
    })
  );

  const peakDailyXP = Math.max(0, ...dailyXP.map(d => d.xp));

  return {
    dailyXP,
    weeklyXP,
    monthlyXP,
    xpGrowth,
    xpOverTime,
    timeline: xpOverTime,
    activityContribution,
    categoryDistribution: activityContribution,
    xpDistribution,
    usersByLevel,
    topUsers,
    fastestProgressingUsers,
    totalXPDistributed: totalPlatformXP,
    summary: {
      totalXPDistributed: totalPlatformXP,
      totalTransactions: totalTransactionsCount,
      totalUsers: totalUsersCount,
      peakDailyXP
    }
  };
};

/**
 * ============================================================================
 * 7. SUPER ADMIN MANUAL XP ADJUSTMENT
 * ============================================================================
 */
const adjustUserXPAsSuperAdmin = async ({
  targetUserId,
  type = 'ADD', // 'ADD' | 'REMOVE'
  amount,
  reason,
  adminUser
}) => {
  // 1. Validate Actor (must be Super Admin)
  if (!adminUser || !adminUser.id || adminUser.role !== 'SUPER_ADMIN') {
    const err = new Error('Forbidden: Super Administrator privileges required.');
    err.code = 'FORBIDDEN';
    err.statusCode = 403;
    throw err;
  }

  // 2. Validate Target User ID
  if (!targetUserId) {
    const err = new Error('Target User ID is required.');
    err.code = 'USER_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  // 3. Validate Amount (positive numeric integer > 0)
  if (amount === undefined || amount === null || typeof amount === 'boolean') {
    const err = new Error('Adjustment amount must be a positive integer greater than zero.');
    err.code = 'INVALID_AMOUNT';
    err.statusCode = 400;
    throw err;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0 || !Number.isInteger(numAmount)) {
    const err = new Error('Adjustment amount must be a positive integer greater than zero.');
    err.code = 'INVALID_AMOUNT';
    err.statusCode = 400;
    throw err;
  }
  const parsedAmount = numAmount;

  // 4. Validate Reason
  if (!reason || typeof reason !== 'string' || !reason.trim() || reason.trim().length < 3) {
    const err = new Error('Mandatory justification reason must be provided (at least 3 characters).');
    err.code = 'REASON_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  const cleanReason = reason.trim();
  const cleanType = String(type).toUpperCase() === 'REMOVE' ? 'REMOVE' : 'ADD';

  // 5. Verify Target User exists and is USER role
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true, role: true, totalXP: true, totalPoints: true }
  });

  if (!targetUser) {
    const err = new Error('Target user does not exist.');
    err.code = 'USER_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (targetUser.role !== 'USER') {
    const err = new Error('Game points can only be adjusted for creators (USER role). Administrators cannot hold game points.');
    err.code = 'ADMIN_CANNOT_HAVE_POINTS';
    err.statusCode = 400;
    throw err;
  }

  const currentPoints = targetUser.totalXP ?? targetUser.totalPoints ?? 0;

  // 6. Validate Removal Balance Safety
  if (cleanType === 'REMOVE') {
    if (currentPoints <= 0) {
      const err = new Error('User currently has 0 XP balance and cannot have XP deducted.');
      err.code = 'INSUFFICIENT_XP';
      err.statusCode = 400;
      throw err;
    }
    if (parsedAmount > currentPoints) {
      const err = new Error(`Cannot deduct ${parsedAmount} XP. User only has ${currentPoints.toLocaleString()} XP balance.`);
      err.code = 'INSUFFICIENT_XP';
      err.statusCode = 400;
      throw err;
    }
  }

  const deltaXP = cleanType === 'REMOVE' ? -parsedAmount : parsedAmount;
  const newBalance = currentPoints + deltaXP;
  const actualAppliedDelta = deltaXP;
  const deltaStr = (actualAppliedDelta > 0 ? '+' : '') + actualAppliedDelta;
  const timestamp = new Date().toISOString();

  const activeLevels = await getActiveLevels();
  const previousLevelInfo = calculateUserLevel(currentPoints, activeLevels);

  // 7. Execute atomic adjustment: PointTransaction + User totalXP
  const [pointTx, updatedUser] = await prisma.$transaction([
    prisma.pointTransaction.create({
      data: {
        userId: targetUser.id,
        points: actualAppliedDelta,
        xp: actualAppliedDelta,
        actionType: 'SUPER_ADMIN_ADJUSTMENT',
        description: `Super Admin Adjustment: ${deltaStr} XP (${cleanReason})`,
        metadata: {
          reason: cleanReason,
          actor: 'Super Admin',
          actorId: adminUser.id,
          actorName: adminUser.name,
          actorRole: adminUser.role,
          date: timestamp,
          timestamp,
          adjustmentType: cleanType,
          amount: actualAppliedDelta,
          requestedAmount: parsedAmount,
          previousXP: currentPoints,
          newXP: newBalance
        }
      }
    }),
    prisma.user.update({
      where: { id: targetUser.id },
      data: {
        totalPoints: newBalance,
        totalXP: newBalance
      }
    })
  ]);

  // 8. Recalculate level progression
  let levelInfo = calculateUserLevel(newBalance, activeLevels);
  try {
    const recalced = await recalculateUserGamification(targetUser.id);
    if (recalced) levelInfo = recalced;
  } catch (lvlErr) {
    // fallback levelInfo already set
  }

  const leveledUp = levelInfo.currentLevel > previousLevelInfo.currentLevel;
  const levelDemoted = levelInfo.currentLevel < previousLevelInfo.currentLevel;

  // 9. Create Audit Log
  const auditLog = await prisma.auditLog.create({
    data: {
      actor: adminUser.email || adminUser.name || 'Super Admin',
      action: 'SUPER_ADMIN_XP_ADJUSTMENT',
      entity: 'UserGamification',
      entityId: targetUser.id,
      details: `Super Admin ${adminUser.name} adjusted user ${targetUser.name} (${targetUser.email}) XP by ${deltaStr} XP. Reason: ${cleanReason}`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        previousValue: currentPoints,
        newValue: newBalance,
        deltaXP: actualAppliedDelta,
        reason: cleanReason,
        actorId: adminUser.id,
        actorRole: adminUser.role,
        previousLevel: previousLevelInfo.currentLevel,
        newLevel: levelInfo.currentLevel,
        date: timestamp,
        timestamp
      }
    }
  });

  // 10. Notify user
  try {
    if (leveledUp) {
      await createNotification({
        userId: targetUser.id,
        type: 'ACCOUNT_ALERT',
        title: 'Level Up!',
        message: `🏆 Congratulations! Your level increased from Level ${previousLevelInfo.currentLevel} (${previousLevelInfo.levelName}) to Level ${levelInfo.currentLevel} (${levelInfo.levelName})! Current balance: ${newBalance.toLocaleString()} XP.`,
        metadata: {
          type: 'LEVEL_UP',
          previousLevel: previousLevelInfo.currentLevel,
          newLevel: levelInfo.currentLevel,
          previousLevelName: previousLevelInfo.levelName,
          newLevelName: levelInfo.levelName,
          previousXP: currentPoints,
          newXP: newBalance,
          adjustedBy: adminUser.name,
          actorRole: adminUser.role,
          date: timestamp
        }
      });
    } else if (levelDemoted) {
      await createNotification({
        userId: targetUser.id,
        type: 'ACCOUNT_ALERT',
        title: 'Level Adjustment Notice',
        message: `ℹ️ Following an XP adjustment (${deltaStr} XP), your level adjusted from Level ${previousLevelInfo.currentLevel} (${previousLevelInfo.levelName}) to Level ${levelInfo.currentLevel} (${levelInfo.levelName}). Current balance: ${newBalance.toLocaleString()} XP.`,
        metadata: {
          type: 'LEVEL_DEMOTION',
          previousLevel: previousLevelInfo.currentLevel,
          newLevel: levelInfo.currentLevel,
          previousLevelName: previousLevelInfo.levelName,
          newLevelName: levelInfo.levelName,
          previousXP: currentPoints,
          newXP: newBalance,
          adjustedBy: adminUser.name,
          actorRole: adminUser.role,
          date: timestamp
        }
      });
    }

    await createNotification({
      userId: targetUser.id,
      type: 'ACCOUNT_ALERT',
      title: deltaXP > 0 ? 'XP Bonus Awarded!' : 'XP Deduction Notice',
      message: `Super Administrator ${adminUser.name} applied an XP balance adjustment of ${deltaStr} XP. Reason: "${cleanReason}". Your new balance is ${newBalance.toLocaleString()} XP.`,
      metadata: {
        adjustmentDelta: actualAppliedDelta,
        adjustmentType: cleanType,
        amount: actualAppliedDelta,
        newBalance,
        reason: cleanReason,
        actor: 'Super Admin',
        actorId: adminUser.id,
        actorName: adminUser.name,
        previousLevel: previousLevelInfo.currentLevel,
        newLevel: levelInfo.currentLevel,
        date: timestamp
      }
    });
  } catch (notifErr) {
    console.warn('[SuperAdminGamification] Warning creating notification:', notifErr.message);
  }

  return {
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email
    },
    previousBalance: currentPoints,
    previousXP: currentPoints,
    newBalance,
    newXP: newBalance,
    deltaXP: actualAppliedDelta,
    actualDelta: actualAppliedDelta,
    previousLevel: previousLevelInfo.currentLevel,
    currentLevel: levelInfo.currentLevel,
    level: levelInfo.currentLevel,
    levelName: levelInfo.levelName,
    leveledUp,
    levelDemoted,
    levelInfo,
    transaction: pointTx,
    auditLog
  };
};

/**
 * ============================================================================
 * 8. SUPER ADMIN AUDIT LOGS (Query & Filter Gamification Actions)
 * ============================================================================
 */
const getSuperAdminAuditLogs = async ({
  page = 1,
  limit = 20,
  action,
  actor,
  targetId,
  startDate,
  endDate
}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const where = {};

  if (action) {
    where.action = action;
  } else {
    where.action = {
      in: [
        'GAMIFICATION_RULE_UPDATE',
        'SUPER_ADMIN_XP_ADJUSTMENT',
        'XP_ADJUSTMENT',
        'LEVEL_CREATE',
        'LEVEL_UPDATE',
        'LEVEL_DELETE',
        'LEVELS_GENERATE'
      ]
    };
  }

  if (actor) {
    where.actor = { contains: actor, mode: 'insensitive' };
  }

  if (targetId) {
    where.entityId = targetId;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [totalCount, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy: { timestamp: 'desc' }
    })
  ]);

  return {
    logs,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
      totalLogs: totalCount
    }
  };
};

module.exports = {
  initDefaultGamificationSettings,
  getGamificationSettings,
  updateGamificationSettings,
  getSuperAdminOverview,
  getSuperAdminUsers,
  getSuperAdminAdmins,
  getSuperAdminTransactions,
  getSuperAdminAnalytics,
  adjustUserXPAsSuperAdmin,
  getSuperAdminAuditLogs
};
