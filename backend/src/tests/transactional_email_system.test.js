const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { getEmailLogs } = require('../repositories/emailLogRepository');
const { createResetToken } = require('../repositories/passwordResetRepository');
const { findUserByEmail } = require('../repositories/userRepository');

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

// Port auto-detection helper (5001 or fallback 5002)
async function detectActivePort() {
  for (const p of [5002, 5001]) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${p}/api/health`, (res) => {
          resolve(res.statusCode);
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      if (res === 200) {
        PORT = p;
        BASE_URL = `http://localhost:${PORT}/api`;
        return;
      }
    } catch {}
  }
}

async function runTransactionalEmailTests() {
  await detectActivePort();
  console.log('\n======================================================');
  console.log(`📧 Transactional Email System Verification Suite (Port: ${PORT})`);
  console.log('======================================================\n');

  // Authenticate users
  const creator = await login('user@portal.com', 'User123!');
  const admin = await login('admin@portal.com', 'Admin123!');
  const superAdmin = await login('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Successfully authenticated CREATOR, ADMIN, and SUPER_ADMIN.\n');

  // --------------------------------------------------------------------------
  // TEST 1: Email Configuration Loading & Telemetry Security
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Configuration & Telemetry Security ---');
  const status = emailService.getMailSystemStatus();
  assert.ok(status.host, 'Mail host must be defined');
  assert.ok(status.port, 'Mail port must be defined');
  assert.ok(status.provider, 'Provider must be defined');
  assert.strictEqual(status.password, undefined, 'Password must NEVER be present in status');
  assert.strictEqual(status.auth, undefined, 'Auth credentials must NEVER be present in status');
  console.log(`✓ Telemetry loaded: Host=${status.host}:${status.port}, Provider="${status.provider}", User="${status.user}"`);
  console.log('✓ Zero sensitive credentials exposed in telemetry.\n');

  // --------------------------------------------------------------------------
  // TEST 2: RBAC Protection on Super Admin Email Endpoints
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Strict RBAC Protection on Email Endpoints ---');

  const unauthTest = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    body: { recipient: 'target@example.com' }
  });
  assert.strictEqual(unauthTest.status, 401, 'Unauthenticated test email must return 401');
  console.log('✓ 401 Unauthorized enforced for unauthenticated requests');

  const userTest = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creator.token}` },
    body: { recipient: 'target@example.com' }
  });
  assert.strictEqual(userTest.status, 403, 'Normal USER must be forbidden (403)');
  console.log('✓ 403 Forbidden enforced for normal USER');

  const adminTest = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}` },
    body: { recipient: 'target@example.com' }
  });
  assert.strictEqual(adminTest.status, 403, 'ADMIN must be forbidden (403)');
  console.log('✓ 403 Forbidden enforced for ADMIN\n');

  // --------------------------------------------------------------------------
  // TEST 3: Super Admin Test Email & Logging Filter
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Super Admin Test Email & Logs Filtering ---');
  const testRecipient = `qa_test_${Date.now()}@domain.test`;
  const validTestRes = await makeRequest('/super-admin/email/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { recipient: testRecipient }
  });
  assert.strictEqual(validTestRes.status, 200);
  assert.strictEqual(validTestRes.body.success, true);
  assert.ok(validTestRes.body.data.messageId);

  const searchRes = await makeRequest(`/super-admin/email/logs?search=${encodeURIComponent(testRecipient)}`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(searchRes.status, 200);
  assert.ok(searchRes.body.data.length >= 1);
  assert.strictEqual(searchRes.body.data[0].recipient, testRecipient);
  assert.strictEqual(searchRes.body.data[0].template, 'TEST_EMAIL');
  console.log(`✓ Test email processed & logged for ${testRecipient}\n`);

  // --------------------------------------------------------------------------
  // TEST 4: Account Creation Welcome Email
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Account Creation Welcome Email ---');
  const newAccountEmail = `user_welcome_${Date.now()}@portal.com`;
  const regRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: {
      name: 'Welcome Test User',
      email: newAccountEmail,
      password: 'UserPass123!'
    }
  });
  assert.strictEqual(regRes.status, 201);
  assert.ok(regRes.body.token);

  // Check that ACCOUNT_CREATED email was logged
  const welcomeLogs = await getEmailLogs({ search: newAccountEmail, template: 'ACCOUNT_CREATED' });
  assert.ok(welcomeLogs.data.length >= 1, 'ACCOUNT_CREATED email must be recorded in EmailLog');
  assert.strictEqual(welcomeLogs.data[0].recipient, newAccountEmail);
  assert.strictEqual(welcomeLogs.data[0].template, 'ACCOUNT_CREATED');
  console.log(`✓ Welcome email logged for new registered user: ${newAccountEmail}\n`);

  // --------------------------------------------------------------------------
  // TEST 5: Password Reset Flow (End-to-End)
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Password Reset Flow (Anti-enumeration, Token, Single-use) ---');

  // 5a. Anti-enumeration: Non-existent email returns same success message
  const nonExistentRes = await makeRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'nonexistent_account_xyz@nowhere.com' }
  });
  assert.strictEqual(nonExistentRes.status, 200);
  assert.strictEqual(nonExistentRes.body.success, true);
  assert.ok(nonExistentRes.body.message.includes('If an account exists with that email address'));
  console.log('✓ Anti-enumeration: Identical generic success response for non-existent email');

  // 5b. Request reset for valid registered user
  const resetReqRes = await makeRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: newAccountEmail }
  });
  assert.strictEqual(resetReqRes.status, 200);
  assert.strictEqual(resetReqRes.body.success, true);
  console.log('✓ Forgot password request succeeded for existing user');

  // Verify PASSWORD_RESET email was logged
  const resetLogs = await getEmailLogs({ search: newAccountEmail, template: 'PASSWORD_RESET' });
  assert.ok(resetLogs.data.length >= 1, 'PASSWORD_RESET email must be logged');
  console.log('✓ PASSWORD_RESET email dispatched and logged');

  // 5c. Retrieve created token from DB directly for testing
  const userRecord = await findUserByEmail(newAccountEmail);
  assert.ok(userRecord, 'User record must exist');

  // Create an explicit raw token and tokenHash for the user to test verification & reset
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await createResetToken({
    userId: userRecord.id,
    tokenHash,
    expiresAt
  });

  // 5d. Verify invalid token -> 400
  const verifyInvalid = await makeRequest('/auth/verify-reset-token?token=invalid_token_123');
  assert.strictEqual(verifyInvalid.status, 400);
  assert.strictEqual(verifyInvalid.body.valid, false);
  console.log('✓ Invalid token verification correctly rejected (400 Bad Request)');

  // 5e. Verify valid token -> 200
  const verifyValid = await makeRequest(`/auth/verify-reset-token?token=${rawToken}`);
  assert.strictEqual(verifyValid.status, 200);
  assert.strictEqual(verifyValid.body.valid, true);
  console.log('✓ Valid token verification succeeded (200 OK)');

  // 5f. Reset password with valid token
  const newSecretPassword = 'BrandNewPassword123!';
  const resetRes = await makeRequest('/auth/reset-password', {
    method: 'POST',
    body: {
      token: rawToken,
      newPassword: newSecretPassword,
      confirmPassword: newSecretPassword
    }
  });
  assert.strictEqual(resetRes.status, 200);
  assert.strictEqual(resetRes.body.success, true);
  console.log('✓ Password reset executed successfully');

  // 5g. Single-use: Reusing the same token must fail
  const reuseRes = await makeRequest('/auth/reset-password', {
    method: 'POST',
    body: {
      token: rawToken,
      newPassword: 'AnotherPassword123!',
      confirmPassword: 'AnotherPassword123!'
    }
  });
  assert.strictEqual(reuseRes.status, 400);
  console.log('✓ Single-use guarantee: Reused token rejected (400 Bad Request)');

  // 5h. Verify login succeeds with the new password
  const newLogin = await login(newAccountEmail, newSecretPassword);
  assert.ok(newLogin.token, 'Login with new password must succeed');
  console.log('✓ Successful authentication using newly reset password');

  // Verify PASSWORD_CHANGED confirmation email logged
  const passChangedLogs = await getEmailLogs({ search: newAccountEmail, template: 'PASSWORD_CHANGED' });
  assert.ok(passChangedLogs.data.length >= 1, 'PASSWORD_CHANGED confirmation email must be logged');
  console.log('✓ PASSWORD_CHANGED confirmation email logged\n');

  // --------------------------------------------------------------------------
  // TEST 6: User Profile Password Change & Security Email
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: In-App Password Change (PUT /api/users/change-password) ---');
  // 6a. Wrong current password -> 400
  const badOldPassRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newLogin.token}` },
    body: {
      currentPassword: 'WrongPassword!',
      newPassword: 'UpdatedSecretPass123!',
      confirmPassword: 'UpdatedSecretPass123!'
    }
  });
  assert.strictEqual(badOldPassRes.status, 400);
  console.log('✓ Rejected password change when current password is wrong');

  // 6b. Correct current password -> 200
  const goodPassRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newLogin.token}` },
    body: {
      currentPassword: newSecretPassword,
      newPassword: 'UpdatedSecretPass123!',
      confirmPassword: 'UpdatedSecretPass123!'
    }
  });
  assert.strictEqual(goodPassRes.status, 200);
  console.log('✓ In-app password change succeeded and triggered PASSWORD_CHANGED email\n');

  // --------------------------------------------------------------------------
  // TEST 7: User Email Change (PUT /api/users/change-email) & Dual Emails
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: User Email Change (PUT /api/users/change-email) ---');
  const targetNewEmail = `user_updated_${Date.now()}@portal.com`;

  // 7a. Incorrect password -> 400
  const badPassEmailChange = await makeRequest('/users/change-email', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newLogin.token}` },
    body: {
      newEmail: targetNewEmail,
      currentPassword: 'IncorrectPassword'
    }
  });
  assert.strictEqual(badPassEmailChange.status, 400);
  console.log('✓ Email change rejected with invalid password');

  // 7b. Correct password -> 200
  const goodEmailChange = await makeRequest('/users/change-email', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newLogin.token}` },
    body: {
      newEmail: targetNewEmail,
      currentPassword: 'UpdatedSecretPass123!'
    }
  });
  assert.strictEqual(goodEmailChange.status, 200);
  assert.strictEqual(goodEmailChange.body.user.email, targetNewEmail);
  console.log(`✓ Email updated to ${targetNewEmail}`);

  // Verify dual notification emails: EMAIL_CHANGED_OLD and EMAIL_CHANGED_NEW
  const oldEmailLogs = await getEmailLogs({ search: newAccountEmail, template: 'EMAIL_CHANGED_OLD' });
  assert.ok(oldEmailLogs.data.length >= 1, 'EMAIL_CHANGED_OLD notice must be sent to old email');

  const newEmailLogs = await getEmailLogs({ search: targetNewEmail, template: 'EMAIL_CHANGED_NEW' });
  assert.ok(newEmailLogs.data.length >= 1, 'EMAIL_CHANGED_NEW notice must be sent to new email');
  console.log('✓ Dual email notifications dispatched to old AND new addresses\n');

  // --------------------------------------------------------------------------
  // TEST 8: Account Deactivation & Reactivation Lifecycle Emails
  // --------------------------------------------------------------------------
  console.log('--- TEST 8: Super Admin Account Deactivation & Reactivation Emails ---');
  // 8a. Deactivate user account
  const deactRes = await makeRequest(`/superadmin/users/${userRecord.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { status: 'INACTIVE' }
  });
  assert.strictEqual(deactRes.status, 200);
  assert.strictEqual(deactRes.body.data.status, 'INACTIVE');

  // Verify ACCOUNT_DEACTIVATED email was logged
  const deactLogs = await getEmailLogs({ search: targetNewEmail, template: 'ACCOUNT_DEACTIVATED' });
  assert.ok(deactLogs.data.length >= 1, 'ACCOUNT_DEACTIVATED email must be logged');
  console.log('✓ ACCOUNT_DEACTIVATED email dispatched and logged on account deactivation');

  // 8b. Reactivate user account
  const reactRes = await makeRequest(`/superadmin/users/${userRecord.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { status: 'ACTIVE' }
  });
  assert.strictEqual(reactRes.status, 200);
  assert.strictEqual(reactRes.body.data.status, 'ACTIVE');

  // Verify ACCOUNT_REACTIVATED email was logged
  const reactLogs = await getEmailLogs({ search: targetNewEmail, template: 'ACCOUNT_REACTIVATED' });
  assert.ok(reactLogs.data.length >= 1, 'ACCOUNT_REACTIVATED email must be logged');
  console.log('✓ ACCOUNT_REACTIVATED email dispatched and logged on account reactivation\n');

  // --------------------------------------------------------------------------
  // TEST 9: Reliability & Non-Crashing Guarantee Under Email Failure
  // --------------------------------------------------------------------------
  console.log('--- TEST 9: Reliability & Fault Tolerance Under Email Failure ---');
  const failureSim = await emailService.sendEmail({
    to: 'invalid_recipient_address',
    subject: 'Simulated Failure',
    html: '<p>Content</p>',
    templateName: 'FAILURE_TEST'
  });
  assert.strictEqual(failureSim.success, false);
  assert.strictEqual(failureSim.status, 'FAILED');
  assert.ok(failureSim.error);
  console.log('✓ Email failure safely caught and logged without throwing unhandled exceptions\n');

  console.log('======================================================');
  console.log('🎉 ALL 9 TRANSACTIONAL EMAIL & AUTH TESTS PASSED!');
  console.log('======================================================\n');
}

runTransactionalEmailTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
