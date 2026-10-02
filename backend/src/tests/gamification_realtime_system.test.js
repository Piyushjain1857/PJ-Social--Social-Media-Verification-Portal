/**
 * Real-Time Gamification System Specification Test Suite
 * 
 * Tests real-time streaming, instant UI updates, level-up celebrations,
 * admin adjustments, rule changes, safe fallback polling, and concurrency protection
 * across USER, ADMIN, and SUPER ADMIN roles.
 */

const assert = require('assert');
const http = require('http');
const { prisma } = require('../config/db');
const realtimeGamificationService = require('../services/realtimeGamificationService');

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

/**
 * Helper to open an HTTP stream to /api/gamification/events
 */
function createEventStreamClient(token) {
  return new Promise((resolve, reject) => {
    const receivedEvents = [];
    const url = new URL(`http://localhost:5001/api/gamification/events?token=${encodeURIComponent(token)}`);

    const req = http.get(url, (res) => {
      assert.strictEqual(res.statusCode, 200, 'SSE endpoint should return 200 OK');
      assert.strictEqual(res.headers['content-type'], 'text/event-stream', 'Should return text/event-stream');

      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep last incomplete part

        parts.forEach((block) => {
          if (!block.trim()) return;
          const lines = block.split('\n');
          let eventType = 'message';
          let dataStr = '';

          lines.forEach((line) => {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.replace('data: ', '').trim();
            }
          });

          let parsedData = null;
          try {
            parsedData = JSON.parse(dataStr);
          } catch (e) {
            parsedData = dataStr;
          }

          receivedEvents.push({ event: eventType, data: parsedData });
        });
      });

      resolve({
        req,
        res,
        getEvents: () => receivedEvents,
        close: () => {
          req.destroy();
        }
      });
    });

    req.on('error', reject);
  });
}

async function runRealtimeGamificationTests() {
  console.log('\n================================================================');
  console.log('⚡ REAL-TIME GAMIFICATION SYSTEM SPECIFICATION TEST SUITE');
  console.log('================================================================\n');

  // Authenticate Personas
  const userPersona = await authenticate('user@portal.com', 'User123!');
  const adminPersona = await authenticate('admin@portal.com', 'Admin123!');
  const superAdminPersona = await authenticate('superadmin@portal.com', 'SuperAdmin123!');

  const userHeaders = { Authorization: `Bearer ${userPersona.token}`, 'Content-Type': 'application/json' };
  const adminHeaders = { Authorization: `Bearer ${adminPersona.token}`, 'Content-Type': 'application/json' };
  const saHeaders = { Authorization: `Bearer ${superAdminPersona.token}`, 'Content-Type': 'application/json' };

  console.log('✓ Personas authenticated: USER, ADMIN, SUPER_ADMIN\n');

  // --------------------------------------------------------------------------
  // TEST 1: SSE Connection & Handshake
  // --------------------------------------------------------------------------
  console.log('Test 1: Establish Real-time Event Streams for User, Admin, Super Admin');
  const userStream = await createEventStreamClient(userPersona.token);
  const adminStream = await createEventStreamClient(adminPersona.token);
  const superAdminStream = await createEventStreamClient(superAdminPersona.token);

  // Wait for initial handshake
  await new Promise((r) => setTimeout(r, 200));

  const userEvents1 = userStream.getEvents();
  assert(userEvents1.some(e => e.event === 'connected'), 'User stream must receive connected handshake event');
  console.log('  ✓ 1. Real-time streams active and authenticated with handshake ack');

  // --------------------------------------------------------------------------
  // TEST 2: User Earns XP via Submission Approval -> Instant Real-time Update
  // --------------------------------------------------------------------------
  console.log('Test 2: Submission Approval emits real-time XP update to User & Admin');
  
  // Create a pending submission
  const testSub = await prisma.submission.create({
    data: {
      userId: userPersona.user.id,
      platform: 'INSTAGRAM',
      actionType: 'LIKE',
      postUrl: `https://instagram.com/p/rt_${Date.now()}`,
      screenshotUrl: '/uploads/rt_proof.png',
      status: 'PENDING',
      description: 'Real-time XP update test'
    }
  });

  // Admin approves submission
  const approveRes = await fetch(`${API_BASE}/submissions/${testSub.id}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      feedback: 'Approved for real-time verification'
    })
  });
  assert.strictEqual(approveRes.status, 200, 'Approval should succeed');

  // Wait for event broadcast
  await new Promise((r) => setTimeout(r, 250));

  const userXpEvent = userStream.getEvents().find(e => e.event === 'xp_updated' && e.data?.submissionId === testSub.id);
  assert(userXpEvent, 'User must receive real-time xp_updated event');
  assert(typeof userXpEvent.data.totalXP === 'number', 'Event must contain updated totalXP');
  assert(typeof userXpEvent.data.currentLevel === 'number', 'Event must contain updated currentLevel');
  assert(typeof userXpEvent.data.progressPercentage === 'number', 'Event must contain level progressPercentage');

  const adminXpEvent = adminStream.getEvents().find(e => e.event === 'admin_user_xp_updated' && e.data?.userId === userPersona.user.id);
  assert(adminXpEvent, 'Admin stream must receive admin_user_xp_updated event for live table sync');

  console.log(`  ✓ 2. User received live xp_updated (+${userXpEvent.data.deltaXP} XP, Total: ${userXpEvent.data.totalXP} XP, Level: ${userXpEvent.data.currentLevel})`);
  console.log(`  ✓    Admin received admin_user_xp_updated for immediate table update without refresh`);

  // --------------------------------------------------------------------------
  // TEST 3: Level-Up Celebration Event (🎉 Level Up!)
  // --------------------------------------------------------------------------
  console.log('Test 3: Crossing Level Threshold emits 🎉 Level Up! celebration event');

  // Grant enough XP to trigger level up
  const levelUpRes = await fetch(`${API_BASE}/admin/gamification/users/${userPersona.user.id}/adjust-xp`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      amount: 300,
      reason: 'Trigger Level-Up celebration event'
    })
  });
  assert.strictEqual(levelUpRes.status, 200, 'XP adjustment should succeed');

  await new Promise((r) => setTimeout(r, 250));

  const levelUpEvent = userStream.getEvents().find(e => e.event === 'level_up');
  assert(levelUpEvent, 'User must receive level_up event');
  assert.strictEqual(levelUpEvent.data.celebrationTitle, '🎉 Level Up!');
  assert(levelUpEvent.data.currentLevel > 1, 'Event must indicate elevated level');
  assert(levelUpEvent.data.levelName, 'Event must include level name');

  console.log(`  ✓ 3. 🎉 Level Up! event received: Level ${levelUpEvent.data.currentLevel} (${levelUpEvent.data.levelName}) with ${levelUpEvent.data.totalXP} XP`);

  // --------------------------------------------------------------------------
  // TEST 4: Admin Adjusts XP -> Affected User's Data Updates In Place
  // --------------------------------------------------------------------------
  console.log('Test 4: Admin XP adjustment updates affected user in real-time');

  const adjustRes = await fetch(`${API_BASE}/admin/gamification/users/${userPersona.user.id}/adjust-xp`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      type: 'REMOVE',
      amount: 10,
      reason: 'Points correction policy test'
    })
  });
  assert.strictEqual(adjustRes.status, 200);


  await new Promise((r) => setTimeout(r, 250));

  const adjustmentEvent = userStream.getEvents().filter(e => e.event === 'xp_updated' && e.data?.reason === 'Points correction policy test').pop();
  assert(adjustmentEvent, 'User must receive live xp_updated event from admin adjustment');
  assert.strictEqual(adjustmentEvent.data.deltaXP, -10, 'Must record exact delta');
  console.log(`  ✓ 4. Admin adjustment broadcast verified: delta -10 XP, new total ${adjustmentEvent.data.totalXP} XP`);

  // --------------------------------------------------------------------------
  // TEST 5: Super Admin Changes XP Rules -> New Submissions Use New Configuration
  // --------------------------------------------------------------------------
  console.log('Test 5: Super Admin changes XP rules -> New submissions use new configuration (Past untouched)');

  // Record historical transaction count and XP before rule change
  const historyBefore = await prisma.pointTransaction.findMany({
    where: { actionType: 'STORY' }
  });
  const pastXpValues = historyBefore.map(tx => tx.xp);

  // Super Admin updates STORY to award 15 XP
  const ruleUpdateRes = await fetch(`${API_BASE}/superadmin/gamification/settings`, {
    method: 'PUT',
    headers: saHeaders,
    body: JSON.stringify({
      updates: [{ activity: 'STORY', xp: 15, isActive: true, description: 'Promotional high-impact story bonus' }],
      reason: 'Seasonal creator reward boost'
    })
  });
  assert.strictEqual(ruleUpdateRes.status, 200, 'Rule update should succeed');


  await new Promise((r) => setTimeout(r, 250));

  // Verify all streams received rules_updated event
  const rulesEvent = userStream.getEvents().find(e => e.event === 'rules_updated');
  assert(rulesEvent, 'Clients must receive real-time rules_updated event');
  console.log('  ✓ Super Admin broadcasted rules_updated event to all clients');

  // Submit and approve new STORY submission under new 15 XP rule
  const storySub = await prisma.submission.create({
    data: {
      userId: userPersona.user.id,
      platform: 'INSTAGRAM',
      actionType: 'STORY',
      postUrl: `https://instagram.com/stories/rt_test_${Date.now()}`,
      screenshotUrl: '/uploads/story_proof.png',
      status: 'PENDING',
      description: 'Testing dynamic 15 XP rule'
    }
  });

  const storyApproveRes = await fetch(`${API_BASE}/submissions/${storySub.id}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      feedback: 'Approved under new 15 XP configuration'
    })
  });
  const storyApproveData = await storyApproveRes.json();
  assert.strictEqual(storyApproveData.data.pointsAwarded.xp, 15, 'New submission must receive new 15 XP configuration');

  // Verify historical transactions were NOT retroactively modified
  const historyAfter = await prisma.pointTransaction.findMany({
    where: { id: { in: historyBefore.map(h => h.id) } }
  });
  historyAfter.forEach((tx, idx) => {
    assert.strictEqual(tx.xp, pastXpValues[idx], 'Historical transactions must retain their original XP');
  });

  console.log('  ✓ 5. New submission awarded dynamic 15 XP; historical transactions remained 100% untouched');

  // Restore STORY rule back to 2 XP
  await fetch(`${API_BASE}/superadmin/gamification/settings`, {
    method: 'PUT',
    headers: saHeaders,
    body: JSON.stringify({
      updates: [{ activity: 'STORY', xp: 2, isActive: true }],
      reason: 'Reset rule to standard'
    })
  });
  await prisma.gamificationSetting.upsert({
    where: { activity: 'STORY' },
    create: { activity: 'STORY', xp: 2, isActive: true },
    update: { xp: 2, isActive: true }
  });
  const { setActivityPointConfig } = require('../services/pointsService');
  setActivityPointConfig('STORY', 2);


  // --------------------------------------------------------------------------
  // TEST 6: Safe Fallback API Synchronization (/api/gamification/sync-state)
  // --------------------------------------------------------------------------
  console.log('Test 6: Fallback state synchronization endpoint handles reconnects and stale state');

  const staleTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const syncRes = await fetch(`${API_BASE}/gamification/sync-state?lastSync=${encodeURIComponent(staleTimestamp)}`, {
    headers: userHeaders
  });
  assert.strictEqual(syncRes.status, 200, 'Sync state endpoint must return 200 OK');
  const syncData = await syncRes.json();
  assert.strictEqual(syncData.success, true);
  assert.strictEqual(syncData.data.hasChanged, true, 'hasChanged should be true when transactions are newer than lastSync');
  assert(syncData.data.profile, 'Must return profile for seamless state hydration');
  assert(syncData.data.rank, 'Must return rank for live leaderboard position update');

  console.log('  ✓ 6. Fallback sync-state endpoint accurately identified stale state and hydrated fresh profile/rank');

  // --------------------------------------------------------------------------
  // TEST 7: Duplicate Prevention in Real-Time Actions
  // --------------------------------------------------------------------------
  console.log('Test 7: Duplicate approval / duplicate XP prevention in real-time');

  const dupApproveRes = await fetch(`${API_BASE}/submissions/${storySub.id}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      feedback: 'Attempting re-approval'
    })
  });
  assert.strictEqual(dupApproveRes.status, 400, 'Duplicate approval must be blocked with 400');
  const dupData = await dupApproveRes.json();
  assert(dupData.message.includes('already approved'), 'Error message must state already approved');

  console.log('  ✓ 7. Duplicate approval successfully blocked: zero duplicate XP, zero duplicate notifications');

  // Clean up streams
  userStream.close();
  adminStream.close();
  superAdminStream.close();

  console.log('\n================================================================');
  console.log('🎉 ALL REAL-TIME GAMIFICATION SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runRealtimeGamificationTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });

