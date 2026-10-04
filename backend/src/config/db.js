const { PrismaClient } = require('@prisma/client');
const env = require('./env');

let prisma;

try {
  const basePrisma = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    errorFormat: 'pretty'
  });

  prisma = basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const writeOps = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
          if (writeOps.includes(operation)) {
            console.log('\n========================================');
            console.log('DATABASE WRITE');
            console.log(`MODEL:      ${model}`);
            console.log(`OPERATION:  ${operation}`);
            console.log(`RECORD ID:  ${args?.where?.id || args?.data?.id || 'N/A'}`);
            if (model === 'Submission' && args?.data?.status) {
              console.log(`NEW STATUS: ${args.data.status}`);
            }
            if (model === 'User' && (args?.data?.email || args?.create?.email)) {
              console.log(`EMAIL:      ${args.data?.email || args.create?.email}`);
            }
            console.log(`ARGS:       ${JSON.stringify({ where: args?.where, data: args?.data }, null, 2)}`);
            console.log(`TIMESTAMP:  ${new Date().toISOString()}`);
            console.log('========================================\n');
          }
          return query(args);
        }
      }
    }
  });
} catch (error) {
  console.error('[Database] Failed to instantiate PrismaClient:', error.message);
}

/**
 * Perform a non-throwing check on PostgreSQL database connectivity
 * @returns {Promise<{isConnected: boolean, latencyMs: number|null, message: string, schemaDetails: object}>}
 */
const checkDatabaseConnection = async () => {
  const result = {
    isConnected: false,
    latencyMs: null,
    message: 'PostgreSQL connection not verified',
    configuredUrl: env.DATABASE_URL ? env.DATABASE_URL.replace(/:[^:@]*@/, ':****@') : 'Not configured',
    models: ['User', 'SocialAccount', 'Submission', 'Review', 'Notification'],
    enums: ['Role', 'UserStatus', 'Platform', 'ActionType', 'SubmissionStatus', 'NotificationType']
  };

  if (!prisma) {
    result.message = 'Prisma client instance unavailable';
    return result;
  }

  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.latencyMs = Date.now() - startTime;
    result.isConnected = true;
    result.message = 'PostgreSQL database connected and responsive';
  } catch (error) {
    result.latencyMs = Date.now() - startTime;
    result.isConnected = false;
    result.message = `Database connection awaiting PostgreSQL: ${error.message.split('\n')[0]}`;
  }

  return result;
};

// Graceful cleanup on server stop
const disconnectDatabase = async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('[Database] Prisma client disconnected.');
  }
};

module.exports = {
  prisma,
  checkDatabaseConnection,
  disconnectDatabase
};
