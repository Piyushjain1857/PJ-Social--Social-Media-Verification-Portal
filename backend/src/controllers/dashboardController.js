const { prisma, checkDatabaseConnection } = require('../config/db');
const { getUserSubmissions } = require('../repositories/submissionRepository');
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
    const [submissions, notifications] = await Promise.all([
      getUserSubmissions(userId),
      getUserNotifications(userId),
    ]);

    // ── Submission stats ───────────────────────────────────────────────────
    const total     = submissions.length;
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

module.exports = { getUserDashboard };
