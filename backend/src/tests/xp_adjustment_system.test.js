const assert = require('assert');
const http = require('http');
const app = require('../app');

let server;
let API_BASE = '';

async function authenticate(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { token: data.token, user: data.user };
}

async function runXPAdjustmentTests() {
  console.log('\n======================================================');
  console.log('⚡ Starting Complete Admin & Super Admin XP Adjustment Test Suite');
  console.log('======================================================\n');

  // 1. Authenticate personas
  console.log('--- 1. Authenticating Personas ---');
  const user = await authenticate('user@portal.com', 'User123!');
  const admin = await authenticate('admin@portal.com', 'Admin123!');
  const superAdmin = await authenticate('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Normal User, Admin, and Super Admin authenticated successfully');

  const targetUserId = user.user.id;

  // 2. Initial state verification
  console.log('\n--- 2. Checking Initial User Balance & Transactions ---');
  const initRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(initRes.status, 200);
  const initData = await initRes.json();
  const initialXP = initData.data.profile.totalXP;
  const initialLevel = initData.data.profile.currentLevel;
  console.log(`✓ Initial State for ${user.user.name}: ${initialXP} XP, Level ${initialLevel} (${initData.data.profile.levelName})`);

  // Count existing transactions
  const initHistoryRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/history?limit=100`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(initHistoryRes.status, 200);
  const initHistory = await initHistoryRes.json();
  const initialTxCount = initHistory.pagination.totalCount;
  console.log(`✓ Historical Transactions Count: ${initialTxCount}`);

  // 3. Validation Tests: Invalid Amounts & Reasons
  console.log('\n--- 3. Testing Strict Input Validation ---');

  // 3a. Zero amount
  const zeroRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 0,
      reason: 'Zero amount test'
    })
  });
  assert.strictEqual(zeroRes.status, 400, 'Zero amount must be rejected with 400');
  const zeroJson = await zeroRes.json();
  console.log(`✓ Zero amount correctly rejected: "${zeroJson.message}"`);

  // 3b. Negative amount in amount field
  const negRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: -25,
      reason: 'Negative amount test'
    })
  });
  assert.strictEqual(negRes.status, 400, 'Negative amount must be rejected with 400');
  console.log('✓ Negative numeric amount correctly rejected');

  // 3c. Non-numeric amount
  const nanRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 'invalid_amount',
      reason: 'Non-numeric test'
    })
  });
  assert.strictEqual(nanRes.status, 400, 'Non-numeric amount must be rejected with 400');
  console.log('✓ Non-numeric amount correctly rejected');

  // 3d. Decimal amount
  const decimalRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 15.5,
      reason: 'Decimal test'
    })
  });
  assert.strictEqual(decimalRes.status, 400, 'Decimal amount must be rejected with 400');
  console.log('✓ Decimal/float amount correctly rejected');

  // 3e. Missing / empty reason
  const emptyReasonRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: '   '
    })
  });
  assert.strictEqual(emptyReasonRes.status, 400, 'Empty reason must be rejected with 400');
  console.log('✓ Empty reason correctly rejected');

  // 3f. Reason too short (< 3 chars)
  const shortReasonRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'no'
    })
  });
  assert.strictEqual(shortReasonRes.status, 400, 'Too short reason must be rejected with 400');
  console.log('✓ Sub-3-character reason correctly rejected');

  // 3g. Invalid user ID
  const invalidUserRes = await fetch(`${API_BASE}/admin/gamification/users/00000000-0000-0000-0000-000000000000/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'Valid reason for invalid user'
    })
  });
  assert.strictEqual(invalidUserRes.status, 404, 'Non-existent user must return 404');
  console.log('✓ Non-existent target user correctly returns 404');

  // 3h. Target user is Admin (cannot hold points)
  const adminTargetRes = await fetch(`${API_BASE}/admin/gamification/users/${admin.user.id}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'Attempting to adjust admin XP'
    })
  });
  assert.strictEqual(adminTargetRes.status, 400, 'Admin target must be rejected with 400');
  console.log('✓ Adjustment to admin user correctly rejected (administrators cannot hold points)');

  // 4. Authorization / RBAC Tests
  console.log('\n--- 4. Testing Authorization & RBAC Enforcement ---');

  // Regular user calling admin adjust
  const userForbiddenRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'User trying to award self XP'
    })
  });
  assert.strictEqual(userForbiddenRes.status, 403, 'Normal user must be forbidden (403)');
  console.log('✓ Regular user correctly received 403 on admin adjustment endpoint');

  // Admin calling super admin adjust endpoint
  const adminSuperAdminForbidden = await fetch(`${API_BASE}/super-admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'Admin trying super admin adjust'
    })
  });
  assert.strictEqual(adminSuperAdminForbidden.status, 403, 'Admin must be forbidden (403) on super admin endpoint');
  console.log('✓ Admin correctly received 403 on super admin adjustment endpoint');

  // 5. Admin Adds XP (+50 XP)
  console.log('\n--- 5. Testing Admin Adding XP (+50 XP) ---');
  const addRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 50,
      reason: 'Event participation'
    })
  });
  assert.strictEqual(addRes.status, 200);
  const addJson = await addRes.json();
  assert.strictEqual(addJson.success, true);
  assert.strictEqual(addJson.data.deltaXP, 50);
  assert.strictEqual(addJson.data.newXP, initialXP + 50);
  console.log(`✓ Admin added +50 XP: ${initialXP} ➔ ${addJson.data.newXP} XP`);

  // Verify PointTransaction created with ADMIN_ADJUSTMENT
  const historyAfterAdd = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/history?limit=5`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  const historyAddJson = await historyAfterAdd.json();
  const latestTx = historyAddJson.data[0];
  assert.strictEqual(latestTx.actionType, 'ADMIN_ADJUSTMENT');
  assert.strictEqual(latestTx.xp, 50);
  assert.ok(latestTx.description.includes('Event participation'), 'Description must include reason');
  assert.ok(latestTx.source.includes('Admin'), 'Source must reflect Admin actor');
  assert.strictEqual(latestTx.metadata.reason, 'Event participation');
  assert.strictEqual(latestTx.metadata.actor, 'Admin');
  assert.ok(latestTx.metadata.date, 'Timestamp must be present');
  console.log(`✓ Immutable Transaction verified: Type=${latestTx.actionType}, XP=+${latestTx.xp}, Actor=${latestTx.metadata.actor}, Reason="${latestTx.metadata.reason}"`);

  // 6. Admin Removes XP (-25 XP)
  console.log('\n--- 6. Testing Admin Removing XP (-25 XP) ---');
  const removeRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'REMOVE',
      amount: 25,
      reason: 'Correction of duplicate bonus'
    })
  });
  assert.strictEqual(removeRes.status, 200);
  const removeJson = await removeRes.json();
  assert.strictEqual(removeJson.success, true);
  assert.strictEqual(removeJson.data.deltaXP, -25);
  assert.strictEqual(removeJson.data.newXP, initialXP + 25);
  console.log(`✓ Admin removed -25 XP: ${initialXP + 50} ➔ ${removeJson.data.newXP} XP`);

  // Verify PointTransaction created with negative XP
  const historyAfterRemove = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/history?limit=5`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  const historyRemoveJson = await historyAfterRemove.json();
  const latestRemoveTx = historyRemoveJson.data[0];
  assert.strictEqual(latestRemoveTx.actionType, 'ADMIN_ADJUSTMENT');
  assert.strictEqual(latestRemoveTx.xp, -25);
  assert.ok(latestRemoveTx.description.includes('-25 XP'));
  console.log(`✓ Immutable Removal Transaction verified: Type=${latestRemoveTx.actionType}, XP=${latestRemoveTx.xp}, Reason="${latestRemoveTx.metadata.reason}"`);

  // 7. Testing Removal Safety: Cannot deduct more than balance
  console.log('\n--- 7. Testing Removal Balance Boundary Safety ---');
  const excessiveRemovalRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'REMOVE',
      amount: 9999999,
      reason: 'Excessive deduction attempt'
    })
  });
  assert.strictEqual(excessiveRemovalRes.status, 400, 'Removal exceeding balance must be rejected');
  const excessiveJson = await excessiveRemovalRes.json();
  console.log(`✓ Excessive deduction safely rejected: "${excessiveJson.message}"`);

  // 8. Super Admin Adds XP (+100 XP)
  console.log('\n--- 8. Testing Super Admin Adding XP (+100 XP) ---');
  const saAddRes = await fetch(`${API_BASE}/super-admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdmin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: 100,
      reason: 'Institutional hackathon excellence award'
    })
  });
  assert.strictEqual(saAddRes.status, 200);
  const saAddJson = await saAddRes.json();
  assert.strictEqual(saAddJson.success, true);
  assert.strictEqual(saAddJson.data.deltaXP, 100);
  console.log(`✓ Super Admin added +100 XP: Balance is now ${saAddJson.data.newXP} XP`);

  // Verify SUPER_ADMIN_ADJUSTMENT transaction
  const saHistoryRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/history?limit=5`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  const saHistoryJson = await saHistoryRes.json();
  const latestSaTx = saHistoryJson.data[0];
  assert.strictEqual(latestSaTx.actionType, 'SUPER_ADMIN_ADJUSTMENT');
  assert.strictEqual(latestSaTx.xp, 100);
  assert.strictEqual(latestSaTx.metadata.actor, 'Super Admin');
  console.log(`✓ SUPER_ADMIN_ADJUSTMENT transaction verified: Type=${latestSaTx.actionType}, Actor=${latestSaTx.metadata.actor}`);

  // 9. Super Admin Removes XP (-50 XP)
  console.log('\n--- 9. Testing Super Admin Removing XP (-50 XP) ---');
  const saRemoveRes = await fetch(`${API_BASE}/super-admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdmin.token}`
    },
    body: JSON.stringify({
      type: 'REMOVE',
      amount: 50,
      reason: 'Administrative policy penalty deduction'
    })
  });
  assert.strictEqual(saRemoveRes.status, 200);
  const saRemoveJson = await saRemoveRes.json();
  assert.strictEqual(saRemoveJson.success, true);
  assert.strictEqual(saRemoveJson.data.deltaXP, -50);
  console.log(`✓ Super Admin removed -50 XP: Balance is now ${saRemoveJson.data.newXP} XP`);

  // 10. Level-Up and Level Demotion Event & Notification Tests
  console.log('\n--- 10. Testing Level Transition Events & Notifications ---');

  // Read current user state
  const curRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  const curData = await curRes.json();
  const curXP = curData.data.profile.totalXP;
  const curLevel = curData.data.profile.currentLevel;
  const xpRemaining = curData.data.profile.xpRemaining;

  console.log(`  Current XP: ${curXP}, Level: ${curLevel}, Remaining to next level: ${xpRemaining}`);

  // Test Level Up: Award enough to cross into next level
  const xpToLevelUp = xpRemaining + 10;
  console.log(`  Awarding +${xpToLevelUp} XP to trigger Level Up...`);
  const lvlUpRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'ADD',
      amount: xpToLevelUp,
      reason: 'Testing level up transition trigger'
    })
  });
  assert.strictEqual(lvlUpRes.status, 200);
  const lvlUpJson = await lvlUpRes.json();
  assert.strictEqual(lvlUpJson.data.leveledUp, true, 'leveledUp must be true');
  assert.strictEqual(lvlUpJson.data.currentLevel, curLevel + 1, `Level must increment from ${curLevel} to ${curLevel + 1}`);
  console.log(`✓ Level Up successfully triggered: Level ${curLevel} ➔ Level ${lvlUpJson.data.currentLevel}`);

  // Verify Level Up notification exists
  const notifRes = await fetch(`${API_BASE}/notifications?limit=5`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  assert.strictEqual(notifRes.status, 200);
  const notifJson = await notifRes.json();
  const notifications = notifJson.data || notifJson.notifications || [];
  const lvlUpNotif = notifications.find(n => n.title === 'Level Up!');
  assert.ok(lvlUpNotif, 'Level Up notification must be sent to the user');
  console.log(`✓ Level Up notification verified: "${lvlUpNotif.title}" - "${lvlUpNotif.message}"`);

  // Test Level Demotion: Deduct enough to drop back down safely
  console.log(`  Deducting -${xpToLevelUp} XP to trigger safe Level Demotion...`);
  const lvlDownRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/adjust-xp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`
    },
    body: JSON.stringify({
      type: 'REMOVE',
      amount: xpToLevelUp,
      reason: 'Testing safe level demotion transition'
    })
  });
  assert.strictEqual(lvlDownRes.status, 200);
  const lvlDownJson = await lvlDownRes.json();
  assert.strictEqual(lvlDownJson.data.levelDemoted, true, 'levelDemoted must be true');
  assert.strictEqual(lvlDownJson.data.currentLevel, curLevel, `Level must safely revert back to ${curLevel}`);
  console.log(`✓ Level Demotion handled safely and clearly: Level ${curLevel + 1} ➔ Level ${lvlDownJson.data.currentLevel}`);

  // Verify Level Demotion notification exists
  const notifDownRes = await fetch(`${API_BASE}/notifications?limit=5`, {
    headers: { Authorization: `Bearer ${user.token}` }
  });
  const notifDownJson = await notifDownRes.json();
  const notifsDown = notifDownJson.data || notifDownJson.notifications || [];
  const lvlDownNotif = notifsDown.find(n => n.title === 'Level Adjustment Notice');
  assert.ok(lvlDownNotif, 'Level Adjustment Notice notification must be sent to user');
  console.log(`✓ Level Demotion notification verified: "${lvlDownNotif.title}" - "${lvlDownNotif.message}"`);

  // 11. Consistency & History Ledger Verification
  console.log('\n--- 11. Verifying Consistent Calculation & Immutability ---');

  // Total transactions must have increased (NO historical transactions deleted)
  const finalHistoryRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/history?limit=100`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  const finalHistoryJson = await finalHistoryRes.json();
  const finalTxCount = finalHistoryJson.pagination.totalCount;
  assert.ok(finalTxCount > initialTxCount, `Historical transactions count must have grown (from ${initialTxCount} to ${finalTxCount})`);
  console.log(`✓ Immutability verified: Transaction count increased from ${initialTxCount} to ${finalTxCount} (no deletions)`);

  // Verify chart data reflects adjustments
  const chartRes = await fetch(`${API_BASE}/gamification/user/${targetUserId}/chart?timeframe=30d`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(chartRes.status, 200);
  const chartJson = await chartRes.json();
  assert.strictEqual(chartJson.success, true);
  assert.ok(chartJson.data.points.length > 0, 'Chart points must be populated');
  console.log(`✓ XP Chart telemetry updated: ${chartJson.data.points.length} data points returned`);

  // Verify Adjustment filter on history ledger
  const adjFilterRes = await fetch(`${API_BASE}/admin/gamification/users/${targetUserId}/history?actionType=ADJUSTMENT&limit=10`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.strictEqual(adjFilterRes.status, 200);
  const adjFilterJson = await adjFilterRes.json();
  assert.ok(adjFilterJson.data.length > 0, 'Adjustments filter must return transactions');
  console.log(`✓ Adjustments filter verified: ${adjFilterJson.data.length} adjustment records returned`);

  console.log('\n======================================================');
  console.log('🎉 ALL XP ADJUSTMENT TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

if (require.main === module) {
  server = http.createServer(app);
  server.listen(0, async () => {
    const port = server.address().port;
    API_BASE = `http://localhost:${port}/api`;
    try {
      await runXPAdjustmentTests();
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ XP Adjustment Test Suite Failed:', err);
      server.close();
      process.exit(1);
    }
  });
} else {
  module.exports = { runXPAdjustmentTests };
}
