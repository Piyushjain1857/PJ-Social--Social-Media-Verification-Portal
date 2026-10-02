/**
 * Verification Test Suite for Upgraded Game Points & Gamification System
 */

const assert = require('assert');
const { prisma } = require('../config/db');
const {
  getUserRankMetrics,
  getUserXPChartData,
  getUserRankHistory,
  getUserGamificationProfile
} = require('../services/levelService');

const API_BASE = 'http://localhost:5001/api';

async function authenticate(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function runGamePointsTests() {
  console.log('\n======================================================');
  console.log('🎮 Starting Game Points Verification Test Suite');
  console.log('======================================================\n');

  // 1. Authenticate personas
  console.log('--- 1. Authenticating Personas ---');
  const user = await authenticate('user@portal.com', 'User123!');
  const admin = await authenticate('admin@portal.com', 'Admin123!');
  const superAdmin = await authenticate('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Normal User, Admin, and Super Admin authenticated successfully');

  // 2. Test GET /api/gamification/me
  console.log('\n--- 2. Testing GET /api/gamification/me ---');
  const meRes = await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(meRes.status, 200);
  const meJson = await meRes.json();
  assert.strictEqual(meJson.success, true);
  const meData = meJson.data;

  assert.ok(typeof meData.totalXP === 'number', 'totalXP should be a number');
  assert.ok(typeof meData.currentLevel === 'number', 'currentLevel should be a number');
  assert.ok(typeof meData.levelName === 'string', 'levelName should be a string');
  assert.ok(typeof meData.rank === 'number', 'rank should be a number');
  assert.ok(typeof meData.totalParticipants === 'number', 'totalParticipants should be a number');
  assert.ok(typeof meData.percentileAhead === 'number', 'percentileAhead should be a number');
  assert.ok(typeof meData.recentXP === 'number', 'recentXP should be a number');
  console.log(`✓ /api/gamification/me: Level ${meData.currentLevel} (${meData.levelName}), ${meData.totalXP} XP, Rank #${meData.rank}/${meData.totalParticipants}, Ahead of ${meData.percentileAhead}%`);

  // 3. Test GET /api/gamification/me/rank
  console.log('\n--- 3. Testing GET /api/gamification/me/rank ---');
  const rankRes = await fetch(`${API_BASE}/gamification/me/rank`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(rankRes.status, 200);
  const rankJson = await rankRes.json();
  assert.strictEqual(rankJson.success, true);
  const rankData = rankJson.data;

  assert.strictEqual(rankData.rank, meData.rank, 'Rank from /rank must match rank from /me');
  assert.strictEqual(rankData.totalParticipants, meData.totalParticipants);
  assert.ok(rankData.percentileAhead >= 0 && rankData.percentileAhead <= 100);
  assert.ok(typeof rankData.usersBehind === 'number');
  assert.ok(typeof rankData.pointsToNextRank === 'number');
  console.log(`✓ /api/gamification/me/rank: Rank #${rankData.rank} out of ${rankData.totalParticipants} users, ${rankData.usersBehind} behind, ${rankData.percentileAhead}% ahead`);

  // 4. Test GET /api/gamification/me/chart across all 5 timeframes
  console.log('\n--- 4. Testing GET /api/gamification/me/chart with all timeframes ---');
  const timeframes = ['7d', '30d', '3m', '6m', 'all'];
  for (const tf of timeframes) {
    const chartRes = await fetch(`${API_BASE}/gamification/me/chart?timeframe=${tf}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    assert.strictEqual(chartRes.status, 200);
    const chartJson = await chartRes.json();
    assert.strictEqual(chartJson.success, true);
    assert.ok(Array.isArray(chartJson.data.points), `Points should be an array for ${tf}`);
    assert.ok(chartJson.data.points.length > 0, `Points array should not be empty for ${tf}`);
    assert.ok(chartJson.data.summary, `Summary should exist for ${tf}`);
    
    // Check structure of first point
    const firstPt = chartJson.data.points[0];
    assert.ok(firstPt.date, 'Point must have date');
    assert.ok(typeof firstPt.xp === 'number', 'Point must have numerical cumulative XP');
    assert.ok(typeof firstPt.level === 'number', 'Point must have level number');
    assert.ok(firstPt.levelName, 'Point must have level name');
    console.log(`✓ Chart [${tf}]: ${chartJson.data.points.length} points, Start: ${chartJson.data.summary.startingXP} XP, End: ${chartJson.data.summary.endingXP} XP, Level: ${chartJson.data.summary.currentLevelName}`);
  }

  // 5. Test GET /api/gamification/me/rank-history
  console.log('\n--- 5. Testing GET /api/gamification/me/rank-history ---');
  const rankHistRes = await fetch(`${API_BASE}/gamification/me/rank-history`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(rankHistRes.status, 200);
  const rankHistJson = await rankHistRes.json();
  assert.strictEqual(rankHistJson.success, true);
  const histData = rankHistJson.data;

  assert.ok(Array.isArray(histData.timeline), 'Timeline should be array');
  assert.ok(histData.timeline.length > 0, 'Timeline should contain monthly snapshots');
  assert.ok(['upward', 'downward', 'stable'].includes(histData.trend), 'Trend must be upward, downward, or stable');
  assert.ok(typeof histData.currentRank === 'number');
  assert.ok(typeof histData.initialRank === 'number');
  assert.ok(typeof histData.rankChange === 'number');
  console.log(`✓ Rank History: ${histData.timeline.length} monthly snapshots, Trend: "${histData.trend}", Initial: #${histData.initialRank} -> Current: #${histData.currentRank}`);

  // 6. Test GET /api/gamification/me/history
  console.log('\n--- 6. Testing GET /api/gamification/me/history with Action, Source, & XP ---');
  const txRes = await fetch(`${API_BASE}/gamification/me/history?limit=5`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(txRes.status, 200);
  const txJson = await txRes.json();
  assert.strictEqual(txJson.success, true);
  assert.ok(Array.isArray(txJson.data));
  assert.ok(txJson.pagination);
  if (txJson.data.length > 0) {
    const item = txJson.data[0];
    assert.ok(item.actionType, 'Item must have actionType');
    assert.ok(item.actionName, 'Item must have formatted actionName');
    assert.ok(item.icon, 'Item must have action icon');
    assert.ok(typeof item.xp === 'number', 'Item must have numerical XP');
    assert.ok(item.source, 'Item must have source');
    assert.ok(item.date, 'Item must have date');
    console.log(`✓ XP History: Returned ${txJson.data.length} records. Sample: ${item.icon} ${item.actionName} (+${item.xp} XP) from ${item.source} on ${item.date}`);
  }

  // 7. Security: Verify Normal User cannot access other users' gamification data
  console.log('\n--- 7. Testing RBAC Security Guardrails ---');
  const forbiddenRes = await fetch(`${API_BASE}/gamification/user/${admin.user.id}`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(forbiddenRes.status, 403, 'Normal user must be forbidden from inspecting other users');
  console.log('✓ Security verified: Normal user receives 403 on /api/gamification/user/:id');

  // 8. Admin / Super Admin can inspect user gamification data
  console.log('\n--- 8. Testing Admin User Gamification Inspection ---');
  const adminInspectRes = await fetch(`${API_BASE}/gamification/user/${user.user.id}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(adminInspectRes.status, 200, 'Admin should be able to inspect user gamification');
  const inspectData = await adminInspectRes.json();
  assert.strictEqual(inspectData.success, true);
  assert.strictEqual(inspectData.data.totalXP, meData.totalXP);
  console.log(`✓ Admin inspected user ${user.user.name}: ${inspectData.data.totalXP} XP, Level ${inspectData.data.currentLevel}`);

  // 9. Verifying Admin & Super Admin Do Not Have Game Points
  console.log('\n--- 9. Verifying Admin & Super Admin Do Not Have Game Points ---');
  
  // 9a. Admin calling /api/gamification/me
  const adminMeRes = await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(adminMeRes.status, 200);
  const adminMe = await adminMeRes.json();
  assert.strictEqual(adminMe.data.isParticipant, false, 'Admin must not be a gamification participant');
  assert.strictEqual(adminMe.data.totalXP, 0, 'Admin totalXP must be 0');
  assert.strictEqual(adminMe.data.rank, null, 'Admin must not have a player rank');
  console.log('✓ Admin /api/gamification/me returns isParticipant: false, totalXP: 0, rank: null');

  // 9b. Super Admin calling /api/gamification/me/rank
  const superAdminRankRes = await fetch(`${API_BASE}/gamification/me/rank`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(superAdminRankRes.status, 200);
  const superAdminRank = await superAdminRankRes.json();
  assert.strictEqual(superAdminRank.data.isParticipant, false, 'Super Admin must not have a player rank');
  assert.strictEqual(superAdminRank.data.rank, null);
  console.log('✓ Super Admin /api/gamification/me/rank returns isParticipant: false, rank: null');

  // 9c. Super Admin attempting to allocate points to Admin account
  const adjustAdminRes = await fetch(`${API_BASE}/points/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdmin.token}`
    },
    body: JSON.stringify({
      userId: admin.user.id,
      points: 100,
      reason: 'Testing admin points protection'
    })
  });
  assert.strictEqual(adjustAdminRes.status, 400, 'Attempting to allocate points to an Admin must fail with 400');
  const adjustAdminJson = await adjustAdminRes.json();
  assert.strictEqual(adjustAdminJson.code, 'ADMIN_CANNOT_HAVE_POINTS');
  console.log('✓ Blocked awarding points to Admin: ADMIN_CANNOT_HAVE_POINTS');

  // 9d. Leaderboard verification: Only normal USER accounts appear on the leaderboard
  const lbRes = await fetch(`${API_BASE}/points/leaderboard?limit=100`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(lbRes.status, 200);
  const lbJson = await lbRes.json();
  const rows = lbJson.data?.leaderboard || (Array.isArray(lbJson.data) ? lbJson.data : []);
  const nonUsersOnLeaderboard = rows.filter(u => u.role && u.role !== 'USER');
  assert.strictEqual(nonUsersOnLeaderboard.length, 0, 'Leaderboard must contain 0 non-USER accounts');
  console.log('✓ Leaderboard verification: 100% of ranked participants are normal USER accounts');

  console.log('\n======================================================');
  console.log('🎉 ALL GAME POINTS VERIFICATION TESTS PASSED!');
  console.log('======================================================\n');
}

runGamePointsTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
