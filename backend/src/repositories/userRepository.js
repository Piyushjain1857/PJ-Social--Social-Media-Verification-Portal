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
      if (users && users.length > 0) return users;
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
 * Update a user's role (Super Admin action)
 */
const updateUserRole = async (id, newRole) => {
  await initializeInMemoryUsers();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { role: newRole },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true
        }
      });
      return updated;
    } catch (err) {
      console.warn('[UserRepo] Prisma updateUserRole failed, updating memory store:', err.message);
    }
  }

  for (const [email, user] of inMemoryUsers.entries()) {
    if (user.id === id) {
      user.role = newRole;
      user.updatedAt = new Date();
      inMemoryUsers.set(email, user);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt
      };
    }
  }

  return null;
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  getAllUsers,
  updateUserRole
};

