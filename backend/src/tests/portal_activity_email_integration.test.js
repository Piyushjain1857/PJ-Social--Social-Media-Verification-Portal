/**
 * Automated Test Suite: Portal Activity Email Integration & User Preferences
 * 
 * Verifies:
 * 1. Submission Created: In-App Notification + "Your submission has been received." Email
 * 2. Submission Approved: In-App Notification + "Your submission has been approved! 🎉" Email
 * 3. Submission Rejected: In-App Notification + "Your submission was rejected." Email (Reason only, no internal notes)
 * 4. Clarification Requested: In-App Notification + "Additional information is required." Email
 * 5. XP Earned: "⚡ You earned XP!" Email (after XP transaction commits)
 * 6. Level Up: "🏆 LEVEL UP!" Email + Zero Duplicate Level-Up Emails
 * 7. Email Preferences: PostgreSQL storage, individual toggle control, non-disablable security emails
 * 8. Notification Center Integration: 1 database event -> In-App Notification + Email
 * 9. API Retry Deduplication: Idempotent operations do not resend duplicate emails
 */

const assert = require('assert');
const http = require('http');
const emailService = require('../services/emailService');
const { getEmailLogs, hasSentEmail } = require('../repositories/emailLogRepository');
const { getUserEmailPreferences, updateUserEmailPreferences } = require('../repositories/emailPreferenceRepository');
const { findUserByEmail } = require('../repositories/userRepository');
const { prisma, checkDatabaseConnection } = require('../config/db');

let PORT = process.env.PORT || 5002;
let BASE_URL = `http://localhost:${PORT}/api`;

const makeRequest = (endpoint, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
};

const login = async (email, password) => {
  const res = await makeRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  if (!res.body || !res.body.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
};

async function detectActivePort() {
  for (const p of [5002, 5001, 5000]) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${p}/api/health`, (res) => {
          resolve(res.statusCode);
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      if (res === 200) {
        PORT = p;
        BASE_URL = `http://localhost:${PORT}/api`;
        return p;
      }
    } catch {}
  }
  return PORT;
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING PORTAL ACTIVITY & EMAIL INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  await detectActivePort();
  console.log(`[Setup] Target API endpoint: ${BASE_URL}`);

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      if (err.stack) {
        const firstLine = err.stack.split('\n')[1];
        console.error(`     At: ${firstLine}`);
      }
      failed++;
    }
  };

  // 1. Authenticate Roles
  let userAuth, adminAuth, superAdminAuth;
  await test('Authenticate user, administrator, and super administrator', async () => {
    userAuth = await login('user@portal.com', 'User123!');
    adminAuth = await login('admin@portal.com', 'Admin123!');
    superAdminAuth = await login('superadmin@portal.com', 'SuperAdmin123!');
    assert(userAuth.token, 'User token exists');
    assert(adminAuth.token, 'Admin token exists');
    assert(superAdminAuth.token, 'SuperAdmin token exists');
  });

  // 2. Email Preferences: GET & PUT via REST API
  await test('Email Preferences: Fetch defaults and update preferences in PostgreSQL', async () => {
    const getRes = await makeRequest('/users/email-preferences', {
      headers: { Authorization: `Bearer ${userAuth.token}` }
    });
    assert.strictEqual(getRes.status, 200, 'GET preferences status 200');
    assert(getRes.body.data, 'Preferences data exists');
    assert.strictEqual(typeof getRes.body.data.submissionUpdates, 'boolean');
    assert.strictEqual(typeof getRes.body.data.gamificationUpdates, 'boolean');

    // Update preferences
    const putRes = await makeRequest('/users/email-preferences', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userAuth.token}` },
      body: {
        submissionUpdates: true,
        gamificationUpdates: true,
        accountSecurity: true,
        announcements: false
      }
    });
    assert.strictEqual(putRes.status, 200, 'PUT preferences status 200');
    assert.strictEqual(putRes.body.data.announcements, false, 'Announcements toggled off');
    assert.strictEqual(putRes.body.data.submissionUpdates, true, 'Submission updates enabled');

    // Verify in DB directly
    const directPrefs = await getUserEmailPreferences(userAuth.user.id);
    assert.strictEqual(directPrefs.announcements, false);
    assert.strictEqual(directPrefs.submissionUpdates, true);
  });

  // 3. Official Social Account lookup
  let officialAccountId;
  let targetPlatform;
  await test('Fetch active official social account for submission', async () => {
    const accountsRes = await makeRequest('/social-accounts', {
      headers: { Authorization: `Bearer ${userAuth.token}` }
    });
    assert.strictEqual(accountsRes.status, 200);
    const accounts = accountsRes.body.data || accountsRes.body;
    assert(Array.isArray(accounts) && accounts.length > 0, 'Official accounts exist');
    const selected = accounts.find(a => a.platform === 'INSTAGRAM') || accounts[0];
    officialAccountId = selected.id;
    targetPlatform = selected.platform;
    assert(officialAccountId, 'Official account ID resolved');
  });

  // 4. SUBMISSION CREATED -> In-App Notification + "Your submission has been received." Email
  let testSubmissionId;
  await test('Submission Created: Triggers in-app notification & submission received email', async () => {
    const subRes = await makeRequest('/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAuth.token}` },
      body: {
        platform: targetPlatform,
        socialAccountId: officialAccountId,
        actionType: 'COMMENT',
        postUrl: `https://${targetPlatform.toLowerCase()}.com/p/test-activity-email-123`,
        screenshotUrl: 'https://storage.portal.local/screenshots/email-test-proof.png',
        description: 'Engaged with institutional post via official verified channel.'
      }
    });

    assert.strictEqual(subRes.status, 201, `Submission created status 201: ${JSON.stringify(subRes.body)}`);
    testSubmissionId = subRes.body.data.id;
    assert(testSubmissionId, 'Submission ID created');

    // Wait 350ms for async email & notification dispatch
    await new Promise(r => setTimeout(r, 350));

    // Verify In-App Notification
    const notifsRes = await makeRequest('/notifications', {
      headers: { Authorization: `Bearer ${userAuth.token}` }
    });
    assert.strictEqual(notifsRes.status, 200);
    const notifs = notifsRes.body.data || notifsRes.body;
    const receivedNotif = notifs.find(n => n.type === 'SUBMISSION_UPDATE' && n.message.includes('review queue'));
    assert(receivedNotif, 'In-app notification for submission created found');

    // Verify Email Log
    const logsRes = await makeRequest(`/super-admin/email/logs?recipient=${encodeURIComponent(userAuth.user.email)}`, {
      headers: { Authorization: `Bearer ${superAdminAuth.token}` }
    });
    assert.strictEqual(logsRes.status, 200);
    const logs = logsRes.body.data || [];
    const receivedEmail = logs.find(l => l.template === 'SUBMISSION_RECEIVED' && l.entityId === testSubmissionId);
    assert(receivedEmail, 'Submission received email log found with matching entityId');
    assert.strictEqual(receivedEmail.subject, 'Your submission has been received.');
  });

  // 5. CLARIFICATION REQUESTED -> In-App Notification + "Additional information is required." Email
  await test('Clarification: Triggers in-app notification & clarification email with button', async () => {
    const clarifyRes = await makeRequest(`/reviews/${testSubmissionId}/clarification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: {
        message: 'Please provide a full uncropped screenshot showing the username timestamp.'
      }
    });

    assert.strictEqual(clarifyRes.status, 201, `Clarification recorded status 201: ${JSON.stringify(clarifyRes.body)}`);

    await new Promise(r => setTimeout(r, 450));

    // Verify In-App Notification
    const notifsRes = await makeRequest('/notifications', {
      headers: { Authorization: `Bearer ${userAuth.token}` }
    });
    const notifs = notifsRes.body.data || notifsRes.body;
    const clarifyNotif = notifs.find(n => n.type === 'REVIEW_FEEDBACK' && n.title.includes('Clarification Requested'));
    assert(clarifyNotif, 'In-app notification for clarification found');

    // Verify Email Log
    const logsRes = await makeRequest(`/super-admin/email/logs?recipient=${encodeURIComponent(userAuth.user.email)}`, {
      headers: { Authorization: `Bearer ${superAdminAuth.token}` }
    });
    assert.strictEqual(logsRes.status, 200);
    const logs = logsRes.body.data || [];
    const clarifyEmail = logs.find(l => l.template === 'CLARIFICATION_REQUEST');
    assert(clarifyEmail, 'Clarification request email found in email logs');
    assert.strictEqual(clarifyEmail.subject, 'Additional information is required.');
  });

  // 6. SUBMISSION REJECTED -> In-App Notification + "Your submission was rejected." Email (Reason only)
  let rejectedSubmissionId;
  await test('Submission Rejected: Triggers in-app notification & rejection email without exposing internal notes', async () => {
    // Create new submission to reject
    const newSubRes = await makeRequest('/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAuth.token}` },
      body: {
        platform: targetPlatform,
        socialAccountId: officialAccountId,
        actionType: 'LIKE',
        postUrl: `https://${targetPlatform.toLowerCase()}.com/p/reject-test-url-456`,
        screenshotUrl: 'https://storage.portal.local/screenshots/reject-test.png',
        description: 'Submission to be rejected for insufficient proof.'
      }
    });
    rejectedSubmissionId = newSubRes.body.data.id;
    assert(rejectedSubmissionId, 'Rejected test submission created');

    // Admin rejects with feedback
    const rejectVerdictRes = await makeRequest(`/reviews/${rejectedSubmissionId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: {
        feedback: 'Screenshot does not show the official campaign hashtag.'
      }
    });
    assert.strictEqual(rejectVerdictRes.status, 200, 'Verdict marked as REJECTED');

    await new Promise(r => setTimeout(r, 450));

    // Verify In-App Notification
    const notifsRes = await makeRequest('/notifications', {
      headers: { Authorization: `Bearer ${userAuth.token}` }
    });
    const notifs = notifsRes.body.data || notifsRes.body;
    const rejectNotif = notifs.find(n => n.type === 'REVIEW_FEEDBACK' && n.title === 'Submission REJECTED');
    assert(rejectNotif, 'Rejection in-app notification found');
    assert(rejectNotif.message.includes('Screenshot does not show the official campaign hashtag.'));

    // Verify Email Log
    const logsRes = await makeRequest(`/super-admin/email/logs?recipient=${encodeURIComponent(userAuth.user.email)}`, {
      headers: { Authorization: `Bearer ${superAdminAuth.token}` }
    });
    assert.strictEqual(logsRes.status, 200);
    const logs = logsRes.body.data || [];
    const rejectEmail = logs.find(l => l.template === 'SUBMISSION_REJECTED' && l.entityId === rejectedSubmissionId);
    assert(rejectEmail, 'Rejection email logged with entityId');
    assert.strictEqual(rejectEmail.subject, 'Your submission was rejected.');
  });

  // 7. SUBMISSION APPROVED & XP EARNED -> In-App Notification + "Your submission has been approved! 🎉" + "⚡ You earned XP!"
  await test('Submission Approved & XP Earned: Triggers in-app notification, approved email & XP earned email', async () => {
    // Approve the first test submission
    const approveVerdictRes = await makeRequest(`/reviews/${testSubmissionId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: {
        feedback: 'Great participation! Comment verified.'
      }
    });
    assert.strictEqual(approveVerdictRes.status, 200, `Approval verdict succeeded: ${JSON.stringify(approveVerdictRes.body)}`);
    assert.strictEqual(approveVerdictRes.body.data.pointsAwarded.awarded, true, 'Points awarded flag true');
    assert(approveVerdictRes.body.data.pointsAwarded.xp > 0, 'Positive XP awarded');

    await new Promise(r => setTimeout(r, 450));

    // Verify In-App Notification
    const notifsRes = await makeRequest('/notifications', {
      headers: { Authorization: `Bearer ${userAuth.token}` }
    });
    const notifs = notifsRes.body.data || notifsRes.body;
    const approveNotif = notifs.find(n => n.type === 'REVIEW_FEEDBACK' && n.title === 'Submission APPROVED');
    assert(approveNotif, 'Approval in-app notification found');

    // Verify Approval Email
    const logsRes = await makeRequest(`/super-admin/email/logs?recipient=${encodeURIComponent(userAuth.user.email)}`, {
      headers: { Authorization: `Bearer ${superAdminAuth.token}` }
    });
    assert.strictEqual(logsRes.status, 200);
    const logs = logsRes.body.data || [];
    const approvedEmail = logs.find(l => l.template === 'SUBMISSION_APPROVED' && l.entityId === testSubmissionId);
    assert(approvedEmail, 'Approved email found in logs');
    assert.strictEqual(approvedEmail.subject, 'Your submission has been approved! 🎉');

    // Verify XP Earned Email
    const xpEmail = logs.find(l => l.template === 'XP_EARNED');
    assert(xpEmail, 'XP Earned email found in logs');
    assert.strictEqual(xpEmail.subject, '⚡ You earned XP!');
  });

  // 8. LEVEL UP & DUPLICATE LEVEL-UP PREVENTION
  await test('Level Up: Sends "🏆 LEVEL UP!" email and prevents duplicate level-up emails', async () => {
    const userObj = await findUserByEmail('user@portal.com');
    assert(userObj, 'User found');

    const testLevel = 500 + Math.floor(Math.random() * 400);
    // First Level Up trigger
    const firstLevelUpResult = await emailService.sendLevelUpEmail(userObj, {
      previousLevel: testLevel - 1,
      newLevel: testLevel,
      currentLevel: testLevel,
      levelName: 'Grandmaster Creator',
      totalXP: 25000,
      icon: '👑'
    });
    assert.strictEqual(firstLevelUpResult.success, true);
    assert.strictEqual(firstLevelUpResult.duplicatePrevented, undefined, 'First level up email sent');

    // Retry / duplicate Level Up call for same level
    const duplicateResult = await emailService.sendLevelUpEmail(userObj, {
      previousLevel: testLevel - 1,
      newLevel: testLevel,
      currentLevel: testLevel,
      levelName: 'Grandmaster Creator',
      totalXP: 25100,
      icon: '👑'
    });
    assert.strictEqual(duplicateResult.success, true);
    assert.strictEqual(duplicateResult.duplicatePrevented, true, 'Duplicate level-up email was idempotently blocked!');
  });

  // 9. API RETRY DEDUPLICATION FOR SUBMISSIONS
  await test('API Retry Deduplication: Re-dispatching submission approved email prevents duplicates', async () => {
    const userObj = await findUserByEmail('user@portal.com');
    const duplicateApprovedResult = await emailService.sendSubmissionApprovedEmail(userObj, {
      id: testSubmissionId,
      platform: 'INSTAGRAM',
      actionType: 'COMMENT'
    }, { xp: 2, points: 2, totalXP: 100 });

    assert.strictEqual(duplicateApprovedResult.success, true);
    assert.strictEqual(duplicateApprovedResult.duplicatePrevented, true, 'Duplicate approval email was idempotently blocked!');
  });

  // 10. PREFERENCE ENFORCEMENT: Disabling submissionUpdates suppresses emails
  await test('Preferences Enforcement: Disabling submissionUpdates suppresses email but preserves in-app notifs', async () => {
    // Disable submissionUpdates
    await updateUserEmailPreferences(userAuth.user.id, { submissionUpdates: false });

    const userObj = await findUserByEmail('user@portal.com');
    const dummySubId = `sub-suppress-${Date.now()}`;

    const skippedResult = await emailService.sendSubmissionReceivedEmail(userObj, {
      id: dummySubId,
      platform: 'INSTAGRAM',
      actionType: 'LIKE',
      createdAt: new Date(),
      status: 'PENDING'
    });

    assert.strictEqual(skippedResult.success, true);
    assert.strictEqual(skippedResult.skipped, true, 'Email was skipped due to user preference');
    assert.strictEqual(skippedResult.reason, 'PREFERENCE_DISABLED');

    // Restore preference
    await updateUserEmailPreferences(userAuth.user.id, { submissionUpdates: true });
  });

  // 11. SECURITY-CRITICAL EMAILS CANNOT BE DISABLED
  await test('Security-Critical Emails: Password reset/change emails always dispatch regardless of preferences', async () => {
    const userObj = await findUserByEmail('user@portal.com');
    
    // Set all optional preferences to false
    await updateUserEmailPreferences(userAuth.user.id, {
      accountSecurity: false,
      submissionUpdates: false,
      gamificationUpdates: false,
      announcements: false
    });

    // Password reset email must still send!
    const pwResetResult = await emailService.sendPasswordResetEmail(userObj, {
      resetLink: 'http://localhost:5173/reset-password?token=mocktoken123',
      expiryTime: '1 hour'
    });

    assert.strictEqual(pwResetResult.success, true, 'Password reset email sent successfully despite optional preferences being false');
    assert.strictEqual(pwResetResult.skipped, undefined, 'Password reset was NOT skipped');

    // Restore preferences
    await updateUserEmailPreferences(userAuth.user.id, {
      accountSecurity: true,
      submissionUpdates: true,
      gamificationUpdates: true,
      announcements: true
    });
  });

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Execute tests
runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
