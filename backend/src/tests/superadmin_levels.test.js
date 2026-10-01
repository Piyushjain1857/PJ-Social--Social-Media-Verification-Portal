const assert = require('assert');
const { prisma } = require('../config/db');

const API_BASE = 'http://localhost:5001/api';

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
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

async function runSuperAdminLevelTests() {
  console.log('\n========================================================');
  console.log('🛡️ Starting Super Admin Level Management Test Suite');
  console.log('========================================================\n');

  // Authenticate personas
  const superAdmin = await loginUser('superadmin@portal.com', 'SuperAdmin123!');
  const admin = await loginUser('admin@portal.com', 'Admin123!');
  const creator = await loginUser('user@portal.com', 'User123!');

  console.log('✓ Successfully authenticated Super Admin, Admin, and Normal User personas');

  // ---------------------------------------------------------------------------
  // 1. Strict Server-Side RBAC Enforcement: Only SUPER_ADMIN allowed
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing Strict RBAC Protection on Level Management APIs ---');

  // Unauthenticated -> 401
  const unauthRes = await fetch(`${API_BASE}/admin/levels`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should return 401');
  console.log('✓ Unauthenticated request rejected with 401 Unauthorized');

  // Normal USER -> 403
  const userAccessRes = await fetch(`${API_BASE}/admin/levels`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  assert.strictEqual(userAccessRes.status, 403, 'Normal USER must receive 403 Forbidden');
  console.log('✓ Normal USER rejected with 403 Forbidden');

  // ADMIN -> 403
  const adminAccessRes = await fetch(`${API_BASE}/admin/levels`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(adminAccessRes.status, 403, 'Admin must receive 403 Forbidden');
  console.log('✓ Admin Moderator rejected with 403 Forbidden');

  // SUPER_ADMIN -> 200
  const superAccessRes = await fetch(`${API_BASE}/admin/levels`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(superAccessRes.status, 200, 'SUPER_ADMIN must receive 200 OK');
  const initialLevelsData = await superAccessRes.json();
  assert.strictEqual(initialLevelsData.success, true);
  console.log(`✓ Super Admin granted access: ${initialLevelsData.count} levels configured`);

  // ---------------------------------------------------------------------------
  // 2. Telemetry / Configuration Summary: GET /api/admin/levels/configuration
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Level Engine Configuration Telemetry ---');
  const configRes = await fetch(`${API_BASE}/admin/levels/configuration`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(configRes.status, 200);
  const configData = await configRes.json();
  assert.strictEqual(configData.success, true);
  assert.ok(configData.data.totalLevels >= 50);
  assert.ok(configData.data.activeLevels >= 50);
  assert.ok(configData.data.highestLevel >= 50);
  assert.ok(configData.data.totalXPRequired > 0);
  console.log(`✓ Level telemetry verified: Total=${configData.data.totalLevels}, Active=${configData.data.activeLevels}, Highest=${configData.data.highestLevel}, MaxXP=${configData.data.totalXPRequired}`);

  // ---------------------------------------------------------------------------
  // 3. User XP Safety Baseline: Capture user's XP before changes
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Verifying User XP Baseline Safety ---');
  const userProfileBefore = await (await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  })).json();
  const baselineXP = userProfileBefore.data.totalXP;
  console.log(`✓ Baseline User XP: ${baselineXP} XP`);

  // ---------------------------------------------------------------------------
  // 4. Create Level: POST /api/admin/levels
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing Create Level (POST /api/admin/levels) ---');
  const testLevelNum = 999;
  // Cleanup test level if already exists
  await prisma.level.deleteMany({ where: { levelNumber: testLevelNum } });

  // Negative validation tests
  const invalidXPRes = await fetch(`${API_BASE}/admin/levels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      levelNumber: testLevelNum,
      name: 'Test Invalid XP',
      xpRequired: -50
    })
  });
  assert.strictEqual(invalidXPRes.status, 400);
  console.log('✓ Negative XP requirement properly rejected (400)');

  const missingNameRes = await fetch(`${API_BASE}/admin/levels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      levelNumber: testLevelNum,
      name: '   ',
      xpRequired: 300
    })
  });
  assert.strictEqual(missingNameRes.status, 400);
  console.log('✓ Empty level name properly rejected (400)');

  // Valid level creation
  const createRes = await fetch(`${API_BASE}/admin/levels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      levelNumber: testLevelNum,
      name: 'Cosmic Ascendant',
      xpRequired: 500,
      icon: '🌌',
      description: 'Exclusive cosmic rank for pinnacle creators'
    })
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  assert.strictEqual(createData.success, true);
  const createdLevel = createData.data;
  assert.strictEqual(createdLevel.levelNumber, testLevelNum);
  assert.strictEqual(createdLevel.name, 'Cosmic Ascendant');
  assert.strictEqual(createdLevel.xpRequired, 500);
  console.log(`✓ Super Admin created Level ${createdLevel.levelNumber} ("${createdLevel.name}", ${createdLevel.xpRequired} XP)`);

  // Prevent duplicate level number
  const dupRes = await fetch(`${API_BASE}/admin/levels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      levelNumber: testLevelNum,
      name: 'Duplicate Level',
      xpRequired: 250
    })
  });
  assert.strictEqual(dupRes.status, 400);
  console.log('✓ Duplicate level number properly rejected (400)');

  // ---------------------------------------------------------------------------
  // 5. Edit Level: PUT /api/admin/levels/:id
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Edit Level (PUT /api/admin/levels/:id) ---');
  const editRes = await fetch(`${API_BASE}/admin/levels/${createdLevel.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Galactic Sovereign',
      xpRequired: 750,
      icon: '🪐',
      description: 'Updated sovereign tier'
    })
  });
  assert.strictEqual(editRes.status, 200);
  const editData = await editRes.json();
  assert.strictEqual(editData.data.name, 'Galactic Sovereign');
  assert.strictEqual(editData.data.xpRequired, 750);
  assert.strictEqual(editData.data.icon, '🪐');
  console.log(`✓ Level updated: Name -> "${editData.data.name}", XP -> ${editData.data.xpRequired}`);

  // ---------------------------------------------------------------------------
  // 6. Deactivate & Activate: PATCH /api/admin/levels/:id/status
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Deactivate & Activate Status ---');
  const deactRes = await fetch(`${API_BASE}/admin/levels/${createdLevel.id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isActive: false })
  });
  assert.strictEqual(deactRes.status, 200);
  const deactData = await deactRes.json();
  assert.strictEqual(deactData.data.isActive, false);
  console.log('✓ Level successfully deactivated (isActive: false)');

  const reactRes = await fetch(`${API_BASE}/admin/levels/${createdLevel.id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isActive: true })
  });
  assert.strictEqual(reactRes.status, 200);
  const reactData = await reactRes.json();
  assert.strictEqual(reactData.data.isActive, true);
  console.log('✓ Level successfully re-activated (isActive: true)');

  // ---------------------------------------------------------------------------
  // 7. Dynamic Cumulative Thresholds Recalculation
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Testing Dynamic Cumulative Thresholds Recalculation ---');
  const allLevelsRes = await fetch(`${API_BASE}/admin/levels`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  const allLevelsData = await allLevelsRes.json();
  const levels = allLevelsData.data;

  // Verify thresholds are contiguous and cumulative:
  // startXP[k+1] == endXP[k] + 1
  for (let i = 0; i < levels.length - 1; i++) {
    const curr = levels[i];
    const next = levels[i + 1];
    assert.strictEqual(curr.cumulativeEndXP + 1, next.cumulativeStartXP, `Cumulative continuity broke between Level ${curr.levelNumber} and ${next.levelNumber}`);
  }
  console.log('✓ Dynamic cumulative thresholds verified: 100% contiguous and mathematically valid');

  // ---------------------------------------------------------------------------
  // 8. Bulk Generation: POST /api/admin/levels/generate
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Testing Bulk Level Generation (POST /api/admin/levels/generate) ---');
  // First attempt without confirmModify -> 400
  const unconfirmedGen = await fetch(`${API_BASE}/admin/levels/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ count: 50, xpPerLevel: 250, confirmModify: false })
  });
  assert.strictEqual(unconfirmedGen.status, 400);
  console.log('✓ Safety check verified: Unconfirmed level generation blocked (400)');

  // Confirmed generation
  const confirmedGen = await fetch(`${API_BASE}/admin/levels/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ count: 50, xpPerLevel: 250, confirmModify: true })
  });
  assert.strictEqual(confirmedGen.status, 200);
  const genData = await confirmedGen.json();
  assert.strictEqual(genData.success, true);
  console.log(`✓ Confirmed generation succeeded: ${genData.count} levels configured`);

  // ---------------------------------------------------------------------------
  // 9. XP Safety Verification: User XP must remain identical
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Verifying User XP Remains Strictly Untouched ---');
  const userProfileAfter = await (await fetch(`${API_BASE}/gamification/me`, {
    headers: { Authorization: `Bearer ${creator.token}` }
  })).json();
  assert.strictEqual(userProfileAfter.data.totalXP, baselineXP, 'User XP must NOT change when level configurations change!');
  console.log(`✓ Verified: User XP is strictly untouched (${userProfileAfter.data.totalXP} XP == ${baselineXP} XP)`);

  // ---------------------------------------------------------------------------
  // 10. Safe Deletion & Historical Protection
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Testing Safe Deletion & Historical Data Protection ---');
  // Clean up the created test level
  const delRes = await fetch(`${API_BASE}/admin/levels/${createdLevel.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${superAdmin.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ force: true })
  });
  assert.strictEqual(delRes.status, 200);
  console.log(`✓ Test level ${createdLevel.levelNumber} deleted safely`);

  // ---------------------------------------------------------------------------
  // 11. Audit Log Verification: Check that actions generated AuditLog entries
  // ---------------------------------------------------------------------------
  console.log('\n--- 11. Testing Audit Log Persistence ---');
  const auditRes = await fetch(`${API_BASE}/superadmin/audit-logs`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(auditRes.status, 200);
  const auditData = await auditRes.json();
  assert.strictEqual(auditData.success, true);
  const logs = auditData.data;

  const hasLevelCreated = logs.some(l => l.event === 'LEVEL_CREATED' || l.details?.includes('Super Admin created Level'));
  const hasLevelUpdated = logs.some(l => l.event === 'LEVEL_UPDATED' || l.details?.includes('Super Admin changed Level'));
  const hasLevelGenerated = logs.some(l => l.event === 'LEVELS_GENERATED' || l.details?.includes('Super Admin generated'));

  assert.ok(hasLevelCreated, 'Audit log should record LEVEL_CREATED');
  assert.ok(hasLevelUpdated, 'Audit log should record LEVEL_UPDATED');
  assert.ok(hasLevelGenerated, 'Audit log should record LEVELS_GENERATED');
  console.log('✓ Confirmed: Level creation, update, and generation are recorded in system Audit Log');

  console.log('\n========================================================');
  console.log('🎉 ALL SUPER ADMIN LEVEL MANAGEMENT BACKEND TESTS PASSED!');
  console.log('========================================================\n');
}

if (require.main === module) {
  runSuperAdminLevelTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = { runSuperAdminLevelTests };
