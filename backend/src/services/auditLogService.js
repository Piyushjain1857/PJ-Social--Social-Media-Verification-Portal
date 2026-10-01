const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory store for fallback
const inMemoryAuditLogs = [];

/**
 * Record an auditable governance action in the system
 * @param {Object} params
 * @param {string} params.actor - Actor email or user ID
 * @param {string} params.action - Action identifier (e.g. LEVEL_CREATED, LEVEL_UPDATED, LEVEL_DEACTIVATED)
 * @param {string} params.entity - Entity name (e.g. Level)
 * @param {string} [params.entityId] - Target entity identifier
 * @param {string} params.details - Human readable description
 * @param {Object} [params.metadata] - Extra contextual metadata
 */
const recordAuditLog = async ({
  actor,
  action,
  entity,
  entityId = null,
  details,
  metadata = null
}) => {
  const logEntry = {
    id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    actor: actor || 'system',
    action,
    entity,
    entityId: entityId ? String(entityId) : null,
    details,
    metadata: metadata || null,
    timestamp: new Date()
  };

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const record = await prisma.auditLog.create({
        data: {
          actor: logEntry.actor,
          action: logEntry.action,
          entity: logEntry.entity,
          entityId: logEntry.entityId,
          details: logEntry.details,
          metadata: logEntry.metadata
        }
      });
      return record;
    } catch (err) {
      console.warn('[AuditLogService] DB write failed, using memory fallback:', err.message);
    }
  }

  inMemoryAuditLogs.unshift(logEntry);
  return logEntry;
};

/**
 * Fetch all audit logs (with pagination and filtering)
 */
const getAuditLogs = async (options = {}) => {
  const { limit = 50, page = 1, entity, action } = options;
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const where = {};
      if (entity) where.entity = entity;
      if (action) where.action = action;

      const [records, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take
        }),
        prisma.auditLog.count({ where })
      ]);

      return {
        records,
        totalCount,
        page: parseInt(page, 10) || 1,
        limit: take,
        totalPages: Math.ceil(totalCount / take) || 1
      };
    } catch (err) {
      console.warn('[AuditLogService] DB query failed, falling back:', err.message);
    }
  }

  let filtered = [...inMemoryAuditLogs];
  if (entity) filtered = filtered.filter(l => l.entity === entity);
  if (action) filtered = filtered.filter(l => l.action === action);

  const totalCount = filtered.length;
  const records = filtered.slice(skip, skip + take);

  return {
    records,
    totalCount,
    page: parseInt(page, 10) || 1,
    limit: take,
    totalPages: Math.ceil(totalCount / take) || 1
  };
};

module.exports = {
  recordAuditLog,
  getAuditLogs
};
