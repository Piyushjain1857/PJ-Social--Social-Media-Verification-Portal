const { prisma, checkDatabaseConnection } = require('../config/db');
const { getAllSubmissions } = require('../repositories/submissionRepository');
const { getAllUsers } = require('../repositories/userRepository');
const { getAllOfficialAccounts } = require('../repositories/socialAccountRepository');
const { getUserNotifications } = require('../repositories/notificationRepository');

/**
 * GET /api/search
 * Protected: Authenticated users (USER, ADMIN, SUPER_ADMIN)
 * 
 * Performs cross-cutting global search across Submissions, Users, Admins, 
 * Social Accounts, and Notifications according to the caller's role clearance.
 * 
 * Query Params:
 * - q: Search query string (min 1 char)
 * - limit: Max results per category (default 5, max 20)
 */
const globalSearch = async (req, res, next) => {
  try {
    const rawQuery = req.query.q || '';
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    const perCategoryLimit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 5));
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!query) {
      return res.status(200).json({
        success: true,
        query: '',
        totalMatches: 0,
        categories: {
          submissions: [],
          users: [],
          admins: [],
          socialAccounts: [],
          notifications: []
        }
      });
    }

    const dbStatus = await checkDatabaseConnection();
    let submissions = [];
    let users = [];
    let admins = [];
    let socialAccounts = [];
    let notifications = [];

    if (dbStatus.isConnected && prisma) {
      try {
        const promises = [];

        // 1. Submissions query (role-filtered)
        const subWhere = {
          OR: [
            { postUrl: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { user: { name: { contains: query, mode: 'insensitive' } } },
            { user: { email: { contains: query, mode: 'insensitive' } } },
            { socialAccount: { handle: { contains: query, mode: 'insensitive' } } },
            { socialAccount: { name: { contains: query, mode: 'insensitive' } } }
          ]
        };

        if (userRole === 'USER') {
          subWhere.userId = userId;
        }

        const subPromise = prisma.submission.findMany({
          where: subWhere,
          take: perCategoryLimit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            platform: true,
            actionType: true,
            status: true,
            postUrl: true,
            description: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
            socialAccount: { select: { id: true, handle: true, name: true } }
          }
        }).then(rows => {
          submissions = rows.map(r => ({
            id: r.id,
            title: `${r.platform} ${r.actionType}`,
            subtitle: r.user?.name ? `By ${r.user.name} • ${r.status}` : r.postUrl,
            status: r.status,
            platform: r.platform,
            actionType: r.actionType,
            postUrl: r.postUrl,
            createdAt: r.createdAt,
            type: 'submission',
            navTarget: userRole === 'USER' ? 'my-submissions' : 'submissions'
          }));
        });
        promises.push(subPromise);

        // 2. Users query (ADMIN or SUPER_ADMIN only)
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
          const userWhere = {
            role: 'USER',
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          };

          const userPromise = prisma.user.findMany({
            where: userWhere,
            take: perCategoryLimit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true
            }
          }).then(rows => {
            users = rows.map(u => ({
              id: u.id,
              title: u.name,
              subtitle: `${u.email} • ${u.status}`,
              role: u.role,
              status: u.status,
              createdAt: u.createdAt,
              type: 'user',
              navTarget: 'users'
            }));
          });
          promises.push(userPromise);
        }

        // 3. Admins query (SUPER_ADMIN only)
        if (userRole === 'SUPER_ADMIN') {
          const adminWhere = {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          };

          const adminPromise = prisma.user.findMany({
            where: adminWhere,
            take: perCategoryLimit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true
            }
          }).then(rows => {
            admins = rows.map(a => ({
              id: a.id,
              title: a.name,
              subtitle: `${a.role} • ${a.email}`,
              role: a.role,
              status: a.status,
              createdAt: a.createdAt,
              type: 'admin',
              navTarget: 'admins'
            }));
          });
          promises.push(adminPromise);
        }

        // 4. Social Accounts query (All authenticated users)
        const socialWhere = {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { handle: { contains: query, mode: 'insensitive' } },
            { accountUrl: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        };
        if (userRole === 'USER') {
          socialWhere.isActive = true;
        }

        const socialPromise = prisma.socialAccount.findMany({
          where: socialWhere,
          take: perCategoryLimit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            platform: true,
            handle: true,
            name: true,
            accountUrl: true,
            isActive: true,
            createdAt: true
          }
        }).then(rows => {
          socialAccounts = rows.map(s => ({
            id: s.id,
            title: s.name || s.handle,
            subtitle: `${s.platform} • ${s.handle}${s.isActive ? '' : ' (Inactive)'}`,
            platform: s.platform,
            handle: s.handle,
            accountUrl: s.accountUrl,
            isActive: s.isActive,
            createdAt: s.createdAt,
            type: 'socialAccount',
            navTarget: userRole === 'SUPER_ADMIN' ? 'social-accounts' : 'dashboard'
          }));
        });
        promises.push(socialPromise);

        // 5. Notifications query (user's own notifications)
        const notifPromise = prisma.notification.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { message: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: perCategoryLimit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            message: true,
            type: true,
            isRead: true,
            createdAt: true
          }
        }).then(rows => {
          notifications = rows.map(n => ({
            id: n.id,
            title: n.title,
            subtitle: n.message.length > 70 ? `${n.message.substring(0, 70)}...` : n.message,
            notificationType: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
            type: 'notification',
            navTarget: 'notifications'
          }));
        });
        promises.push(notifPromise);

        await Promise.all(promises);
      } catch (err) {
        console.warn('[SearchController] Prisma global search error, falling back to memory stores:', err.message);
      }
    }

    // Fallback to repository in-memory stores if DB returned no rows or errored
    const qLower = query.toLowerCase();

    if (submissions.length === 0) {
      const allSubs = await getAllSubmissions();
      const filtered = allSubs.filter(s => {
        if (userRole === 'USER' && s.userId !== userId) return false;
        return (
          (s.postUrl && s.postUrl.toLowerCase().includes(qLower)) ||
          (s.description && s.description.toLowerCase().includes(qLower)) ||
          (s.userName && s.userName.toLowerCase().includes(qLower)) ||
          (s.userEmail && s.userEmail.toLowerCase().includes(qLower)) ||
          (s.platform && s.platform.toLowerCase().includes(qLower)) ||
          (s.actionType && s.actionType.toLowerCase().includes(qLower))
        );
      }).slice(0, perCategoryLimit);

      submissions = filtered.map(s => ({
        id: s.id,
        title: `${s.platform} ${s.actionType}`,
        subtitle: s.userName ? `By ${s.userName} • ${s.status}` : s.postUrl,
        status: s.status,
        platform: s.platform,
        actionType: s.actionType,
        postUrl: s.postUrl,
        createdAt: s.createdAt,
        type: 'submission',
        navTarget: userRole === 'USER' ? 'my-submissions' : 'submissions'
      }));
    }

    if (users.length === 0 && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
      const allUsers = await getAllUsers();
      const filtered = allUsers.filter(u => {
        if (u.role !== 'USER') return false;
        return (
          (u.name && u.name.toLowerCase().includes(qLower)) ||
          (u.email && u.email.toLowerCase().includes(qLower))
        );
      }).slice(0, perCategoryLimit);

      users = filtered.map(u => ({
        id: u.id,
        title: u.name,
        subtitle: `${u.email} • ${u.status}`,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        type: 'user',
        navTarget: 'users'
      }));
    }

    if (admins.length === 0 && userRole === 'SUPER_ADMIN') {
      const allUsers = await getAllUsers();
      const filtered = allUsers.filter(u => {
        if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') return false;
        return (
          (u.name && u.name.toLowerCase().includes(qLower)) ||
          (u.email && u.email.toLowerCase().includes(qLower))
        );
      }).slice(0, perCategoryLimit);

      admins = filtered.map(a => ({
        id: a.id,
        title: a.name,
        subtitle: `${a.role} • ${a.email}`,
        role: a.role,
        status: a.status,
        createdAt: a.createdAt,
        type: 'admin',
        navTarget: 'admins'
      }));
    }

    if (socialAccounts.length === 0) {
      const allAccounts = await getAllOfficialAccounts();
      const filtered = allAccounts.filter(a => {
        if (userRole === 'USER' && !a.isActive) return false;
        return (
          (a.name && a.name.toLowerCase().includes(qLower)) ||
          (a.handle && a.handle.toLowerCase().includes(qLower)) ||
          (a.platform && a.platform.toLowerCase().includes(qLower)) ||
          (a.description && a.description.toLowerCase().includes(qLower))
        );
      }).slice(0, perCategoryLimit);

      socialAccounts = filtered.map(s => ({
        id: s.id,
        title: s.name || s.handle,
        subtitle: `${s.platform} • ${s.handle}${s.isActive ? '' : ' (Inactive)'}`,
        platform: s.platform,
        handle: s.handle,
        accountUrl: s.accountUrl,
        isActive: s.isActive,
        createdAt: s.createdAt,
        type: 'socialAccount',
        navTarget: userRole === 'SUPER_ADMIN' ? 'social-accounts' : 'dashboard'
      }));
    }

    if (notifications.length === 0) {
      const allNotifs = await getUserNotifications(userId);
      const filtered = allNotifs.filter(n =>
        (n.title && n.title.toLowerCase().includes(qLower)) ||
        (n.message && n.message.toLowerCase().includes(qLower))
      ).slice(0, perCategoryLimit);

      notifications = filtered.map(n => ({
        id: n.id,
        title: n.title,
        subtitle: n.message.length > 70 ? `${n.message.substring(0, 70)}...` : n.message,
        notificationType: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
        type: 'notification',
        navTarget: 'notifications'
      }));
    }

    const totalMatches =
      submissions.length +
      users.length +
      admins.length +
      socialAccounts.length +
      notifications.length;

    return res.status(200).json({
      success: true,
      query,
      totalMatches,
      categories: {
        submissions,
        users,
        admins,
        socialAccounts,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  globalSearch
};
