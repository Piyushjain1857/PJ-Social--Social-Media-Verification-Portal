const prisma = require('../config/db');
const env = require('../config/env');

const getHealthStatus = async (req, res) => {
  let dbStatus = 'disconnected';
  let dbLatencyMs = null;

  if (prisma && typeof prisma.$queryRaw === 'function') {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = `offline (${err.message.slice(0, 50)}...)`;
    }
  } else {
    dbStatus = 'uninitialized (run prisma generate & start PostgreSQL)';
  }

  const healthData = {
    status: 'healthy',
    service: 'Social Media Activity Verification Portal API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    endpoints: {
      health: '/api/health',
      docs: '/api/info'
    }
  };

  return res.status(200).json({
    success: true,
    data: healthData
  });
};

const getPortalInfo = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      portalName: 'Social Media Activity Verification Portal',
      description: 'Role-based verification system for creator social campaigns and activities.',
      roles: {
        SUPER_ADMIN: 'Full platform administration, user management, policy rules, and metrics.',
        ADMIN: 'Verifies submissions, handles review disputes, and inspects activity proofs.',
        USER: 'Connects social accounts, submits campaign activity links, and tracks verification status.'
      }
    }
  });
};

module.exports = {
  getHealthStatus,
  getPortalInfo
};
