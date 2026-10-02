const { prisma, checkDatabaseConnection } = require('../config/db');

const inMemoryNotifications = new Map();

const initializeInMemoryNotifications = () => {
  if (inMemoryNotifications.size > 0) return;

  const defaultNotifications = [
    {
      id: 'notif-001',
      userId: 'usr-user-003',
      type: 'REVIEW_FEEDBACK',
      title: 'LinkedIn Verification Approved',
      message: 'Your LinkedIn post submission #sub-002 was verified and approved by Admin Moderator.',
      isRead: false,
      createdAt: new Date('2026-02-09T14:20:00Z')
    },
    {
      id: 'notif-002',
      userId: 'usr-user-003',
      type: 'REVIEW_FEEDBACK',
      title: 'Facebook Submission Requires Attention',
      message: 'Your Facebook story submission #sub-003 was rejected. Reason: Timestamp missing from proof.',
      isRead: true,
      createdAt: new Date('2026-02-06T10:10:00Z')
    },
    {
      id: 'notif-003',
      userId: 'usr-user-003',
      type: 'SYSTEM',
      title: 'Welcome to VeriSocial Creator Portal',
      message: 'Your creator account is active. Connect your social channels and start verifying activities.',
      isRead: true,
      createdAt: new Date('2026-02-01T00:00:00Z')
    }
  ];

  defaultNotifications.forEach(n => inMemoryNotifications.set(n.id, n));
};

initializeInMemoryNotifications();

const getUserNotifications = async (userId) => {
  initializeInMemoryNotifications();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const records = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      if (records && records.length > 0) return records;
    } catch (err) {
      console.warn('[NotifRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  return Array.from(inMemoryNotifications.values())
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Filtered, sorted, and paginated query for user notifications.
 */
const getUserNotificationsPaginated = async (userId, filters = {}) => {
  initializeInMemoryNotifications();
  const dbStatus = await checkDatabaseConnection();

  const {
    page = 1,
    limit = 10,
    search = '',
    type = 'ALL',
    isRead = 'ALL',
    startDate = null,
    endDate = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';

  const validSort = ['createdAt', 'type', 'isRead', 'title'];
  const sortField = validSort.includes(sortBy) ? sortBy : 'createdAt';
  const cleanSortOrder = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (dbStatus.isConnected && prisma) {
    try {
      const where = { userId };

      if (type && type !== 'ALL') {
        where.type = type;
      }

      if (isRead !== 'ALL' && isRead !== undefined && isRead !== null) {
        where.isRead = isRead === 'true' || isRead === true;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          const from = new Date(startDate);
          if (!isNaN(from.getTime())) {
            from.setHours(0, 0, 0, 0);
            where.createdAt.gte = from;
          }
        }
        if (endDate) {
          const to = new Date(endDate);
          if (!isNaN(to.getTime())) {
            to.setHours(23, 59, 59, 999);
            where.createdAt.lte = to;
          }
        }
      }

      if (trimmedSearch) {
        where.OR = [
          { title: { contains: trimmedSearch, mode: 'insensitive' } },
          { message: { contains: trimmedSearch, mode: 'insensitive' } }
        ];
      }

      const [totalCount, totalUnread, records] = await Promise.all([
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.notification.findMany({
          where,
          orderBy: { [sortField]: cleanSortOrder },
          skip,
          take: parsedLimit
        })
      ]);

      const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

      return {
        records,
        totalCount,
        totalUnread,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasNext: parsedPage < totalPages,
        hasPrev: parsedPage > 1
      };
    } catch (err) {
      console.warn('[NotifRepo] Prisma getUserNotificationsPaginated failed, falling back to memory store:', err.message);
    }
  }

  // In-Memory Fallback
  let memoryRecords = Array.from(inMemoryNotifications.values()).filter(n => n.userId === userId);
  const totalUnread = memoryRecords.filter(n => !n.isRead).length;

  if (type && type !== 'ALL') {
    memoryRecords = memoryRecords.filter(n => n.type === type);
  }
  if (isRead !== 'ALL' && isRead !== undefined && isRead !== null) {
    const wantRead = isRead === 'true' || isRead === true;
    memoryRecords = memoryRecords.filter(n => n.isRead === wantRead);
  }
  if (startDate) {
    const from = new Date(startDate);
    if (!isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      memoryRecords = memoryRecords.filter(n => new Date(n.createdAt) >= from);
    }
  }
  if (endDate) {
    const to = new Date(endDate);
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      memoryRecords = memoryRecords.filter(n => new Date(n.createdAt) <= to);
    }
  }
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    memoryRecords = memoryRecords.filter(n =>
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.message && n.message.toLowerCase().includes(q))
    );
  }

  memoryRecords.sort((a, b) => {
    let valA = a[sortField] || a.createdAt;
    let valB = b[sortField] || b.createdAt;
    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }
    if (cleanSortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  const totalCount = memoryRecords.length;
  const paginated = memoryRecords.slice(skip, skip + parsedLimit);
  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  return {
    records: paginated,
    totalCount,
    totalUnread,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    hasNext: parsedPage < totalPages,
    hasPrev: parsedPage > 1
  };
};

const createNotification = async ({ userId, type = 'SYSTEM', title, message, metadata = null }) => {
  initializeInMemoryNotifications();
  const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const notif = {
    id,
    userId,
    type,
    title,
    message,
    metadata: metadata || null,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const created = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          metadata: metadata || null,
          isRead: false
        }
      });
      inMemoryNotifications.set(created.id, { ...notif, id: created.id });
      return created;
    } catch (err) {
      console.warn('[NotifRepo] Prisma create failed:', err.message);
    }
  }

  inMemoryNotifications.set(id, notif);
  return notif;
};

const markNotificationAsRead = async (id, userId) => {
  initializeInMemoryNotifications();
  const dbStatus = await checkDatabaseConnection();

  let target = null;
  if (dbStatus.isConnected && prisma) {
    try {
      target = await prisma.notification.findUnique({ where: { id } });
    } catch (err) {
      console.warn('[NotifRepo] Prisma findUnique failed:', err.message);
    }
  }

  if (!target) {
    target = inMemoryNotifications.get(id);
  }

  if (!target) {
    return { error: 'NOT_FOUND', code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' };
  }

  // Strictly enforce that users can only access and modify their own notifications
  if (target.userId !== userId) {
    return {
      error: 'FORBIDDEN',
      code: 'FORBIDDEN_OWNERSHIP',
      message: 'Access denied. You can only modify your own notifications.'
    };
  }

  // Update in DB if connected
  let updated = null;
  if (dbStatus.isConnected && prisma) {
    try {
      updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true, updatedAt: new Date() }
      });
    } catch (err) {
      console.warn('[NotifRepo] Prisma markRead update failed:', err.message);
    }
  }

  // Update in memory
  const memNotif = inMemoryNotifications.get(id) || target;
  memNotif.isRead = true;
  memNotif.updatedAt = new Date();
  inMemoryNotifications.set(id, memNotif);

  return { success: true, data: updated || memNotif };
};

const markAllNotificationsAsRead = async (userId) => {
  initializeInMemoryNotifications();
  const dbStatus = await checkDatabaseConnection();

  let updatedCount = 0;

  if (dbStatus.isConnected && prisma) {
    try {
      const res = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, updatedAt: new Date() }
      });
      updatedCount = res.count;
    } catch (err) {
      console.warn('[NotifRepo] Prisma markAllRead failed:', err.message);
    }
  }

  // Update memory store
  for (const [id, notif] of inMemoryNotifications.entries()) {
    if (notif.userId === userId && !notif.isRead) {
      notif.isRead = true;
      notif.updatedAt = new Date();
      inMemoryNotifications.set(id, notif);
      if (!dbStatus.isConnected) {
        updatedCount++;
      }
    }
  }

  return { success: true, count: updatedCount };
};

module.exports = {
  getUserNotifications,
  getUserNotificationsPaginated,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
