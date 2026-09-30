/**
 * Prisma Seed Script — Social Media Verification Portal
 *
 * Creates three demo accounts for development:
 *   superadmin@portal.com  /  SuperAdmin123!  (SUPER_ADMIN)
 *   admin@portal.com       /  Admin123!       (ADMIN)
 *   user@portal.com        /  User123!        (USER)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function main() {
  console.log('🌱  Seeding database...\n');

  const users = [
    {
      name: 'Eleanor Vance',
      email: 'superadmin@portal.com',
      password: await hashPassword('SuperAdmin123!'),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    {
      name: 'Marcus Brody',
      email: 'admin@portal.com',
      password: await hashPassword('Admin123!'),
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    {
      name: 'Sarah Connor',
      email: 'user@portal.com',
      password: await hashPassword('User123!'),
      role: 'USER',
      status: 'ACTIVE',
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log(`  ✅  ${user.role.padEnd(12)}  ${user.email}  (id: ${user.id})`);
  }

  console.log('\n✨  Seeding complete!');
  console.log('\nDemo credentials:');
  console.log('  superadmin@portal.com  /  SuperAdmin123!');
  console.log('  admin@portal.com       /  Admin123!');
  console.log('  user@portal.com        /  User123!');
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
