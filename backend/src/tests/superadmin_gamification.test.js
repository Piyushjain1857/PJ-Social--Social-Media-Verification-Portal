const assert = require('assert');
const http = require('http');
const app = require('../app');
const { prisma } = require('../config/db');
const { getPointsForAction } = require('../services/pointsService');

let server;
let baseUrl;

function makeRequest({ method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    if (body) {
      const jsonBody = JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: { email, password }
  });
  if (!res.data?.success || !res.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data.token;
}

async function runSuperAdminGamificationTests() {
  console.log('\n========================================================');
  console.log('👑 Starting Super Admin Gamification Control Center Test Suite');
  console.log('========================================================\n');

  let superAdminToken;
  let adminToken;
  let userToken;
  let testTargetUser;

  try {
    // 1. Authenticate Personas
    console.log('--- 1. Authenticating Personas ---');
    superAdminToken = await loginUser('superadmin@portal.com', 'SuperAdmin123!');
    adminToken = await loginUser('admin@portal.com', 'Admin123!');
    userToken = await loginUser('user@portal.com', 'User123!');
    console.log('✓ Successfully authenticated Super Admin, Admin, and Normal User personas');

    // Retrieve target creator user
    testTargetUser = await prisma.user.findFirst({
      where: { role: 'USER' }
    });
    assert(testTargetUser, 'A normal USER record must exist for testing');

    // 2. Strict RBAC Enforcement
    console.log('\n--- 2. Testing Strict RBAC Enforcement on Super Admin Gamification APIs ---');

    // Test unauthenticated
    const unauthRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/overview'
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    console.log('✓ Unauthenticated request rejected with 401 Unauthorized');

    // Test Normal User access (must be 403 Forbidden)
    const normalUserEndpoints = [
      '/api/super-admin/gamification/overview',
      '/api/super-admin/gamification/users',
      '/api/super-admin/gamification/admins',
      '/api/super-admin/gamification/transactions',
      '/api/super-admin/gamification/analytics',
      '/api/super-admin/gamification/settings',
      '/api/super-admin/gamification/audit-logs'
    ];

    for (const ep of normalUserEndpoints) {
      const res = await makeRequest({
        method: 'GET',
        path: ep,
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.strictEqual(res.status, 403, `Normal user must receive 403 on ${ep}`);
    }
    console.log('✓ Normal USER strictly forbidden (403) from all Super Admin control center APIs');

    // Test Admin Moderator access (must be 403 Forbidden on Super Admin exclusive APIs)
    for (const ep of normalUserEndpoints) {
      const res = await makeRequest({
        method: 'GET',
        path: ep,
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 403, `Admin must receive 403 on Super Admin route ${ep}`);
    }
    console.log('✓ Admin Moderator strictly forbidden (403) from all Super Admin control center APIs');

    // 3. Super Admin Overview Telemetry
    console.log('\n--- 3. Testing GET /api/super-admin/gamification/overview ---');
    const overviewRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/overview',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(overviewRes.status, 200);
    assert.strictEqual(overviewRes.data.success, true);
    const ov = overviewRes.data.data;
    assert(ov.totalUsers > 0, 'Total users must be > 0');
    assert(ov.activeLevels > 0, 'Active levels must be > 0');
    assert(ov.totalXPTransactions >= 0, 'Total XP transactions must be defined');
    console.log(`✓ Super Admin Overview verified: Users=${ov.totalUsers}, ActiveUsers=${ov.activeUsers}, TotalXP=${ov.totalXPDistributed}, ActiveLevels=${ov.activeLevels}, HighestLevel=${ov.highestLevelReached}`);

    // 4. All Users Table
    console.log('\n--- 4. Testing GET /api/super-admin/gamification/users ---');
    const usersRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/users?limit=5',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(usersRes.status, 200);
    assert.strictEqual(usersRes.data.success, true);
    assert(Array.isArray(usersRes.data.data), 'Users list must be an array');
    const sampleUser = usersRes.data.data[0];
    assert(sampleUser.id, 'User must have ID');
    assert(sampleUser.levelName, 'User must have levelName');
    assert(sampleUser.rank !== undefined, 'User must have rank');
    assert(sampleUser.xpThisWeek !== undefined, 'User must have xpThisWeek');
    assert(sampleUser.xpThisMonth !== undefined, 'User must have xpThisMonth');
    console.log(`✓ Users table returned ${usersRes.data.data.length} users with Rank, Level, and Week/Month XP velocity`);

    // 5. All Admins Gamification Activity
    console.log('\n--- 5. Testing GET /api/super-admin/gamification/admins ---');
    const adminsRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/admins',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(adminsRes.status, 200);
    assert.strictEqual(adminsRes.data.success, true);
    assert(Array.isArray(adminsRes.data.data), 'Admins data must be an array');
    const sampleAdmin = adminsRes.data.data.find(a => a.role === 'ADMIN');
    assert(sampleAdmin, 'An ADMIN record must be present');
    assert(sampleAdmin.actionsPerformed !== undefined, 'actionsPerformed must be present');
    assert(sampleAdmin.xpAdjustmentsCount !== undefined, 'xpAdjustmentsCount must be present');
    console.log(`✓ Admins activity verified for ${sampleAdmin.name}: Actions=${sampleAdmin.actionsPerformed}, XP Adjustments=${sampleAdmin.xpAdjustmentsCount}, Last Activity: "${sampleAdmin.lastActivity}"`);

    // 6. XP Transaction Explorer
    console.log('\n--- 6. Testing GET /api/super-admin/gamification/transactions ---');
    const txRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/transactions?limit=10',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(txRes.status, 200);
    assert.strictEqual(txRes.data.success, true);
    assert(Array.isArray(txRes.data.data), 'Transactions must be an array');
    if (txRes.data.data.length > 0) {
      const tx = txRes.data.data[0];
      assert(tx.date, 'Tx must have date');
      assert(tx.action, 'Tx must have action');
      assert(tx.xp !== undefined, 'Tx must have xp');
      assert(tx.actor, 'Tx must have actor');
      assert(tx.source, 'Tx must have source');
    }
    console.log(`✓ XP Transaction Explorer returned ${txRes.data.data.length} transactions with User, Actor, Action, and Status`);

    // 7. Advanced Analytics
    console.log('\n--- 7. Testing GET /api/super-admin/gamification/analytics ---');
    const analyticsRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/analytics',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(analyticsRes.data.success, true);
    const an = analyticsRes.data.data;
    assert(Array.isArray(an.xpOverTime), 'xpOverTime must be an array');
    assert(Array.isArray(an.activityContribution), 'activityContribution must be an array');
    assert(Array.isArray(an.xpDistribution), 'xpDistribution must be an array');
    assert(Array.isArray(an.topUsers), 'topUsers must be an array');
    console.log(`✓ Advanced Analytics telemetry verified: 30-day timeline buckets, ${an.activityContribution.length} activity categories, top users ranking`);

    // 8. Gamification Settings (Read & Initial Defaults)
    console.log('\n--- 8. Testing GET /api/super-admin/gamification/settings ---');
    const settingsRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/settings',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(settingsRes.status, 200);
    assert.strictEqual(settingsRes.data.success, true);
    assert(Array.isArray(settingsRes.data.data), 'Settings must be an array');
    const likeSetting = settingsRes.data.data.find(s => s.activity === 'LIKE');
    assert(likeSetting, 'LIKE setting must exist');
    console.log(`✓ Gamification settings verified: ${settingsRes.data.data.map(s => `${s.activity}=${s.xp} XP`).join(', ')}`);

    // 9. Update Gamification Settings & Safety Guardrails
    console.log('\n--- 9. Testing PUT /api/super-admin/gamification/settings & Rule Safety ---');

    // Admin attempts to update settings (MUST BE 403)
    const adminForbiddenUpdate = await makeRequest({
      method: 'PUT',
      path: '/api/super-admin/gamification/settings',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { updates: [{ activity: 'LIKE', xp: 5 }] }
    });
    assert.strictEqual(adminForbiddenUpdate.status, 403, 'Admin must not be allowed to change gamification settings');
    console.log('✓ Security verified: Admin is forbidden (403) from modifying gamification settings');

    // Super Admin updates LIKE from 1 to 5 XP
    const initialLikeXP = likeSetting.xp;
    const updateRes = await makeRequest({
      method: 'PUT',
      path: '/api/super-admin/gamification/settings',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        updates: [{ activity: 'LIKE', xp: 5, isActive: true }],
        reason: 'Promotional creator advocacy boost'
      }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.success, true);

    // Verify synchronous points calculation immediately reflects 5 XP
    const currentLikePoints = getPointsForAction('LIKE');
    assert.strictEqual(currentLikePoints, 5, 'Future LIKE actions must yield 5 XP immediately');
    console.log('✓ Rule Safety: Future transactions will now receive 5 XP for LIKE');

    // Verify Audit Log was recorded
    const auditRes = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/audit-logs?action=GAMIFICATION_RULE_UPDATE&limit=1',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(auditRes.status, 200);
    assert(auditRes.data.data.length > 0, 'Audit log entry must be present');
    const latestAudit = auditRes.data.data[0];
    assert.strictEqual(latestAudit.action, 'GAMIFICATION_RULE_UPDATE');
    assert.strictEqual(latestAudit.entityId, 'LIKE');
    console.log(`✓ Audit Log recorded: ${latestAudit.details}`);

    // Revert LIKE back to initial XP
    await makeRequest({
      method: 'PUT',
      path: '/api/super-admin/gamification/settings',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        updates: [{ activity: 'LIKE', xp: initialLikeXP, isActive: true }],
        reason: 'Restoring standard baseline'
      }
    });
    assert.strictEqual(getPointsForAction('LIKE'), initialLikeXP);
    console.log(`✓ Reverted LIKE rule back to ${initialLikeXP} XP`);

    // 10. Super Admin Manual XP Adjustment
    console.log('\n--- 10. Testing POST /api/super-admin/gamification/users/:id/adjust-xp ---');

    // Admin attempts to adjust via Super Admin endpoint (MUST BE 403)
    const adminAdjustAttempt = await makeRequest({
      method: 'POST',
      path: `/api/super-admin/gamification/users/${testTargetUser.id}/adjust-xp`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { type: 'ADD', amount: 100, reason: 'Test bonus' }
    });
    assert.strictEqual(adminAdjustAttempt.status, 403, 'Admin must not be allowed to call Super Admin adjust-xp');
    console.log('✓ Security verified: Admin is forbidden (403) from Super Admin adjust-xp endpoint');

    // Validation check: Missing reason
    const noReasonRes = await makeRequest({
      method: 'POST',
      path: `/api/super-admin/gamification/users/${testTargetUser.id}/adjust-xp`,
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { type: 'ADD', amount: 50, reason: '' }
    });
    assert.strictEqual(noReasonRes.status, 400, 'Empty reason must be rejected with 400');
    console.log('✓ Validation: Empty adjustment reason properly rejected (400)');

    // Super Admin awards +100 XP
    const startBalance = (await prisma.user.findUnique({ where: { id: testTargetUser.id } })).totalXP;
    const addXPRes = await makeRequest({
      method: 'POST',
      path: `/api/super-admin/gamification/users/${testTargetUser.id}/adjust-xp`,
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        type: 'ADD',
        amount: 100,
        reason: 'Super Admin institutional merit award'
      }
    });
    assert.strictEqual(addXPRes.status, 200);
    assert.strictEqual(addXPRes.data.success, true);
    assert.strictEqual(addXPRes.data.data.newBalance, startBalance + 100);
    console.log(`✓ Super Admin awarded +100 XP: Balance ${startBalance} -> ${addXPRes.data.data.newBalance} XP`);

    // Super Admin deducts -25 XP
    const deductXPRes = await makeRequest({
      method: 'POST',
      path: `/api/super-admin/gamification/users/${testTargetUser.id}/adjust-xp`,
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        type: 'REMOVE',
        amount: 25,
        reason: 'Corrective deduction of unverified activity'
      }
    });
    assert.strictEqual(deductXPRes.status, 200);
    assert.strictEqual(deductXPRes.data.success, true);
    assert.strictEqual(deductXPRes.data.data.newBalance, startBalance + 75);
    console.log(`✓ Super Admin deducted -25 XP: New Balance = ${deductXPRes.data.data.newBalance} XP`);

    // Verify Super Admin Audit Log
    const adjAuditRes = await makeRequest({
      method: 'GET',
      path: `/api/super-admin/gamification/audit-logs?action=SUPER_ADMIN_XP_ADJUSTMENT&limit=1`,
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(adjAuditRes.status, 200);
    assert(adjAuditRes.data.data.length > 0);
    assert.strictEqual(adjAuditRes.data.data[0].action, 'SUPER_ADMIN_XP_ADJUSTMENT');
    console.log(`✓ Super Admin Audit Log confirmed: ${adjAuditRes.data.data[0].details}`);

    console.log('\n========================================================');
    console.log('🎉 ALL SUPER ADMIN GAMIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n❌ Super Admin Gamification Test Failure:', err);
    throw err;
  }
}

if (require.main === module) {
  server = http.createServer(app);
  server.listen(0, async () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    try {
      await runSuperAdminGamificationTests();
      server.close();
      process.exit(0);
    } catch (e) {
      server.close();
      process.exit(1);
    }
  });
} else {
  module.exports = { runSuperAdminGamificationTests };
}
