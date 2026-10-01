const assert = require('assert');
const {
  calculateUserLevel,
  getNextLevel,
  getLevelProgress,
  getXPRequiredForNextLevel,
  calculateUserXP,
  getActiveLevels,
  buildLevelThresholds
} = require('../services/levelService');
const { awardPoints, preventDuplicateAward } = require('../services/pointsService');
const { prisma } = require('../config/db');

const API_BASE = 'http://localhost:5001/api';

async function authenticate(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Authentication failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function runGamificationLevelSystemTests() {
  console.log('\n======================================================');
  console.log('🎮 Starting Gamification Level System Test Suite');
  console.log('======================================================\n');

  // Authenticate personas
  const superAdmin = await authenticate('superadmin@portal.com', 'SuperAdmin123!');
  const admin = await authenticate('admin@portal.com', 'Admin123!');
  const creator = await authenticate('user@portal.com', 'User123!');

  console.log('✓ Personas authenticated successfully (Super Admin, Admin, Creator)');

  // ---------------------------------------------------------------------------
  // Requirement 9, 10, 11: Level Calculation, Progress Percentage & Next Level
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing Default 50-Level Calculation (250 XP each) ---');

  // Test 0 XP -> Level 1 (Novice)
  const lvl0 = calculateUserLevel(0);
  assert.strictEqual(lvl0.currentLevel, 1);
  assert.strictEqual(lvl0.currentLevelStartXP, 0);
  assert.strictEqual(lvl0.nextLevel, 2);
  assert.strictEqual(lvl0.nextLevelRequiredXP, 250);
  assert.strictEqual(lvl0.xpIntoCurrentLevel, 0);
  assert.strictEqual(lvl0.xpRemaining, 250);
  assert.strictEqual(lvl0.progressPercentage, 0);
  console.log('✓ Level 1 (0 XP) calculated correctly');

  // Test 820 XP -> Level 4 (Prompt Example)
  // Level 1: 0-249
  // Level 2: 250-499
  // Level 3: 500-749
  // Level 4: 750-999
  // 820 XP -> start 750, xpIntoCurrentLevel 70, xpRemaining 180, progressPercentage 28%
  const lvl820 = calculateUserLevel(820);
  assert.strictEqual(lvl820.currentLevel, 4);
  assert.strictEqual(lvl820.currentLevelStartXP, 750);
  assert.strictEqual(lvl820.nextLevel, 5);
  assert.strictEqual(lvl820.nextLevelRequiredXP, 250);
  assert.strictEqual(lvl820.xpIntoCurrentLevel, 70);
  assert.strictEqual(lvl820.xpRemaining, 180);
  assert.strictEqual(lvl820.progressPercentage, 28);
  console.log('✓ User XP = 820 -> Level 4, xpIntoCurrentLevel = 70, xpRemaining = 180, progress = 28% (Exact Prompt Example)');

  // Test 3820 XP -> Level 16 (Contributor) (Prompt API Example)
  // Level 16 start = 15 * 250 = 3750
  // 3820 - 3750 = 70 into level, 180 remaining, progress 28%
  const lvl3820 = calculateUserLevel(3820);
  assert.strictEqual(lvl3820.currentLevel, 16);
  assert.strictEqual(lvl3820.levelName, 'Contributor');
  assert.strictEqual(lvl3820.nextLevel, 17);
  assert.strictEqual(lvl3820.currentLevelStartXP, 3750);
  assert.strictEqual(lvl3820.xpIntoCurrentLevel, 70);
  assert.strictEqual(lvl3820.xpRemaining, 180);
  assert.strictEqual(lvl3820.progressPercentage, 28);
  console.log('✓ User XP = 3820 -> Level 16 Contributor, xpRemaining = 180, progress = 28% (Exact Prompt API Example)');

  // ---------------------------------------------------------------------------
  // Requirement 12: Different XP Requirements per Level (Variable Thresholds)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Variable XP Requirements per Level ---');
  // Prompt Example:
  // Level 1 requires 100 XP -> 0–99
  // Level 2 requires 150 XP -> 100–249
  // Level 3 requires 250 XP -> 250–499
  const customDynamicLevels = [
    { levelNumber: 1, name: 'Trainee', xpRequired: 100, icon: '🌱' },
    { levelNumber: 2, name: 'Associate', xpRequired: 150, icon: '⚡' },
    { levelNumber: 3, name: 'Senior', xpRequired: 250, icon: '🚀' }
  ];

  const varLvl1 = calculateUserLevel(50, customDynamicLevels);
  assert.strictEqual(varLvl1.currentLevel, 1);
  assert.strictEqual(varLvl1.currentLevelStartXP, 0);
  assert.strictEqual(varLvl1.xpIntoCurrentLevel, 50);
  assert.strictEqual(varLvl1.xpRemaining, 50);
  assert.strictEqual(varLvl1.progressPercentage, 50);
  console.log('✓ Custom Variable: 50 XP -> Level 1 (50% progress)');

  const varLvl2 = calculateUserLevel(100, customDynamicLevels);
  assert.strictEqual(varLvl2.currentLevel, 2);
  assert.strictEqual(varLvl2.currentLevelStartXP, 100);
  assert.strictEqual(varLvl2.xpIntoCurrentLevel, 0);
  assert.strictEqual(varLvl2.xpRemaining, 150);
  assert.strictEqual(varLvl2.progressPercentage, 0);
  console.log('✓ Custom Variable: 100 XP -> Level 2 threshold transition (0% progress)');

  const varLvl2Mid = calculateUserLevel(175, customDynamicLevels);
  assert.strictEqual(varLvl2Mid.currentLevel, 2);
  assert.strictEqual(varLvl2Mid.currentLevelStartXP, 100);
  assert.strictEqual(varLvl2Mid.xpIntoCurrentLevel, 75);
  assert.strictEqual(varLvl2Mid.xpRemaining, 75);
  assert.strictEqual(varLvl2Mid.progressPercentage, 50);
  console.log('✓ Custom Variable: 175 XP -> Level 2 (50% progress, 75/150 XP into level)');

  const varLvl3 = calculateUserLevel(250, customDynamicLevels);
  assert.strictEqual(varLvl3.currentLevel, 3);
  assert.strictEqual(varLvl3.currentLevelStartXP, 250);
  assert.strictEqual(varLvl3.xpIntoCurrentLevel, 0);
  assert.strictEqual(varLvl3.progressPercentage, 0);
  console.log('✓ Custom Variable: 250 XP -> Level 3 threshold transition');

  // ---------------------------------------------------------------------------
  // Requirement 7 & API: GET /api/gamification/me & GET /api/gamification/me/history
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing GET /api/gamification/me ---');
  const meRes = await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.success, true);
  assert.ok(typeof meData.data.totalXP === 'number');
  assert.ok(typeof meData.data.currentLevel === 'number');
  assert.ok(typeof meData.data.levelName === 'string');
  assert.ok(typeof meData.data.currentLevelStartXP === 'number');
  assert.ok(typeof meData.data.xpIntoCurrentLevel === 'number');
  assert.ok(typeof meData.data.xpRemaining === 'number');
  assert.ok(typeof meData.data.progressPercentage === 'number');
  console.log(`✓ GET /api/gamification/me returned profile: Level ${meData.data.currentLevel} (${meData.data.levelName}), ${meData.data.totalXP} total XP`);

  console.log('\n--- 4. Testing GET /api/gamification/me/history ---');
  const histRes = await fetch(`${API_BASE}/gamification/me/history`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  assert.strictEqual(histRes.status, 200);
  const histData = await histRes.json();
  assert.strictEqual(histData.success, true);
  assert.ok(Array.isArray(histData.data));
  console.log(`✓ GET /api/gamification/me/history returned ${histData.data.length} transactions`);

  // ---------------------------------------------------------------------------
  // Requirement 8: Security - User cannot modify XP directly
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Security Guardrails (No direct XP modification) ---');
  // Attempting arbitrary POST to increase XP directly must be rejected or not exist
  const hijackRes = await fetch(`${API_BASE}/gamification/me`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creator.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ xp: 100000 })
  });
  // Should return 404 or 405 (endpoint does not accept POST)
  assert.ok([404, 405].includes(hijackRes.status));
  console.log(`✓ Security verified: POST /api/gamification/me with arbitrary XP rejected (${hijackRes.status})`);

  // Normal user cannot adjust points
  const adjustAttempt = await fetch(`${API_BASE}/points/adjust`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creator.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId: creator.user.id, points: 5000, reason: 'Self award' })
  });
  assert.strictEqual(adjustAttempt.status, 403);
  console.log('✓ Security verified: Normal user blocked from manual points adjustment (403)');

  // ---------------------------------------------------------------------------
  // Requirements 1, 2, 3, 4, 5, 6: XP Awarding & Verification Flow
  // 1. Approved LIKE gives +1 XP
  // 2. Approved COMMENT gives +2 XP
  // 3. Approved STORY gives +2 XP
  // 4. Pending submission gives 0 XP
  // 5. Rejected submission gives 0 XP
  // 6. Duplicate approval does not duplicate XP
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing XP Awarding Rules on Submission Approval ---');

  // Fetch active official social account
  const activeAccRes = await fetch(`${API_BASE}/social-accounts/active`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  const activeAccData = await activeAccRes.json();
  const officialAccount = activeAccData.data && activeAccData.data[0];
  assert.ok(officialAccount, 'Active official social account required');

  // Helper to create submission
  async function createSub(actionType) {
    const res = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creator.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform: officialAccount.platform,
        actionType,
        postUrl: `https://instagram.com/p/${actionType.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        screenshotUrl: 'https://example.com/proof.png',
        description: `Proof of ${actionType}`,
        socialAccountId: officialAccount.id
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201, `Submission creation failed: ${JSON.stringify(data)}`);
    return data.data;
  }

  // Get initial XP before submissions
  const beforeProfileRes = await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  const initialXP = (await beforeProfileRes.json()).data.totalXP;

  // A. Approved LIKE -> +1 XP
  console.log('\nTesting LIKE submission (+1 XP):');
  const likeSub = await createSub('LIKE');

  // Verify pending gives 0 XP
  const pendingCheckRes = await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  const xpDuringPending = (await pendingCheckRes.json()).data.totalXP;
  assert.strictEqual(xpDuringPending, initialXP);
  console.log('✓ Verified: Pending submission awarded 0 XP');

  // Admin approves LIKE
  const approveLikeRes = await fetch(`${API_BASE}/reviews/${likeSub.id}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ feedback: 'Valid like proof' })
  });
  assert.strictEqual(approveLikeRes.status, 200);

  const afterLikeProfile = await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  const xpAfterLike = (await afterLikeProfile.json()).data.totalXP;
  assert.strictEqual(xpAfterLike, initialXP + 1);
  console.log('✓ Verified: Approved LIKE gives +1 XP');

  // B. Duplicate approval does NOT duplicate XP
  console.log('\nTesting duplicate approval prevention:');
  const duplicateApproveRes = await fetch(`${API_BASE}/reviews/${likeSub.id}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ feedback: 'Duplicate approval attempt' })
  });
  const xpAfterDuplicate = (await (await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  })).json()).data.totalXP;
  assert.strictEqual(xpAfterDuplicate, initialXP + 1);
  console.log('✓ Verified: Duplicate approval did NOT duplicate XP (Balance remains unchanged)');

  // C. Approved COMMENT -> +2 XP
  console.log('\nTesting COMMENT submission (+2 XP):');
  const commentSub = await createSub('COMMENT');

  await fetch(`${API_BASE}/reviews/${commentSub.id}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ feedback: 'Comment verified' })
  });

  const xpAfterComment = (await (await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  })).json()).data.totalXP;
  assert.strictEqual(xpAfterComment, initialXP + 1 + 2);
  console.log('✓ Verified: Approved COMMENT gives +2 XP');

  // D. Approved STORY -> +2 XP
  console.log('\nTesting STORY submission (+2 XP):');
  const storySub = await createSub('STORY');

  await fetch(`${API_BASE}/reviews/${storySub.id}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ feedback: 'Story verified' })
  });

  const xpAfterStory = (await (await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  })).json()).data.totalXP;
  assert.strictEqual(xpAfterStory, initialXP + 1 + 2 + 2);
  console.log('✓ Verified: Approved STORY gives +2 XP');

  // E. Rejected submission gives 0 XP
  console.log('\nTesting REJECTED submission (0 XP):');
  const rejectSub = await createSub('COMMENT');

  await fetch(`${API_BASE}/reviews/${rejectSub.id}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${admin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ feedback: 'Invalid proof screenshot' })
  });

  const xpAfterReject = (await (await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  })).json()).data.totalXP;
  assert.strictEqual(xpAfterReject, xpAfterStory);
  console.log('✓ Verified: Rejected submission gave 0 XP (Balance unchanged)');

  console.log('\n======================================================');
  console.log('🎉 ALL 12 GAMIFICATION LEVEL SYSTEM VERIFICATIONS PASSED!');
  console.log('======================================================\n');
}

if (require.main === module) {
  runGamificationLevelSystemTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = { runGamificationLevelSystemTests };
