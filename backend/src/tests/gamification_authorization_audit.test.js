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
  if (!data.token) {
    throw new Error(`Auth failed for ${email}: No token received`);
  }
  return { token: data.token, user: data.user };
}

function verifyNoSensitiveLeak(body) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  assert.ok(!bodyStr.includes('PrismaClientKnownRequestError'), 'Error must not leak Prisma internal errors');
  assert.ok(!bodyStr.includes('node_modules'), 'Error must not leak internal node_modules paths');
  assert.ok(!bodyStr.includes('Users/piyush'), 'Error must not leak internal filesystem paths');
  assert.ok(!bodyStr.includes('password'), 'Error must not leak password fields');
  assert.ok(!bodyStr.includes('secret'), 'Error must not leak secret keys');
}

async function runAuthorizationAudit() {
  console.log('\n===============================================================');
  console.log('🛡️  Gamification System Complete Authorization Audit Test Suite');
  console.log('===============================================================\n');

  // Authenticate Personas
  console.log('--- Phase 0: Authenticating Personas ---');
  const userPersona = await authenticate('user@portal.com', 'User123!');
  const adminPersona = await authenticate('admin@portal.com', 'Admin123!');
  const superAdminPersona = await authenticate('superadmin@portal.com', 'SuperAdmin123!');

  const userHeaders = { Authorization: `Bearer ${userPersona.token}` };
  const adminHeaders = { Authorization: `Bearer ${adminPersona.token}` };
  const saHeaders = { Authorization: `Bearer ${superAdminPersona.token}` };

  console.log(`✓ Normal User Authenticated: ${userPersona.user.email} (Role: ${userPersona.user.role})`);
  console.log(`✓ Admin Authenticated: ${adminPersona.user.email} (Role: ${adminPersona.user.role})`);
  console.log(`✓ Super Admin Authenticated: ${superAdminPersona.user.email} (Role: ${superAdminPersona.user.role})`);

  // Target User ID for testing cross-user attacks
  const targetUserId = userPersona.user.id;
  const adminUserId = adminPersona.user.id;
  const saUserId = superAdminPersona.user.id;

  // =========================================================================
  // ATTACK 1: Normal User attempting Admin API
  // =========================================================================
  console.log('\n--- Attack 1: Normal User attempting Admin API ---');
  const adminEndpoints = [
    { method: 'GET', url: `${API_BASE}/admin/gamification/analytics`, desc: 'Admin Gamification Analytics' },
    { method: 'GET', url: `${API_BASE}/admin/gamification/users`, desc: 'Admin Users Directory' },
    { method: 'GET', url: `${API_BASE}/admin/gamification/users/${targetUserId}`, desc: 'Admin User Dossier' },
    { method: 'GET', url: `${API_BASE}/admin/gamification/users/${targetUserId}/history`, desc: 'Admin User History' },
    { method: 'GET', url: `${API_BASE}/points/admin/overview`, desc: 'Points Admin Overview' },
    { method: 'GET', url: `${API_BASE}/admin/levels/configuration`, desc: 'Level Configuration Telemetry' },
    { method: 'GET', url: `${API_BASE}/admin/levels`, desc: 'Admin Levels List' },
  ];

  for (const ep of adminEndpoints) {
    const res = await fetch(ep.url, { method: ep.method, headers: userHeaders });
    assert.strictEqual(res.status, 403, `Normal user must receive 403 on ${ep.desc} (${ep.url})`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Forbidden');
    verifyNoSensitiveLeak(data);
    console.log(`  ✓ Blocked with 403: Normal user -> ${ep.desc}`);
  }

  // =========================================================================
  // ATTACK 2: Normal User attempting another user's XP API
  // =========================================================================
  console.log('\n--- Attack 2: Normal User attempting another user\'s XP API ---');
  const crossUserEndpoints = [
    { method: 'GET', url: `${API_BASE}/gamification/user/${adminUserId}`, desc: 'Inspect Other User Gamification Profile' },
    { method: 'GET', url: `${API_BASE}/gamification/user/${adminUserId}/chart`, desc: 'Inspect Other User XP Chart' },
    { method: 'GET', url: `${API_BASE}/gamification/user/${adminUserId}/rank`, desc: 'Inspect Other User Rank' },
    { method: 'GET', url: `${API_BASE}/gamification/user/${adminUserId}/rank-history`, desc: 'Inspect Other User Rank History' },
    { method: 'GET', url: `${API_BASE}/gamification/user/${adminUserId}/journey`, desc: 'Inspect Other User Level Journey' },
    { method: 'GET', url: `${API_BASE}/gamification/user/${adminUserId}/activity-distribution`, desc: 'Inspect Other User Activity Breakdown' },
    { method: 'GET', url: `${API_BASE}/points/user/${adminUserId}`, desc: 'Inspect Other User Points Balance' },
  ];

  for (const ep of crossUserEndpoints) {
    const res = await fetch(ep.url, { method: ep.method, headers: userHeaders });
    assert.strictEqual(res.status, 403, `Normal user must receive 403 on ${ep.desc} (${ep.url})`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Forbidden');
    verifyNoSensitiveLeak(data);
    console.log(`  ✓ Blocked with 403: Normal user -> ${ep.desc}`);
  }

  // =========================================================================
  // ATTACK 3: Normal User attempting XP adjustment
  // =========================================================================
  console.log('\n--- Attack 3: Normal User attempting XP adjustment ---');
  const adjustEndpoints = [
    {
      url: `${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`,
      body: { type: 'ADD', amount: 500, reason: 'Malicious self-grant attempt' },
      desc: 'Admin XP Adjustment Endpoint'
    },
    {
      url: `${API_BASE}/points/adjust`,
      body: { userId: targetUserId, points: 500, reason: 'Malicious points grant attempt' },
      desc: 'Points Adjustment Endpoint'
    },
    {
      url: `${API_BASE}/super-admin/gamification/users/${targetUserId}/adjust-xp`,
      body: { type: 'ADD', amount: 500, reason: 'Malicious Super Admin adjust attempt' },
      desc: 'Super Admin XP Adjustment Endpoint'
    }
  ];

  for (const ep of adjustEndpoints) {
    const res = await fetch(ep.url, {
      method: 'POST',
      headers: { ...userHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(ep.body)
    });
    assert.strictEqual(res.status, 403, `Normal user must receive 403 on ${ep.desc}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Forbidden');
    verifyNoSensitiveLeak(data);
    console.log(`  ✓ Blocked with 403: Normal user -> ${ep.desc}`);
  }

  // =========================================================================
  // ATTACK 4: Admin attempting Super Admin level-management API
  // =========================================================================
  console.log('\n--- Attack 4: Admin attempting Super Admin level-management API ---');
  const levelMgmtEndpoints = [
    { method: 'GET', url: `${API_BASE}/admin/levels/configuration`, desc: 'Get Level Configuration' },
    { method: 'GET', url: `${API_BASE}/admin/levels`, desc: 'List Levels Configuration' },
    {
      method: 'POST',
      url: `${API_BASE}/admin/levels/generate`,
      body: { count: 30, xpPerLevel: 200, confirmModify: true },
      desc: 'Bulk Generate Levels'
    },
    {
      method: 'POST',
      url: `${API_BASE}/admin/levels`,
      body: { levelNumber: 99, name: 'Hacker Level', xpRequired: 99999 },
      desc: 'Create Single Level'
    },
    {
      method: 'PUT',
      url: `${API_BASE}/admin/levels/mock-id`,
      body: { name: 'Compromised Name' },
      desc: 'Update Level'
    },
    {
      method: 'PATCH',
      url: `${API_BASE}/admin/levels/mock-id/status`,
      body: { isActive: false },
      desc: 'Toggle Level Status'
    },
    {
      method: 'DELETE',
      url: `${API_BASE}/admin/levels/mock-id`,
      body: { force: true },
      desc: 'Delete Level'
    }
  ];

  for (const ep of levelMgmtEndpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined
    });
    assert.strictEqual(res.status, 403, `Admin must receive 403 on Level Management: ${ep.desc}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Forbidden');
    verifyNoSensitiveLeak(data);
    console.log(`  ✓ Blocked with 403: Admin -> ${ep.desc}`);
  }

  // =========================================================================
  // ATTACK 5: Admin attempting XP-rule modification
  // =========================================================================
  console.log('\n--- Attack 5: Admin attempting XP-rule modification ---');
  const ruleEndpoints = [
    {
      method: 'PUT',
      url: `${API_BASE}/super-admin/gamification/settings`,
      body: {
        updates: [{ activityType: 'LIKE', points: 999 }],
        reason: 'Unauthorized rule tampering'
      },
      desc: 'Update Gamification Activity Rules'
    },
    {
      method: 'GET',
      url: `${API_BASE}/super-admin/gamification/settings`,
      desc: 'Inspect Gamification Rule Settings'
    }
  ];

  for (const ep of ruleEndpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined
    });
    assert.strictEqual(res.status, 403, `Admin must receive 403 on XP-rule API: ${ep.desc}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Forbidden');
    verifyNoSensitiveLeak(data);
    console.log(`  ✓ Blocked with 403: Admin -> ${ep.desc}`);
  }

  // =========================================================================
  // ATTACK 6: Admin attempting another protected Super Admin API
  // =========================================================================
  console.log('\n--- Attack 6: Admin attempting another protected Super Admin API ---');
  const saProtectedEndpoints = [
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/overview`, desc: 'Global Overview Telemetry' },
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/users`, desc: 'Super Admin User Directory' },
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/admins`, desc: 'Super Admin Admin Directory' },
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/transactions`, desc: 'Super Admin XP Transaction Explorer' },
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/analytics`, desc: 'Super Admin Advanced Analytics' },
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/audit-logs`, desc: 'Super Admin Gamification Audit Logs' },
    {
      method: 'POST',
      url: `${API_BASE}/super-admin/gamification/users/${targetUserId}/adjust-xp`,
      body: { type: 'ADD', amount: 50, reason: 'Admin attempt on Super Admin endpoint' },
      desc: 'Super Admin Exclusive adjust-xp Endpoint'
    },
    { method: 'GET', url: `${API_BASE}/points/all`, desc: 'Super Admin All Transactions Audit' },
    {
      method: 'POST',
      url: `${API_BASE}/points/adjust`,
      body: { userId: targetUserId, points: 5, reason: 'Admin attempt on Super Admin points adjust' },
      desc: 'Super Admin points adjust endpoint'
    }
  ];

  for (const ep of saProtectedEndpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined
    });
    assert.strictEqual(res.status, 403, `Admin must receive 403 on Super Admin API: ${ep.desc}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Forbidden');
    verifyNoSensitiveLeak(data);
    console.log(`  ✓ Blocked with 403: Admin -> ${ep.desc}`);
  }

  // =========================================================================
  // ATTACK 7: Unauthenticated API access
  // =========================================================================
  console.log('\n--- Attack 7: Unauthenticated API access across endpoints ---');
  const unauthEndpoints = [
    { method: 'GET', url: `${API_BASE}/gamification/me`, desc: 'User Own Gamification Profile' },
    { method: 'GET', url: `${API_BASE}/gamification/me/chart`, desc: 'User Own XP Chart' },
    { method: 'GET', url: `${API_BASE}/gamification/me/rank`, desc: 'User Own Rank' },
    { method: 'GET', url: `${API_BASE}/gamification/me/rank-history`, desc: 'User Own Rank History' },
    { method: 'GET', url: `${API_BASE}/gamification/me/history`, desc: 'User Own History' },
    { method: 'GET', url: `${API_BASE}/gamification/me/journey`, desc: 'User Own Level Journey' },
    { method: 'GET', url: `${API_BASE}/gamification/me/activity-distribution`, desc: 'User Own Activity Breakdown' },
    { method: 'GET', url: `${API_BASE}/gamification/levels`, desc: 'Levels List' },
    { method: 'GET', url: `${API_BASE}/gamification/leaderboard`, desc: 'Leaderboard' },
    { method: 'GET', url: `${API_BASE}/points/me`, desc: 'User Points Profile' },
    { method: 'GET', url: `${API_BASE}/points/me/history`, desc: 'User Points History' },
    { method: 'GET', url: `${API_BASE}/points/me/rank`, desc: 'User Points Rank' },
    { method: 'GET', url: `${API_BASE}/admin/gamification/analytics`, desc: 'Admin Gamification Analytics' },
    { method: 'GET', url: `${API_BASE}/admin/gamification/users`, desc: 'Admin Gamification Users' },
    { method: 'GET', url: `${API_BASE}/admin/levels/configuration`, desc: 'Admin Level Configuration' },
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/overview`, desc: 'Super Admin Overview' },
    { method: 'GET', url: `${API_BASE}/super-admin/gamification/settings`, desc: 'Super Admin Settings' },
    {
      method: 'POST',
      url: `${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`,
      body: { type: 'ADD', amount: 10, reason: 'No auth attempt' },
      desc: 'Admin Adjust XP'
    },
    {
      method: 'POST',
      url: `${API_BASE}/points/adjust`,
      body: { userId: targetUserId, points: 10, reason: 'No auth attempt' },
      desc: 'Points Adjust'
    }
  ];

  for (const ep of unauthEndpoints) {
    // 1. Missing Authorization header completely
    const resNoAuth = await fetch(ep.url, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined
    });
    assert.strictEqual(resNoAuth.status, 401, `Unauthenticated request must receive 401 on ${ep.desc}`);
    const dataNoAuth = await resNoAuth.json();
    assert.strictEqual(dataNoAuth.success, false);
    assert.strictEqual(dataNoAuth.error, 'Unauthorized');
    assert.strictEqual(dataNoAuth.code, 'UNAUTHORIZED');
    verifyNoSensitiveLeak(dataNoAuth);

    // 2. Invalid / Tampered token
    const resBadToken = await fetch(ep.url, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.tampered.token.12345'
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined
    });
    assert.strictEqual(resBadToken.status, 401, `Invalid token request must receive 401 on ${ep.desc}`);
    const dataBadToken = await resBadToken.json();
    assert.strictEqual(dataBadToken.success, false);
    assert.strictEqual(dataBadToken.error, 'Unauthorized');
    verifyNoSensitiveLeak(dataBadToken);

    console.log(`  ✓ Blocked with 401 (no token & invalid token): -> ${ep.desc}`);
  }

  // =========================================================================
  // VERIFICATION 8: Authorized Role Operations Succeed
  // =========================================================================
  console.log('\n--- Phase 8: Verifying Legitimate Access by Hierarchy Level ---');

  // 8.1 Normal User legitimate operations
  console.log('Testing Normal User Authorized Actions:');
  const userMeRes = await fetch(`${API_BASE}/gamification/me`, { headers: userHeaders });
  assert.strictEqual(userMeRes.status, 200, 'Normal user can view own profile');
  const userChartRes = await fetch(`${API_BASE}/gamification/me/chart?timeframe=30d`, { headers: userHeaders });
  assert.strictEqual(userChartRes.status, 200, 'Normal user can view own chart');
  const userRankRes = await fetch(`${API_BASE}/gamification/me/rank`, { headers: userHeaders });
  assert.strictEqual(userRankRes.status, 200, 'Normal user can view own rank');
  const userHistRes = await fetch(`${API_BASE}/gamification/me/history`, { headers: userHeaders });
  assert.strictEqual(userHistRes.status, 200, 'Normal user can view own history');
  const userJourneyRes = await fetch(`${API_BASE}/gamification/me/journey`, { headers: userHeaders });
  assert.strictEqual(userJourneyRes.status, 200, 'Normal user can view own journey');
  console.log('  ✓ Normal User legitimate endpoints verified (200 OK)');

  // 8.2 Admin legitimate operations
  console.log('Testing Admin Authorized Actions:');
  const adminViewUserRes = await fetch(`${API_BASE}/gamification/user/${targetUserId}`, { headers: adminHeaders });
  assert.strictEqual(adminViewUserRes.status, 200, 'Admin can view user gamification profile');
  const adminViewChartRes = await fetch(`${API_BASE}/gamification/user/${targetUserId}/chart`, { headers: adminHeaders });
  assert.strictEqual(adminViewChartRes.status, 200, 'Admin can view user XP chart');
  const adminViewRankRes = await fetch(`${API_BASE}/gamification/user/${targetUserId}/rank`, { headers: adminHeaders });
  assert.strictEqual(adminViewRankRes.status, 200, 'Admin can view user rank metrics');
  const adminViewHistoryRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/history`, { headers: adminHeaders });
  assert.strictEqual(adminViewHistoryRes.status, 200, 'Admin can view user history dossier');
  const adminAdjustRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'ADD', amount: 15, reason: 'Audit authorized bonus' })
  });
  assert.strictEqual(adminAdjustRes.status, 200, 'Admin can perform XP adjustment via admin API');
  console.log('  ✓ Admin legitimate inspection and XP adjustments verified (200 OK)');

  // 8.3 Super Admin legitimate operations
  console.log('Testing Super Admin Authorized Actions:');
  const saLevelConfigRes = await fetch(`${API_BASE}/admin/levels/configuration`, { headers: saHeaders });
  assert.strictEqual(saLevelConfigRes.status, 200, 'Super Admin can access level configuration');
  const saRulesRes = await fetch(`${API_BASE}/super-admin/gamification/settings`, { headers: saHeaders });
  assert.strictEqual(saRulesRes.status, 200, 'Super Admin can access XP rules settings');
  const saAnalyticsRes = await fetch(`${API_BASE}/super-admin/gamification/analytics`, { headers: saHeaders });
  assert.strictEqual(saAnalyticsRes.status, 200, 'Super Admin can access global analytics');
  const saAuditLogsRes = await fetch(`${API_BASE}/super-admin/gamification/audit-logs`, { headers: saHeaders });
  assert.strictEqual(saAuditLogsRes.status, 200, 'Super Admin can access gamification audit logs');
  const saTxRes = await fetch(`${API_BASE}/super-admin/gamification/transactions`, { headers: saHeaders });
  assert.strictEqual(saTxRes.status, 200, 'Super Admin can access transaction explorer');
  console.log('  ✓ Super Admin full governance verified (200 OK)');

  console.log('\n===============================================================');
  console.log('🎉 ALL AUTHORIZATION AUDIT CHECKS PASSED PERFECTLY!');
  console.log('   - 401 Unauthorized strictly enforced for missing/bad tokens');
  console.log('   - 403 Forbidden strictly enforced across role hierarchy');
  console.log('   - Zero information disclosure or stack trace leaks detected');
  console.log('===============================================================\n');
}

if (require.main === module) {
  runAuthorizationAudit()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ Authorization Audit Failure:', err);
      process.exit(1);
    });
}

module.exports = { runAuthorizationAudit };
