const { prisma, checkDatabaseConnection } = require('../config/db');
const { getUserSubmissions, getAllSubmissions } = require('../repositories/submissionRepository');
const { getUserNotifications } = require('../repositories/notificationRepository');
const { getAllUsers } = require('../repositories/userRepository');

/**
 * GET /api/dashboard/user
 *
 * Returns dashboard statistics and recent activity for the authenticated user.
 * Data is strictly scoped to req.user.id — no cross-user access possible.
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     stats: { total, pending, approved, rejected, trustScore },
 *     recentSubmissions: [ ...last 5 ],
 *     recentNotifications: [ ...last 5 ],
 *     user: { id, name, email, role, createdAt }
 *   }
 * }
 */
const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // ── Security: never allow a USER to query another user's dashboard ────────
    // req.user is populated by the `authenticate` middleware from the JWT.
    // We only use req.user.id — no client-supplied user ID is accepted.

    // ── Parallel data fetch ────────────────────────────────────────────────
    const [submissionsResult, notificationsResult] = await Promise.all([
      getUserSubmissions(userId, { limit: 1000 }),
      getUserNotifications(userId),
    ]);

    const submissions = Array.isArray(submissionsResult)
      ? submissionsResult
      : (submissionsResult?.records || []);
    const notifications = Array.isArray(notificationsResult)
      ? notificationsResult
      : (notificationsResult?.records || []);

    // ── Submission stats ───────────────────────────────────────────────────
    const total     = submissionsResult?.totalCount ?? submissions.length;
    const pending   = submissions.filter(s => s.status === 'PENDING').length;
    const approved  = submissions.filter(s => s.status === 'APPROVED').length;
    const rejected  = submissions.filter(s => s.status === 'REJECTED').length;
    const trustScore = total > 0 ? Math.round((approved / total) * 100) : 100;

    // ── Platform breakdown ─────────────────────────────────────────────────
    const platformBreakdown = submissions.reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] || 0) + 1;
      return acc;
    }, {});

    // ── Action-type breakdown ──────────────────────────────────────────────
    const actionBreakdown = submissions.reduce((acc, s) => {
      acc[s.actionType] = (acc[s.actionType] || 0) + 1;
      return acc;
    }, {});

    // ── Recent records (last 5, already sorted desc by createdAt) ─────────
    const recentSubmissions   = submissions.slice(0, 5);
    const recentNotifications = notifications.slice(0, 5);
    const unreadNotifications = notifications.filter(n => !n.isRead).length;

    // ── Postgres-native aggregate (only when DB is live) ──────────────────
    let dbStats = null;
    const dbStatus = await checkDatabaseConnection();
    if (dbStatus.isConnected && prisma) {
      try {
        // Use groupBy for an efficient single-query status count
        const grouped = await prisma.submission.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true },
        });
        dbStats = grouped.reduce((acc, row) => {
          acc[row.status] = row._count.status;
          return acc;
        }, {});
      } catch (err) {
        // Non-fatal — in-memory counts are already computed above
        console.warn('[DashboardCtrl] Prisma groupBy failed, using in-memory counts:', err.message);
      }
    }

    return res.json({
      success: true,
      data: {
        stats: {
          total:       dbStats ? Object.values(dbStats).reduce((a, b) => a + b, 0) : total,
          pending:     dbStats?.PENDING  ?? pending,
          approved:    dbStats?.APPROVED ?? approved,
          rejected:    dbStats?.REJECTED ?? rejected,
          trustScore,
          platformBreakdown,
          actionBreakdown,
          unreadNotifications,
        },
        recentSubmissions,
        recentNotifications,
        user: {
          id:        req.user.id,
          name:      req.user.name,
          email:     req.user.email,
          role:      req.user.role,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (err) {
    console.error('[DashboardCtrl] getUserDashboard error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data.',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
};

/**
 * GET /api/dashboard/admin
 * Protected: ADMIN, SUPER_ADMIN only
 *
 * Returns operational review metrics, user statistics, and recent pending submissions for moderators.
 * Uses efficient PostgreSQL queries (groupBy, count, indexed order/take).
 */
const getAdminDashboard = async (req, res) => {
  try {
    // Role-based authorization check (defense in depth in addition to route middleware)
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: 'Access denied. Administrator clearance required.',
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dbStatus = await checkDatabaseConnection();

    if (dbStatus.isConnected && prisma) {
      try {
        const [statusCounts, reviewedTodayCount, recentPending, userRoleCounts] = await Promise.all([
          // Efficient single-query groupBy for status aggregates
          prisma.submission.groupBy({
            by: ['status'],
            _count: { status: true },
          }),
          // Reviews completed today
          prisma.review.count({
            where: {
              createdAt: { gte: startOfToday },
            },
          }),
          // Recent pending submissions awaiting review (latest 10)
          prisma.submission.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
              reviews: {
                include: {
                  admin: { select: { id: true, name: true } },
                },
              },
            },
          }),
          // User counts grouped by role
          prisma.user.groupBy({
            by: ['role'],
            _count: { role: true },
          }),
        ]);

        const counts = statusCounts.reduce((acc, row) => {
          acc[row.status] = row._count.status;
          return acc;
        }, {});

        const roleMap = userRoleCounts.reduce((acc, r) => {
          acc[r.role] = r._count.role;
          return acc;
        }, {});

        const creatorsCount = roleMap.USER || 0;
        const adminsCount = roleMap.ADMIN || 0;
        const superAdminsCount = roleMap.SUPER_ADMIN || 0;
        const totalAdmins = adminsCount + superAdminsCount;
        const totalUsers = creatorsCount + totalAdmins;

        const pending = counts.PENDING || 0;
        const approved = counts.APPROVED || 0;
        const rejected = counts.REJECTED || 0;
        const total = pending + approved + rejected;

        return res.status(200).json({
          success: true,
          data: {
            stats: {
              totalUsers,
              creatorsCount,
              totalAdmins,
              adminsCount,
              superAdminsCount,
              pending,
              reviewedToday: reviewedTodayCount,
              approved,
              rejected,
              total,
            },
            recentPending: recentPending.map(sub => ({
              ...sub,
              userName: sub.user?.name || 'Creator',
              userEmail: sub.user?.email || '',
            })),
            user: {
              id: req.user.id,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role,
            },
          },
        });
      } catch (prismaErr) {
        console.warn('[DashboardCtrl] Prisma query failed for admin dashboard, falling back to repository:', prismaErr.message);
      }
    }

    // In-memory fallback
    const [allSubs, allUsers] = await Promise.all([
      getAllSubmissions(),
      getAllUsers(),
    ]);

    const creatorsCount = allUsers.filter(u => u.role === 'USER').length;
    const adminsCount = allUsers.filter(u => u.role === 'ADMIN').length;
    const superAdminsCount = allUsers.filter(u => u.role === 'SUPER_ADMIN').length;
    const totalAdmins = adminsCount + superAdminsCount;
    const totalUsers = allUsers.length;

    const pending = allSubs.filter(s => s.status === 'PENDING').length;
    const approved = allSubs.filter(s => s.status === 'APPROVED').length;
    const rejected = allSubs.filter(s => s.status === 'REJECTED').length;

    let reviewedToday = 0;
    allSubs.forEach(s => {
      (s.reviews || []).forEach(r => {
        if (new Date(r.createdAt) >= startOfToday) reviewedToday++;
      });
    });

    const recentPending = allSubs
      .filter(s => s.status === 'PENDING')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          creatorsCount,
          totalAdmins,
          adminsCount,
          superAdminsCount,
          pending,
          reviewedToday,
          approved,
          rejected,
          total: pending + approved + rejected,
        },
        recentPending,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
      },
    });
  } catch (err) {
    console.error('[DashboardCtrl] getAdminDashboard error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load administrator dashboard data.',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
};

/**
 * GET /api/dashboard/super-admin
 * Protected: SUPER_ADMIN only
 *
 * Returns institutional governance metrics, platform distribution,
 * recent audit activity, and latest submissions.
 * Uses optimized PostgreSQL aggregations and relations.
 */
const getSuperAdminDashboard = async (req, res) => {
  try {
    // Defense-in-depth role check
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: 'Access denied. Super Administrator clearance required.',
      });
    }

    const dbStatus = await checkDatabaseConnection();

    if (dbStatus.isConnected && prisma) {
      try {
        const [
          userRoleCounts,
          submissionStatusCounts,
          platformCounts,
          activeSocialAccountsCount,
          totalSocialAccountsCount,
          recentSubmissions,
          recentReviews,
          recentNotifications
        ] = await Promise.all([
          // 1. User counts grouped by role
          prisma.user.groupBy({
            by: ['role'],
            _count: { role: true },
          }),
          // 2. Submissions grouped by status
          prisma.submission.groupBy({
            by: ['status'],
            _count: { status: true },
          }),
          // 3. Submissions grouped by platform
          prisma.submission.groupBy({
            by: ['platform'],
            _count: { platform: true },
          }),
          // 4. Active official social accounts count
          prisma.socialAccount.count({
            where: { isActive: true },
          }),
          // 5. Total official social accounts count
          prisma.socialAccount.count(),
          // 6. Recent submissions (latest 8)
          prisma.submission.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
              user: { select: { id: true, name: true, email: true } },
              socialAccount: { select: { id: true, name: true, platform: true, handle: true, accountUrl: true } },
              reviews: {
                include: { admin: { select: { id: true, name: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          }),
          // 7. Recent reviews for audit activity (latest 8)
          prisma.review.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
              admin: { select: { id: true, name: true, email: true, role: true } },
              submission: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                  socialAccount: { select: { id: true, name: true, platform: true, handle: true } },
                },
              },
            },
          }),
          // 8. Recent notifications for system events (latest 8)
          prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          }),
        ]);

        // Process role counts
        const roleMap = userRoleCounts.reduce((acc, r) => {
          acc[r.role] = r._count.role;
          return acc;
        }, {});

        const creatorsCount = roleMap.USER || 0;
        const adminsCount = roleMap.ADMIN || 0;
        const superAdminsCount = roleMap.SUPER_ADMIN || 0;
        const totalAdmins = adminsCount + superAdminsCount;
        const totalUsers = creatorsCount + totalAdmins;

        // Process submission counts
        const statusMap = submissionStatusCounts.reduce((acc, s) => {
          acc[s.status] = s._count.status;
          return acc;
        }, {});

        const pendingSubmissions = statusMap.PENDING || 0;
        const approvedSubmissions = statusMap.APPROVED || 0;
        const rejectedSubmissions = statusMap.REJECTED || 0;
        const totalSubmissions = pendingSubmissions + approvedSubmissions + rejectedSubmissions;
        const reviewedTotal = approvedSubmissions + rejectedSubmissions;
        const approvalRate = reviewedTotal > 0 ? Math.round((approvedSubmissions / reviewedTotal) * 100) : 100;

        // Process platform counts
        const platformMap = platformCounts.reduce((acc, p) => {
          acc[p.platform] = p._count.platform;
          return acc;
        }, { INSTAGRAM: 0, LINKEDIN: 0, FACEBOOK: 0 });

        // Build composite chronological recent activity stream
        const activityItems = [
          ...recentReviews.map(r => ({
            id: `rev-${r.id}`,
            type: 'REVIEW',
            action: r.status,
            actorName: r.admin?.name || 'Administrator',
            actorEmail: r.admin?.email || '',
            actorRole: r.admin?.role || 'ADMIN',
            target: `${r.submission?.user?.name || 'Creator'} (${r.submission?.platform} ${r.submission?.actionType})`,
            details: r.feedback ? `Verdict: ${r.status}. Feedback: "${r.feedback}"` : `Decision: ${r.status}`,
            timestamp: r.createdAt,
          })),
          ...recentNotifications.map(n => ({
            id: `notif-${n.id}`,
            type: 'NOTIFICATION',
            action: n.type,
            actorName: 'System Engine',
            actorEmail: '',
            actorRole: 'SYSTEM',
            target: n.user?.name || 'User',
            details: n.title ? `${n.title}: ${n.message}` : n.message,
            timestamp: n.createdAt,
          })),
        ]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 8);

        // Format recent submissions
        const formattedSubmissions = recentSubmissions.map(s => ({
          id: s.id,
          platform: s.platform,
          actionType: s.actionType,
          postUrl: s.postUrl,
          screenshotUrl: s.screenshotUrl,
          description: s.description,
          status: s.status,
          createdAt: s.createdAt,
          userName: s.user?.name || 'Creator',
          userEmail: s.user?.email || '',
          userId: s.userId,
          socialAccountName: s.socialAccount?.name || s.socialAccount?.handle || 'Official Account',
          socialAccountHandle: s.socialAccount?.handle || '',
          socialAccountUrl: s.socialAccount?.accountUrl || '',
          latestReview: s.reviews?.[0] || null,
        }));

        return res.status(200).json({
          success: true,
          data: {
            stats: {
              totalUsers,
              totalAdmins,
              totalSubmissions,
              pendingSubmissions,
              approvedSubmissions,
              rejectedSubmissions,
              activeSocialAccounts: activeSocialAccountsCount,
              totalSocialAccounts: totalSocialAccountsCount,
              creatorsCount,
              adminsCount,
              superAdminsCount,
              approvalRate,
            },
            platformBreakdown: platformMap,
            recentSubmissions: formattedSubmissions,
            recentActivity: activityItems,
            user: {
              id: req.user.id,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role,
            },
            timestamp: new Date().toISOString(),
          },
        });
      } catch (prismaErr) {
        console.warn('[DashboardCtrl] Prisma query failed for super admin dashboard, using fallback:', prismaErr.message);
      }
    }

    // In-memory fallback
    const { getAllOfficialAccounts } = require('../repositories/socialAccountRepository');
    const { listUsers } = require('../repositories/userRepository');

    const [allSubs, allAccounts, usersResult] = await Promise.all([
      getAllSubmissions(),
      getAllOfficialAccounts(),
      listUsers({ limit: 100 }),
    ]);

    const usersList = usersResult.users || [];
    const creatorsCount = usersList.filter(u => u.role === 'USER').length;
    const adminsCount = usersList.filter(u => u.role === 'ADMIN').length;
    const superAdminsCount = usersList.filter(u => u.role === 'SUPER_ADMIN').length;
    const totalAdmins = adminsCount + superAdminsCount;
    const totalUsers = usersList.length;

    const pendingSubmissions = allSubs.filter(s => s.status === 'PENDING').length;
    const approvedSubmissions = allSubs.filter(s => s.status === 'APPROVED').length;
    const rejectedSubmissions = allSubs.filter(s => s.status === 'REJECTED').length;
    const totalSubmissions = allSubs.length;
    const reviewedTotal = approvedSubmissions + rejectedSubmissions;
    const approvalRate = reviewedTotal > 0 ? Math.round((approvedSubmissions / reviewedTotal) * 100) : 100;

    const activeSocialAccounts = allAccounts.filter(a => a.isActive).length;

    const platformBreakdown = allSubs.reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] || 0) + 1;
      return acc;
    }, { INSTAGRAM: 0, LINKEDIN: 0, FACEBOOK: 0 });

    const recentSubmissions = allSubs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalAdmins,
          totalSubmissions,
          pendingSubmissions,
          approvedSubmissions,
          rejectedSubmissions,
          activeSocialAccounts,
          totalSocialAccounts: allAccounts.length,
          creatorsCount,
          adminsCount,
          superAdminsCount,
          approvalRate,
        },
        platformBreakdown,
        recentSubmissions,
        recentActivity: [],
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[DashboardCtrl] getSuperAdminDashboard error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load super administrator dashboard data.',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
};

module.exports = { getUserDashboard, getAdminDashboard, getSuperAdminDashboard };

