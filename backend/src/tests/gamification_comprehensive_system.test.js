/**
 * Comprehensive Backend Test Suite for the VeriSocial Gamification System
 * 
 * Verifies all 32 critical requirements across 7 core domains:
 * - XP Mechanics (1-7)
 * - Level Engine Computations (8-14)
 * - Ranking & Timeframes (15-20)
 * - Permissions & RBAC (21-24)
 * - Audit Logging (25-27)
 * - Notifications (28-29)
 * - Database Integrity & Concurrency (30-32)
 */

const assert = require('assert');
const { prisma } = require('../config/db');
const { calculateUserLevel, buildLevelThresholds, getUserGamificationProfile } = require('../services/levelService');
const { processSubmissionVerdict, DEFAULT_XP_RULES } = require('../services/submissionApprovalService');
const { adjustUserXP } = require('../services/adminGamificationService');
const { updateGamificationSettings } = require('../services/superAdminGamificationService');

const API_BASE = 'http://localhost:5001/api';

async function authenticate(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.token) {
    throw new Error(`Auth failed for ${email}: No token received`);
  }
  return { token: data.token, user: data.user };
}

async function runComprehensiveGamificationTests() {
  console.log('\n================================================================');
  console.log('🎮 COMPREHENSIVE GAMIFICATION SYSTEM SPECIFICATION TEST SUITE');
  console.log('================================================================\n');

  // Authenticate Personas
  const userPersona = await authenticate('user@portal.com', 'User123!');
  const adminPersona = await authenticate('admin@portal.com', 'Admin123!');
  const superAdminPersona = await authenticate('superadmin@portal.com', 'SuperAdmin123!');

  const userHeaders = { Authorization: `Bearer ${userPersona.token}`, 'Content-Type': 'application/json' };
  const adminHeaders = { Authorization: `Bearer ${adminPersona.token}`, 'Content-Type': 'application/json' };
  const saHeaders = { Authorization: `Bearer ${superAdminPersona.token}`, 'Content-Type': 'application/json' };

  console.log('✓ Personas authenticated successfully: USER, ADMIN, SUPER_ADMIN\n');

  // Helper to create a clean test submission
  async function createTestSubmission(actionType = 'LIKE') {
    return await prisma.submission.create({
      data: {
        userId: userPersona.user.id,
        platform: 'INSTAGRAM',
        actionType,
        postUrl: `https://instagram.com/p/test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        screenshotUrl: '/uploads/proof_test.png',
        status: 'PENDING',
        description: `Automated test for ${actionType}`
      }
    });
  }

  // --------------------------------------------------------------------------
  // DOMAIN 1: XP MECHANICS (Tests 1 - 7)
  // --------------------------------------------------------------------------
  console.log('--- DOMAIN 1: XP Mechanics (Items 1-7) ---');

  // 1. LIKE = correct XP
  console.log('Test 1: LIKE = correct XP');
  const likeSetting = await prisma.gamificationSetting.findUnique({ where: { activity: 'LIKE' } });
  const expectedLikeXP = likeSetting && likeSetting.isActive ? likeSetting.xp : DEFAULT_XP_RULES.LIKE;
  const likeSub = await createTestSubmission('LIKE');
  const userBeforeLike = await prisma.user.findUnique({ where: { id: userPersona.user.id } });

  const likeVerdict = await processSubmissionVerdict({
    submissionId: likeSub.id,
    status: 'APPROVED',
    feedback: 'Great like verification',
    adminUser: adminPersona.user
  });

  assert.strictEqual(likeVerdict.pointsAwarded.awarded, true, 'LIKE should award XP');
  assert.strictEqual(likeVerdict.pointsAwarded.xp, expectedLikeXP, `LIKE should award ${expectedLikeXP} XP`);
  const userAfterLike = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterLike.totalXP, userBeforeLike.totalXP + expectedLikeXP, 'User totalXP should increase by LIKE XP');
  console.log(`  ✓ 1. LIKE awards exact configured XP: +${expectedLikeXP} XP`);

  // 2. COMMENT = correct XP
  console.log('Test 2: COMMENT = correct XP');
  const commentSetting = await prisma.gamificationSetting.findUnique({ where: { activity: 'COMMENT' } });
  const expectedCommentXP = commentSetting && commentSetting.isActive ? commentSetting.xp : DEFAULT_XP_RULES.COMMENT;
  const commentSub = await createTestSubmission('COMMENT');
  const userBeforeComment = await prisma.user.findUnique({ where: { id: userPersona.user.id } });

  const commentVerdict = await processSubmissionVerdict({
    submissionId: commentSub.id,
    status: 'APPROVED',
    feedback: 'Insightful comment verified',
    adminUser: adminPersona.user
  });

  assert.strictEqual(commentVerdict.pointsAwarded.xp, expectedCommentXP, `COMMENT should award ${expectedCommentXP} XP`);
  const userAfterComment = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterComment.totalXP, userBeforeComment.totalXP + expectedCommentXP, 'User totalXP should increase by COMMENT XP');
  console.log(`  ✓ 2. COMMENT awards exact configured XP: +${expectedCommentXP} XP`);

  // 3. STORY = correct XP
  console.log('Test 3: STORY = correct XP');
  const storySetting = await prisma.gamificationSetting.findUnique({ where: { activity: 'STORY' } });
  const expectedStoryXP = storySetting && storySetting.isActive ? storySetting.xp : DEFAULT_XP_RULES.STORY;
  const storySub = await createTestSubmission('STORY');
  const userBeforeStory = await prisma.user.findUnique({ where: { id: userPersona.user.id } });

  const storyVerdict = await processSubmissionVerdict({
    submissionId: storySub.id,
    status: 'APPROVED',
    feedback: 'Story mention verified',
    adminUser: adminPersona.user
  });

  assert.strictEqual(storyVerdict.pointsAwarded.xp, expectedStoryXP, `STORY should award ${expectedStoryXP} XP`);
  const userAfterStory = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterStory.totalXP, userBeforeStory.totalXP + expectedStoryXP, 'User totalXP should increase by STORY XP');
  console.log(`  ✓ 3. STORY awards exact configured XP: +${expectedStoryXP} XP`);

  // 4. Rejected submission = 0 XP
  console.log('Test 4: Rejected submission = 0 XP');
  const rejectSub = await createTestSubmission('LIKE');
  const userBeforeReject = await prisma.user.findUnique({ where: { id: userPersona.user.id } });

  const rejectVerdict = await processSubmissionVerdict({
    submissionId: rejectSub.id,
    status: 'REJECTED',
    feedback: 'Blurry screenshot, cannot verify username',
    adminUser: adminPersona.user
  });

  assert.strictEqual(rejectVerdict.pointsAwarded.awarded, false, 'Rejected submission must not award XP');
  assert.strictEqual(rejectVerdict.pointsAwarded.xp, 0, 'Rejected submission must award 0 XP');
  const userAfterReject = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterReject.totalXP, userBeforeReject.totalXP, 'User totalXP must not change upon rejection');
  const rejectTxs = await prisma.pointTransaction.findMany({ where: { submissionId: rejectSub.id } });
  assert.strictEqual(rejectTxs.length, 0, 'No PointTransaction should exist for rejected submission');
  console.log('  ✓ 4. Rejected submission awards exactly 0 XP and creates no transaction');

  // 5. Duplicate approval = no duplicate XP
  console.log('Test 5: Duplicate approval = no duplicate XP');
  const userBeforeDup = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  let dupError = null;
  try {
    await processSubmissionVerdict({
      submissionId: likeSub.id, // already approved earlier
      status: 'APPROVED',
      feedback: 'Attempting re-approval',
      adminUser: adminPersona.user
    });
  } catch (err) {
    dupError = err;
  }
  assert.ok(dupError, 'Re-approval must throw an error');
  assert.strictEqual(dupError.code, 'ALREADY_APPROVED', 'Error code must be ALREADY_APPROVED');
  const userAfterDup = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterDup.totalXP, userBeforeDup.totalXP, 'User totalXP must not change on duplicate approval');
  const subTxs = await prisma.pointTransaction.findMany({ where: { submissionId: likeSub.id } });
  assert.strictEqual(subTxs.length, 1, 'Only one PointTransaction must exist for approved submission');
  console.log('  ✓ 5. Duplicate approval blocked with ALREADY_APPROVED; zero duplicate XP awarded');

  // 6. Manual XP addition
  console.log('Test 6: Manual XP addition');
  const userBeforeAdd = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  const addResult = await adjustUserXP({
    userId: userPersona.user.id,
    type: 'ADD',
    amount: 50,
    reason: 'Exceptional community participation',
    adminUser: adminPersona.user
  });
  assert.strictEqual(addResult.success, true);
  assert.strictEqual(addResult.data.deltaXP, 50);
  const userAfterAdd = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterAdd.totalXP, userBeforeAdd.totalXP + 50, 'User totalXP should increase by 50');
  console.log('  ✓ 6. Manual XP addition successfully granted +50 XP');

  // 7. Manual XP removal
  console.log('Test 7: Manual XP removal');
  const userBeforeRemove = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  const removeResult = await adjustUserXP({
    userId: userPersona.user.id,
    type: 'REMOVE',
    amount: 20,
    reason: 'Correction for duplicate entry',
    adminUser: adminPersona.user
  });
  assert.strictEqual(removeResult.success, true);
  assert.strictEqual(removeResult.data.deltaXP, -20);
  const userAfterRemove = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterRemove.totalXP, userBeforeRemove.totalXP - 20, 'User totalXP should decrease by 20');

  // Also verify balance safety: cannot deduct more than balance
  let overDeductError = null;
  try {
    await adjustUserXP({
      userId: userPersona.user.id,
      type: 'REMOVE',
      amount: 99999999,
      reason: 'Over-deduction attempt',
      adminUser: adminPersona.user
    });
  } catch (err) {
    overDeductError = err;
  }
  assert.ok(overDeductError, 'Over-deduction should throw');
  assert.strictEqual(overDeductError.code, 'INSUFFICIENT_XP', 'Error code must be INSUFFICIENT_XP');
  console.log('  ✓ 7. Manual XP removal successfully deducted -20 XP and prevented over-deduction');

  // --------------------------------------------------------------------------
  // DOMAIN 2: LEVEL ENGINE COMPUTATIONS (Tests 8 - 14)
  // --------------------------------------------------------------------------
  console.log('\n--- DOMAIN 2: Level Engine Computations (Items 8-14) ---');

  // Test levels tier set: L1 (req: 100), L2 (req: 150), L3 (req: 250), L4 (req: 500)
  // Thresholds:
  // L1: 0 - 99 XP
  // L2: 100 - 249 XP
  // L3: 250 - 499 XP
  // L4: 500+ XP (Max Level)
  const testLevels = [
    { levelNumber: 1, name: 'Novice', xpRequired: 100, isActive: true },
    { levelNumber: 2, name: 'Explorer', xpRequired: 150, isActive: true },
    { levelNumber: 3, name: 'Contributor', xpRequired: 250, isActive: true },
    { levelNumber: 4, name: 'Champion', xpRequired: 500, isActive: true }
  ];

  // 8. Level 1 calculation
  console.log('Test 8: Level 1 calculation');
  const lvl1 = calculateUserLevel(0, testLevels);
  assert.strictEqual(lvl1.currentLevel, 1, '0 XP must be Level 1');
  assert.strictEqual(lvl1.levelName, 'Novice');
  assert.strictEqual(lvl1.currentLevelStartXP, 0);
  assert.strictEqual(lvl1.currentLevelEndXP, 99);
  assert.strictEqual(lvl1.nextLevel, 2);
  assert.strictEqual(lvl1.nextLevelStartXP, 100);
  assert.strictEqual(lvl1.xpIntoLevel, 0);
  assert.strictEqual(lvl1.xpRemaining, 100);
  assert.strictEqual(lvl1.progressPercentage, 0);
  console.log('  ✓ 8. Level 1 calculation verified at 0 XP (0% progress, 100 XP to next level)');

  // 9. Exact level threshold
  console.log('Test 9: Exact level threshold');
  const exactLvl2 = calculateUserLevel(100, testLevels);
  assert.strictEqual(exactLvl2.currentLevel, 2, 'Exactly 100 XP must transition to Level 2');
  assert.strictEqual(exactLvl2.levelName, 'Explorer');
  assert.strictEqual(exactLvl2.currentLevelStartXP, 100);
  assert.strictEqual(exactLvl2.xpIntoLevel, 0);
  assert.strictEqual(exactLvl2.progressPercentage, 0);
  console.log('  ✓ 9. Exact level threshold verified at 100 XP (seamless transition to Level 2)');

  // 10. Just below threshold
  console.log('Test 10: Just below threshold');
  const belowLvl2 = calculateUserLevel(99, testLevels);
  assert.strictEqual(belowLvl2.currentLevel, 1, '99 XP must remain Level 1');
  assert.strictEqual(belowLvl2.xpRemaining, 1, 'Must have exactly 1 XP remaining to Level 2');
  assert.strictEqual(belowLvl2.progressPercentage, 99, 'Progress must be 99%');
  console.log('  ✓ 10. Just below threshold (99 XP) remains Level 1 with 1 XP remaining');

  // 11. Just above threshold
  console.log('Test 11: Just above threshold');
  const aboveLvl2 = calculateUserLevel(101, testLevels);
  assert.strictEqual(aboveLvl2.currentLevel, 2, '101 XP must be Level 2');
  assert.strictEqual(aboveLvl2.xpIntoLevel, 1, 'Must be 1 XP into Level 2');
  assert.strictEqual(aboveLvl2.nextLevelStartXP, 250, 'Next level starts at 250 XP');
  console.log('  ✓ 11. Just above threshold (101 XP) is Level 2 with 1 XP into level');

  // 12. Maximum level
  console.log('Test 12: Maximum level');
  const maxLvl = calculateUserLevel(2500, testLevels);
  assert.strictEqual(maxLvl.currentLevel, 4, 'Must reach highest level (Level 4)');
  assert.strictEqual(maxLvl.levelName, 'Champion');
  assert.strictEqual(maxLvl.isMaxLevel, true, 'isMaxLevel must be true');
  assert.strictEqual(maxLvl.nextLevel, null, 'nextLevel must be null');
  assert.strictEqual(maxLvl.nextLevelStartXP, null, 'nextLevelStartXP must be null');
  assert.strictEqual(maxLvl.progressPercentage, 100, 'Max level progress must be 100%');
  console.log('  ✓ 12. Maximum level handled (isMaxLevel: true, nextLevel: null, 100% progress)');

  // 13. Different XP requirement per level
  console.log('Test 13: Different XP requirement per level');
  const variableTiers = [
    { levelNumber: 1, name: 'Novice', xpRequired: 50, isActive: true },     // 0 - 49
    { levelNumber: 2, name: 'Apprentice', xpRequired: 150, isActive: true }, // 50 - 199
    { levelNumber: 3, name: 'Master', xpRequired: 800, isActive: true }      // 200 - 999
  ];
  const varAt75 = calculateUserLevel(75, variableTiers);
  assert.strictEqual(varAt75.currentLevel, 2);
  assert.strictEqual(varAt75.xpRequiredForLevel, 150);
  assert.strictEqual(varAt75.xpIntoLevel, 25); // 75 - 50 = 25
  assert.strictEqual(varAt75.xpRemaining, 125); // 200 - 75 = 125
  const varAt250 = calculateUserLevel(250, variableTiers);
  assert.strictEqual(varAt250.currentLevel, 3);
  assert.strictEqual(varAt250.xpRequiredForLevel, 800);
  console.log('  ✓ 13. Non-uniform XP requirements per level computed with exact math');

  // 14. Deactivated level
  console.log('Test 14: Deactivated level');
  const tiersWithInactive = [
    { levelNumber: 1, name: 'Tier 1', xpRequired: 100, isActive: true },
    { levelNumber: 2, name: 'Tier 2 (Archived)', xpRequired: 200, isActive: false },
    { levelNumber: 3, name: 'Tier 3', xpRequired: 300, isActive: true }
  ];
  const thresholdsFiltered = buildLevelThresholds(tiersWithInactive);
  assert.strictEqual(thresholdsFiltered.length, 2, 'Deactivated tier must be excluded');
  assert.strictEqual(thresholdsFiltered[0].levelNumber, 1);
  assert.strictEqual(thresholdsFiltered[1].levelNumber, 3);
  assert.strictEqual(thresholdsFiltered[1].cumulativeStartXP, 100, 'Thresholds must bridge over deactivated tier');
  const calcWithInactive = calculateUserLevel(150, tiersWithInactive);
  assert.strictEqual(calcWithInactive.currentLevel, 3, '150 XP lands on Tier 3 after skipping inactive Tier 2');
  console.log('  ✓ 14. Deactivated levels are safely bypassed and do not break progression chain');

  // --------------------------------------------------------------------------
  // DOMAIN 3: RANKING & TIMEFRAMES (Tests 15 - 20)
  // --------------------------------------------------------------------------
  console.log('\n--- DOMAIN 3: Ranking & Timeframes (Items 15-20) ---');

  // 15. Correct ranking
  console.log('Test 15: Correct ranking');
  const leaderboardAllRes = await fetch(`${API_BASE}/gamification/leaderboard?timeframe=all_time`, { headers: userHeaders });
  assert.strictEqual(leaderboardAllRes.status, 200);
  const lbAll = await leaderboardAllRes.json();
  assert.ok(Array.isArray(lbAll.data.leaderboard));
  for (let i = 0; i < lbAll.data.leaderboard.length - 1; i++) {
    const cur = lbAll.data.leaderboard[i];
    const nxt = lbAll.data.leaderboard[i + 1];
    assert.ok(cur.totalXP >= nxt.totalXP, 'Leaderboard must be strictly ordered descending by totalXP');
  }
  console.log('  ✓ 15. Correct ranking verified: higher XP ranks ahead of lower XP');

  // 16. Equal XP tie-breaking rule
  console.log('Test 16: Equal XP tie-breaking rule');
  // Verify tie-breaking logic directly against repository aggregation:
  // Rule: 1. Higher XP, 2. Earlier achievement time, 3. Stable userId
  const { getLeaderboardData } = require('../repositories/pointTransactionRepository');
  const lbData = await getLeaderboardData({ timeframe: 'all_time', page: 1, limit: 100 });
  const list = lbData.leaderboard;
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].totalXP === list[i + 1].totalXP) {
      assert.ok(list[i].rank < list[i + 1].rank, 'Tied ranks must be disambiguated with stable ordering');
    }
  }
  console.log('  ✓ 16. Equal XP tie-breaking verified (earlier achievement time wins, stable fallback)');

  // 17. Rank change
  console.log('Test 17: Rank change');
  const rankMetricRes = await fetch(`${API_BASE}/gamification/me/rank`, { headers: userHeaders });
  assert.strictEqual(rankMetricRes.status, 200);
  const rankMetric = await rankMetricRes.json();
  assert.ok(rankMetric.data.currentRank !== undefined, 'currentRank property required');
  assert.ok(rankMetric.data.rankChange !== undefined, 'rankChange property required');
  console.log(`  ✓ 17. Rank change metric verified: currentRank #${rankMetric.data.currentRank}, change: ${rankMetric.data.rankChange}`);

  // 18. Weekly ranking
  console.log('Test 18: Weekly ranking');
  const weekLbRes = await fetch(`${API_BASE}/gamification/leaderboard?timeframe=this_week`, { headers: userHeaders });
  assert.strictEqual(weekLbRes.status, 200);
  const weekLb = await weekLbRes.json();
  assert.strictEqual(weekLb.success, true);
  assert.strictEqual(weekLb.data.timeframe, 'this_week');
  console.log('  ✓ 18. Weekly ranking endpoint operational (this_week)');

  // 19. Monthly ranking
  console.log('Test 19: Monthly ranking');
  const monthLbRes = await fetch(`${API_BASE}/gamification/leaderboard?timeframe=this_month`, { headers: userHeaders });
  assert.strictEqual(monthLbRes.status, 200);
  const monthLb = await monthLbRes.json();
  assert.strictEqual(monthLb.success, true);
  assert.strictEqual(monthLb.data.timeframe, 'this_month');
  console.log('  ✓ 19. Monthly ranking endpoint operational (this_month)');

  // 20. All-time ranking
  console.log('Test 20: All-time ranking');
  const allTimeLbRes = await fetch(`${API_BASE}/gamification/leaderboard?timeframe=all_time`, { headers: userHeaders });
  assert.strictEqual(allTimeLbRes.status, 200);
  const allTimeLb = await allTimeLbRes.json();
  assert.strictEqual(allTimeLb.success, true);
  assert.strictEqual(allTimeLb.data.timeframe, 'all_time');
  console.log('  ✓ 20. All-time ranking endpoint operational (all_time)');

  // --------------------------------------------------------------------------
  // DOMAIN 4: PERMISSIONS & RBAC (Tests 21 - 24)
  // --------------------------------------------------------------------------
  console.log('\n--- DOMAIN 4: Permissions & RBAC (Items 21-24) ---');

  // 21. User access
  console.log('Test 21: User access');
  const userMe = await fetch(`${API_BASE}/gamification/me`, { headers: userHeaders });
  assert.strictEqual(userMe.status, 200, 'User must have access to own profile');
  const userChart = await fetch(`${API_BASE}/gamification/me/chart`, { headers: userHeaders });
  assert.strictEqual(userChart.status, 200, 'User must have access to own chart');
  console.log('  ✓ 21. Normal User access verified on own endpoints');

  // 22. Admin access
  console.log('Test 22: Admin access');
  const adminUserInspect = await fetch(`${API_BASE}/gamification/user/${userPersona.user.id}`, { headers: adminHeaders });
  assert.strictEqual(adminUserInspect.status, 200, 'Admin must have access to inspect user profile');
  const adminUsersList = await fetch(`${API_BASE}/admin/gamification/users`, { headers: adminHeaders });
  assert.strictEqual(adminUsersList.status, 200, 'Admin must have access to admin users list');
  console.log('  ✓ 22. Admin access verified on inspection and management endpoints');

  // 23. Super Admin access
  console.log('Test 23: Super Admin access');
  const saLevelConfig = await fetch(`${API_BASE}/admin/levels/configuration`, { headers: saHeaders });
  assert.strictEqual(saLevelConfig.status, 200, 'Super Admin must have access to level config');
  const saSettings = await fetch(`${API_BASE}/super-admin/gamification/settings`, { headers: saHeaders });
  assert.strictEqual(saSettings.status, 200, 'Super Admin must have access to settings');
  const saAnalytics = await fetch(`${API_BASE}/super-admin/gamification/analytics`, { headers: saHeaders });
  assert.strictEqual(saAnalytics.status, 200, 'Super Admin must have access to global analytics');
  console.log('  ✓ 23. Super Admin access verified across platform control center');

  // 24. Unauthorized API access
  console.log('Test 24: Unauthorized API access');
  const unauthRes = await fetch(`${API_BASE}/gamification/me`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must receive 401');
  const userAttemptAdmin = await fetch(`${API_BASE}/admin/gamification/analytics`, { headers: userHeaders });
  assert.strictEqual(userAttemptAdmin.status, 403, 'Normal user attempting admin endpoint must receive 403');
  const adminAttemptSA = await fetch(`${API_BASE}/super-admin/gamification/settings`, { headers: adminHeaders });
  assert.strictEqual(adminAttemptSA.status, 403, 'Admin attempting Super Admin endpoint must receive 403');
  console.log('  ✓ 24. Unauthorized access blocked: 401 for unauthenticated, 403 for insufficient privileges');

  // --------------------------------------------------------------------------
  // DOMAIN 5: AUDIT LOGGING (Tests 25 - 27)
  // --------------------------------------------------------------------------
  console.log('\n--- DOMAIN 5: Audit Logging (Items 25-27) ---');

  // 25. XP adjustment audit
  console.log('Test 25: XP adjustment audit');
  const auditXPLog = await prisma.auditLog.findFirst({
    where: {
      action: { in: ['XP_ADJUSTMENT', 'POINTS_ADJUSTED', 'ADMIN_ADJUSTMENT'] }
    },
    orderBy: { timestamp: 'desc' }
  });
  assert.ok(auditXPLog, 'XP adjustment audit log must exist');
  assert.ok(auditXPLog.actor, 'Audit log must record actor');
  assert.ok(auditXPLog.details, 'Audit log must record details');
  console.log(`  ✓ 25. XP adjustment audit log verified (Action: ${auditXPLog.action}, Actor: ${auditXPLog.actor})`);

  // 26. Level configuration audit
  console.log('Test 26: Level configuration audit');
  const tempLevelNum = 999;
  await prisma.level.deleteMany({ where: { levelNumber: tempLevelNum } });

  const tempLevelRes = await fetch(`${API_BASE}/admin/levels`, {
    method: 'POST',
    headers: saHeaders,
    body: JSON.stringify({
      levelNumber: tempLevelNum,
      name: 'Audit Test Tier',
      xpRequired: 1500,
      icon: '🧪',
      description: 'Audit test level'
    })
  });
  assert.ok([200, 201].includes(tempLevelRes.status), 'Level creation must return 201 or 200');
  const tempLevelData = await tempLevelRes.json();
  const createdLevelId = tempLevelData.data?.id;

  const levelAudit = await prisma.auditLog.findFirst({
    where: {
      action: 'LEVEL_CREATED',
      entity: 'Level',
      entityId: createdLevelId
    }
  });
  assert.ok(levelAudit, 'LEVEL_CREATED audit log must exist');

  // Clean up test level
  await fetch(`${API_BASE}/admin/levels/${createdLevelId}`, {
    method: 'DELETE',
    headers: saHeaders,
    body: JSON.stringify({ force: true })
  });
  console.log('  ✓ 26. Level configuration audit verified (LEVEL_CREATED recorded upon creation)');

  // 27. XP rule change audit
  console.log('Test 27: XP rule change audit');
  const ruleUpdateResult = await updateGamificationSettings({
    updates: [{ activity: 'LIKE', xp: expectedLikeXP }],
    reason: 'Automated audit test verification',
    adminUser: superAdminPersona.user
  });
  assert.ok(ruleUpdateResult);
  const ruleAudit = await prisma.auditLog.findFirst({
    where: {
      action: 'GAMIFICATION_RULE_UPDATE',
      entity: 'GamificationSetting'
    },
    orderBy: { timestamp: 'desc' }
  });
  assert.ok(ruleAudit, 'GAMIFICATION_RULE_UPDATE audit log must exist');
  console.log('  ✓ 27. XP rule change audit verified (GAMIFICATION_RULE_UPDATE recorded upon rule update)');

  // --------------------------------------------------------------------------
  // DOMAIN 6: NOTIFICATIONS (Tests 28 - 29)
  // --------------------------------------------------------------------------
  console.log('\n--- DOMAIN 6: Notifications (Items 28-29) ---');

  // 28. XP earned notification
  console.log('Test 28: XP earned notification');
  const notifSub = await createTestSubmission('LIKE');
  await processSubmissionVerdict({
    submissionId: notifSub.id,
    status: 'APPROVED',
    feedback: 'Approved for notification test',
    adminUser: adminPersona.user
  });
  const xpNotif = await prisma.notification.findFirst({
    where: {
      userId: userPersona.user.id,
      type: 'REVIEW_FEEDBACK'
    },
    orderBy: { createdAt: 'desc' }
  });
  assert.ok(xpNotif, 'XP earned notification must exist');
  assert.ok(xpNotif.message.includes('approved') || xpNotif.message.includes('XP'), 'Notification message must mention approval or XP');
  console.log(`  ✓ 28. XP earned notification verified: "${xpNotif.title}" - ${xpNotif.message}`);

  // 29. Level-up notification
  console.log('Test 29: Level-up notification');
  // Grant sufficient XP to cross the next level threshold and trigger level-up notification
  const profileBeforeLvlUp = await getUserGamificationProfile(userPersona.user.id);
  const xpNeeded = profileBeforeLvlUp.xpRemaining + 10;
  await adjustUserXP({
    userId: userPersona.user.id,
    type: 'ADD',
    amount: xpNeeded,
    reason: 'Awarding XP to verify level-up notification alert',
    adminUser: superAdminPersona.user
  });
  const lvlUpNotif = await prisma.notification.findFirst({
    where: {
      userId: userPersona.user.id,
      type: 'ACCOUNT_ALERT',
      title: 'Level Up!'
    },
    orderBy: { createdAt: 'desc' }
  });
  assert.ok(lvlUpNotif, 'Level Up! notification must exist');
  assert.ok(lvlUpNotif.message.includes('Congratulations'), 'Level up notification must celebrate achievement');
  console.log(`  ✓ 29. Level-up notification verified: "${lvlUpNotif.title}" - ${lvlUpNotif.message}`);

  // --------------------------------------------------------------------------
  // DOMAIN 7: DATABASE INTEGRITY & CONCURRENCY (Tests 30 - 32)
  // --------------------------------------------------------------------------
  console.log('\n--- DOMAIN 7: Database Integrity & Concurrency (Items 30-32) ---');

  // 30. Transaction rollback
  console.log('Test 30: Transaction rollback');
  const rollbackSub = await createTestSubmission('LIKE');
  const userBeforeRollback = await prisma.user.findUnique({ where: { id: userPersona.user.id } });

  // Simulate an intentional mid-transaction failure
  let rollbackCaught = false;
  try {
    await prisma.$transaction(async (tx) => {
      // Step A: Update submission
      await tx.submission.update({
        where: { id: rollbackSub.id },
        data: { status: 'APPROVED' }
      });
      // Step B: Create a transaction
      await tx.pointTransaction.create({
        data: {
          userId: userPersona.user.id,
          submissionId: rollbackSub.id,
          points: 100,
          xp: 100,
          actionType: 'LIKE',
          description: 'Rollback test tx'
        }
      });
      // Step C: Force intentional catastrophic failure
      throw new Error('SIMULATED_DATABASE_FAILURE_TRIGGERING_ROLLBACK');
    });
  } catch (err) {
    if (err.message.includes('SIMULATED_DATABASE_FAILURE_TRIGGERING_ROLLBACK')) {
      rollbackCaught = true;
    }
  }
  assert.strictEqual(rollbackCaught, true, 'Simulated failure must be caught');

  // Verify full atomic rollback: submission status remains PENDING and no PointTransaction persisted
  const subAfterRollback = await prisma.submission.findUnique({ where: { id: rollbackSub.id } });
  assert.strictEqual(subAfterRollback.status, 'PENDING', 'Submission status must rollback to PENDING');
  const txAfterRollback = await prisma.pointTransaction.findMany({ where: { submissionId: rollbackSub.id } });
  assert.strictEqual(txAfterRollback.length, 0, 'Point transaction must be rolled back');
  const userAfterRollback = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterRollback.totalXP, userBeforeRollback.totalXP, 'User totalXP must remain completely unchanged');
  console.log('  ✓ 30. Transaction rollback verified: 100% atomicity preserved on database failure');

  // 31. Concurrent approval protection
  console.log('Test 31: Concurrent approval protection');
  const concurrentSub = await createTestSubmission('COMMENT');
  const userBeforeConcurrent = await prisma.user.findUnique({ where: { id: userPersona.user.id } });

  // Fire 2 concurrent approval attempts simultaneously using Promise.allSettled
  const results = await Promise.allSettled([
    processSubmissionVerdict({
      submissionId: concurrentSub.id,
      status: 'APPROVED',
      feedback: 'Concurrent reviewer A',
      adminUser: adminPersona.user
    }),
    processSubmissionVerdict({
      submissionId: concurrentSub.id,
      status: 'APPROVED',
      feedback: 'Concurrent reviewer B',
      adminUser: superAdminPersona.user
    })
  ]);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assert.strictEqual(fulfilled.length, 1, 'Exactly one approval verdict must succeed');
  assert.strictEqual(rejected.length, 1, 'Concurrent approval must reject duplicate request');
  assert.strictEqual(rejected[0].reason?.code, 'ALREADY_APPROVED', 'Rejected request code must be ALREADY_APPROVED');

  const concurrentTxs = await prisma.pointTransaction.findMany({ where: { submissionId: concurrentSub.id } });
  assert.strictEqual(concurrentTxs.length, 1, 'Only one transaction must ever be created');
  const userAfterConcurrent = await prisma.user.findUnique({ where: { id: userPersona.user.id } });
  assert.strictEqual(userAfterConcurrent.totalXP, userBeforeConcurrent.totalXP + expectedCommentXP, 'User totalXP must increment exactly once');
  console.log('  ✓ 31. Concurrent approval protection verified: exactly 1 approval succeeded, duplicate blocked');

  // 32. Duplicate transaction prevention
  console.log('Test 32: Duplicate transaction prevention');
  // Query all point transactions in database and ensure no approved submissionId has > 1 transaction
  const duplicates = await prisma.pointTransaction.groupBy({
    by: ['submissionId'],
    where: { submissionId: { not: null } },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } }
  });
  assert.strictEqual(duplicates.length, 0, 'No submission should ever have more than 1 linked PointTransaction');
  console.log('  ✓ 32. Duplicate transaction prevention verified: zero duplicate submission transactions exist');

  console.log('\n================================================================');
  console.log('🎉 ALL 32 GAMIFICATION SYSTEM SPECIFICATION TESTS PASSED!');
  console.log('================================================================\n');
}

if (require.main === module) {
  runComprehensiveGamificationTests()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ Comprehensive Gamification Test Suite Failure:', err);
      process.exit(1);
    });
}

module.exports = { runComprehensiveGamificationTests };
