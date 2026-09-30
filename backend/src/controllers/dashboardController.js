const { prisma, checkDatabaseConnection } = require('../config/db');
const { getUserSubmissions, getAllSubmissions } = require('../repositories/submissionRepository');
const { getUserNotifications } = require('../repositories/notificationRepository');

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
 * Returns operational review metrics and recent pending submissions for moderators.
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
        const [statusCounts, reviewedTodayCount, recentPending] = await Promise.all([
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
        ]);

        const counts = statusCounts.reduce((acc, row) => {
          acc[row.status] = row._count.status;
          return acc;
        }, {});

        const pending = counts.PENDING || 0;
        const approved = counts.APPROVED || 0;
        const rejected = counts.REJECTED || 0;
        const total = pending + approved + rejected;

        return res.status(200).json({
          success: true,
          data: {
            stats: {
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
    const allSubs = await getAllSubmissions();
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

module.exports = { getUserDashboard, getAdminDashboard };
