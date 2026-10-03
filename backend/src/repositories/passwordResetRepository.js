const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory fallback
const inMemoryResetTokens = [];

/**
 * Creates a hashed password reset token, invalidating existing unused tokens for this user
 */
const createResetToken = async ({ userId, tokenHash, expiresAt }) => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.passwordResetToken) {
    try {
      // Invalidate previous tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId }
      }).catch(() => null);

      return await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt
        }
      });
    } catch (err) {
      console.warn('[PasswordResetRepo] Prisma create failed, falling back to memory:', err.message);
    }
  }

  // In-memory fallback
  for (let i = inMemoryResetTokens.length - 1; i >= 0; i--) {
    if (inMemoryResetTokens[i].userId === userId) {
      inMemoryResetTokens.splice(i, 1);
    }
  }

  const record = {
    id: `prt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    tokenHash,
    expiresAt,
    usedAt: null,
    createdAt: new Date()
  };
  inMemoryResetTokens.push(record);
  return record;
};

/**
 * Finds a token by hash
 */
const findTokenByHash = async (tokenHash) => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.passwordResetToken) {
    try {
      return await prisma.passwordResetToken.findUnique({
        where: { tokenHash }
      });
    } catch (err) {
      console.warn('[PasswordResetRepo] Prisma findUnique failed, checking memory:', err.message);
    }
  }

  return inMemoryResetTokens.find(t => t.tokenHash === tokenHash) || null;
};

/**
 * Marks token as used
 */
const markTokenUsed = async (id) => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.passwordResetToken) {
    try {
      return await prisma.passwordResetToken.update({
        where: { id },
        data: { usedAt: new Date() }
      });
    } catch (err) {
      console.warn('[PasswordResetRepo] Prisma update failed:', err.message);
    }
  }

  const token = inMemoryResetTokens.find(t => t.id === id);
  if (token) {
    token.usedAt = new Date();
    return token;
  }
  return null;
};

module.exports = {
  createResetToken,
  findTokenByHash,
  markTokenUsed,
  inMemoryResetTokens
};
