const { prisma, checkDatabaseConnection } = require('../config/db');

const inMemoryAccounts = new Map();

const initializeInMemoryAccounts = async () => {
  if (inMemoryAccounts.size > 0) return;

  const defaultAccounts = [
    {
      id: 'soc-official-001',
      platform: 'INSTAGRAM',
      name: 'K.R. Mangalam University Official Instagram',
      handle: '@krmuniv',
      accountUrl: 'https://www.instagram.com/krmuniv/?hl=en',
      profileUrl: 'https://www.instagram.com/krmuniv/?hl=en',
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
      handle: 'krmuniv',
      accountUrl: 'https://www.linkedin.com/school/krmuniv/posts/?feedView=all',
      profileUrl: 'https://www.linkedin.com/school/krmuniv/posts/?feedView=all',
      description: 'Official LinkedIn institutional page for academic achievements, research publications, and career updates.',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2026-01-05T00:00:00Z'),
      updatedAt: new Date('2026-01-05T00:00:00Z')
    },
    {
      id: 'soc-official-003',
      platform: 'FACEBOOK',
      name: 'K.R. Mangalam University Official Facebook Page',
      handle: 'krmuniv',
      accountUrl: 'https://www.facebook.com/krmuniv/',
      profileUrl: 'https://www.facebook.com/krmuniv/',
      description: 'Official Facebook community page for students, alumni, parents, and community engagement.',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2026-01-10T00:00:00Z'),
      updatedAt: new Date('2026-01-10T00:00:00Z')
    }
  ];



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
 * Get official accounts with server-side pagination, search, platform, status filtering, and sorting.
 */
const getOfficialAccountsPaginated = async (filters = {}) => {
  await initializeInMemoryAccounts();
  const dbStatus = await checkDatabaseConnection();

  const {
    page = 1,
    limit = 10,
    search = '',
    platform = 'ALL',
    status = 'ALL',
    startDate = null,
    endDate = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';

  const validSort = ['name', 'handle', 'platform', 'isActive', 'createdAt', 'updatedAt'];
  const sortField = validSort.includes(sortBy) ? sortBy : 'createdAt';
  const cleanSortOrder = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (dbStatus.isConnected && prisma) {
    try {
      const where = {};

      if (platform && platform !== 'ALL') {
        where.platform = platform.toUpperCase();
      }

      if (status && status !== 'ALL') {
        const wantActive = status.toUpperCase() === 'ACTIVE' || status === 'true';
        where.isActive = wantActive;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          const from = new Date(startDate);
          if (!isNaN(from.getTime())) {
            from.setHours(0, 0, 0, 0);
            where.createdAt.gte = from;
          }
        }
        if (endDate) {
          const to = new Date(endDate);
          if (!isNaN(to.getTime())) {
            to.setHours(23, 59, 59, 999);
            where.createdAt.lte = to;
          }
        }
      }

      if (trimmedSearch) {
        where.OR = [
          { name: { contains: trimmedSearch, mode: 'insensitive' } },
          { handle: { contains: trimmedSearch, mode: 'insensitive' } },
          { accountUrl: { contains: trimmedSearch, mode: 'insensitive' } },
          { profileUrl: { contains: trimmedSearch, mode: 'insensitive' } },
          { description: { contains: trimmedSearch, mode: 'insensitive' } }
        ];
      }

      const [totalCount, accounts] = await Promise.all([
        prisma.socialAccount.count({ where }),
        prisma.socialAccount.findMany({
          where,
          include: {
            _count: {
              select: { submissions: true }
            }
          },
          orderBy: { [sortField]: cleanSortOrder },
          skip,
          take: parsedLimit
        })
      ]);

      const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

      const records = accounts.map(a => ({
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

      return {
        records,
        totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasNext: parsedPage < totalPages,
        hasPrev: parsedPage > 1
      };
    } catch (err) {
      console.warn('[SocialRepo] Prisma getOfficialAccountsPaginated failed, falling back to memory store:', err.message);
    }
  }

  // In-Memory Fallback
  let memoryRecords = Array.from(inMemoryAccounts.values()).map(a => ({
    ...a,
    submissionsCount: 0
  }));

  if (platform && platform !== 'ALL') {
    memoryRecords = memoryRecords.filter(a => a.platform === platform.toUpperCase());
  }
  if (status && status !== 'ALL') {
    const wantActive = status.toUpperCase() === 'ACTIVE' || status === 'true';
    memoryRecords = memoryRecords.filter(a => a.isActive === wantActive);
  }
  if (startDate) {
    const from = new Date(startDate);
    if (!isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      memoryRecords = memoryRecords.filter(a => new Date(a.createdAt) >= from);
    }
  }
  if (endDate) {
    const to = new Date(endDate);
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      memoryRecords = memoryRecords.filter(a => new Date(a.createdAt) <= to);
    }
  }
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    memoryRecords = memoryRecords.filter(a =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.handle && a.handle.toLowerCase().includes(q)) ||
      (a.accountUrl && a.accountUrl.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  }

  memoryRecords.sort((a, b) => {
    let valA = a[sortField] || a.createdAt;
    let valB = b[sortField] || b.createdAt;
    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }
    if (cleanSortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  const totalCount = memoryRecords.length;
  const paginated = memoryRecords.slice(skip, skip + parsedLimit);
  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  return {
    records: paginated,
    totalCount,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    hasNext: parsedPage < totalPages,
    hasPrev: parsedPage > 1
  };
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
  getOfficialAccountsPaginated,
  getActiveOfficialAccounts,
  getOfficialAccountById,
  createOfficialAccount,
  updateOfficialAccount,
  updateOfficialAccountStatus,
  deleteOfficialAccount
};
