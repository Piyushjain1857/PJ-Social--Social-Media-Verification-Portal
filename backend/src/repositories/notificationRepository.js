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

const createNotification = async ({ userId, type = 'SYSTEM', title, message }) => {
  initializeInMemoryNotifications();
  const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const notif = {
    id,
    userId,
    type,
    title,
    message,
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

module.exports = {
  getUserNotifications,
  createNotification
};
