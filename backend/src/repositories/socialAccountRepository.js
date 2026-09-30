const { prisma, checkDatabaseConnection } = require('../config/db');

const inMemoryAccounts = new Map();

const initializeInMemoryAccounts = async () => {
  if (inMemoryAccounts.size > 0) return;

  const defaultAccounts = [
    {
      id: 'soc-official-001',
      platform: 'INSTAGRAM',
      name: 'K.R. Mangalam University Official Instagram',
      handle: '@apex_university',
      accountUrl: 'https://instagram.com/apex_university',
      profileUrl: 'https://instagram.com/apex_university',
      description: 'Official verified Instagram channel for university-wide announcements, campus life, and student engagement.',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z')
    },
    {
      id: 'soc-official-002',
      platform: 'LINKEDIN',
      name: 'K.R. Mangalam University Official LinkedIn Page',
      handle: 'apex-university',
      accountUrl: 'https://linkedin.com/school/apex-university',
      profileUrl: 'https://linkedin.com/school/apex-university',
      description: 'Official LinkedIn institutional page for academic achievements, research publications, and career updates.',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2026-01-05T00:00:00Z'),
      updatedAt: new Date('2026-01-05T00:00:00Z')
    },
    {
      id: 'soc-official-003',
      platform: 'FACEBOOK',
      name: 'K.R. Mangalam University Official Facebook',
      handle: 'apexuniversity',
      accountUrl: 'https://facebook.com/apexuniversity',
      profileUrl: 'https://facebook.com/apexuniversity',
      description: 'Official Facebook community page for students, alumni, parents, and community engagement.',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2026-01-10T00:00:00Z'),
      updatedAt: new Date('2026-01-10T00:00:00Z')
    }
  ];

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const existing = await prisma.socialAccount.findMany();
      if (existing.length === 0) {
        for (const acc of defaultAccounts) {
          await prisma.socialAccount.create({
            data: {
              id: acc.id,
              platform: acc.platform,
              name: acc.name,
              handle: acc.handle,
              accountUrl: acc.accountUrl,
              profileUrl: acc.profileUrl,
              description: acc.description,
              isActive: acc.isActive,
              isVerified: acc.isVerified
            }
          });
        }
      }
    } catch (err) {
      console.warn('[SocialRepo] Failed to seed default official accounts in DB:', err.message);
    }
  }

  defaultAccounts.forEach(a => inMemoryAccounts.set(a.id, a));
};

// Initialize immediately
initializeInMemoryAccounts();

/**
 * Get all official accounts (with submission counts)
 */
const getAllOfficialAccounts = async () => {
  await initializeInMemoryAccounts();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const accounts = await prisma.socialAccount.findMany({
        include: {
          _count: {
            select: { submissions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (accounts && accounts.length > 0) {
        return accounts.map(a => ({
          id: a.id,
          platform: a.platform,
          name: a.name || a.handle,
          handle: a.handle,
          accountUrl: a.accountUrl || a.profileUrl,
          profileUrl: a.profileUrl || a.accountUrl,
          description: a.description || '',
          isActive: a.isActive,
          isVerified: a.isVerified,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          submissionsCount: a._count?.submissions || 0
        }));
      }
    } catch (err) {
      console.warn('[SocialRepo] Prisma getAllOfficialAccounts failed, using memory store:', err.message);
    }
  }

  return Array.from(inMemoryAccounts.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(a => ({
      ...a,
      submissionsCount: 0
    }));
};

/**
 * Get only active official accounts for submission creation
 */
const getActiveOfficialAccounts = async (platformFilter = null) => {
  await initializeInMemoryAccounts();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const where = { isActive: true };
      if (platformFilter) {
        where.platform = platformFilter.toUpperCase();
      }
      const active = await prisma.socialAccount.findMany({
        where,
        orderBy: { platform: 'asc' }
      });
      if (active && active.length > 0) {
        return active.map(a => ({
          id: a.id,
          platform: a.platform,
          name: a.name || a.handle,
          handle: a.handle,
          accountUrl: a.accountUrl || a.profileUrl,
          description: a.description,
          isActive: a.isActive,
          isVerified: a.isVerified
        }));
      }
    } catch (err) {
      console.warn('[SocialRepo] Prisma getActiveOfficialAccounts failed:', err.message);
    }
  }

  return Array.from(inMemoryAccounts.values())
    .filter(a => a.isActive && (!platformFilter || a.platform === platformFilter.toUpperCase()))
    .map(a => ({
      id: a.id,
      platform: a.platform,
      name: a.name || a.handle,
      handle: a.handle,
      accountUrl: a.accountUrl || a.profileUrl,
      description: a.description,
      isActive: a.isActive,
      isVerified: a.isVerified
    }));
};

/**
 * Find account by ID
 */
const getOfficialAccountById = async (id) => {
  await initializeInMemoryAccounts();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const account = await prisma.socialAccount.findUnique({
        where: { id },
        include: {
          submissions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, actionType: true, status: true, createdAt: true }
          },
          _count: {
            select: { submissions: true }
          }
        }
      });
      if (account) {
        return {
          id: account.id,
          platform: account.platform,
          name: account.name || account.handle,
          handle: account.handle,
          accountUrl: account.accountUrl || account.profileUrl,
          profileUrl: account.profileUrl || account.accountUrl,
          description: account.description || '',
          isActive: account.isActive,
          isVerified: account.isVerified,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
          submissions: account.submissions || [],
          submissionsCount: account._count?.submissions || 0
        };
      }
    } catch (err) {
      console.warn('[SocialRepo] Prisma getOfficialAccountById failed:', err.message);
    }
  }

  const mem = inMemoryAccounts.get(id);
  if (mem) {
    return {
      ...mem,
      submissions: [],
      submissionsCount: 0
    };
  }
  return null;
};

/**
 * Create a new official social account
 */
const createOfficialAccount = async ({
  name,
  platform,
  accountUrl,
  handle,
  description = '',
  isActive = true
}) => {
  await initializeInMemoryAccounts();
  const id = `soc-official-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanUrl = accountUrl.trim();
  const cleanHandle = handle.trim();
  const cleanName = name.trim();

  const accountData = {
    id,
    platform: platform.toUpperCase(),
    name: cleanName,
    handle: cleanHandle,
    accountUrl: cleanUrl,
    profileUrl: cleanUrl,
    description: description.trim(),
    isActive: Boolean(isActive),
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const created = await prisma.socialAccount.create({
        data: {
          id: accountData.id,
          platform: accountData.platform,
          name: accountData.name,
          handle: accountData.handle,
          accountUrl: accountData.accountUrl,
          profileUrl: accountData.profileUrl,
          description: accountData.description,
          isActive: accountData.isActive,
          isVerified: true
        }
      });
      inMemoryAccounts.set(created.id, { ...accountData, id: created.id });
      return created;
    } catch (err) {
      console.warn('[SocialRepo] Prisma createOfficialAccount failed, saving to memory store:', err.message);
    }
  }

  inMemoryAccounts.set(id, accountData);
  return accountData;
};

/**
 * Update an official social account
 */
const updateOfficialAccount = async (id, updates = {}) => {
  await initializeInMemoryAccounts();
  const dbStatus = await checkDatabaseConnection();

  const dataToUpdate = {};
  if (updates.name !== undefined) dataToUpdate.name = updates.name.trim();
  if (updates.platform !== undefined) dataToUpdate.platform = updates.platform.toUpperCase();
  if (updates.handle !== undefined) dataToUpdate.handle = updates.handle.trim();
  if (updates.accountUrl !== undefined) {
    dataToUpdate.accountUrl = updates.accountUrl.trim();
    dataToUpdate.profileUrl = updates.accountUrl.trim();
  }
  if (updates.description !== undefined) dataToUpdate.description = updates.description.trim();
  if (updates.isActive !== undefined) dataToUpdate.isActive = Boolean(updates.isActive);

  let prismaUpdated = null;
  if (dbStatus.isConnected && prisma) {
    try {
      prismaUpdated = await prisma.socialAccount.update({
        where: { id },
        data: dataToUpdate
      });
    } catch (err) {
      console.warn('[SocialRepo] Prisma updateOfficialAccount failed:', err.message);
    }
  }

  const mem = inMemoryAccounts.get(id);
  if (mem) {
    const updatedMem = {
      ...mem,
      ...dataToUpdate,
      updatedAt: new Date()
    };
    inMemoryAccounts.set(id, updatedMem);
    return prismaUpdated || updatedMem;
  }

  return prismaUpdated;
};

/**
 * Update account active status
 */
const updateOfficialAccountStatus = async (id, isActive) => {
  return await updateOfficialAccount(id, { isActive });
};

/**
 * Delete official account
 */
const deleteOfficialAccount = async (id) => {
  await initializeInMemoryAccounts();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      await prisma.socialAccount.delete({
        where: { id }
      });
    } catch (err) {
      console.warn('[SocialRepo] Prisma deleteOfficialAccount failed:', err.message);
    }
  }

  inMemoryAccounts.delete(id);
  return true;
};

module.exports = {
  getAllOfficialAccounts,
  getActiveOfficialAccounts,
  getOfficialAccountById,
  createOfficialAccount,
  updateOfficialAccount,
  updateOfficialAccountStatus,
  deleteOfficialAccount
};
