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

async function runSubmissionXPAwardingTests() {
  console.log('\n================================================================');
  console.log('⚡ ATOMIC SUBMISSION TO APPROVED XP AWARDING TEST SUITE');
  console.log('================================================================\n');

  let adminToken;
  let userToken;
  let superAdminToken;
  let testCreator;
  let officialAccount;

  try {
    // ------------------------------------------------------------------------
    // 1. Authentication & Setup
    // ------------------------------------------------------------------------
    console.log('--- 1. Authenticating Personas ---');
    adminToken = await login('admin@portal.com', 'Admin123!');
    userToken = await login('user@portal.com', 'User123!');
    superAdminToken = await login('superadmin@portal.com', 'SuperAdmin123!');
    console.log('✓ Admin, User, and Super Admin personas authenticated');

    testCreator = await prisma.user.findUnique({ where: { email: 'user@portal.com' } });
    assert(testCreator, 'Normal creator user must exist');
    officialAccount = await prisma.socialAccount.findFirst({ where: { isActive: true, platform: 'INSTAGRAM' } }) || await prisma.socialAccount.findFirst({ where: { isActive: true } });
    assert(officialAccount, 'Active official social account must exist');
    console.log(`✓ Creator: ${testCreator.name} (${testCreator.id}), Social Account: ${officialAccount.platform} (${officialAccount.handle})`);

    // Verify XP rules in DB
    const likeRule = await prisma.gamificationSetting.findUnique({ where: { activity: 'LIKE' } });
    const commentRule = await prisma.gamificationSetting.findUnique({ where: { activity: 'COMMENT' } });
    const storyRule = await prisma.gamificationSetting.findUnique({ where: { activity: 'STORY' } });
    const expectedLikeXP = likeRule?.isActive ? likeRule.xp : 1;
    const expectedCommentXP = commentRule?.isActive ? commentRule.xp : 2;
    const expectedStoryXP = storyRule?.isActive ? storyRule.xp : 2;
    console.log(`✓ Database XP Rules: LIKE=${expectedLikeXP} XP, COMMENT=${expectedCommentXP} XP, STORY=${expectedStoryXP} XP`);

    // ------------------------------------------------------------------------
    // TEST 1: Pending → Approved = XP awarded
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Flow: Pending → Approved = XP Awarded ---');

    // Fetch initial user balance
    const userBefore1 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    const initialXP1 = userBefore1.totalXP ?? userBefore1.totalPoints ?? 0;

    // A. Normal user creates submission with evidence
    const createSub1 = await makeRequest({
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        platform: officialAccount.platform,
        actionType: 'COMMENT',
        postUrl: 'https://instagram.com/p/testpost123',
        description: 'Engaged with official university post with supportive comment',
        screenshotUrl: '/api/uploads/screenshots/evidence-test-comment.png',
        socialAccountId: officialAccount.id
      }
    });

    assert.strictEqual(createSub1.status, 201);
    assert.strictEqual(createSub1.data.success, true);
    const sub1Id = createSub1.data.data.id;
    assert.strictEqual(createSub1.data.data.status, 'PENDING');
    console.log(`✓ Submission created with status PENDING: ${sub1Id}`);

    // B. Admin approves submission
    const approveSub1 = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub1Id}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Evidence successfully verified against platform. Approved!' }
    });

    assert.strictEqual(approveSub1.status, 200);
    assert.strictEqual(approveSub1.data.success, true);
    assert.strictEqual(approveSub1.data.data.submission.status, 'APPROVED');
    assert.strictEqual(approveSub1.data.data.pointsAwarded.awarded, true);
    assert.strictEqual(approveSub1.data.data.pointsAwarded.xp, expectedCommentXP);
    console.log(`✓ Admin approved submission: +${expectedCommentXP} XP awarded`);

    // C. Verify user total XP updated in database
    const userAfter1 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    assert.strictEqual(userAfter1.totalXP, initialXP1 + expectedCommentXP, 'User totalXP must be incremented by expectedCommentXP');
    assert.strictEqual(userAfter1.totalPoints, initialXP1 + expectedCommentXP, 'User totalPoints must match totalXP');
    console.log(`✓ User total XP updated: ${initialXP1} -> ${userAfter1.totalXP}`);

    // D. Verify PointTransaction created with submissionId link
    const tx1 = await prisma.pointTransaction.findFirst({
      where: { submissionId: sub1Id }
    });
    assert(tx1, 'PointTransaction must exist for approved submission');
    assert.strictEqual(tx1.xp, expectedCommentXP);
    assert.strictEqual(tx1.actionType, 'COMMENT');
    console.log(`✓ PointTransaction verified: ${tx1.id} linked to submission ${sub1Id}`);

    // E. Verify creator received notification
    const notif1 = await prisma.notification.findFirst({
      where: { userId: testCreator.id, type: 'REVIEW_FEEDBACK' },
      orderBy: { createdAt: 'desc' }
    });
    assert(notif1, 'Review notification must be sent');
    assert(notif1.message.includes(`+${expectedCommentXP} XP`), 'Notification must include XP gained');
    console.log(`✓ Notification verified: "${notif1.message}"`);

    // F. Verify audit log was recorded
    const audit1 = await prisma.auditLog.findFirst({
      where: { entityId: sub1Id, action: 'SUBMISSION_APPROVED' },
      orderBy: { timestamp: 'desc' }
    });
    assert(audit1, 'Audit log must record SUBMISSION_APPROVED');
    console.log(`✓ Audit log verified: ${audit1.details}`);

    // ------------------------------------------------------------------------
    // TEST 2: Pending → Rejected = 0 XP
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Flow: Pending → Rejected = 0 XP ---');

    const userBefore2 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    const initialXP2 = userBefore2.totalXP;

    // Create submission
    const createSub2 = await makeRequest({
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        platform: officialAccount.platform,
        actionType: 'LIKE',
        postUrl: 'https://instagram.com/p/testpost456',
        description: 'Liked official post',
        screenshotUrl: '/api/uploads/screenshots/evidence-test-like.png',
        socialAccountId: officialAccount.id
      }
    });
    assert.strictEqual(createSub2.status, 201);
    const sub2Id = createSub2.data.data.id;

    // Reject submission
    const rejectSub2 = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub2Id}/reject`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Screenshot is blurry and does not show account handle.' }
    });
    assert.strictEqual(rejectSub2.status, 200);
    assert.strictEqual(rejectSub2.data.data.submission.status, 'REJECTED');
    assert.strictEqual(rejectSub2.data.data.pointsAwarded.awarded, false);
    assert.strictEqual(rejectSub2.data.data.pointsAwarded.xp, 0);
    console.log('✓ Admin rejected submission with feedback. pointsAwarded = 0');

    // Verify user balance unchanged
    const userAfter2 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    assert.strictEqual(userAfter2.totalXP, initialXP2, 'User total XP must NOT change on rejection');
    console.log(`✓ User total XP strictly unchanged: ${userAfter2.totalXP}`);

    // Verify NO point transaction exists for sub2
    const tx2 = await prisma.pointTransaction.findFirst({ where: { submissionId: sub2Id } });
    assert.strictEqual(tx2, null, 'NO PointTransaction should be created for rejected submission');
    console.log('✓ Confirmed: 0 PointTransactions created');

    // ------------------------------------------------------------------------
    // TEST 3: Approved → Approved = No Duplicate XP
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Flow: Approved → Approved = No Duplicate XP ---');

    const userBefore3 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    const initialXP3 = userBefore3.totalXP;

    // Attempt to approve submission 1 again
    const reApprove = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub1Id}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Trying to approve again' }
    });

    // Both HTTP 400 (ALREADY_APPROVED) or 0-XP idempotent response are valid safety responses
    console.log(`✓ Re-approval call returned status ${reApprove.status}: ${reApprove.data.message}`);
    if (reApprove.status === 200) {
      assert.strictEqual(reApprove.data.data.pointsAwarded.points, 0);
    } else {
      assert.strictEqual(reApprove.status, 400);
      assert(['ALREADY_APPROVED', 'INVALID_STATE_TRANSITION'].includes(reApprove.data.code));
    }

    // Verify user total XP did NOT increase
    const userAfter3 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    assert.strictEqual(userAfter3.totalXP, initialXP3, 'User XP must strictly not increase on re-approval');
    console.log(`✓ Verified: User XP remained exactly ${userAfter3.totalXP} (0 duplicate XP)`);

    // Verify only 1 PointTransaction exists for sub1
    const sub1TxCount = await prisma.pointTransaction.count({ where: { submissionId: sub1Id } });
    assert.strictEqual(sub1TxCount, 1, 'Exactly 1 PointTransaction must exist, no duplicate transactions');
    console.log('✓ Verified: Exactly 1 PointTransaction exists for submission');

    // ------------------------------------------------------------------------
    // TEST 4: Rejected → Approved = Award XP Only Once (Existing Overturn Workflow)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Flow: Rejected → Approved = Award XP Only Once ---');

    const userBefore4 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    const initialXP4 = userBefore4.totalXP;

    // sub2 was previously REJECTED. Now administrator reviews and approves it (overturn)!
    const approveRejectedSub2 = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub2Id}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Creator clarification verified. Now approving activity.' }
    });

    assert.strictEqual(approveRejectedSub2.status, 200);
    assert.strictEqual(approveRejectedSub2.data.data.submission.status, 'APPROVED');
    assert.strictEqual(approveRejectedSub2.data.data.pointsAwarded.awarded, true);
    assert.strictEqual(approveRejectedSub2.data.data.pointsAwarded.xp, expectedLikeXP);
    console.log(`✓ Rejected submission successfully approved: +${expectedLikeXP} XP awarded`);

    // Verify user total XP increased by expectedLikeXP
    const userAfter4 = await prisma.user.findUnique({ where: { id: testCreator.id } });
    assert.strictEqual(userAfter4.totalXP, initialXP4 + expectedLikeXP);
    console.log(`✓ User XP updated: ${initialXP4} -> ${userAfter4.totalXP}`);

    // Verify point transaction now exists
    const sub2Tx = await prisma.pointTransaction.findFirst({ where: { submissionId: sub2Id } });
    assert(sub2Tx, 'PointTransaction must now exist for previously rejected submission');
    assert.strictEqual(sub2Tx.xp, expectedLikeXP);
    console.log(`✓ PointTransaction verified: ${sub2Tx.id}`);

    // Now try approving it a second time (Approved → Approved)
    const reApproveSub2 = await makeRequest({
      method: 'POST',
      path: `/api/reviews/${sub2Id}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { feedback: 'Trying to approve again' }
    });
    assert.strictEqual(reApproveSub2.status, 400);
    const userAfterReApprove = await prisma.user.findUnique({ where: { id: testCreator.id } });
    assert.strictEqual(userAfterReApprove.totalXP, userAfter4.totalXP, 'Second approval must NOT award duplicate XP');
    console.log(`✓ Second approval attempt blocked duplicate award: User XP remains ${userAfterReApprove.totalXP}`);

    console.log('\n================================================================');
    console.log('🎉 ALL ATOMIC SUBMISSION TO XP AWARDING TESTS PASSED PERFECTLY!');
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
    await runSubmissionXPAwardingTests();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SUBMISSION XP AWARDING TEST FAILED:', err);
    process.exit(1);
  }
});
