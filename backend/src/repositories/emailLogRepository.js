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
          { messageId: { contains: q, mode: 'insensitive' } }
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
      (l.messageId && l.messageId.toLowerCase().includes(q))
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
  getDistinctTemplates,
  inMemoryEmailLogs
};
