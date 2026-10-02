const { prisma } = require('../config/db');
const { calculateUserLevel, setActivityPointConfig } = require('./pointsService');
const { recalculateUserGamification, getUserLevelProgress } = require('./levelService');
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
    highestLevelReached = highestLevelObj.level;
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
        currentLevel: levelObj.level,
        levelName: levelObj.name,
        levelIcon: levelObj.badge,
        levelColor: levelObj.color,
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. XP Over Time (Group by date for last 30 days)
  const recentTxs = await prisma.pointTransaction.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { points: true, createdAt: true, actionType: true },
    orderBy: { createdAt: 'asc' }
  });

  const dailyBuckets = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    dailyBuckets[dateStr] = { date: dateStr, xp: 0, transactions: 0 };
  }

  recentTxs.forEach((tx) => {
    const dateStr = new Date(tx.createdAt).toISOString().split('T')[0];
    if (dailyBuckets[dateStr]) {
      dailyBuckets[dateStr].xp += tx.points;
      dailyBuckets[dateStr].transactions += 1;
    }
  });

  const xpOverTime = Object.values(dailyBuckets);

  // 2. Activity Contribution
  const activitySums = await prisma.pointTransaction.groupBy({
    by: ['actionType'],
    _sum: { points: true },
    _count: { id: true }
  });

  let totalXPSum = 0;
  activitySums.forEach((a) => { totalXPSum += a._sum.points || 0; });
  totalXPSum = Math.max(1, totalXPSum);

  const activityContribution = activitySums.map((a) => ({
    activity: a.actionType,
    totalXP: a._sum.points || 0,
    count: a._count.id,
    percentage: Math.round(((a._sum.points || 0) / totalXPSum) * 100)
  }));

  // 3. XP Distribution Buckets
  const [tier1, tier2, tier3, tier4, tier5] = await Promise.all([
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 0, lte: 99 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 100, lte: 499 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 500, lte: 999 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 1000, lte: 4999 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 5000 } } })
  ]);

  const xpDistribution = [
    { label: '0 – 99 XP', count: tier1 },
    { label: '100 – 499 XP', count: tier2 },
    { label: '500 – 999 XP', count: tier3 },
    { label: '1,000 – 4,999 XP', count: tier4 },
    { label: '5,000+ XP', count: tier5 }
  ];

  // 4. Users by Level
  const allUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { totalXP: true }
  });

  const levelCounts = {};
  allUsers.forEach((u) => {
    const lvl = calculateUserLevel(u.totalXP).level;
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
  });

  const usersByLevel = Object.entries(levelCounts).map(([lvl, count]) => ({
    level: parseInt(lvl, 10),
    count
  })).sort((a, b) => a.level - b.level);

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
      level: lvl.level,
      levelName: lvl.name,
      approvedSubmissions: u._count.submissions
    };
  });

  // 6. Fastest Progressing Users (Highest XP gained in last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fastUsersGroup = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: sevenDaysAgo } },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 5
  });

  const fastestProgressingUsers = await Promise.all(
    fastUsersGroup.map(async (item) => {
      const u = await prisma.user.findUnique({
        where: { id: item.userId },
        select: { id: true, name: true, email: true, totalXP: true }
      });
      return {
        id: item.userId,
        name: u?.name || 'Creator',
        email: u?.email || '',
        weeklyXP: item._sum.points || 0,
        totalXP: u?.totalXP || 0
      };
    })
  );

  return {
    xpOverTime,
    activityContribution,
    xpDistribution,
    usersByLevel,
    topUsers,
    fastestProgressingUsers,
    totalXPDistributed: totalXPSum
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
  if (!targetUserId) {
    throw new Error('Target User ID is required.');
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Adjustment amount must be a positive integer greater than zero.');
  }

  if (!reason || !reason.trim() || reason.trim().length < 3) {
    throw new Error('Mandatory justification reason must be provided (at least 3 characters).');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!targetUser) {
    throw new Error('Target user does not exist.');
  }

  const currentPoints = targetUser.totalXP ?? targetUser.totalPoints ?? 0;
  const deltaXP = type === 'REMOVE' ? -parsedAmount : parsedAmount;
  const newBalance = Math.max(0, currentPoints + deltaXP);
  const actualAppliedDelta = newBalance - currentPoints;
  const deltaStr = (actualAppliedDelta > 0 ? '+' : '') + actualAppliedDelta;

  // Execute atomic adjustment
  const [pointTx, updatedUser] = await prisma.$transaction([
    prisma.pointTransaction.create({
      data: {
        userId: targetUser.id,
        points: actualAppliedDelta,
        xp: actualAppliedDelta,
        actionType: 'SUPER_ADMIN_ADJUSTMENT',
        description: `Super Admin Adjustment: ${deltaStr} XP (${reason.trim()})`,
        metadata: {
          source: 'SUPER_ADMIN',
          adjustmentType: type,
          reason: reason.trim(),
          adminId: adminUser.id,
          adminName: adminUser.name,
          adminRole: adminUser.role,
          previousXP: currentPoints,
          newXP: newBalance,
          timestamp: new Date().toISOString()
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

  // Recalculate level progression
  let levelInfo = null;
  try {
    levelInfo = await recalculateUserGamification(targetUser.id);
  } catch (lvlErr) {
    levelInfo = calculateUserLevel(newBalance);
  }

  // Create Audit Log
  const auditLog = await prisma.auditLog.create({
    data: {
      actor: adminUser.email || adminUser.name || 'Super Admin',
      action: 'SUPER_ADMIN_XP_ADJUSTMENT',
      entity: 'UserGamification',
      entityId: targetUser.id,
      details: `Super Admin ${adminUser.name} adjusted user ${targetUser.name} (${targetUser.email}) XP by ${deltaStr} XP. Reason: ${reason.trim()}`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        previousValue: currentPoints,
        newValue: newBalance,
        deltaXP: actualAppliedDelta,
        reason: reason.trim(),
        actorId: adminUser.id,
        actorRole: adminUser.role,
        timestamp: new Date().toISOString()
      }
    }
  });

  // Notify user
  try {
    await createNotification({
      userId: targetUser.id,
      type: 'ACCOUNT_ALERT',
      title: 'Game Points XP Adjustment',
      message: `Super Administrator ${adminUser.name} applied an XP balance adjustment of ${deltaStr} XP. Reason: "${reason.trim()}". Your new balance is ${newBalance.toLocaleString()} XP.`,
      metadata: {
        adjustmentDelta: actualAppliedDelta,
        newBalance,
        reason: reason.trim(),
        adjustedBy: adminUser.name
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
    newBalance,
    deltaXP: actualAppliedDelta,
    transaction: pointTx,
    auditLog,
    level: levelInfo
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
