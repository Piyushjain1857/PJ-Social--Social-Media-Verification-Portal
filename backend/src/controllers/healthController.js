const { checkDatabaseConnection } = require('../config/db');
const env = require('../config/env');

const getHealthStatus = async (req, res) => {
  const dbCheck = await checkDatabaseConnection();

  const healthData = {
    status: 'healthy',
    service: 'Social Media Activity Verification Portal API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbCheck.isConnected ? 'connected' : 'awaiting_connection',
      isConnected: dbCheck.isConnected,
      latencyMs: dbCheck.latencyMs,
      message: dbCheck.message,
      models: dbCheck.models,
      enums: dbCheck.enums
    },
    roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    endpoints: {
      health: '/api/health',
      database: '/api/database/status',
      docs: '/api/info'
    }
  };

  return res.status(200).json({
    success: true,
    data: healthData
  });
};

const getDatabaseStatus = async (req, res) => {
  const dbCheck = await checkDatabaseConnection();

  res.status(200).json({
    success: true,
    data: {
      ...dbCheck,
      provider: 'postgresql',
      orm: 'prisma',
      schemaModels: {
        User: {
          fields: ['id', 'name', 'email', 'password', 'role', 'status', 'createdAt', 'updatedAt'],
          relations: ['socialAccounts', 'submissions', 'reviews', 'notifications']
        },
        SocialAccount: {
          fields: ['id', 'userId', 'platform', 'handle', 'profileUrl', 'isVerified', 'createdAt', 'updatedAt'],
          relations: ['user', 'submissions']
        },
        Submission: {
          fields: ['id', 'userId', 'socialAccountId', 'platform', 'actionType', 'postUrl', 'screenshotUrl', 'description', 'status', 'createdAt', 'updatedAt'],
          relations: ['user', 'socialAccount', 'reviews']
        },
        Review: {
          fields: ['id', 'submissionId', 'adminId', 'status', 'feedback', 'createdAt', 'updatedAt'],
          relations: ['submission', 'admin']
        },
        Notification: {
          fields: ['id', 'userId', 'type', 'title', 'message', 'isRead', 'metadata', 'createdAt', 'updatedAt'],
          relations: ['user']
        }
      }
    }
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
  getDatabaseStatus,
  getPortalInfo
};
