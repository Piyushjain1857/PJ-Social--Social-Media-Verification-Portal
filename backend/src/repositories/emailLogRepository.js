const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory fallback if database connection is unavailable
const inMemoryEmailLogs = [];

/**
 * Creates an EmailLog entry
 */
const createEmailLog = async (data) => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      return await prisma.emailLog.create({
        data: {
          recipient: data.recipient,
          subject: data.subject,
          template: data.template || 'GENERAL',
          status: data.status || 'PENDING',
          messageId: data.messageId || null,
          entityId: data.entityId || null,
          error: data.error || null,
          sentAt: data.sentAt || null,
        }
      });
    } catch (err) {
      console.warn('[EmailLogRepo] Prisma create failed, falling back to memory:', err.message);
    }
  }

  const logRecord = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recipient: data.recipient,
    subject: data.subject,
    template: data.template || 'GENERAL',
    status: data.status || 'PENDING',
    messageId: data.messageId || null,
    entityId: data.entityId || null,
    error: data.error || null,
    sentAt: data.sentAt || null,
    createdAt: new Date()
  };
  inMemoryEmailLogs.unshift(logRecord);
  return logRecord;
};

/**
 * Updates an EmailLog entry (e.g. from PENDING to SENT or FAILED)
 */
const updateEmailLog = async (id, data) => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      return await prisma.emailLog.update({
        where: { id },
        data: {
          status: data.status,
          messageId: data.messageId !== undefined ? data.messageId : undefined,
          entityId: data.entityId !== undefined ? data.entityId : undefined,
          error: data.error !== undefined ? data.error : undefined,
          sentAt: data.sentAt !== undefined ? data.sentAt : undefined
        }
      });
    } catch (err) {
      console.warn('[EmailLogRepo] Prisma update failed, falling back to memory:', err.message);
    }
  }

  const index = inMemoryEmailLogs.findIndex(l => l.id === id);
  if (index !== -1) {
    inMemoryEmailLogs[index] = {
      ...inMemoryEmailLogs[index],
      ...data
    };
    return inMemoryEmailLogs[index];
  }
  return null;
};

/**
 * Retrieves paginated, searchable, and filtered email logs
 */
const getEmailLogs = async ({
  page = 1,
  limit = 10,
  search,
  status,
  template,
  startDate,
  endDate,
  dateFrom,
  dateTo
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      const where = {};

      if (status && status.toUpperCase() !== 'ALL') {
        where.status = status.toUpperCase();
      }

      if (template && template.toUpperCase() !== 'ALL') {
        where.template = template.toUpperCase();
      }

      if (search && search.trim()) {
        const q = search.trim();
        where.OR = [
          { recipient: { contains: q, mode: 'insensitive' } },
          { subject: { contains: q, mode: 'insensitive' } },
          { template: { contains: q, mode: 'insensitive' } },
          { messageId: { contains: q, mode: 'insensitive' } },
          { entityId: { contains: q, mode: 'insensitive' } }
        ];
      }

      const fromDateStr = startDate || dateFrom;
      const toDateStr = endDate || dateTo;

      if (fromDateStr) {
        const from = new Date(fromDateStr);
        if (!isNaN(from.getTime())) {
          from.setHours(0, 0, 0, 0);
          where.createdAt = { ...(where.createdAt || {}), gte: from };
        }
      }

      if (toDateStr) {
        const to = new Date(toDateStr);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          where.createdAt = { ...(where.createdAt || {}), lte: to };
        }
      }

      const totalCount = await prisma.emailLog.count({ where });
      const records = await prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      });

      return {
        count: records.length,
        data: records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum) || 1
        }
      };
    } catch (err) {
      console.warn('[EmailLogRepo] Prisma getEmailLogs failed, using memory fallback:', err.message);
    }
  }

  // In-memory fallback
  let filtered = [...inMemoryEmailLogs];

  if (status && status.toUpperCase() !== 'ALL') {
    filtered = filtered.filter(l => l.status === status.toUpperCase());
  }

  if (template && template.toUpperCase() !== 'ALL') {
    filtered = filtered.filter(l => l.template.toUpperCase() === template.toUpperCase());
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(l =>
      (l.recipient && l.recipient.toLowerCase().includes(q)) ||
      (l.subject && l.subject.toLowerCase().includes(q)) ||
      (l.template && l.template.toLowerCase().includes(q)) ||
      (l.messageId && l.messageId.toLowerCase().includes(q)) ||
      (l.entityId && l.entityId.toLowerCase().includes(q))
    );
  }

  const fromDateStr = startDate || dateFrom;
  const toDateStr = endDate || dateTo;

  if (fromDateStr) {
    const from = new Date(fromDateStr);
    if (!isNaN(from.getTime())) {
      filtered = filtered.filter(l => new Date(l.createdAt) >= from);
    }
  }

  if (toDateStr) {
    const to = new Date(toDateStr);
    if (!isNaN(to.getTime())) {
      filtered = filtered.filter(l => new Date(l.createdAt) <= to);
    }
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalCount = filtered.length;
  const paginated = filtered.slice(skip, skip + limitNum);

  return {
    count: paginated.length,
    data: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum) || 1
    }
  };
};

/**
 * Checks whether an email for this recipient and template/entity has already been sent or is pending
 * Used to prevent duplicate emails when APIs or actions are retried.
 */
const hasSentEmail = async ({ recipient, template, entityId, subjectContains }) => {
  const normRecipient = (recipient || '').trim().toLowerCase();
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      const where = {
        recipient: { equals: normRecipient, mode: 'insensitive' },
        status: { in: ['SENT', 'PENDING'] }
      };
      if (template) {
        where.template = template;
      }
      if (entityId) {
        where.entityId = entityId;
      }
      if (subjectContains) {
        where.subject = { contains: subjectContains, mode: 'insensitive' };
      }
      const existing = await prisma.emailLog.findFirst({ where });
      return Boolean(existing);
    } catch (err) {
      console.warn('[EmailLogRepo] hasSentEmail query failed:', err.message);
    }
  }

  // Memory fallback
  return inMemoryEmailLogs.some(l => 
    l.recipient && l.recipient.toLowerCase() === normRecipient &&
    (l.status === 'SENT' || l.status === 'PENDING') &&
    (!template || l.template === template) &&
    (!entityId || l.entityId === entityId) &&
    (!subjectContains || (l.subject && l.subject.toLowerCase().includes(subjectContains.toLowerCase())))
  );
};

/**
 * Retrieve high-level delivery metrics (Today, Week, Month, Status breakdown, Success rate)
 */
const getEmailMetrics = async () => {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      const [
        total,
        successful,
        failed,
        pending,
        sentToday,
        sentThisWeek,
        sentThisMonth
      ] = await Promise.all([
        prisma.emailLog.count(),
        prisma.emailLog.count({ where: { status: 'SENT' } }),
        prisma.emailLog.count({ where: { status: 'FAILED' } }),
        prisma.emailLog.count({ where: { status: 'PENDING' } }),
        prisma.emailLog.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.emailLog.count({ where: { createdAt: { gte: startOfWeek } } }),
        prisma.emailLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      ]);

      const finished = successful + failed;
      const successRate = finished > 0 ? Number(((successful / finished) * 100).toFixed(1)) : 100.0;

      return {
        sentToday,
        sentThisWeek,
        sentThisMonth,
        successful,
        failed,
        pending,
        total,
        deliverySuccessRate: successRate
      };
    } catch (err) {
      console.warn('[EmailLogRepo] Prisma getEmailMetrics failed, falling back to memory:', err.message);
    }
  }

  // In-memory fallback
  const total = inMemoryEmailLogs.length;
  const successful = inMemoryEmailLogs.filter(l => l.status === 'SENT').length;
  const failed = inMemoryEmailLogs.filter(l => l.status === 'FAILED').length;
  const pending = inMemoryEmailLogs.filter(l => l.status === 'PENDING').length;
  const sentToday = inMemoryEmailLogs.filter(l => new Date(l.createdAt) >= startOfToday).length;
  const sentThisWeek = inMemoryEmailLogs.filter(l => new Date(l.createdAt) >= startOfWeek).length;
  const sentThisMonth = inMemoryEmailLogs.filter(l => new Date(l.createdAt) >= startOfMonth).length;

  const finished = successful + failed;
  const successRate = finished > 0 ? Number(((successful / finished) * 100).toFixed(1)) : 100.0;

  return {
    sentToday,
    sentThisWeek,
    sentThisMonth,
    successful,
    failed,
    pending,
    total,
    deliverySuccessRate: successRate
  };
};

/**
 * Retrieve comprehensive time-series and categorical analytics
 */
const getEmailAnalytics = async (days = 14) => {
  const daysNum = Math.min(30, Math.max(7, parseInt(days, 10) || 14));
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysNum);
  sinceDate.setHours(0, 0, 0, 0);

  let logs = [];
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      logs = await prisma.emailLog.findMany({
        where: { createdAt: { gte: sinceDate } },
        orderBy: { createdAt: 'asc' }
      });
    } catch (err) {
      console.warn('[EmailLogRepo] Prisma getEmailAnalytics query failed:', err.message);
    }
  }

  if (logs.length === 0 && inMemoryEmailLogs.length > 0) {
    logs = inMemoryEmailLogs.filter(l => new Date(l.createdAt) >= sinceDate);
  }

  // 1. Daily time-series breakdown
  const dailyMap = new Map();
  for (let i = daysNum - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    dailyMap.set(dateKey, { date: dateKey, sent: 0, failed: 0, pending: 0, total: 0 });
  }

  logs.forEach(log => {
    const dateKey = new Date(log.createdAt).toISOString().split('T')[0];
    if (dailyMap.has(dateKey)) {
      const entry = dailyMap.get(dateKey);
      entry.total++;
      if (log.status === 'SENT') entry.sent++;
      else if (log.status === 'FAILED') entry.failed++;
      else if (log.status === 'PENDING') entry.pending++;
    }
  });

  const daily = Array.from(dailyMap.values());

  // 2. Template breakdown
  const templateMap = new Map();
  logs.forEach(log => {
    const t = log.template || 'UNKNOWN';
    if (!templateMap.has(t)) {
      templateMap.set(t, { template: t, count: 0, sent: 0, failed: 0 });
    }
    const item = templateMap.get(t);
    item.count++;
    if (log.status === 'SENT') item.sent++;
    if (log.status === 'FAILED') item.failed++;
  });
  const byTemplate = Array.from(templateMap.values()).sort((a, b) => b.count - a.count);

  // 3. Event category breakdown
  const categoryMap = {
    SECURITY: 0,
    ACTIVITY: 0,
    GAMIFICATION: 0,
    SYSTEM: 0
  };

  logs.forEach(log => {
    const t = (log.template || '').toUpperCase();
    if (t.includes('PASSWORD') || t.includes('LOGIN') || t.includes('ACCOUNT') || t.includes('EMAIL_CHANGED')) {
      categoryMap.SECURITY++;
    } else if (t.includes('SUBMISSION') || t.includes('CLARIFICATION')) {
      categoryMap.ACTIVITY++;
    } else if (t.includes('XP') || t.includes('LEVEL') || t.includes('POINT')) {
      categoryMap.GAMIFICATION++;
    } else {
      categoryMap.SYSTEM++;
    }
  });

  const byCategory = Object.entries(categoryMap).map(([category, count]) => ({
    category,
    count
  }));

  // 4. Overall status counts in this window
  const totalWindow = logs.length;
  const sentWindow = logs.filter(l => l.status === 'SENT').length;
  const failedWindow = logs.filter(l => l.status === 'FAILED').length;
  const pendingWindow = logs.filter(l => l.status === 'PENDING').length;
  const windowSuccessRate = (sentWindow + failedWindow) > 0
    ? Number(((sentWindow / (sentWindow + failedWindow)) * 100).toFixed(1))
    : 100.0;

  return {
    timeframeDays: daysNum,
    daily,
    byTemplate,
    byCategory,
    summary: {
      total: totalWindow,
      sent: sentWindow,
      failed: failedWindow,
      pending: pendingWindow,
      successRate: windowSuccessRate
    }
  };
};

/**
 * Get single EmailLog by ID with secrets safely redacted
 */
const getEmailLogById = async (id) => {
  if (!id) return null;

  let record = null;
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      record = await prisma.emailLog.findUnique({ where: { id } });
    } catch (err) {
      console.warn('[EmailLogRepo] Prisma getEmailLogById query failed:', err.message);
    }
  }

  if (!record) {
    record = inMemoryEmailLogs.find(l => l.id === id);
  }

  if (!record) return null;

  // Sanitize any potential secret strings in error message
  const sanitizedError = record.error
    ? record.error
        .replace(/(password|pass|secret|token|key)[:=]\s*([^\s,;]+)/gi, '$1: [REDACTED]')
        .replace(/auth:\s*\{[^}]*\}/gi, 'auth: [REDACTED]')
    : null;

  return {
    id: record.id,
    recipient: record.recipient,
    subject: record.subject,
    template: record.template,
    status: record.status,
    messageId: record.messageId,
    entityId: record.entityId,
    error: sanitizedError,
    sentAt: record.sentAt,
    createdAt: record.createdAt
  };
};

/**
 * Retrieve failed email logs for the Failed Emails tab
 */
const getFailedEmailLogs = async ({ page = 1, limit = 10, search = '' } = {}) => {
  return await getEmailLogs({
    page,
    limit,
    search,
    status: 'FAILED'
  });
};

/**
 * Get distinct email templates used
 */
const getDistinctTemplates = async () => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailLog) {
    try {
      const records = await prisma.emailLog.findMany({
        select: { template: true },
        distinct: ['template']
      });
      return records.map(r => r.template);
    } catch (err) {
      // fallback
    }
  }

  const templates = new Set(inMemoryEmailLogs.map(l => l.template));
  return Array.from(templates);
};

module.exports = {
  createEmailLog,
  updateEmailLog,
  getEmailLogs,
  hasSentEmail,
  getDistinctTemplates,
  getEmailMetrics,
  getEmailAnalytics,
  getEmailLogById,
  getFailedEmailLogs,
  inMemoryEmailLogs
};

