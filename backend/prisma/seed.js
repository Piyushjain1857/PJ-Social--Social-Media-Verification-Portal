/**
 * Prisma Seed Script — Social Media Verification Portal
 *
 * Seeds baseline administrative structure and configuration without any sample data:
 *   - 3 Essential Accounts:
 *       • superadmin@portal.com / SuperAdmin123! (SUPER_ADMIN)
 *       • admin@portal.com      / Admin123!      (ADMIN)
 *       • user@portal.com       / User123!       (USER)
 *   - 3 Official Social Accounts (K.R. Mangalam University: Instagram, LinkedIn, Facebook)
 *   - 50 Gamification Levels (50 ranks, 250 XP per rank)
 *   - 3 Gamification Activity Settings (LIKE: 1 XP, COMMENT: 2 XP, STORY: 2 XP)
 *
 * No sample submissions, dummy reviews, test transactions, or fake users are added.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { seedLevels } = require('./seedLevels');

const prisma = new PrismaClient();

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

const OFFICIAL_ACCOUNTS = [
  {
    id: 'soc-official-001',
    platform: 'INSTAGRAM',
    name: 'K.R. Mangalam University Official Instagram',
    handle: '@krmuniv',
    accountUrl: 'https://www.instagram.com/krmuniv/?hl=en',
    profileUrl: 'https://www.instagram.com/krmuniv/?hl=en',
    description: 'Official verified Instagram channel for university-wide announcements, campus life, and student engagement.',
    isActive: true,
    isVerified: true
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
    isVerified: true
  },
  {
    id: 'soc-official-003',
    platform: 'FACEBOOK',
    name: 'K.R. Mangalam University Official Facebook',
    handle: 'krmuniv',
    accountUrl: 'https://www.facebook.com/krmuniv/',
    profileUrl: 'https://www.facebook.com/krmuniv/',
    description: 'Official Facebook community page for students, alumni, parents, and community engagement.',
    isActive: true,
    isVerified: true
  }
];

const DEFAULT_GAMIFICATION_SETTINGS = [
  {
    activity: 'LIKE',
    xp: 1,
    isActive: true,
    description: 'Points awarded for verified social media Like activity'
  },
  {
    activity: 'COMMENT',
    xp: 2,
    isActive: true,
    description: 'Points awarded for verified social media Comment activity'
  },
  {
    activity: 'STORY',
    xp: 2,
    isActive: true,
    description: 'Points awarded for verified social media Story post'
  }
];

async function main() {
  console.log('🌱 Starting clean database seed (zero sample data)...\n');

  // 1. Purge any sample/test activity data
  console.log('🧹 Clearing old sample/test submissions, reviews, transactions, and notifications...');
  await prisma.clarificationRequest.deleteMany({});
  await prisma.reviewNote.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.pointTransaction.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // 2. Remove any test/sample users outside the 3 primary core accounts
  const coreEmails = ['superadmin@portal.com', 'admin@portal.com', 'user@portal.com'];
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { notIn: coreEmails } }
  });
  if (deletedUsers.count > 0) {
    console.log(`  🗑️ Removed ${deletedUsers.count} non-core test/sample user records.`);
  }

  // 3. Remove non-official social accounts
  const officialIds = OFFICIAL_ACCOUNTS.map(a => a.id);
  await prisma.socialAccount.deleteMany({
    where: { id: { notIn: officialIds } }
  });

  // 4. Seed / Reset the 3 Essential Portal Accounts with clean 0-point state
  console.log('\n👤 Seeding essential core accounts...');
  const users = [
    {
      name: 'Eleanor Vance',
      email: 'superadmin@portal.com',
      password: await hashPassword('SuperAdmin123!'),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      totalPoints: 0,
      totalXP: 0
    },
    {
      name: 'Marcus Brody',
      email: 'admin@portal.com',
      password: await hashPassword('Admin123!'),
      role: 'ADMIN',
      status: 'ACTIVE',
      totalPoints: 0,
      totalXP: 0
    },
    {
      name: 'Sarah Connor',
      email: 'user@portal.com',
      password: await hashPassword('User123!'),
      role: 'USER',
      status: 'ACTIVE',
      totalPoints: 0,
      totalXP: 0
    }
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        role: userData.role,
        status: userData.status,
        totalPoints: 0,
        totalXP: 0
      },
      create: userData
    });
    console.log(`  ✅ ${user.role.padEnd(12)} ${user.email} (id: ${user.id})`);
  }

  // 5. Seed Official Social Media Accounts
  console.log('\n🌐 Seeding official social media accounts...');
  for (const acc of OFFICIAL_ACCOUNTS) {
    await prisma.socialAccount.upsert({
      where: { id: acc.id },
      update: {
        platform: acc.platform,
        name: acc.name,
        handle: acc.handle,
        accountUrl: acc.accountUrl,
        profileUrl: acc.profileUrl,
        description: acc.description,
        isActive: acc.isActive,
        isVerified: acc.isVerified
      },
      create: acc
    });
    console.log(`  ✅ [${acc.platform}] ${acc.handle} — ${acc.name}`);
  }

  // 6. Seed Gamification Levels (50 levels, 250 XP each)
  console.log('\n⚡ Seeding gamification levels...');
  await seedLevels();

  // 7. Seed Gamification Rules / Settings
  console.log('\n⚙️  Seeding gamification activity rules...');
  for (const rule of DEFAULT_GAMIFICATION_SETTINGS) {
    await prisma.gamificationSetting.upsert({
      where: { activity: rule.activity },
      update: {
        xp: rule.xp,
        isActive: rule.isActive,
        description: rule.description
      },
      create: rule
    });
    console.log(`  ✅ ${rule.activity.padEnd(8)} → ${rule.xp} XP per verified action`);
  }



  console.log('\n✨ Database seeding complete! Zero sample data present.\n');
  console.log('Core Account Credentials:');
  console.log('  Super Admin : superadmin@portal.com / SuperAdmin123!');
  console.log('  Admin       : admin@portal.com      / Admin123!');
  console.log('  Creator     : user@portal.com       / User123!');
}

main()
  .catch((err) => {
    console.error('❌ Database seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
