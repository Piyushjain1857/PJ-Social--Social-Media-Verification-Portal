const assert = require('assert');

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
  if (!res.ok || !data.token) {
    throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function runAdminGamificationTests() {
  console.log('\n======================================================');
  console.log('🛡️ Starting Admin Gamification Management Test Suite');
  console.log('======================================================\n');

  // 1. Authenticate Personas
  console.log('--- 1. Authenticating Personas ---');
  const user = await authenticate('user@portal.com', 'User123!');
  const admin = await authenticate('admin@portal.com', 'Admin123!');
  const superAdmin = await authenticate('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Normal User, Admin, and Super Admin authenticated successfully');

  // 2. Testing Strict RBAC Protection (Normal User must receive 403)
  console.log('\n--- 2. Testing Strict RBAC Protection on Admin Endpoints ---');
  const forbiddenAnalytics = await fetch(`${API_BASE}/admin/gamification/analytics`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(forbiddenAnalytics.status, 403, 'Normal user must receive 403 on analytics');

  const forbiddenUsers = await fetch(`${API_BASE}/admin/gamification/users`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(forbiddenUsers.status, 403, 'Normal user must receive 403 on users list');

  const forbiddenAdjust = await fetch(`${API_BASE}/admin/gamification/users/${user.user.id}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`
    },
    body: JSON.stringify({ type: 'ADD', amount: 50, reason: 'Unauthorized attempt' })
  });
  assert.strictEqual(forbiddenAdjust.status, 403, 'Normal user must receive 403 on adjust-xp');
  console.log('✓ Security verified: Normal user is strictly forbidden (403) from all admin gamification endpoints');

  // 3. Testing GET /api/admin/gamification/analytics
  console.log('\n--- 3. Testing GET /api/admin/gamification/analytics ---');
  const analyticsRes = await fetch(`${API_BASE}/admin/gamification/analytics`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(analyticsRes.status, 200);
  const analyticsJson = await analyticsRes.json();
  assert.strictEqual(analyticsJson.success, true);
  const { metrics, xpDistribution, activityDistribution, topUsers } = analyticsJson.data;

  assert.ok(typeof metrics.totalUsers === 'number', 'totalUsers should be numeric');
  assert.ok(typeof metrics.totalXPDistributed === 'number', 'totalXPDistributed should be numeric');
  assert.ok(typeof metrics.averageUserXP === 'number', 'averageUserXP should be numeric');
  assert.ok(typeof metrics.highestXP === 'number', 'highestXP should be numeric');
  assert.ok(typeof metrics.highestLevel === 'number', 'highestLevel should be numeric');
  assert.ok(Array.isArray(xpDistribution), 'xpDistribution should be an array');
  assert.ok(Array.isArray(activityDistribution), 'activityDistribution should be an array');
  assert.ok(Array.isArray(topUsers), 'topUsers should be an array');
  console.log(`✓ Analytics telemetry verified: Total Creators=${metrics.totalUsers}, Total XP=${metrics.totalXPDistributed}, Avg XP=${metrics.averageUserXP}, Highest XP=${metrics.highestXP}`);

  // 4. Testing GET /api/admin/gamification/users with Search & Filters
  console.log('\n--- 4. Testing GET /api/admin/gamification/users ---');
  const usersRes = await fetch(`${API_BASE}/admin/gamification/users?page=1&limit=10&sortBy=highest_xp`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(usersRes.status, 200);
  const usersJson = await usersRes.json();
  assert.strictEqual(usersJson.success, true);
  assert.ok(Array.isArray(usersJson.data), 'data should be an array of users');
  assert.ok(usersJson.pagination && usersJson.pagination.totalUsers > 0, 'pagination should reflect users');

  const firstUser = usersJson.data[0];
  assert.ok(firstUser.id, 'User must have id');
  assert.ok(firstUser.name, 'User must have name');
  assert.ok(firstUser.email, 'User must have email');
  assert.ok(typeof firstUser.totalXP === 'number', 'User must have totalXP');
  assert.ok(typeof firstUser.currentLevel === 'number', 'User must have currentLevel');
  assert.ok(firstUser.levelName, 'User must have levelName');
  assert.ok(typeof firstUser.rank === 'number', 'User must have rank');
  assert.ok(firstUser.lastActivity, 'User must have lastActivity');
  console.log(`✓ Users list: Sample creator ${firstUser.name} (${firstUser.email}) — Level ${firstUser.currentLevel} ${firstUser.levelName}, ${firstUser.totalXP} XP, Rank #${firstUser.rank}, Last Activity: "${firstUser.lastActivity}"`);

  // 4b. Testing search filter
  const searchRes = await fetch(`${API_BASE}/admin/gamification/users?search=${encodeURIComponent(user.user.email)}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(searchRes.status, 200);
  const searchJson = await searchRes.json();
  assert.ok(searchJson.data.some(u => u.email === user.user.email), 'Search by email must return target user');
  console.log(`✓ Search filter successfully located creator by email: ${user.user.email}`);

  // 5. Testing GET /api/admin/gamification/users/:id (Dossier)
  console.log('\n--- 5. Testing GET /api/admin/gamification/users/:id ---');
  const dossierRes = await fetch(`${API_BASE}/admin/gamification/users/${user.user.id}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(dossierRes.status, 200);
  const dossierJson = await dossierRes.json();
  assert.strictEqual(dossierJson.success, true);
  assert.strictEqual(dossierJson.data.user.id, user.user.id);
  assert.ok(dossierJson.data.profile, 'Dossier must include profile');
  assert.ok(Array.isArray(dossierJson.data.chartData), 'Dossier must include chartData');
  assert.ok(Array.isArray(dossierJson.data.rankHistory), 'Dossier must include rankHistory');
  assert.ok(Array.isArray(dossierJson.data.recentHistory), 'Dossier must include recentHistory');
  assert.ok(Array.isArray(dossierJson.data.levelJourney), 'Dossier must include levelJourney');
  console.log(`✓ Dossier verified for ${dossierJson.data.user.name}: Level ${dossierJson.data.profile.currentLevel}, ${dossierJson.data.profile.totalXP} XP, ${dossierJson.data.levelJourney.length} level tiers`);

  // 6. Testing Validation on POST /api/admin/gamification/users/:id/adjust-xp
  console.log('\n--- 6. Testing XP Adjustment Input Validations ---');
  const missingReasonRes = await fetch(`${API_BASE}/admin/gamification/users/${user.user.id}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({ type: 'ADD', amount: 50, reason: '' })
  });
  assert.strictEqual(missingReasonRes.status, 400, 'Adjustment with missing reason must fail with 400');

  const invalidAmountRes = await fetch(`${API_BASE}/admin/gamification/users/${user.user.id}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({ type: 'ADD', amount: 0, reason: 'Valid reason' })
  });
  assert.strictEqual(invalidAmountRes.status, 400, 'Adjustment with 0 amount must fail with 400');

  const adminTargetRes = await fetch(`${API_BASE}/admin/gamification/users/${admin.user.id}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdmin.token}`
    },
    body: JSON.stringify({ type: 'ADD', amount: 50, reason: 'Invalid target' })
  });
  assert.strictEqual(adminTargetRes.status, 400, 'Adjusting XP on administrative account must fail with 400');
  console.log('✓ Validation rules verified: reason mandatory, amount > 0, admin accounts protected');

  // 7. Testing Successful XP Add Adjustment
  console.log('\n--- 7. Testing Admin Adding XP (+50 XP) ---');
  const initialXP = dossierJson.data.profile.totalXP;
  const adjustAddRes = await fetch(`${API_BASE}/admin/gamification/users/${user.user.id}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'Community Hackathon 1st Place Bonus'
    })
  });
  assert.strictEqual(adjustAddRes.status, 200);
  const adjustAddJson = await adjustAddRes.json();
  assert.strictEqual(adjustAddJson.success, true);
  assert.strictEqual(adjustAddJson.data.newXP, initialXP + 50);
  console.log(`✓ Admin added +50 XP: Previous XP=${initialXP} -> New XP=${adjustAddJson.data.newXP}, Level ${adjustAddJson.data.level} (${adjustAddJson.data.levelName})`);

  // 8. Testing Successful XP Remove Adjustment
  console.log('\n--- 8. Testing Admin Deducting XP (-20 XP) ---');
  const adjustRemoveRes = await fetch(`${API_BASE}/admin/gamification/users/${user.user.id}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'REMOVE',
      amount: 20,
      reason: 'Correction of duplicate event attendance credit'
    })
  });
  assert.strictEqual(adjustRemoveRes.status, 200);
  const adjustRemoveJson = await adjustRemoveRes.json();
  assert.strictEqual(adjustRemoveJson.success, true);
  assert.strictEqual(adjustRemoveJson.data.newXP, initialXP + 30);
  console.log(`✓ Admin removed -20 XP: New XP=${adjustRemoveJson.data.newXP}`);

  // 9. Testing Audit Log Creation
  console.log('\n--- 9. Verifying Audit Log Entry ---');
  const auditRes = await fetch(`${API_BASE}/superadmin/audit-logs?limit=5`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(auditRes.status, 200);
  const auditJson = await auditRes.json();
  const xpLogs = (auditJson.data || auditJson.logs || []).filter(l => l.action === 'XP_ADJUSTMENT');
  assert.ok(xpLogs.length > 0, 'Audit log must record XP_ADJUSTMENT action');
  const latestAudit = xpLogs[0];
  console.log(`✓ Audit log verified: Actor="${latestAudit.actor}", Action="${latestAudit.action}", Details="${latestAudit.details}"`);

  // 10. Testing User History shows the adjustment
  console.log('\n--- 10. Verifying Creator XP History Ledger ---');
  const historyRes = await fetch(`${API_BASE}/admin/gamification/users/${user.user.id}/history`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(historyRes.status, 200);
  const historyJson = await historyRes.json();
  assert.strictEqual(historyJson.success, true);
  const latestHistory = historyJson.data[0];
  assert.ok(
    latestHistory.actionType === 'ADMIN_ADJUSTMENT' || latestHistory.actionType === 'ADJUSTMENT',
    `Expected ADMIN_ADJUSTMENT or ADJUSTMENT, got: ${latestHistory.actionType}`
  );
  console.log(`✓ XP History ledger verified: Latest entry is "${latestHistory.actionName}" (${latestHistory.xp > 0 ? '+' : ''}${latestHistory.xp} XP) - "${latestHistory.description}"`);

  console.log('\n======================================================');
  console.log('🎉 ALL ADMIN GAMIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runAdminGamificationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
