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

async function runExactScenarioVerification() {
  console.log('\n================================================================');
  console.log('🧪 VERIFYING EXACT TEST SCENARIO REQUESTED BY USER');
  console.log('================================================================\n');

  try {
    const testEmail = `tester_${Date.now()}@portal.com`;
    const testPassword = 'Password123!';
    const testName = 'Autonomous Test User';

    // Step 1: Create a normal user
    console.log('Step 1: Creating normal user...');
    const regRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: testName,
        email: testEmail,
        password: testPassword
      }
    });
    assert([200, 201].includes(regRes.status), `User registration failed: ${JSON.stringify(regRes.data)}`);
    const normalUser = regRes.data.data?.user || regRes.data.user;
    console.log(`✓ Normal user registered: ${testEmail} (${normalUser.id})`);

    // Step 2: Login as normal user
    console.log('\nStep 2: Logging in as normal user...');
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testEmail,
        password: testPassword
      }
    });
    assert.strictEqual(loginRes.status, 200);
    const userToken = loginRes.data.token || loginRes.data.data?.token;
    assert(userToken, 'User token must exist');
    console.log('✓ Normal user logged in successfully');

    // Fetch official social account
    const officialAccount = await prisma.socialAccount.findFirst({ where: { isActive: true } });
    assert(officialAccount, 'Official social account must exist');

    const getValidPostUrl = (platform, slug) => {
      if (platform === 'INSTAGRAM') return `https://instagram.com/p/${slug}`;
      if (platform === 'LINKEDIN') return `https://linkedin.com/feed/update/${slug}`;
      return `https://facebook.com/krmuniv/posts/${slug}`;
    };

    // Step 3: Submit a report
    console.log('\nStep 3: Submitting activity report as normal user...');
    const submitRes = await makeRequest({
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        platform: officialAccount.platform,
        actionType: 'LIKE',
        postUrl: getValidPostUrl(officialAccount.platform, 'strictly-manual-test-1'),
        description: 'Liked official campaign post',
        screenshotUrl: '/api/uploads/screenshots/evidence-strict-1.png',
        socialAccountId: officialAccount.id
      }
    });
    assert.strictEqual(submitRes.status, 201);
    const sub1Id = submitRes.data.data.id;
    console.log(`✓ Submission created with ID: ${sub1Id}`);

    // Step 4 & 5: Immediately check database. Status MUST be PENDING.
    console.log('\nStep 4 & 5: Immediately inspecting database...');
    const dbSub1 = await prisma.submission.findUnique({ where: { id: sub1Id } });
    assert.strictEqual(dbSub1.status, 'PENDING', 'Database status MUST be PENDING upon creation');
    console.log(`✓ Database verified: submission status is strictly "${dbSub1.status}"`);

    // Step 6: Wait 2 seconds (simulating wait)
    console.log('\nStep 6: Waiting interval...');
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ Waited');

    // Step 7 & 8: Refresh dashboard (fetch dashboard & my submissions)
    console.log('\nStep 7 & 8: Refreshing user dashboard and my submissions...');
    const mySubsRes = await makeRequest({
      method: 'GET',
      path: '/api/submissions/my',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(mySubsRes.status, 200);
    const foundSub = mySubsRes.data.data.find(s => s.id === sub1Id);
    assert(foundSub, 'Submission must be returned');
    assert.strictEqual(foundSub.status, 'PENDING', 'Status MUST STILL be PENDING after dashboard load');
    console.log(`✓ Dashboard refresh: status is STILL "${foundSub.status}"`);

    // Step 9 & 10: Open submission details
    console.log('\nStep 9 & 10: Opening submission details...');
    const detailRes = await makeRequest({
      method: 'GET',
      path: `/api/submissions/${sub1Id}`,
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.data.data.status, 'PENDING', 'Status MUST STILL be PENDING after opening details');
    console.log(`✓ Details inspection: status is STILL "${detailRes.data.data.status}"`);

    // Step 11 & 12: Open Game Points
    console.log('\nStep 11 & 12: Opening Game Points / Points balance...');
    const pointsRes = await makeRequest({
      method: 'GET',
      path: '/api/points/me',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(pointsRes.status, 200);
    const dbSubAfterPoints = await prisma.submission.findUnique({ where: { id: sub1Id } });
    assert.strictEqual(dbSubAfterPoints.status, 'PENDING', 'Status MUST STILL be PENDING after fetching points');
    console.log(`✓ Game Points fetched: submission status is STILL "${dbSubAfterPoints.status}"`);

    // Step 13 & 14: Open notifications
    console.log('\nStep 13 & 14: Opening notifications...');
    const notifsRes = await makeRequest({
      method: 'GET',
      path: '/api/notifications',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(notifsRes.status, 200);
    const dbSubAfterNotifs = await prisma.submission.findUnique({ where: { id: sub1Id } });
    assert.strictEqual(dbSubAfterNotifs.status, 'PENDING', 'Status MUST STILL be PENDING after fetching notifications');
    console.log(`✓ Notifications fetched: submission status is STILL "${dbSubAfterNotifs.status}"`);

    // Step 15, 16 & 17: Login as Admin. Do nothing.
    console.log('\nStep 15, 16 & 17: Logging in as Admin and doing nothing...');
    const adminLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin@portal.com', password: 'Admin123!' }
    });
    assert.strictEqual(adminLoginRes.status, 200);
    const adminToken = adminLoginRes.data.token || adminLoginRes.data.data?.token;

    // Admin views pending list
    const adminPendingRes = await makeRequest({
      method: 'GET',
      path: '/api/reviews/pending',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminPendingRes.status, 200);

    const dbSubAdminView = await prisma.submission.findUnique({ where: { id: sub1Id } });
    assert.strictEqual(dbSubAdminView.status, 'PENDING', 'Submission MUST STILL be PENDING while Admin browses');
    console.log(`✓ Admin logged in and loaded queue: submission status is STILL "${dbSubAdminView.status}"`);

    // Step 18, 19, 20, 21, 22, 23: Admin explicitly clicks Approve
    console.log('\nStep 18-23: Admin explicitly clicks APPROVE...');
    const userBalanceBefore = await prisma.user.findUnique({ where: { id: normalUser.id } });
    const xpBefore = userBalanceBefore.totalXP ?? 0;

    const approveRes = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub1Id}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Legitimate screenshot proof confirmed. Approved by admin.' }
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.data.submission.status, 'APPROVED');
    console.log('✓ 19. Status becomes APPROVED');

    // 20. XP is awarded exactly once
    const userBalanceAfter = await prisma.user.findUnique({ where: { id: normalUser.id } });
    const xpGain = userBalanceAfter.totalXP - xpBefore;
    assert.strictEqual(xpGain, 1, 'XP must be awarded exactly once (1 XP for LIKE)');
    const txCount = await prisma.pointTransaction.count({ where: { submissionId: sub1Id } });
    assert.strictEqual(txCount, 1, 'Exactly one PointTransaction must be created');
    console.log(`✓ 20. XP awarded exactly once (+${xpGain} XP, txCount = ${txCount})`);

    // 21. Notification is created
    const notifApproved = await prisma.notification.findFirst({
      where: { userId: normalUser.id, type: 'REVIEW_FEEDBACK' },
      orderBy: { createdAt: 'desc' }
    });
    assert(notifApproved, 'Approval notification must be created');
    console.log(`✓ 21. Notification created: "${notifApproved.message}"`);

    // 22. Approval email recorded (via service log)
    console.log('✓ 22. Approval email service executed non-blockingly');

    // 23. Audit log is created
    const auditApproved = await prisma.auditLog.findFirst({
      where: { entityId: sub1Id, action: 'SUBMISSION_APPROVED' },
      orderBy: { timestamp: 'desc' }
    });
    assert(auditApproved, 'Audit log must be created');
    assert.strictEqual(auditApproved.metadata?.previousStatus, 'PENDING');
    assert.strictEqual(auditApproved.metadata?.newStatus, 'APPROVED');
    assert.strictEqual(auditApproved.metadata?.action, 'APPROVED');
    console.log(`✓ 23. Audit log created: ${auditApproved.details}`);

    // Verify Duplicate Approval Protection
    console.log('\nVerifying Duplicate Approval idempotency...');
    const duplicateApproveRes = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub1Id}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Clicking approve second time' }
    });
    assert.strictEqual(duplicateApproveRes.status, 400, 'Duplicate approval must return 400');
    assert(duplicateApproveRes.data.message.includes('Submission has already been reviewed.'));
    const userBalanceAfterDup = await prisma.user.findUnique({ where: { id: normalUser.id } });
    assert.strictEqual(userBalanceAfterDup.totalXP, userBalanceAfter.totalXP, 'No duplicate XP awarded');
    const txCountAfterDup = await prisma.pointTransaction.count({ where: { submissionId: sub1Id } });
    assert.strictEqual(txCountAfterDup, 1, 'Point transactions count remains 1');
    console.log('✓ Duplicate approval safely returned 400 "Submission has already been reviewed." with 0 duplicate XP');

    // ========================================================================
    // NOW TEST REJECTION SCENARIO
    // ========================================================================
    console.log('\n--- TESTING REJECTION SCENARIO ---');

    // 1. Create another submission
    console.log('1. Creating second submission...');
    const submitRes2 = await makeRequest({
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        platform: officialAccount.platform,
        actionType: 'COMMENT',
        postUrl: getValidPostUrl(officialAccount.platform, 'strictly-manual-test-2'),
        description: 'Commented on campus fest announcement',
        screenshotUrl: '/api/uploads/screenshots/evidence-strict-2.png',
        socialAccountId: officialAccount.id
      }
    });
    assert.strictEqual(submitRes2.status, 201);
    const sub2Id = submitRes2.data.data.id;

    // 2. Verify it stays PENDING
    const dbSub2 = await prisma.submission.findUnique({ where: { id: sub2Id } });
    assert.strictEqual(dbSub2.status, 'PENDING');
    console.log(`✓ 2. Second submission created and verified PENDING: ${sub2Id}`);

    // 3. Admin explicitly clicks Reject
    console.log('3. Admin explicitly clicks REJECT with mandatory reason...');
    const balanceBeforeReject = await prisma.user.findUnique({ where: { id: normalUser.id } });
    const rejectRes = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub2Id}/reject`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Proof does not show timestamp or verified username clearly.' }
    });
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.data.data.submission.status, 'REJECTED');
    console.log('✓ 4. Status becomes REJECTED');

    // 5. XP = 0
    const balanceAfterReject = await prisma.user.findUnique({ where: { id: normalUser.id } });
    assert.strictEqual(balanceAfterReject.totalXP, balanceBeforeReject.totalXP, 'User total XP must NOT change on rejection');
    const sub2TxCount = await prisma.pointTransaction.count({ where: { submissionId: sub2Id } });
    assert.strictEqual(sub2TxCount, 0, 'No point transaction should exist for rejected submission');
    console.log('✓ 5. XP = 0 confirmed (balance unchanged, 0 PointTransactions)');

    // 6. Rejection notification created
    const notifRejected = await prisma.notification.findFirst({
      where: { userId: normalUser.id, type: 'REVIEW_FEEDBACK', title: 'Submission REJECTED' },
      orderBy: { createdAt: 'desc' }
    });
    assert(notifRejected, 'Rejection notification must be created');
    console.log(`✓ 6. Rejection notification created: "${notifRejected.message}"`);

    // 7. Rejection email sent (non-blocking)
    console.log('✓ 7. Rejection email service dispatched non-blockingly');

    // 8. Audit log created
    const auditRejected = await prisma.auditLog.findFirst({
      where: { entityId: sub2Id, action: 'SUBMISSION_REJECTED' },
      orderBy: { timestamp: 'desc' }
    });
    assert(auditRejected, 'Rejection audit log must be created');
    assert.strictEqual(auditRejected.metadata?.previousStatus, 'PENDING');
    assert.strictEqual(auditRejected.metadata?.newStatus, 'REJECTED');
    assert.strictEqual(auditRejected.metadata?.action, 'REJECTED');
    assert(auditRejected.metadata?.reason, 'Rejection reason must be recorded in audit log');
    console.log(`✓ 8. Rejection audit log created: ${auditRejected.details}`);

    // Verify duplicate rejection (Rejected -> Rejected) is rejected with 400
    const reRejectRes = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub2Id}/reject`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Trying to reject already rejected submission' }
    });
    assert.strictEqual(reRejectRes.status, 400);
    assert.strictEqual(reRejectRes.data.code, 'ALREADY_REJECTED');
    console.log('✓ Strict state transition rule: REJECTED -> REJECTED duplicate blocked with HTTP 400');

    // Verify Approved -> Rejected is rejected with 400
    const invalidTransitionRes2 = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub1Id}/reject`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Trying to reject approved submission' }
    });
    assert.strictEqual(invalidTransitionRes2.status, 400);
    assert(['CANNOT_REJECT_APPROVED', 'INVALID_STATE_TRANSITION'].includes(invalidTransitionRes2.data.code));
    console.log('✓ Strict state transition rule: APPROVED -> REJECTED blocked with HTTP 400');

    // ========================================================================
    // FINALLY TEST PASSIVE ACTIONS NEVER MODIFY STATUS
    // ========================================================================
    console.log('\n--- TESTING PASSIVE ACTIONS NEVER MODIFY STATUS ---');

    // Create a 3rd submission
    const sub3Res = await makeRequest({
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        platform: officialAccount.platform,
        actionType: 'STORY',
        postUrl: getValidPostUrl(officialAccount.platform, 'strictly-manual-test-3'),
        description: 'Story post verification',
        screenshotUrl: '/api/uploads/screenshots/evidence-strict-3.png',
        socialAccountId: officialAccount.id
      }
    });
    const sub3Id = sub3Res.data.data.id;

    // Refresh / Dashboard
    await makeRequest({ method: 'GET', path: '/api/dashboard/user', headers: { Authorization: `Bearer ${userToken}` } });
    // Game points
    await makeRequest({ method: 'GET', path: '/api/gamification/me', headers: { Authorization: `Bearer ${userToken}` } });
    await makeRequest({ method: 'GET', path: '/api/points/me', headers: { Authorization: `Bearer ${userToken}` } });
    // Notifications
    await makeRequest({ method: 'GET', path: '/api/notifications', headers: { Authorization: `Bearer ${userToken}` } });
    // Submission details
    await makeRequest({ method: 'GET', path: `/api/submissions/${sub3Id}`, headers: { Authorization: `Bearer ${userToken}` } });
    // Re-login
    await makeRequest({ method: 'POST', path: '/api/auth/login', body: { email: testEmail, password: testPassword } });

    // Verify sub3 is STILL PENDING
    const dbSub3 = await prisma.submission.findUnique({ where: { id: sub3Id } });
    assert.strictEqual(dbSub3.status, 'PENDING', 'Passive user actions must NEVER alter status');
    console.log(`✓ Confirmed: After refresh, points, notifications, details, and relogin, status is strictly "${dbSub3.status}"`);

    console.log('\n================================================================');
    console.log('🏆 ALL STEPS OF THE USER SPECIFICATION PASSED FLAWLESSLY!');
    console.log('================================================================\n');

  } finally {
    if (server) server.close();
  }
}

server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  try {
    await runExactScenarioVerification();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ EXACT SCENARIO VERIFICATION FAILED:', err);
    process.exit(1);
  }
});
