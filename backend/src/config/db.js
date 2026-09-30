const { PrismaClient } = require('@prisma/client');

let prisma;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });
} catch (error) {
  console.warn('PrismaClient initialization warning:', error.message);
}

module.exports = prisma;
