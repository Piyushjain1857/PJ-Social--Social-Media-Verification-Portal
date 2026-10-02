/**
 * Seed 50 Default Gamification Levels for PJ Social Portal
 * Configured dynamically: 50 levels, each requiring 250 XP.
 * Controlled by the database so Super Admin can modify thresholds, names, and icons.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LEVEL_NAMES = [
  { level: 1, name: 'Novice', icon: '🌱' },
  { level: 2, name: 'Explorer', icon: '🧭' },
  { level: 3, name: 'Scout', icon: '🔍' },
  { level: 4, name: 'Pathfinder', icon: '🗺️' },
  { level: 5, name: 'Pioneer', icon: '⚡' },
  { level: 6, name: 'Rising Star', icon: '✨' },
  { level: 7, name: 'Engager', icon: '💬' },
  { level: 8, name: 'Advocate', icon: '📣' },
  { level: 9, name: 'Promoter', icon: '🎯' },
  { level: 10, name: 'Catalyst', icon: '🔥' },
  { level: 11, name: 'Collaborator', icon: '🤝' },
  { level: 12, name: 'Spark', icon: '💡' },
  { level: 13, name: 'Builder', icon: '🛠️' },
  { level: 14, name: 'Sustainer', icon: '🛡️' },
  { level: 15, name: 'Influencer', icon: '🌟' },
  { level: 16, name: 'Contributor', icon: '🚀' },
  { level: 17, name: 'Specialist', icon: '🔮' },
  { level: 18, name: 'Senior Contributor', icon: '🌠' },
  { level: 19, name: 'Lead Advocate', icon: '🏵️' },
  { level: 20, name: 'Veteran', icon: '🎖️' },
  { level: 21, name: 'Bronze Champion', icon: '🥉' },
  { level: 22, name: 'Silver Champion', icon: '🥈' },
  { level: 23, name: 'Gold Champion', icon: '🥇' },
  { level: 24, name: 'Ambassador', icon: '🏛️' },
  { level: 25, name: 'Vanguard', icon: '⚔️' },
  { level: 26, name: 'Innovator', icon: '🔬' },
  { level: 27, name: 'Strategist', icon: '♟️' },
  { level: 28, name: 'Master Contributor', icon: '💎' },
  { level: 29, name: 'Premier', icon: '👑' },
  { level: 30, name: 'Luminary', icon: '☀️' },
  { level: 31, name: 'Apex', icon: '🦅' },
  { level: 32, name: 'Titan', icon: '🗿' },
  { level: 33, name: 'Grand Contributor', icon: '🏆' },
  { level: 34, name: 'Paragon', icon: '💠' },
  { level: 35, name: 'Visionary', icon: '🌌' },
  { level: 36, name: 'Sovereign', icon: '🪐' },
  { level: 37, name: 'Luminary Master', icon: '⚜️' },
  { level: 38, name: 'Elite Ambassador', icon: '💫' },
  { level: 39, name: 'High Vanguard', icon: '⚡' },
  { level: 40, name: 'Champion', icon: '👑' },
  { level: 41, name: 'Grandmaster', icon: '🌟' },
  { level: 42, name: 'Mythic', icon: '🦄' },
  { level: 43, name: 'Archon', icon: '☄️' },
  { level: 44, name: 'Ascendant', icon: '🌠' },
  { level: 45, name: 'Celestial', icon: '🌌' },
  { level: 46, name: 'Immortal', icon: '♾️' },
  { level: 47, name: 'Supreme', icon: '🔱' },
  { level: 48, name: 'Overseer', icon: '👁️' },
  { level: 49, name: 'Principal Legend', icon: '🏅' },
  { level: 50, name: 'PJ Social Legend', icon: '🏆' }
];

async function seedLevels() {
  console.log('⚡ Seeding default 50 Gamification Levels...');

  for (let i = 1; i <= 50; i++) {
    const meta = LEVEL_NAMES.find(l => l.level === i) || {
      level: i,
      name: `Level ${i}`,
      icon: '⭐'
    };

    await prisma.level.upsert({
      where: { levelNumber: i },
      update: {
        name: meta.name,
        xpRequired: 250,
        icon: meta.icon,
        description: `Level ${i} (${meta.name}) — 250 XP required to complete this rank`,
        isActive: true
      },
      create: {
        levelNumber: i,
        name: meta.name,
        xpRequired: 250,
        icon: meta.icon,
        description: `Level ${i} (${meta.name}) — 250 XP required to complete this rank`,
        isActive: true
      }
    });
  }

  // Also backfill totalXP from totalPoints for existing users if totalXP is 0
  const usersToSync = await prisma.user.findMany({
    where: { totalXP: 0, totalPoints: { gt: 0 } }
  });

  for (const u of usersToSync) {
    await prisma.user.update({
      where: { id: u.id },
      data: { totalXP: u.totalPoints }
    });
  }

  // Also backfill xp in pointTransaction from points if xp is 0
  const txToSync = await prisma.pointTransaction.findMany({
    where: { xp: 0, points: { gt: 0 } }
  });

  for (const tx of txToSync) {
    await prisma.pointTransaction.update({
      where: { id: tx.id },
      data: { xp: tx.points }
    });
  }

  console.log('✅ Successfully seeded 50 Levels and synchronized existing XP transactions.');
}

if (require.main === module) {
  seedLevels()
    .catch((err) => {
      console.error('❌ Level seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedLevels, LEVEL_NAMES };
