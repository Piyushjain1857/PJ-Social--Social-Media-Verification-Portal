const { prisma, checkDatabaseConnection } = require('../config/db');
const { hashPassword } = require('../utils/hash');

// Pre-seeded demo accounts with bcrypt-hashed passwords for development and offline testing
// Password for all three demo accounts is "Password123!" (or role-specific: SuperAdmin123!, Admin123!, User123!)
const inMemoryUsers = new Map();

const initializeInMemoryUsers = async () => {
  if (inMemoryUsers.size > 0) return;

  const superAdminHash = await hashPassword('SuperAdmin123!');
  const adminHash = await hashPassword('Admin123!');
  const userHash = await hashPassword('User123!');

  const defaultUsers = [
    {
      id: 'usr-superadmin-001',
      name: 'Eleanor Vance (Super Admin)',
      email: 'superadmin@portal.com',
      password: superAdminHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z')
    },
    {
      id: 'usr-admin-002',
      name: 'Marcus Brody (Admin Moderator)',
      email: 'admin@portal.com',
      password: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-15T00:00:00Z'),
      updatedAt: new Date('2026-01-15T00:00:00Z')
    },
    {
      id: 'usr-user-003',
      name: 'Sarah Connor (Creator)',
      email: 'user@portal.com',
      password: userHash,
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z')
    }
  ];

  defaultUsers.forEach(u => inMemoryUsers.set(u.email.toLowerCase(), u));
};

// Initialize immediately
initializeInMemoryUsers();

/**
 * Find user by email (checks PostgreSQL via Prisma if connected, falls back to memory store)
 */
const findUserByEmail = async (email) => {
  await initializeInMemoryUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      if (user) return user;
    } catch (err) {
      console.warn('[UserRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  return inMemoryUsers.get(normalizedEmail) || null;
};

/**
 * Find user by ID (checks PostgreSQL via Prisma if connected, falls back to memory store)
 */
const findUserById = async (id) => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      if (user) return user;
    } catch (err) {
      console.warn('[UserRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === id) return user;
  }

  return null;
};

/**
 * Create a new user (persists to PostgreSQL via Prisma if connected, and saves to memory store)
 */
const createUser = async ({ name, email, password, role = 'USER', status = 'ACTIVE' }) => {
  await initializeInMemoryUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const userData = {
    id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
    status,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const created = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          status: userData.status
        }
      });
      inMemoryUsers.set(normalizedEmail, created);
      return created;
    } catch (err) {
      console.warn('[UserRepo] Prisma user creation failed, saving to memory store:', err.message);
    }
  }

  inMemoryUsers.set(normalizedEmail, userData);
  return userData;
};

/**
 * Get all users (sanitized, excluding passwords)
 */
const getAllUsers = async () => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return users;
    } catch (err) {
      console.warn('[UserRepo] Prisma getAllUsers failed, falling back to memory store:', err.message);
    }
  }

  // Return sanitized in-memory users
  return Array.from(inMemoryUsers.values()).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));
};

/**
 * Get users with pagination, search, role and status filtering (excluding passwords)
 */
const getUsersPaginated = async ({
  page = 1,
  limit = 10,
  search = '',
  role = 'ALL',
  status = 'ALL',
  startDate = null,
  endDate = null,
  sortBy = 'createdAt',
  sortOrder = 'desc'
}) => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;
  const trimmedSearch = typeof search === 'string' ? search.trim().toLowerCase() : '';

  const validSortFields = ['name', 'email', 'role', 'status', 'createdAt', 'updatedAt'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const cleanSortOrder = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (dbStatus.isConnected && prisma) {
    try {
      const where = {};
      if (role && role !== 'ALL') {
        if (role === 'ADMINS') {
          where.role = { in: ['ADMIN', 'SUPER_ADMIN'] };
        } else if (role.includes(',')) {
          where.role = { in: role.split(',').map(r => r.trim()).filter(Boolean) };
        } else {
          where.role = role;
        }
      }
      if (status && status !== 'ALL') {
        where.status = status;
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
          { email: { contains: trimmedSearch, mode: 'insensitive' } }
        ];
      }

      const [totalCount, users, allUsers] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: parsedLimit,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                submissions: true,
                reviews: true
              }
            }
          },
          orderBy: { [sortField]: cleanSortOrder }
        }),
        // Global stats for quick metrics
        prisma.user.findMany({
          select: { role: true, status: true }
        })
      ]);

      const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

      const stats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.status === 'ACTIVE').length,
        inactive: allUsers.filter(u => u.status === 'INACTIVE').length,
        suspended: allUsers.filter(u => u.status === 'SUSPENDED').length,
        usersCount: allUsers.filter(u => u.role === 'USER').length,
        adminsCount: allUsers.filter(u => u.role === 'ADMIN').length,
        superAdminsCount: allUsers.filter(u => u.role === 'SUPER_ADMIN').length
      };

      const mappedUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        submissionsCount: u._count?.submissions || 0,
        reviewsCount: u._count?.reviews || 0
      }));

      return {
        users: mappedUsers,
        pagination: {
          totalCount,
          totalPages,
          currentPage: parsedPage,
          limit: parsedLimit,
          hasNextPage: parsedPage < totalPages,
          hasPrevPage: parsedPage > 1
        },
        stats
      };
    } catch (err) {
      console.warn('[UserRepo] Prisma getUsersPaginated failed, falling back to memory store:', err.message);
    }
  }

  // In-memory fallback
  const allUsersList = Array.from(inMemoryUsers.values());

  const filtered = allUsersList.filter(u => {
    const matchesSearch = !trimmedSearch ||
      u.name.toLowerCase().includes(trimmedSearch) ||
      u.email.toLowerCase().includes(trimmedSearch);

    let matchesRole = true;
    if (role && role !== 'ALL') {
      if (role === 'ADMINS') {
        matchesRole = u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
      } else if (role.includes(',')) {
        matchesRole = role.split(',').map(r => r.trim()).includes(u.role);
      } else {
        matchesRole = u.role === role;
      }
    }
    const matchesStatus = status === 'ALL' || u.status === status;

    let matchesDate = true;
    if (startDate) {
      const from = new Date(startDate);
      if (!isNaN(from.getTime()) && new Date(u.createdAt) < from) matchesDate = false;
    }
    if (endDate) {
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
      if (!isNaN(to.getTime()) && new Date(u.createdAt) > to) matchesDate = false;
    }

    return matchesSearch && matchesRole && matchesStatus && matchesDate;
  });

  filtered.sort((a, b) => {
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

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;
  const paginatedList = filtered.slice(skip, skip + parsedLimit);

  const stats = {
    total: allUsersList.length,
    active: allUsersList.filter(u => u.status === 'ACTIVE').length,
    inactive: allUsersList.filter(u => u.status === 'INACTIVE').length,
    suspended: allUsersList.filter(u => u.status === 'SUSPENDED').length,
    usersCount: allUsersList.filter(u => u.role === 'USER').length,
    adminsCount: allUsersList.filter(u => u.role === 'ADMIN').length,
    superAdminsCount: allUsersList.filter(u => u.role === 'SUPER_ADMIN').length
  };

  const users = paginatedList.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    submissionsCount: 0,
    reviewsCount: 0
  }));

  return {
    users,
    pagination: {
      totalCount,
      totalPages,
      currentPage: parsedPage,
      limit: parsedLimit,
      hasNextPage: parsedPage < totalPages,
      hasPrevPage: parsedPage > 1
    },
    stats
  };
};

/**
 * Get detailed user dossier including activity counts (excluding password)
 */
const getUserDetails = async (id) => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          submissions: {
            select: {
              id: true,
              platform: true,
              actionType: true,
              status: true,
              createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          reviews: {
            select: {
              id: true,
              status: true,
              createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              submissions: true,
              reviews: true,
              notifications: true
            }
          }
        }
      });
      if (user) {
        return {
          ...user,
          submissionsCount: user._count?.submissions || 0,
          reviewsCount: user._count?.reviews || 0,
          notificationsCount: user._count?.notifications || 0
        };
      }
    } catch (err) {
      console.warn('[UserRepo] Prisma getUserDetails failed, falling back to memory store:', err.message);
    }
  }

  // Fallback to in-memory store
  for (const user of inMemoryUsers.values()) {
    if (user.id === id) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        submissions: [],
        reviews: [],
        submissionsCount: 0,
        reviewsCount: 0,
        notificationsCount: 0
      };
    }
  }

  return null;
};

/**
 * Update user entity (name, email, role, status, password)
 */
const updateUser = async (id, updateFields = {}) => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  const updateData = {};
  if (updateFields.name !== undefined) updateData.name = updateFields.name.trim();
  if (updateFields.email !== undefined) updateData.email = updateFields.email.trim().toLowerCase();
  if (updateFields.role !== undefined) updateData.role = updateFields.role;
  if (updateFields.status !== undefined) updateData.status = updateFields.status;
  if (updateFields.password !== undefined) updateData.password = updateFields.password;

  let prismaUpdated = null;
  if (dbStatus.isConnected && prisma) {
    try {
      prismaUpdated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });
    } catch (err) {
      console.warn('[UserRepo] Prisma updateUser failed, falling back to memory store:', err.message);
    }
  }

  // Update in-memory store
  for (const [emailKey, user] of inMemoryUsers.entries()) {
    if (user.id === id) {
      const oldEmail = emailKey;
      const updatedUser = {
        ...user,
        ...updateData,
        updatedAt: new Date()
      };

      if (updateData.email && updateData.email !== oldEmail) {
        inMemoryUsers.delete(oldEmail);
        inMemoryUsers.set(updateData.email, updatedUser);
      } else {
        inMemoryUsers.set(oldEmail, updatedUser);
      }

      return prismaUpdated || {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };
    }
  }

  return prismaUpdated;
};

/**
 * Update user status (ACTIVE, INACTIVE, SUSPENDED)
 */
const updateUserStatus = async (id, status) => {
  return await updateUser(id, { status });
};

/**
 * Delete a user
 */
const deleteUser = async (id) => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      await prisma.user.delete({ where: { id } });
    } catch (err) {
      console.warn('[UserRepo] Prisma deleteUser failed, falling back to memory store:', err.message);
    }
  }

  for (const [emailKey, user] of inMemoryUsers.entries()) {
    if (user.id === id) {
      inMemoryUsers.delete(emailKey);
      return true;
    }
  }

  return true;
};

/**
 * Count active Super Administrators to protect root governance
 */
const countSuperAdmins = async () => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const count = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' }
      });
      return count;
    } catch (err) {
      console.warn('[UserRepo] Prisma countSuperAdmins failed, using memory store:', err.message);
    }
  }

  return Array.from(inMemoryUsers.values()).filter(
    u => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE'
  ).length;
};

/**
 * Update a user's role (Super Admin action)
 */
const updateUserRole = async (id, newRole) => {
  return await updateUser(id, { role: newRole });
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  getAllUsers,
  updateUserRole,
  getUsersPaginated,
  getUserDetails,
  updateUser,
  updateUserStatus,
  deleteUser,
  countSuperAdmins
};


