const assert = require('assert');
const http = require('http');
const emailService = require('../services/emailService');
const { getEmailLogs, inMemoryEmailLogs } = require('../repositories/emailLogRepository');

// Check active port
const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api`;

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

async function runTransactionalEmailTests() {
  console.log('\n======================================================');
  console.log('📧 Master Transactional Email System Verification Suite');
  console.log('======================================================\n');

  // Authenticate users
  const creator = await login('user@portal.com', 'User123!');
  const admin = await login('admin@portal.com', 'Admin123!');
  const superAdmin = await login('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Successfully authenticated CREATOR, ADMIN, and SUPER_ADMIN.\n');

  // --------------------------------------------------------------------------
  // TEST 1: Email Configuration Loading & Telemetry
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Configuration & Telemetry Security ---');
  const status = emailService.getMailSystemStatus();
  assert.ok(status.host, 'Mail host must be defined');
  assert.ok(status.port, 'Mail port must be defined');
  assert.ok(status.provider, 'Provider must be defined');
  // Verify secrets are NEVER exposed in telemetry
  assert.strictEqual(status.password, undefined, 'Password must NEVER be present in status');
  assert.strictEqual(status.auth, undefined, 'Auth credentials must NEVER be present in status');
  console.log(`✓ Telemetry loaded: Host=${status.host}:${status.port}, Provider="${status.provider}", User="${status.user}"`);
  console.log('✓ Verified: Zero sensitive credentials exposed in mail telemetry.\n');

  // --------------------------------------------------------------------------
  // TEST 2: RBAC Protection on Super Admin Email Endpoints
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Strict RBAC Protection on Email APIs ---');

  // 2a. Unauthenticated POST /api/super-admin/email/test -> 401
  const unauthTest = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    body: { recipient: 'target@example.com' }
  });
  assert.strictEqual(unauthTest.status, 401, 'Unauthenticated test email must return 401');
  console.log('✓ 401 Unauthorized enforced for unauthenticated requests');

  // 2b. Normal User POST /api/super-admin/email/test -> 403
  const userTest = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creator.token}` },
    body: { recipient: 'target@example.com' }
  });
  assert.strictEqual(userTest.status, 403, 'Normal USER must be forbidden (403) from test email endpoint');
  console.log('✓ 403 Forbidden enforced for normal USER on /api/super-admin/email/test');

  // 2c. Admin POST /api/super-admin/email/test -> 403
  const adminTest = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}` },
    body: { recipient: 'target@example.com' }
  });
  assert.strictEqual(adminTest.status, 403, 'ADMIN must be forbidden (403) from Super Admin email endpoint');
  console.log('✓ 403 Forbidden enforced for ADMIN on /api/super-admin/email/test');

  // 2d. Normal User GET /api/super-admin/email/logs -> 403
  const userLogs = await makeRequest('/super-admin/email/logs', {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  assert.strictEqual(userLogs.status, 403, 'USER must be forbidden (403) from viewing email logs');
  console.log('✓ 403 Forbidden enforced for USER on /api/super-admin/email/logs\n');

  // --------------------------------------------------------------------------
  // TEST 3: Super Admin Test Email Dispatch
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Super Admin Test Email Dispatch ---');

  // 3a. Invalid recipient -> 400 Bad Request
  const invalidEmailRes = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { recipient: 'not-an-email' }
  });
  assert.strictEqual(invalidEmailRes.status, 400, 'Invalid email must return 400');
  console.log('✓ 400 Bad Request returned on invalid recipient email format');

  // 3b. Valid recipient -> 200 OK
  const testRecipient = `qa_test_${Date.now()}@domain.test`;
  const validTestRes = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { recipient: testRecipient }
  });
  assert.strictEqual(validTestRes.status, 200, 'Super Admin test email must return 200 OK');
  assert.strictEqual(validTestRes.body.success, true, 'Test email dispatch must succeed');
  assert.ok(validTestRes.body.data.messageId, 'Test email response must contain messageId');
  assert.strictEqual(validTestRes.body.data.recipient, testRecipient);
  console.log(`✓ Test email successfully processed for ${testRecipient} (MessageID: ${validTestRes.body.data.messageId})\n`);

  // --------------------------------------------------------------------------
  // TEST 4: Email Logs Querying, Filtering, & Search
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Email Logs Querying, Filtering, & Pagination ---');

  // 4a. Fetch all logs
  const logsRes = await makeRequest('/super-admin/email/logs', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(logsRes.status, 200, 'Super Admin logs endpoint must return 200 OK');
  assert.ok(Array.isArray(logsRes.body.data), 'Logs response data must be an array');
  assert.ok(logsRes.body.pagination, 'Pagination metadata must be included');
  console.log(`✓ Retrieved ${logsRes.body.data.length} email logs (Total: ${logsRes.body.pagination.totalCount})`);

  // 4b. Search by recipient
  const searchRes = await makeRequest(`/super-admin/email/logs?search=${encodeURIComponent(testRecipient)}`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(searchRes.status, 200);
  assert.ok(searchRes.body.data.length >= 1, 'Search query must find the test email log');
  assert.strictEqual(searchRes.body.data[0].recipient, testRecipient);
  assert.strictEqual(searchRes.body.data[0].template, 'TEST_EMAIL');
  console.log(`✓ Search filter verified: found exact match for recipient "${testRecipient}"`);

  // 4c. Filter by template
  const templateFilterRes = await makeRequest('/super-admin/email/logs?template=TEST_EMAIL', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(templateFilterRes.status, 200);
  for (const log of templateFilterRes.body.data) {
    assert.strictEqual(log.template, 'TEST_EMAIL', 'All results must match template filter');
  }
  console.log(`✓ Template filter verified: all ${templateFilterRes.body.data.length} returned logs match template "TEST_EMAIL"`);

  // 4d. Filter by status
  const statusFilterRes = await makeRequest('/super-admin/email/logs?status=SENT', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(statusFilterRes.status, 200);
  for (const log of statusFilterRes.body.data) {
    assert.strictEqual(log.status, 'SENT', 'All results must match status filter');
  }
  console.log(`✓ Status filter verified: all ${statusFilterRes.body.data.length} returned logs have status "SENT"\n`);

  // --------------------------------------------------------------------------
  // TEST 5: Reliability & Non-Crashing Guarantee
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Reliability & Non-Crashing Guarantee ---');

  // 5a. Direct invalid email send produces FAILED log without throwing
  const failedSendResult = await emailService.sendEmail({
    to: 'not_an_email_string',
    subject: 'Invalid test',
    html: '<p>test</p>',
    templateName: 'FAILURE_TEST'
  });
  assert.strictEqual(failedSendResult.success, false, 'Invalid send should return success: false');
  assert.strictEqual(failedSendResult.status, 'FAILED', 'Status must be FAILED');
  assert.ok(failedSendResult.error, 'Error message must be present');
  console.log('✓ Invalid email delivery safely caught and marked FAILED without throwing');

  // 5b. Verify failure log exists in repository
  const failedLogs = await getEmailLogs({ template: 'FAILURE_TEST' });
  assert.ok(failedLogs.data.length >= 1, 'Failed email log must be recorded in repository');
  assert.strictEqual(failedLogs.data[0].status, 'FAILED');
  console.log('✓ Failed email event logged with FAILED status in audit ledger');

  // 5c. User Registration succeeds seamlessly even if email fails/simulates
  const freshEmail = `creator_reg_${Date.now()}@portal.com`;
  const regRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: {
      name: 'Resilience Test Creator',
      email: freshEmail,
      password: 'StrongPassword123!'
    }
  });
  assert.strictEqual(regRes.status, 201, 'User registration must succeed with 201 Created');
  assert.ok(regRes.body.token, 'Registration must return auth token');
  assert.strictEqual(regRes.body.user.email, freshEmail);
  console.log('✓ User account creation succeeds without disruption (100% decoupling from SMTP delivery)');

  // 5d. Verify account creation triggered ACCOUNT_CREATED email log
  const regLogs = await getEmailLogs({ search: freshEmail });
  assert.ok(regLogs.data.length >= 1, 'Account creation must trigger transactional email log');
  assert.strictEqual(regLogs.data[0].template, 'ACCOUNT_CREATED');
  console.log(`✓ Transactional ACCOUNT_CREATED email logged for new user: ${freshEmail}\n`);

  // --------------------------------------------------------------------------
  // TEST 6: All Core Transactional Templates Verification
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: Core Transactional Email Templates Verification ---');
  const dummyUser = { name: 'Alex Johnson', email: 'alex@example.com', totalXP: 350 };

  const tplResults = await Promise.all([
    emailService.sendLoginNotificationEmail(dummyUser, { ip: '127.0.0.1', userAgent: 'Chrome/Test' }),
    emailService.sendPasswordChangedEmail(dummyUser, { ip: '127.0.0.1' }),
    emailService.sendPasswordResetEmail(dummyUser, { resetLink: 'https://portal.test/reset?token=xyz' }),
    emailService.sendSubmissionApprovedEmail(dummyUser, { id: 'sub-test-123', platform: 'INSTAGRAM', actionType: 'LIKE' }, { xp: 2, totalXP: 352, level: { levelName: 'Active' } }),
    emailService.sendSubmissionRejectedEmail(dummyUser, { id: 'sub-test-124', platform: 'LINKEDIN', actionType: 'COMMENT' }, 'Screenshot blurry'),
    emailService.sendClarificationEmail(dummyUser, { id: 'sub-test-125', platform: 'FACEBOOK', actionType: 'STORY' }, 'Please provide full screen'),
    emailService.sendXPNotificationEmail(dummyUser, { xp: 10, actionType: 'BONUS', reason: 'Campaign Star', newTotalXP: 362 }),
    emailService.sendLevelUpEmail(dummyUser, { currentLevel: 3, levelName: 'Contributor', icon: '🚀', totalXP: 362 })
  ]);

  for (const res of tplResults) {
    assert.strictEqual(res.success, true, `Template send failed: ${res.template}`);
    assert.ok(res.messageId, `MessageId missing for ${res.template}`);
  }
  console.log('✓ All 8 transactional email functions rendered and dispatched successfully');

  // Verify telemetry status API endpoint
  const statusApiRes = await makeRequest('/super-admin/email/status', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(statusApiRes.status, 200);
  assert.ok(statusApiRes.body.data.host);
  assert.strictEqual(statusApiRes.body.data.password, undefined);
  console.log('✓ Super Admin /api/super-admin/email/status endpoint operational without secret leakage\n');

  console.log('======================================================');
  console.log('🎉 ALL TRANSACTIONAL EMAIL SYSTEM TESTS PASSED!');
  console.log('======================================================\n');
}

runTransactionalEmailTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
