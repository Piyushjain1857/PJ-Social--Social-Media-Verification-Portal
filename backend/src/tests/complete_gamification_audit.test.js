const assert = require('assert');
const http = require('http');
const app = require('../app');
const { prisma } = require('../config/db');

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

async function login(email, password) {
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

async function runGamificationIntegrationAudit() {
  console.log('\n================================================================');
  console.log('🔍 FULL GAMIFICATION INTEGRATION AUDIT & VERIFICATION SUITE');
  console.log('================================================================\n');

  let superAdminToken;
  let adminToken;
  let userToken;
  let testUser;

  try {
    // -------------------------------------------------------------
    // PHASE 1: Authenticate All Three Personas
    // -------------------------------------------------------------
    console.log('--- Phase 1: Authentication & Token Issuance ---');
    superAdminToken = await login('superadmin@portal.com', 'SuperAdmin123!');
    adminToken = await login('admin@portal.com', 'Admin123!');
    userToken = await login('user@portal.com', 'User123!');
    console.log('✓ Super Admin authenticated');
    console.log('✓ Admin authenticated');
    console.log('✓ Normal User authenticated');

    testUser = await prisma.user.findFirst({ where: { role: 'USER' } });
    assert(testUser, 'Test user must exist');
    console.log(`✓ Test creator identified: ${testUser.name} (${testUser.id})`);

    // -------------------------------------------------------------
    // PHASE 2: Authentication & RBAC Boundaries
    // -------------------------------------------------------------
    console.log('\n--- Phase 2: RBAC Protection & Auth Error Handling ---');
    
    // 401 unauthenticated
    const noAuth = await makeRequest({ method: 'GET', path: '/api/gamification/me' });
    assert.strictEqual(noAuth.status, 401, 'Unauthenticated request must return 401');
    console.log('✓ 401 Unauthorized verified for unauthenticated calls');

    // 403 Forbidden for User accessing Admin routes
    const userToAdmin = await makeRequest({
      method: 'GET',
      path: '/api/admin/gamification/analytics',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(userToAdmin.status, 403, 'User accessing admin endpoint must receive 403');
    console.log('✓ 403 Forbidden verified: User blocked from Admin routes');

    // 403 Forbidden for Admin accessing Super Admin routes
    const adminToSuperAdmin = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/settings',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminToSuperAdmin.status, 403, 'Admin accessing super admin endpoint must receive 403');
    console.log('✓ 403 Forbidden verified: Admin blocked from Super Admin routes');

    // -------------------------------------------------------------
    // PHASE 3: Normal User Gamification Components & APIs
    // -------------------------------------------------------------
    console.log('\n--- Phase 3: Normal User Gamification Flows ---');

    // 1. Total XP, Current Level, Level Progress
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/gamification/me',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.success, true);
    assert(typeof meRes.data.data.totalXP === 'number', 'totalXP must be a number');
    assert(meRes.data.data.currentLevel >= 1, 'currentLevel must be >= 1');
    assert(meRes.data.data.levelName, 'levelName must be present');
    assert(typeof meRes.data.data.progressPercentage === 'number', 'progressPercentage must be present');
    console.log(`✓ /api/gamification/me: Level ${meRes.data.data.currentLevel} (${meRes.data.data.levelName}), ${meRes.data.data.totalXP} XP, Progress: ${meRes.data.data.progressPercentage}%`);

    // 2. XP Graph APIs across all supported timeframes
    const timeframes = ['7d', '30d', '3m', '6m', 'all'];
    for (const tf of timeframes) {
      const chartRes = await makeRequest({
        method: 'GET',
        path: `/api/gamification/me/chart?timeframe=${tf}`,
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.strictEqual(chartRes.status, 200, `Chart for ${tf} must return 200`);
      assert(Array.isArray(chartRes.data.data.points), `Points array must be returned for ${tf}`);
      assert(chartRes.data.data.summary, `Summary object must be returned for ${tf}`);
    }
    console.log('✓ /api/gamification/me/chart: All timeframes (7d, 30d, 3m, 6m, all) verified');

    // 3. User Rank & Percentile
    const rankRes = await makeRequest({
      method: 'GET',
      path: '/api/gamification/me/rank',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(rankRes.status, 200);
    assert(rankRes.data.data.rank >= 1, 'Rank must be >= 1');
    assert(rankRes.data.data.totalParticipants >= 1, 'Total participants must be >= 1');
    assert(typeof rankRes.data.data.percentileAhead === 'number', 'Percentile ahead must be numeric');
    console.log(`✓ /api/gamification/me/rank: Rank #${rankRes.data.data.rank} of ${rankRes.data.data.totalParticipants} (${rankRes.data.data.percentileAhead}% ahead)`);

    // 4. Rank Timeline
    const rankHistRes = await makeRequest({
      method: 'GET',
      path: '/api/gamification/me/rank-history',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(rankHistRes.status, 200);
    assert(Array.isArray(rankHistRes.data.data.timeline), 'Timeline array must exist');
    assert(['upward', 'downward', 'stable'].includes(rankHistRes.data.data.trend), 'Valid trend string');
    console.log(`✓ /api/gamification/me/rank-history: Trend=${rankHistRes.data.data.trend}, History points=${rankHistRes.data.data.timeline.length}`);

    // 5. XP History Ledger
    const histRes = await makeRequest({
      method: 'GET',
      path: '/api/gamification/me/history?page=1&limit=5',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(histRes.status, 200);
    assert(Array.isArray(histRes.data.data), 'History data must be an array');
    assert(histRes.data.pagination, 'Pagination object must exist');
    console.log(`✓ /api/gamification/me/history: Paginated ledger returned ${histRes.data.data.length} records`);

    // 6. Dynamic Level Journey
    const journeyRes = await makeRequest({
      method: 'GET',
      path: '/api/gamification/me/journey',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(journeyRes.status, 200);
    assert(Array.isArray(journeyRes.data.data.journey), 'Journey array must exist');
    assert(journeyRes.data.data.totalLevels >= 5, 'Must have configured levels');
    console.log(`✓ /api/gamification/me/journey: ${journeyRes.data.data.totalLevels} dynamic levels rendered with unlocked/current status`);

    // 7. Community Leaderboards (All 3 endpoint variations)
    const lb1 = await makeRequest({ method: 'GET', path: '/api/leaderboard', headers: { Authorization: `Bearer ${userToken}` } });
    const lb2 = await makeRequest({ method: 'GET', path: '/api/points/leaderboard', headers: { Authorization: `Bearer ${userToken}` } });
    const lb3 = await makeRequest({ method: 'GET', path: '/api/gamification/leaderboard', headers: { Authorization: `Bearer ${userToken}` } });
    assert.strictEqual(lb1.status, 200);
    assert.strictEqual(lb2.status, 200);
    assert.strictEqual(lb3.status, 200);
    console.log('✓ Leaderboard endpoint aliases (/api/leaderboard, /api/points/leaderboard, /api/gamification/leaderboard) all return 200');

    // -------------------------------------------------------------
    // PHASE 4: Admin Gamification Oversight & Adjustments
    // -------------------------------------------------------------
    console.log('\n--- Phase 4: Admin Gamification Oversight ---');

    // 1. Analytics Telemetry
    const adminAnalytics = await makeRequest({
      method: 'GET',
      path: '/api/admin/gamification/analytics',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminAnalytics.status, 200);
    const metrics = adminAnalytics.data.data.metrics;
    assert(metrics.totalUsers !== undefined, 'Total users present');
    assert(metrics.totalXPDistributed !== undefined, 'Total XP present');
    console.log(`✓ Admin Analytics: Users=${metrics.totalUsers}, Total XP=${metrics.totalXPDistributed}, Avg XP=${metrics.averageUserXP}`);

    // 2. Users Table with Search and Filtering
    const adminUsers = await makeRequest({
      method: 'GET',
      path: '/api/admin/gamification/users?page=1&limit=5&sortBy=highest_xp',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminUsers.status, 200);
    assert(Array.isArray(adminUsers.data.data), 'Users list returned');
    console.log(`✓ Admin Users List: Page 1 returned ${adminUsers.data.data.length} creators`);

    // 3. Creator Dossier & Level Journey
    const dossier = await makeRequest({
      method: 'GET',
      path: `/api/admin/gamification/users/${testUser.id}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(dossier.status, 200);
    assert.strictEqual(dossier.data.data.user.id, testUser.id);

    const userJourney = await makeRequest({
      method: 'GET',
      path: `/api/gamification/user/${testUser.id}/journey`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(userJourney.status, 200);
    assert(Array.isArray(userJourney.data.data.journey), 'Journey array returned for user');
    console.log(`✓ Admin User Dossier & User Journey inspected for ${testUser.name}`);

    // 4. Admin XP Adjustment (Positive and Negative)
    const prevXP = dossier.data.data.user.totalXP;
    const adjustAdd = await makeRequest({
      method: 'POST',
      path: `/api/admin/gamification/users/${testUser.id}/adjust-xp`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { type: 'ADD', amount: 30, reason: 'Integration audit bonus verification' }
    });
    assert.strictEqual(adjustAdd.status, 200);
    assert.strictEqual(adjustAdd.data.data.newBalance, prevXP + 30);
    console.log(`✓ Admin Added +30 XP: ${prevXP} -> ${adjustAdd.data.data.newBalance}`);

    const adjustRemove = await makeRequest({
      method: 'POST',
      path: `/api/admin/gamification/users/${testUser.id}/adjust-xp`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { type: 'REMOVE', amount: 30, reason: 'Integration audit adjustment reversion' }
    });
    assert.strictEqual(adjustRemove.status, 200);
    assert.strictEqual(adjustRemove.data.data.newBalance, prevXP);
    console.log(`✓ Admin Deducted -30 XP: Reverted to balance ${adjustRemove.data.data.newBalance}`);

    // Verify creator XP history reflects the adjustment
    const adminUserHist = await makeRequest({
      method: 'GET',
      path: `/api/admin/gamification/users/${testUser.id}/history?limit=1`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminUserHist.status, 200);
    assert(adminUserHist.data.data[0].description.includes('Integration audit'), 'Ledger contains audit description');
    console.log('✓ Admin XP history ledger confirms audit adjustment recorded');

    // -------------------------------------------------------------
    // PHASE 5: Super Admin Command Center
    // -------------------------------------------------------------
    console.log('\n--- Phase 5: Super Admin Control Center ---');

    // 1. Overview Telemetry
    const saOverview = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/overview',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saOverview.status, 200);
    assert(saOverview.data.data.totalUsers >= 1, 'Total users in overview');
    console.log(`✓ Super Admin Overview: Total Users=${saOverview.data.data.totalUsers}, Active Levels=${saOverview.data.data.activeLevels}`);

    // 2. All Users Table
    const saUsers = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/users?page=1&limit=5',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saUsers.status, 200);
    assert(Array.isArray(saUsers.data.data));
    console.log(`✓ Super Admin Users Table: Loaded ${saUsers.data.data.length} users with velocity`);

    // 3. All Admins Oversight
    const saAdmins = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/admins',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saAdmins.status, 200);
    assert(Array.isArray(saAdmins.data.data));
    console.log(`✓ Super Admin Admins Oversight: Loaded ${saAdmins.data.data.length} administrators`);

    // 4. XP Transactions Explorer
    const saTxns = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/transactions?page=1&limit=5',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saTxns.status, 200);
    assert(Array.isArray(saTxns.data.data));
    console.log(`✓ Super Admin Transactions Explorer: ${saTxns.data.data.length} transactions returned`);

    // 5. Super Admin Analytics
    const saAnalytics = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/analytics',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saAnalytics.status, 200);
    assert(Array.isArray(saAnalytics.data.data.timeline), 'Timeline buckets returned');
    assert(Array.isArray(saAnalytics.data.data.categoryDistribution), 'Activity categories returned');
    console.log('✓ Super Admin Analytics: 30-day timeline and category telemetry verified');

    // 6. Dynamic XP Rules & Settings
    const saSettings = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/settings',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saSettings.status, 200);
    assert(Array.isArray(saSettings.data.data), 'Settings array present');
    console.log(`✓ Super Admin Settings: Current rules = ${saSettings.data.data.map(s => `${s.activity}=${s.xp}XP`).join(', ')}`);

    // 7. Super Admin Audit Logs
    const saAudit = await makeRequest({
      method: 'GET',
      path: '/api/super-admin/gamification/audit-logs?limit=5',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saAudit.status, 200);
    assert(Array.isArray(saAudit.data.data), 'Audit logs array returned');
    console.log(`✓ Super Admin Audit Logs: ${saAudit.data.data.length} audit logs retrieved`);

    // 8. Level Management Engine
    const saLevels = await makeRequest({
      method: 'GET',
      path: '/api/admin/levels',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(saLevels.status, 200);
    assert(Array.isArray(saLevels.data.data), 'Levels array returned');
    console.log(`✓ Super Admin Level Management: ${saLevels.data.data.length} active level tiers verified`);

    console.log('\n================================================================');
    console.log('🎉 AUDIT COMPLETE: ALL 15 INTEGRATION CHECKS PASSED PERFECTLY!');
    console.log('================================================================\n');

  } finally {
    if (server) server.close();
  }
}

// Start test runner
server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  try {
    await runGamificationIntegrationAudit();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ AUDIT FAILED:', err);
    process.exit(1);
  }
});
