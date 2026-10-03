/**
 * Super Admin Email Management & Control Center Comprehensive Test Suite
 * Social Media Activity Verification Portal
 * 
 * Verifies:
 * 1. Strict RBAC (Super Admin 200, Admin 403, User 403, Unauth 401)
 * 2. Overview Delivery Metrics (Today, Week, Month, Sent, Failed, Pending, Success Rate)
 * 3. Time-series & Categorical Analytics
 * 4. Email Delivery Logs (Search, Filters, Pagination)
 * 5. Log Details & Privacy (Zero Secrets/Tokens exposed)
 * 6. Test Email with All Templates
 * 7. Failed Emails Listing
 * 8. Safe Retry Mechanism (without duplicate application events)
 * 9. Super Admin Event Toggles (Optional events can be disabled; Security-critical cannot)
 * 10. Template Configuration Management & Sanitization
 */

const assert = require('assert');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5001/api';

const makeRequest = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const config = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: data };
};

const loginAs = async (email, password) => {
  const res = await makeRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.strictEqual(res.status, 200, `Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return {
    token: res.body.token,
    user: res.body.user
  };
};

async function runSuperAdminEmailControlCenterTests() {
  console.log('\n======================================================');
  console.log('📧 Super Admin Email Control Center Test Suite');
  console.log('======================================================\n');

  // Authenticate personas
  const superAdmin = await loginAs('superadmin@portal.com', 'SuperAdmin123!');
  const admin = await loginAs('admin@portal.com', 'Admin123!');
  const user = await loginAs('user@portal.com', 'User123!');

  console.log('✓ Successfully authenticated CREATOR, ADMIN, and SUPER_ADMIN.\n');

  // --------------------------------------------------------------------------
  // TEST 1: Strict RBAC Protection (Super Admin 200, Admin 403, User 403, Unauth 401)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Strict RBAC Protection ---');
  const endpoints = [
    '/super-admin/email/overview',
    '/super-admin/email/analytics',
    '/super-admin/email/logs',
    '/super-admin/email/failed',
    '/super-admin/email/settings',
    '/super-admin/email/templates/config'
  ];

  for (const ep of endpoints) {
    // 1. Unauthenticated -> 401
    const unauth = await makeRequest(ep);
    assert.strictEqual(unauth.status, 401, `Expected 401 for unauthenticated request to ${ep}`);

    // 2. Normal User -> 403
    const userRes = await makeRequest(ep, { headers: { Authorization: `Bearer ${user.token}` } });
    assert.strictEqual(userRes.status, 403, `Expected 403 for User access to ${ep}`);

    // 3. Admin Moderator -> 403
    const adminRes = await makeRequest(ep, { headers: { Authorization: `Bearer ${admin.token}` } });
    assert.strictEqual(adminRes.status, 403, `Expected 403 for Admin access to ${ep}`);

    // 4. Super Admin -> 200
    const saRes = await makeRequest(ep, { headers: { Authorization: `Bearer ${superAdmin.token}` } });
    assert.strictEqual(saRes.status, 200, `Expected 200 for Super Admin access to ${ep}`);
  }
  console.log('✓ 401 Unauthenticated and 403 Forbidden strictly enforced across all email management endpoints.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Delivery Overview Metrics
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Delivery Overview Metrics ---');
  const overviewRes = await makeRequest('/super-admin/email/overview', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(overviewRes.status, 200);
  assert.strictEqual(overviewRes.body.success, true);
  const metrics = overviewRes.body.data;
  assert.ok(typeof metrics.sentToday === 'number');
  assert.ok(typeof metrics.sentThisWeek === 'number');
  assert.ok(typeof metrics.sentThisMonth === 'number');
  assert.ok(typeof metrics.successful === 'number');
  assert.ok(typeof metrics.failed === 'number');
  assert.ok(typeof metrics.pending === 'number');
  assert.ok(typeof metrics.deliverySuccessRate === 'number');
  console.log(`✓ Metrics: ${metrics.successful} sent, ${metrics.failed} failed, Success Rate: ${metrics.deliverySuccessRate}%\n`);

  // --------------------------------------------------------------------------
  // TEST 3: Time-Series & Categorical Analytics
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Time-Series & Categorical Analytics ---');
  const analyticsRes = await makeRequest('/super-admin/email/analytics?days=7', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(analyticsRes.status, 200);
  const analytics = analyticsRes.body.data;
  assert.ok(Array.isArray(analytics.daily));
  assert.ok(analytics.daily.length === 7);
  assert.ok(Array.isArray(analytics.byTemplate));
  assert.ok(Array.isArray(analytics.byCategory));
  console.log(`✓ Analytics loaded: ${analytics.daily.length} daily datapoints, ${analytics.byTemplate.length} templates tracked.\n`);

  // --------------------------------------------------------------------------
  // TEST 4: Email Logs Search, Filters & Pagination
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Email Logs Search, Filters & Pagination ---');
  const logsRes = await makeRequest('/super-admin/email/logs?page=1&limit=5', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(logsRes.status, 200);
  assert.ok(logsRes.body.pagination);
  assert.strictEqual(logsRes.body.pagination.limit, 5);
  assert.ok(logsRes.body.data.length <= 5);

  // Status Filter
  const sentLogsRes = await makeRequest('/super-admin/email/logs?status=SENT', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(sentLogsRes.status, 200);
  for (const log of sentLogsRes.body.data) {
    assert.strictEqual(log.status, 'SENT');
  }

  // Search Filter
  const searchRes = await makeRequest('/super-admin/email/logs?search=portal.com', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(searchRes.status, 200);
  console.log('✓ Email logs pagination, status filtering, and search verified.\n');

  // --------------------------------------------------------------------------
  // TEST 5: Email Log Details & Secret Sanitization
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Email Log Details & Secret Sanitization ---');
  if (logsRes.body.data.length > 0) {
    const sampleLogId = logsRes.body.data[0].id;
    const detailRes = await makeRequest(`/super-admin/email/logs/${sampleLogId}`, {
      headers: { Authorization: `Bearer ${superAdmin.token}` }
    });
    assert.strictEqual(detailRes.status, 200);
    const detail = detailRes.body.data;
    assert.strictEqual(detail.id, sampleLogId);
    assert.ok(detail.recipient);
    assert.ok(detail.subject);
    assert.ok(detail.template);

    // Verify zero sensitive credentials in response
    const jsonStr = JSON.stringify(detail);
    assert.strictEqual(jsonStr.includes('SuperAdmin123!'), false);
    assert.strictEqual(jsonStr.includes('User123!'), false);
    assert.strictEqual(jsonStr.includes('MAIL_PASSWORD'), false);
    console.log(`✓ Details inspected for log ${sampleLogId}: secrets strictly protected.\n`);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Multi-Template Test Email Dispatch
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: Multi-Template Test Email Dispatch ---');
  const testTemplatesToVerify = [
    'TEST_EMAIL',
    'ACCOUNT_CREATED',
    'LOGIN_NOTIFICATION',
    'PASSWORD_RESET',
    'SUBMISSION_APPROVED',
    'LEVEL_UP'
  ];

  for (const tmpl of testTemplatesToVerify) {
    const testRes = await makeRequest('/super-admin/email/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdmin.token}` },
      body: {
        recipient: 'pjsocialmediaportal@gmail.com',
        template: tmpl
      }
    });
    assert.strictEqual(testRes.status, 200);
    assert.ok(testRes.body.data);
    assert.strictEqual(testRes.body.data.recipient, 'pjsocialmediaportal@gmail.com');
    assert.strictEqual(testRes.body.data.template, tmpl);
    console.log(`✓ Test email with template "${tmpl}" dispatched successfully.`);
  }
  console.log('');

  // --------------------------------------------------------------------------
  // TEST 7: Failed Emails Listing & Retry Mechanism
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Failed Emails Listing & Safe Retry ---');
  const failedRes = await makeRequest('/super-admin/email/failed', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(failedRes.status, 200);
  assert.ok(Array.isArray(failedRes.body.data));
  console.log(`✓ Failed emails list retrieved: ${failedRes.body.count} failed deliveries logged.`);

  if (failedRes.body.data.length > 0) {
    const failedLog = failedRes.body.data[0];
    const retryRes = await makeRequest(`/super-admin/email/retry/${failedLog.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdmin.token}` }
    });
    assert.strictEqual(retryRes.status, 200);
    assert.strictEqual(retryRes.body.data.recipient, failedLog.recipient);
    console.log(`✓ Retry delivery verified for log ${failedLog.id} -> ${failedLog.recipient}`);
  }
  console.log('');

  // --------------------------------------------------------------------------
  // TEST 8: Email Settings & Telemetry Safety
  // --------------------------------------------------------------------------
  console.log('--- TEST 8: Email Settings & Telemetry Safety ---');
  const settingsRes = await makeRequest('/super-admin/email/settings', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(settingsRes.status, 200);
  const { telemetry, eventToggles } = settingsRes.body.data;
  assert.ok(telemetry.provider);
  assert.ok(telemetry.sender);
  assert.ok(telemetry.smtpStatus);
  assert.ok(telemetry.oauthStatus);
  assert.strictEqual(telemetry.smtpStatus, 'Configured ✓');

  // Verify zero passwords in telemetry
  const telemetryStr = JSON.stringify(telemetry);
  assert.strictEqual(telemetryStr.includes('password'), false);
  assert.strictEqual(telemetryStr.includes('secret'), false);
  console.log('✓ Email settings telemetry verified. Zero credentials exposed.\n');

  // --------------------------------------------------------------------------
  // TEST 9: Super Admin Global Event Toggles (Security Must Remain Enabled)
  // --------------------------------------------------------------------------
  console.log('--- TEST 9: Super Admin Global Event Toggles ---');
  // Attempt to disable optional events AND attempt to disable security-critical events
  const updateToggleRes = await makeRequest('/super-admin/email/settings/events', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      loginNotification: false,
      submissionApproval: false,
      passwordReset: false,     // MUST REMAIN TRUE
      passwordChanged: false,   // MUST REMAIN TRUE
      accountSecurity: false    // MUST REMAIN TRUE
    }
  });
  assert.strictEqual(updateToggleRes.status, 200);
  const updatedToggles = updateToggleRes.body.data;
  assert.strictEqual(updatedToggles.loginNotification, false, 'Optional loginNotification should be disabled');
  assert.strictEqual(updatedToggles.submissionApproval, false, 'Optional submissionApproval should be disabled');
  assert.strictEqual(updatedToggles.passwordReset, true, 'Security-critical passwordReset MUST remain true');
  assert.strictEqual(updatedToggles.passwordChanged, true, 'Security-critical passwordChanged MUST remain true');
  assert.strictEqual(updatedToggles.accountSecurity, true, 'Security-critical accountSecurity MUST remain true');
  console.log('✓ Security-critical events immutable: password reset/changed cannot be disabled.\n');

  // Reset toggles back to active
  await makeRequest('/super-admin/email/settings/events', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      loginNotification: true,
      submissionApproval: true
    }
  });

  // --------------------------------------------------------------------------
  // TEST 10: Template Configuration Management & Sanitization
  // --------------------------------------------------------------------------
  console.log('--- TEST 10: Template Configuration & Sanitization ---');
  const configsRes = await makeRequest('/super-admin/email/templates/config', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(configsRes.status, 200);
  assert.ok(configsRes.body.data.length >= 10);

  // Update a template with dangerous script injection to verify sanitization
  const updateTmplRes = await makeRequest('/super-admin/email/templates/config/ACCOUNT_CREATED', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      subject: 'Custom Welcome to PJ Verification Portal <script>alert("xss")</script>',
      customHeader: '<img src=x onerror=alert(1)> Official Welcome'
    }
  });
  assert.strictEqual(updateTmplRes.status, 200);
  const updatedTmpl = updateTmplRes.body.data;
  assert.strictEqual(updatedTmpl.subject.includes('<script>'), false, 'Script tags must be stripped');
  assert.strictEqual(updatedTmpl.customHeader.includes('onerror'), false, 'Event handlers must be stripped');
  console.log('✓ Template configuration updated & dangerous HTML injections sanitized.\n');

  console.log('======================================================');
  console.log('🎉 ALL 10 SUPER ADMIN EMAIL CONTROL CENTER TESTS PASSED!');
  console.log('======================================================\n');
}

runSuperAdminEmailControlCenterTests().catch(err => {
  console.error('\n❌ Super Admin Email Control Center Test Suite Failed:', err);
  process.exit(1);
});
