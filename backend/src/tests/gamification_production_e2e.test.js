/**
 * Production Readiness End-to-End Verification Test Suite
 * 
 * Verifies the complete 18-step production lifecycle:
 *  1. Create user.
 *  2. User submits LIKE.
 *  3. Admin reviews.
 *  4. Admin approves.
 *  5. XP is awarded.
 *  6. Level recalculates.
 *  7. User receives notification.
 *  8. User dashboard updates.
 *  9. Rank updates.
 * 10. Admin sees updated XP.
 * 11. Admin can adjust XP.
 * 12. Audit log is created.
 * 13. Super Admin sees the transaction.
 * 14. Super Admin changes future XP configuration.
 * 15. Historical XP remains unchanged.
 * 16. New approved submissions use the new XP rule.
 * 17. Mobile interface compatibility / response structure.
 * 18. Unauthorized users cannot access protected APIs.
 */

const assert = require('assert');
const { prisma } = require('../config/db');
const { setActivityPointConfig } = require('../services/pointsService');

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
  return { token: data.token, user: data.user };
}

async function runProductionReadinessE2E() {
  console.log('\n================================================================');
  console.log('🚀 GAMIFICATION PRODUCTION-READINESS END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // Authenticate existing personas
  const adminPersona = await authenticate('admin@portal.com', 'Admin123!');
  const superAdminPersona = await authenticate('superadmin@portal.com', 'SuperAdmin123!');

  const adminHeaders = { Authorization: `Bearer ${adminPersona.token}`, 'Content-Type': 'application/json' };
  const saHeaders = { Authorization: `Bearer ${superAdminPersona.token}`, 'Content-Type': 'application/json' };

  console.log('✓ Admin & Super Admin authenticated successfully.\n');

  // Ensure default LIKE rule is 1 XP before test begins
  await prisma.gamificationSetting.upsert({
    where: { activity: 'LIKE' },
    create: { activity: 'LIKE', xp: 1, isActive: true },
    update: { xp: 1, isActive: true }
  });
  setActivityPointConfig('LIKE', 1);

  // --------------------------------------------------------------------------
  // STEP 1: Create User
  // --------------------------------------------------------------------------
  console.log('Step 1: Create fresh test creator account');
  const userEmail = `creator_e2e_${Date.now()}@portal.com`;
  const userPassword = 'Password123!';
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Testing Creator',
      email: userEmail,
      password: userPassword
    })
  });
  assert.strictEqual(registerRes.status, 201, 'User registration should return 201 Created');
  const registerData = await registerRes.json();
  assert(registerData.token, 'Should receive JWT token on registration');
  const userPersona = { token: registerData.token, user: registerData.user };
  const userHeaders = { Authorization: `Bearer ${userPersona.token}`, 'Content-Type': 'application/json' };

  // Verify initial gamification state: 0 XP, Level 1
  const initialProfileRes = await fetch(`${API_BASE}/gamification/me`, { headers: userHeaders });
  assert.strictEqual(initialProfileRes.status, 200);
  const initialProfile = await initialProfileRes.json();
  assert.strictEqual(initialProfile.data.totalXP, 0);
  assert.strictEqual(initialProfile.data.currentLevel, 1);
  console.log(`  ✓ 1. User created (${userEmail}), initial state: 0 XP, Level 1 (Novice)`);

  // --------------------------------------------------------------------------
  // STEP 2: User Submits LIKE
  // --------------------------------------------------------------------------
  console.log('Step 2: User submits LIKE activity verification proof');
  const subRes = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({
      platform: 'INSTAGRAM',
      actionType: 'LIKE',
      postUrl: `https://instagram.com/p/e2e_${Date.now()}`,
      screenshotUrl: '/uploads/e2e_proof.png',
      description: 'Proof of like verification'
    })
  });
  assert.strictEqual(subRes.status, 201, 'Submission creation should return 201 Created');
  const subData = await subRes.json();
  const submissionId = subData.data.id;
  assert.strictEqual(subData.data.status, 'PENDING');
  console.log(`  ✓ 2. Submission created (ID: ${submissionId}) with status PENDING`);

  // --------------------------------------------------------------------------
  // STEP 3: Admin Reviews
  // --------------------------------------------------------------------------
  console.log('Step 3: Admin inspects submission in queue');
  const queueRes = await fetch(`${API_BASE}/submissions`, { headers: adminHeaders });
  assert.strictEqual(queueRes.status, 200);
  const queueData = await queueRes.json();
  const pendingSubmission = queueData.data.find(s => s.id === submissionId);
  assert(pendingSubmission, 'Admin must find submission in submissions list');
  console.log('  ✓ 3. Admin retrieved and inspected pending submission');

  // --------------------------------------------------------------------------
  // STEP 4: Admin Approves
  // --------------------------------------------------------------------------
  console.log('Step 4: Admin approves submission');
  const approveRes = await fetch(`${API_BASE}/submissions/${submissionId}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      feedback: 'Verified valid institutional activity'
    })
  });
  assert.strictEqual(approveRes.status, 200, 'Approval should return 200 OK');
  const approveData = await approveRes.json();
  assert.strictEqual(approveData.data.submission.status, 'APPROVED');
  console.log('  ✓ 4. Submission successfully marked APPROVED');

  // --------------------------------------------------------------------------
  // STEP 5: XP is Awarded
  // --------------------------------------------------------------------------
  console.log('Step 5: Verify XP awarded');
  assert.strictEqual(approveData.data.pointsAwarded.xp, 1, 'Should award exactly 1 XP for LIKE');
  assert.strictEqual(approveData.data.pointsAwarded.totalXP, 1, 'Total XP should now be 1');
  console.log('  ✓ 5. Exactly +1 XP awarded to creator');

  // --------------------------------------------------------------------------
  // STEP 6: Level Recalculates
  // --------------------------------------------------------------------------
  console.log('Step 6: Level recalculation');
  const profileAfterApproveRes = await fetch(`${API_BASE}/gamification/me`, { headers: userHeaders });
  const profileAfterApprove = await profileAfterApproveRes.json();
  assert.strictEqual(profileAfterApprove.data.totalXP, 1);
  assert.strictEqual(profileAfterApprove.data.currentLevel, 1);
  assert.strictEqual(profileAfterApprove.data.xpIntoCurrentLevel, 1);
  assert.strictEqual(profileAfterApprove.data.xpRemaining, 249);
  console.log(`  ✓ 6. Level engine recalculated: ${profileAfterApprove.data.xpRemaining} XP to Level 2`);


  // --------------------------------------------------------------------------
  // STEP 7: User Receives Notification
  // --------------------------------------------------------------------------
  console.log('Step 7: User receives notification');
  const notifRes = await fetch(`${API_BASE}/notifications/my`, { headers: userHeaders });
  assert.strictEqual(notifRes.status, 200);
  const notifData = await notifRes.json();
  const verdictNotif = notifData.data.find(n => n.metadata?.submissionId === submissionId);
  assert(verdictNotif, 'User must have received submission verdict notification');
  assert(verdictNotif.message.includes('+1 XP'), 'Notification must mention +1 XP awarded');
  console.log(`  ✓ 7. Notification delivered: "${verdictNotif.title}" (${verdictNotif.message})`);

  // --------------------------------------------------------------------------
  // STEP 8: User Dashboard Updates
  // --------------------------------------------------------------------------
  console.log('Step 8: User dashboard and recent XP history ledger update');
  const historyRes = await fetch(`${API_BASE}/gamification/me/history`, { headers: userHeaders });
  assert.strictEqual(historyRes.status, 200);
  const historyData = await historyRes.json();
  assert(historyData.data.length >= 1, 'History must include new transaction');
  assert.strictEqual(historyData.data[0].xp, 1);
  assert.strictEqual(historyData.data[0].actionType, 'LIKE');
  console.log('  ✓ 8. User dashboard transaction ledger shows itemized LIKE transaction');

  // --------------------------------------------------------------------------
  // STEP 9: Rank Updates
  // --------------------------------------------------------------------------
  console.log('Step 9: Real ranking calculation');
  const rankRes = await fetch(`${API_BASE}/gamification/me/rank`, { headers: userHeaders });
  assert.strictEqual(rankRes.status, 200);
  const rankData = await rankRes.json();
  assert(typeof rankData.data.currentRank === 'number', 'Rank must be a valid number');
  assert(rankData.data.totalParticipants >= 1, 'Total participants must include creator');
  console.log(`  ✓ 9. User rank computed: #${rankData.data.currentRank} of ${rankData.data.totalParticipants} creators`);

  // --------------------------------------------------------------------------
  // STEP 10: Admin Sees Updated XP
  // --------------------------------------------------------------------------
  console.log('Step 10: Admin sees updated user XP in points management table');
  const adminUsersRes = await fetch(`${API_BASE}/admin/gamification/users?search=${encodeURIComponent(userEmail)}`, {
    headers: adminHeaders
  });
  assert.strictEqual(adminUsersRes.status, 200);
  const adminUsersData = await adminUsersRes.json();
  assert.strictEqual(adminUsersData.data.length, 1);
  assert.strictEqual(adminUsersData.data[0].totalXP, 1);
  console.log('  ✓ 10. Admin verified user record has live balance of 1 XP');

  // --------------------------------------------------------------------------
  // STEP 11: Admin Can Adjust XP
  // --------------------------------------------------------------------------
  console.log('Step 11: Admin adjusts user XP');
  const adjustRes = await fetch(`${API_BASE}/admin/gamification/users/${userPersona.user.id}/adjust-xp`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'Community initiative winner bonus'
    })
  });
  assert.strictEqual(adjustRes.status, 200);
  const adjustData = await adjustRes.json();
  assert.strictEqual(adjustData.data.newXP, 51, 'New XP should be 51 (1 + 50)');
  console.log('  ✓ 11. Admin manually added +50 XP. New balance: 51 XP');

  // --------------------------------------------------------------------------
  // STEP 12: Audit Log is Created
  // --------------------------------------------------------------------------
  console.log('Step 12: Audit log record created');
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      entityId: userPersona.user.id,
      action: 'XP_ADJUSTMENT'
    },
    orderBy: { timestamp: 'desc' }
  });

  assert(auditEntry, 'Audit log entry must be present in database');
  assert.strictEqual(auditEntry.actor, adminPersona.user.email);
  assert(auditEntry.details.includes('50 XP'));
  console.log(`  ✓ 12. Audit log verified: Action ${auditEntry.action} by ${auditEntry.actor}`);

  // --------------------------------------------------------------------------
  // STEP 13: Super Admin Sees the Transaction
  // --------------------------------------------------------------------------
  console.log('Step 13: Super Admin transaction explorer visibility');
  const saTxRes = await fetch(`${API_BASE}/superadmin/gamification/transactions`, { headers: saHeaders });
  assert.strictEqual(saTxRes.status, 200);
  const saTxData = await saTxRes.json();
  const foundUserTx = saTxData.data.find(tx => (tx.user?.id === userPersona.user.id || tx.userId === userPersona.user.id));
  assert(foundUserTx, 'Super Admin must see transactions for this user');
  console.log('  ✓ 13. Super Admin retrieved transaction ledger containing user events');

  // --------------------------------------------------------------------------
  // STEP 14: Super Admin Changes Future XP Configuration
  // --------------------------------------------------------------------------
  console.log('Step 14: Super Admin changes future XP rule (LIKE -> 10 XP)');
  const updateRuleRes = await fetch(`${API_BASE}/superadmin/gamification/settings`, {
    method: 'PUT',
    headers: saHeaders,
    body: JSON.stringify({
      updates: [{ activity: 'LIKE', xp: 10, isActive: true, description: 'Increased engagement reward' }],
      reason: 'Platform growth campaign'
    })
  });
  assert.strictEqual(updateRuleRes.status, 200);
  console.log('  ✓ 14. Super Admin updated LIKE rule to award 10 XP');

  // --------------------------------------------------------------------------
  // STEP 15: Historical XP Remains Unchanged
  // --------------------------------------------------------------------------
  console.log('Step 15: Verify historical transactions are completely untouched');
  const originalTx = await prisma.pointTransaction.findFirst({
    where: { submissionId }
  });
  assert.strictEqual(originalTx.xp, 1, 'First LIKE transaction must remain strictly 1 XP');
  console.log('  ✓ 15. Historical transaction remains 1 XP (zero retroactive mutation)');

  // --------------------------------------------------------------------------
  // STEP 16: New Approved Submissions Use the New XP Rule
  // --------------------------------------------------------------------------
  console.log('Step 16: New approved submission receives updated XP amount');
  const sub2 = await prisma.submission.create({
    data: {
      userId: userPersona.user.id,
      platform: 'INSTAGRAM',
      actionType: 'LIKE',
      postUrl: `https://instagram.com/p/e2e_2_${Date.now()}`,
      screenshotUrl: '/uploads/e2e_proof2.png',
      status: 'PENDING'
    }
  });

  const approve2Res = await fetch(`${API_BASE}/submissions/${sub2.id}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      feedback: 'Approved under new 10 XP policy'
    })
  });
  const approve2Data = await approve2Res.json();
  assert.strictEqual(approve2Data.data.pointsAwarded.xp, 10, 'New approval must award updated 10 XP');
  assert.strictEqual(approve2Data.data.pointsAwarded.totalXP, 61, 'Total XP should now be 61 (51 + 10)');
  console.log('  ✓ 16. New submission awarded 10 XP as per updated rule. Total: 61 XP');

  // Reset LIKE rule back to standard 1 XP
  await prisma.gamificationSetting.upsert({
    where: { activity: 'LIKE' },
    create: { activity: 'LIKE', xp: 1, isActive: true },
    update: { xp: 1, isActive: true }
  });
  setActivityPointConfig('LIKE', 1);

  // --------------------------------------------------------------------------
  // STEP 17: Mobile Interface Compatibility
  // --------------------------------------------------------------------------
  console.log('Step 17: Verify mobile API parameters, pagination, and data structures');
  const mobileParamsRes = await fetch(`${API_BASE}/gamification/me/history?page=1&limit=5`, {
    headers: userHeaders
  });
  assert.strictEqual(mobileParamsRes.status, 200);
  const mobileData = await mobileParamsRes.json();
  assert.strictEqual(mobileData.data.length, 3);
  assert(mobileData.pagination, 'Must include pagination metadata for infinite mobile scroll / paging');
  console.log('  ✓ 17. Mobile pagination response validated (3 transactions correctly paged)');

  // --------------------------------------------------------------------------
  // STEP 18: Unauthorized Users Cannot Access Protected APIs
  // --------------------------------------------------------------------------
  console.log('Step 18: Verify strict role authorization enforcement');

  // A. Unauthenticated -> 401
  const unauthRes = await fetch(`${API_BASE}/gamification/me`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

  // B. Normal User -> Admin API -> 403
  const userToAdminRes = await fetch(`${API_BASE}/admin/gamification/users`, { headers: userHeaders });
  assert.strictEqual(userToAdminRes.status, 403, 'Normal user calling admin endpoint must return 403');

  // C. Normal User -> Adjust XP -> 403
  const userAdjustRes = await fetch(`${API_BASE}/admin/gamification/users/${userPersona.user.id}/adjust-xp`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ amount: 100, reason: 'Unauthorized self-grant' })
  });
  assert.strictEqual(userAdjustRes.status, 403, 'Normal user adjusting XP must return 403');

  // D. Admin -> Super Admin Settings -> 403
  const adminToSaRes = await fetch(`${API_BASE}/superadmin/gamification/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ updates: [{ activity: 'LIKE', xp: 999 }] })
  });
  assert.strictEqual(adminToSaRes.status, 403, 'Admin modifying Super Admin rules must return 403');

  console.log('  ✓ 18. All privilege escalation and unauthorized attempts strictly blocked (401/403)');

  console.log('\n================================================================');
  console.log('🎉 ALL 18 PRODUCTION-READINESS END-TO-END STEPS VERIFIED!');
  console.log('================================================================\n');
}

runProductionReadinessE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ E2E Verification failed:', err);
    process.exit(1);
  });
