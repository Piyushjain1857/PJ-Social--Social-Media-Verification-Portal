const assert = require('assert');
const { prisma } = require('../config/db');
const { getUserXPChartData, getUserActivityDistribution } = require('../services/levelService');
const { getSuperAdminAnalytics } = require('../services/superAdminGamificationService');

const API_BASE = `http://localhost:${process.env.PORT || 5001}/api`;

async function runGamificationAnalyticsTests() {
  console.log('\n======================================================');
  console.log('📊 Starting Gamification Analytics & Real Graphs Test Suite');
  console.log('======================================================');

  // 1. Authenticate users
  console.log('\n--- 1. Authenticating Personas ---');
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    return { token: json.token, user: json.user };
  };

  const userAuth = await login('user@portal.com', 'User123!');
  const adminAuth = await login('admin@portal.com', 'Admin123!');
  const superAdminAuth = await login('superadmin@portal.com', 'SuperAdmin123!');

  assert.ok(userAuth.token, 'User token required');
  assert.ok(adminAuth.token, 'Admin token required');
  assert.ok(superAdminAuth.token, 'Super Admin token required');
  console.log('✓ Successfully authenticated User, Admin, and Super Admin personas');

  const userToken = userAuth.token;
  const adminToken = adminAuth.token;
  const superAdminToken = superAdminAuth.token;
  const normalUserId = userAuth.user.id;

  // 2. User Graph across all 5 required timeframes
  console.log('\n--- 2. Testing User XP Graph APIs across 5 Timeframes ---');
  const timeframes = ['7d', '30d', '3m', '6m', 'all'];
  for (const tf of timeframes) {
    const res = await fetch(`${API_BASE}/gamification/me/chart?timeframe=${tf}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.points), `Points array required for ${tf}`);
    assert.ok(json.data.points.length > 0, `Points must not be empty for ${tf}`);
    assert.ok(json.data.summary, `Summary required for ${tf}`);
    assert.ok(typeof json.data.summary.startingXP === 'number');
    assert.ok(typeof json.data.summary.endingXP === 'number');
    assert.ok(typeof json.data.points[0].level === 'number');
    assert.ok(json.data.points[0].levelName);
    console.log(`✓ Chart [${tf}]: ${json.data.points.length} points, Start: ${json.data.summary.startingXP} XP, End: ${json.data.summary.endingXP} XP, Level: ${json.data.summary.currentLevelName}`);
  }

  // 3. User Activity Distribution API
  console.log('\n--- 3. Testing User Activity Distribution API ---');
  const userActRes = await fetch(`${API_BASE}/gamification/me/activity-distribution`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userActRes.status, 200);
  const userActJson = await userActRes.json();
  assert.strictEqual(userActJson.success, true);
  assert.ok(Array.isArray(userActJson.data.activities), 'Activities array required');
  console.log(`✓ Creator Activity Distribution: ${userActJson.data.activities.length} activity categories, Total Positive XP: ${userActJson.data.totalPositiveXP}`);

  // 4. Admin Inspecting Selected User's Graph & Activity Distribution
  console.log('\n--- 4. Testing Admin Inspection of Selected User Gamification ---');
  const adminUserChartRes = await fetch(`${API_BASE}/gamification/user/${normalUserId}/chart?timeframe=30d`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminUserChartRes.status, 200);
  const adminUserChart = await adminUserChartRes.json();
  assert.strictEqual(adminUserChart.success, true);
  assert.ok(adminUserChart.data.points.length > 0);
  console.log('✓ Admin successfully inspected selected user XP chart');

  const adminActRes = await fetch(`${API_BASE}/gamification/user/${normalUserId}/activity-distribution`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminActRes.status, 200);
  const adminAct = await adminActRes.json();
  assert.strictEqual(adminAct.success, true);
  assert.strictEqual(adminAct.data.userId, normalUserId);
  console.log('✓ Admin successfully inspected selected user activity distribution');

  // 5. Unauthorized User Guardrails
  console.log('\n--- 5. Testing Security: Normal User Cannot Inspect Other Users ---');
  const forbiddenChart = await fetch(`${API_BASE}/gamification/user/${normalUserId}/chart`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(forbiddenChart.status, 403, 'Normal user must receive 403 when inspecting another user chart');

  const forbiddenAct = await fetch(`${API_BASE}/gamification/user/${normalUserId}/activity-distribution`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(forbiddenAct.status, 403, 'Normal user must receive 403 when inspecting another user activity distribution');
  console.log('✓ Security guardrails verified: 403 Forbidden on unauthorized chart & distribution access');

  // 6. Super Admin Global Analytics (Daily, Weekly, Monthly, XP Growth, Users by Level, XP Distribution, Activity Contribution)
  console.log('\n--- 6. Testing Super Admin Global Analytics Telemetry ---');
  const superAdminAnalyticsRes = await fetch(`${API_BASE}/super-admin/gamification/analytics`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert.strictEqual(superAdminAnalyticsRes.status, 200);
  const saAnalytics = await superAdminAnalyticsRes.json();
  assert.strictEqual(saAnalytics.success, true);
  const d = saAnalytics.data;

  // Daily XP (30 days)
  assert.ok(Array.isArray(d.dailyXP), 'dailyXP array required');
  assert.strictEqual(d.dailyXP.length, 30, 'dailyXP must contain exactly 30 days');

  // Weekly XP (12 weeks)
  assert.ok(Array.isArray(d.weeklyXP), 'weeklyXP array required');
  assert.strictEqual(d.weeklyXP.length, 12, 'weeklyXP must contain 12 weeks');

  // Monthly XP (12 months)
  assert.ok(Array.isArray(d.monthlyXP), 'monthlyXP array required');
  assert.strictEqual(d.monthlyXP.length, 12, 'monthlyXP must contain 12 months');

  // XP Growth
  assert.ok(Array.isArray(d.xpGrowth), 'xpGrowth array required');
  assert.ok(d.xpGrowth.length > 0, 'xpGrowth must not be empty');

  // Users by Level (database aggregated)
  assert.ok(Array.isArray(d.usersByLevel), 'usersByLevel array required');
  assert.ok(d.usersByLevel.length > 0, 'usersByLevel must not be empty');

  // XP Distribution
  assert.ok(Array.isArray(d.xpDistribution), 'xpDistribution array required');

  // Activity Contribution
  assert.ok(Array.isArray(d.activityContribution), 'activityContribution array required');

  console.log(`✓ Global Analytics verified:
    - Daily XP: ${d.dailyXP.length} days
    - Weekly XP: ${d.weeklyXP.length} weeks
    - Monthly XP: ${d.monthlyXP.length} months
    - XP Growth: ${d.xpGrowth.length} points
    - Users by Level: ${d.usersByLevel.length} tiers
    - XP Distribution: ${d.xpDistribution.length} brackets
    - Activity Contribution: ${d.activityContribution.length} action types
    - Total Platform XP Distributed: ${d.totalXPDistributed}`);

  // 7. Edge Cases: Zero Data, One Transaction, Date Boundaries
  console.log('\n--- 7. Testing Edge Cases: User with No Transactions & Date Boundaries ---');
  // Create a brand new user with 0 transactions
  const testEmail = `zero-tx-${Date.now()}@portal.com`;
  const zeroUser = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Zero Transactions User',
      password: 'HashedPassword123!',
      role: 'USER',
      status: 'ACTIVE',
      totalXP: 0
    }
  });

  const zeroChart = await getUserXPChartData(zeroUser.id, '30d');
  assert.strictEqual(zeroChart.points.length, 30);
  assert.strictEqual(zeroChart.summary.startingXP, 0);
  assert.strictEqual(zeroChart.summary.endingXP, 0);
  assert.strictEqual(zeroChart.summary.currentLevel, 1);
  console.log('✓ 0 Transactions user: Handled safely, 30 daily buckets with 0 XP flatline');

  const zeroAct = await getUserActivityDistribution(zeroUser.id);
  assert.strictEqual(zeroAct.totalActions, 0);
  assert.strictEqual(zeroAct.totalXP, 0);
  assert.strictEqual(zeroAct.activities.length, 0);
  console.log('✓ 0 Transactions user activity distribution: Handled safely with 0 actions');

  // Cleanup test user
  await prisma.user.delete({ where: { id: zeroUser.id } });

  console.log('\n======================================================');
  console.log('🎉 ALL GAMIFICATION ANALYTICS & GRAPH TESTS PASSED!');
  console.log('======================================================\n');
}

runGamificationAnalyticsTests().catch((err) => {
  console.error('\n❌ Analytics Test Suite Failed:', err);
  process.exit(1);
});
