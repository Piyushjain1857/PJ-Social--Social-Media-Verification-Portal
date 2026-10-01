/**
 * Gamification & Points System End-to-End Test Suite
 *
 * Verifies:
 * 1. Point values for action types: LIKE = 1, COMMENT = 2, STORY = 2
 * 2. Points awarded only when submission is APPROVED by Admin/Super Admin
 * 3. Duplicate prevention: same submission cannot award points twice
 * 4. Rejection awards 0 points
 * 5. GET /api/points/me returns balance, recent transactions, and breakdown
 * 6. GET /api/points/me/history returns paginated transaction history
 * 7. RBAC security:
 *    - Normal user receives 403 on GET /api/points/user/:id and POST /api/points/adjust
 *    - Admin can view user points via GET /api/points/user/:id but cannot adjust (403)
 *    - Super Admin can adjust points via POST /api/points/adjust with mandatory reason
 * 8. Auditability: user balance reflects sum of point transactions
 */

const assert = require('assert');
const {
  POINT_VALUES,
  getPointsForAction,
  preventDuplicateAward,
  awardPoints,
  getUserPoints,
  adjustPoints
} = require('../services/pointsService');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5001/api';

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function runPointsSystemTests() {
  console.log('=== Starting Gamification & Points System Test Suite ===\n');

  // 1. Verify Point Value Rules
  console.log('--- 1. Testing Point Rules & Calculations ---');
  assert.strictEqual(getPointsForAction('LIKE'), 1, 'LIKE must award 1 point');
  assert.strictEqual(getPointsForAction('like'), 1, 'Case-insensitive LIKE must award 1 point');
  assert.strictEqual(getPointsForAction('COMMENT'), 2, 'COMMENT must award 2 points');
  assert.strictEqual(getPointsForAction('STORY'), 2, 'STORY must award 2 points');
  assert.strictEqual(getPointsForAction('UNKNOWN'), 0, 'Unknown action type must award 0 points');
  console.log('✓ Point rules verified: LIKE=1, COMMENT=2, STORY=2, UNKNOWN=0');

  // Authenticate demo users
  console.log('\n--- 2. Authenticating Demo Personas ---');
  const superAdminAuth = await loginUser('superadmin@portal.com', 'SuperAdmin123!');
  const adminAuth = await loginUser('admin@portal.com', 'Admin123!');
  const creatorAuth = await loginUser('user@portal.com', 'User123!');
  console.log(`✓ Super Admin authenticated (${superAdminAuth.user.email})`);
  console.log(`✓ Admin Moderator authenticated (${adminAuth.user.email})`);
  console.log(`✓ Creator User authenticated (${creatorAuth.user.email})`);

  // 3. Test Creator Initial Points Summary
  console.log('\n--- 3. Testing GET /api/points/me ---');
  const initialMeRes = await fetch(`${BASE_URL}/points/me`, {
    headers: { Authorization: `Bearer ${creatorAuth.token}` }
  });
  assert.strictEqual(initialMeRes.status, 200, 'GET /api/points/me should return 200');
  const initialMeData = await initialMeRes.json();
  assert.strictEqual(initialMeData.success, true);
  assert.ok(typeof initialMeData.data.totalPoints === 'number', 'totalPoints should be numeric');
  assert.ok(Array.isArray(initialMeData.data.recentTransactions), 'recentTransactions should be an array');
  assert.ok(initialMeData.data.breakdown, 'breakdown should be present');
  console.log(`✓ Initial points summary: ${initialMeData.data.totalPoints} total points`);

  // 4. Test Submission Approval Workflow -> Points Awarded
  console.log('\n--- 4. Testing Activity Submission -> Approval -> Points Awarded ---');
  // First fetch active social account to submit against
  const activeAccRes = await fetch(`${BASE_URL}/social-accounts/active`, {
    headers: { Authorization: `Bearer ${creatorAuth.token}` }
  });
  const activeAccData = await activeAccRes.json();
  const officialAccount = activeAccData.data && activeAccData.data[0];
  assert.ok(officialAccount, 'At least one active official social account required');

  // Create a new LIKE submission
  const subRes = await fetch(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorAuth.token}`
    },
    body: JSON.stringify({
      platform: 'INSTAGRAM',
      actionType: 'LIKE',
      postUrl: `https://instagram.com/p/pts-test-${Date.now()}`,
      screenshotUrl: 'https://example.com/screenshot1.jpg',
      description: 'Proof of like engagement for points test',
      socialAccountId: officialAccount.id
    })
  });
  const subData = await subRes.json();
  assert.strictEqual(subRes.status, 201, `Submission creation should return 201: ${JSON.stringify(subData)}`);
  const createdSub = subData.data;
  console.log(`✓ Creator submitted proof: ID ${createdSub.id} (${createdSub.platform} ${createdSub.actionType})`);

  // Admin approves submission
  const approveRes = await fetch(`${BASE_URL}/reviews/${createdSub.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({ feedback: 'Valid like engagement verified.' })
  });
  assert.strictEqual(approveRes.status, 200, 'Approval should return 200');
  const approveData = await approveRes.json();
  assert.strictEqual(approveData.success, true);
  assert.ok(approveData.data.pointsAwarded, 'Approval response should contain pointsAwarded');
  assert.strictEqual(approveData.data.pointsAwarded.awarded, true, 'Points should be flagged as awarded');
  assert.strictEqual(approveData.data.pointsAwarded.points, 1, 'LIKE should award exactly 1 point');
  console.log(`✓ Admin approved submission: +${approveData.data.pointsAwarded.points} point awarded`);

  // 5. Test Duplicate Prevention
  console.log('\n--- 5. Testing Duplicate Award Prevention ---');
  // Attempt to approve the same submission again via API
  const reApproveRes = await fetch(`${BASE_URL}/reviews/${createdSub.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({ feedback: 'Attempting duplicate approval' })
  });
  // Should reject state transition with 400
  assert.strictEqual(reApproveRes.status, 400, 'Re-approving an approved submission should fail with 400');
  console.log('✓ Re-approval blocked by submission state transition check');

  // Direct service call to awardPoints for the same submissionId
  const directDuplicateAward = await awardPoints({
    userId: creatorAuth.user.id,
    submissionId: createdSub.id,
    actionType: 'LIKE',
    reviewerId: adminAuth.user.id
  });
  assert.strictEqual(directDuplicateAward.awarded, false, 'Duplicate awardPoints must return awarded: false');
  assert.strictEqual(directDuplicateAward.alreadyAwarded, true, 'alreadyAwarded must be true');
  assert.strictEqual(directDuplicateAward.points, 0, 'No additional points should be given');
  console.log('✓ Idempotency verified: Duplicate points award strictly blocked');

  // 6. Test Rejected Submission -> 0 Points
  console.log('\n--- 6. Testing Rejected Submission -> 0 Points Awarded ---');
  const rejectSubRes = await fetch(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorAuth.token}`
    },
    body: JSON.stringify({
      platform: 'INSTAGRAM',
      actionType: 'COMMENT',
      postUrl: `https://instagram.com/p/pts-reject-${Date.now()}`,
      screenshotUrl: 'https://example.com/screenshot2.jpg',
      description: 'Proof destined for rejection',
      socialAccountId: officialAccount.id
    })
  });
  const rejectSubData = await rejectSubRes.json();
  const subToReject = rejectSubData.data;

  const pointsBeforeRejection = (await (await fetch(`${BASE_URL}/points/me`, {
    headers: { Authorization: `Bearer ${creatorAuth.token}` }
  })).json()).data.totalPoints;

  const rejectVerdictRes = await fetch(`${BASE_URL}/reviews/${subToReject.id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({ feedback: 'Screenshot cropped and unreadable.' })
  });
  assert.strictEqual(rejectVerdictRes.status, 200, 'Rejection should return 200');

  const pointsAfterRejection = (await (await fetch(`${BASE_URL}/points/me`, {
    headers: { Authorization: `Bearer ${creatorAuth.token}` }
  })).json()).data.totalPoints;

  assert.strictEqual(pointsBeforeRejection, pointsAfterRejection, 'Points must NOT change when a submission is rejected');
  console.log('✓ Verified: Rejected submission awarded 0 points (balance unchanged)');

  // 7. Test STORY and COMMENT points values (2 points each)
  console.log('\n--- 7. Testing Story Verification (+2 Points) ---');
  const storySubRes = await fetch(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorAuth.token}`
    },
    body: JSON.stringify({
      platform: 'INSTAGRAM',
      actionType: 'STORY',
      postUrl: `https://instagram.com/stories/story-${Date.now()}`,
      screenshotUrl: 'https://example.com/screenshot3.jpg',
      description: 'Proof of story post',
      socialAccountId: officialAccount.id
    })
  });
  const storySub = (await storySubRes.json()).data;
  const storyApproveRes = await fetch(`${BASE_URL}/reviews/${storySub.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({ feedback: 'Story active and verified.' })
  });
  const storyApproveData = await storyApproveRes.json();
  assert.strictEqual(storyApproveData.data.pointsAwarded.points, 2, 'STORY approval must award 2 points');
  console.log('✓ Verified: STORY approval awarded +2 points');

  // 8. Test Points History API
  console.log('\n--- 8. Testing GET /api/points/me/history ---');
  const historyRes = await fetch(`${BASE_URL}/points/me/history?limit=5`, {
    headers: { Authorization: `Bearer ${creatorAuth.token}` }
  });
  assert.strictEqual(historyRes.status, 200, 'Points history should return 200');
  const historyData = await historyRes.json();
  assert.strictEqual(historyData.success, true);
  assert.ok(historyData.data.length > 0, 'History should contain awarded transactions');
  assert.ok(historyData.pagination, 'History should contain pagination metadata');
  console.log(`✓ History returned ${historyData.count} transactions (Page ${historyData.pagination.page} of ${historyData.pagination.totalPages})`);

  // 9. Testing RBAC Security Restrictions
  console.log('\n--- 9. Testing RBAC Security Protections ---');
  // Normal USER cannot view another user's points
  const userAccessForbidden = await fetch(`${BASE_URL}/points/user/${superAdminAuth.user.id}`, {
    headers: { Authorization: `Bearer ${creatorAuth.token}` }
  });
  assert.strictEqual(userAccessForbidden.status, 403, 'Normal USER must receive 403 on /api/points/user/:id');
  console.log('✓ Normal USER receives 403 on /api/points/user/:id');

  // ADMIN can view user's points
  const adminAccessAllowed = await fetch(`${BASE_URL}/points/user/${creatorAuth.user.id}`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` }
  });
  assert.strictEqual(adminAccessAllowed.status, 200, 'ADMIN should be permitted to view user points');
  console.log('✓ ADMIN permitted to inspect user points via /api/points/user/:id');

  // Normal USER cannot manually adjust points
  const userAdjustForbidden = await fetch(`${BASE_URL}/points/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorAuth.token}`
    },
    body: JSON.stringify({ userId: creatorAuth.user.id, points: 10, reason: 'Unauthorized self-reward' })
  });
  assert.strictEqual(userAdjustForbidden.status, 403, 'Normal USER must receive 403 on /api/points/adjust');
  console.log('✓ Normal USER receives 403 on /api/points/adjust');

  // ADMIN cannot manually adjust points (only SUPER_ADMIN)
  const adminAdjustForbidden = await fetch(`${BASE_URL}/points/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({ userId: creatorAuth.user.id, points: 5, reason: 'Admin attempt' })
  });
  assert.strictEqual(adminAdjustForbidden.status, 403, 'ADMIN must receive 403 on /api/points/adjust');
  console.log('✓ ADMIN receives 403 on /api/points/adjust (Super Admin exclusive)');

  // 10. Super Admin Manual Points Adjustment with Audit Trail
  console.log('\n--- 10. Testing Super Admin Manual Adjustment ---');
  // Validation: Missing reason should fail with 400
  const missingReasonRes = await fetch(`${BASE_URL}/points/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminAuth.token}`
    },
    body: JSON.stringify({ userId: creatorAuth.user.id, points: 5, reason: '' })
  });
  assert.strictEqual(missingReasonRes.status, 400, 'Missing reason should be rejected with 400');
  console.log('✓ Rejected adjustment with missing reason (400)');

  // Validation: Zero points should fail with 400
  const zeroPointsRes = await fetch(`${BASE_URL}/points/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminAuth.token}`
    },
    body: JSON.stringify({ userId: creatorAuth.user.id, points: 0, reason: 'Zero points adjustment' })
  });
  assert.strictEqual(zeroPointsRes.status, 400, 'Zero points should be rejected with 400');
  console.log('✓ Rejected adjustment with zero points (400)');

  // Valid adjustment: +10 points bonus
  const validAdjustRes = await fetch(`${BASE_URL}/points/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminAuth.token}`
    },
    body: JSON.stringify({
      userId: creatorAuth.user.id,
      points: 10,
      reason: 'Outstanding campus social media ambassador contribution'
    })
  });
  assert.strictEqual(validAdjustRes.status, 200, 'Super Admin adjustment should succeed with 200');
  const validAdjustData = await validAdjustRes.json();
  assert.strictEqual(validAdjustData.success, true);
  assert.strictEqual(validAdjustData.data.pointsAdjusted, 10);
  assert.strictEqual(validAdjustData.data.transaction.actionType, 'ADJUSTMENT');
  console.log(`✓ Super Admin adjusted balance by +10. New total: ${validAdjustData.data.newTotalPoints}`);

  // 11. Verify Auditable Consistency
  console.log('\n--- 11. Testing Auditability & Balance Consistency ---');
  const finalSummary = await getUserPoints(creatorAuth.user.id);
  assert.strictEqual(
    finalSummary.totalPoints,
    finalSummary.auditedTotalPoints,
    `Total points (${finalSummary.totalPoints}) must equal audited sum of transactions (${finalSummary.auditedTotalPoints})`
  );
  console.log(`✓ Audit verified: User balance (${finalSummary.totalPoints}) matches transaction ledger exactly`);

  console.log('\n🎉 ALL GAMIFICATION & POINTS SYSTEM TESTS PASSED SUCCESSFULLY!\n');
}

if (require.main === module) {
  runPointsSystemTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Points System Test Failed:', err.message);
      if (err.stack) console.error(err.stack);
      process.exit(1);
    });
}

module.exports = { runPointsSystemTests };
