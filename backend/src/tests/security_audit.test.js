const http = require('http');
const assert = require('assert');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api`;
const env = require('../config/env');
const JWT_SECRET = env.JWT_SECRET;

const makeRequest = (endpoint, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {})
      }
    };

    if (options.body && !(options.headers && options.headers['Content-Type'])) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          raw: body
        });
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
  assert(res.body?.token, `Login failed for ${email}`);
  return res.body.token;
};

async function runSecurityAudit() {
  console.log('========================================================');
  console.log('       VeriSocial Full-Stack Security Audit Suite       ');
  console.log('========================================================\n');

  // Authenticate base test accounts
  const superToken = await login('superadmin@portal.com', 'SuperAdmin123!');
  const adminToken = await login('admin@portal.com', 'Admin123!');
  const userToken = await login('user@portal.com', 'User123!');

  console.log('✓ Acquired test tokens for SUPER_ADMIN, ADMIN, and USER roles');

  // ── 1. Security Headers & Server Masking (Helmet) ─────────────────────────
  console.log('\n--- 1. Testing Security Headers & Fingerprint Masking ---');
  const headersRes = await makeRequest('/health');
  assert.strictEqual(headersRes.headers['x-powered-by'], undefined, 'X-Powered-By header must be stripped/disabled');
  assert.strictEqual(headersRes.headers['x-content-type-options'], 'nosniff', 'X-Content-Type-Options must be nosniff');
  assert.strictEqual(headersRes.headers['x-frame-options'], 'SAMEORIGIN', 'X-Frame-Options must be SAMEORIGIN');
  console.log('✓ X-Powered-By is disabled');
  console.log('✓ X-Content-Type-Options: nosniff verified');
  console.log('✓ X-Frame-Options: SAMEORIGIN verified');

  // ── 2. Request Size Limits (Payload Exhaustion Defense) ───────────────────
  console.log('\n--- 2. Testing Request Payload Size Limits (1MB limit) ---');
  const oversizedPayload = {
    data: 'x'.repeat(1024 * 1024 * 1.5) // 1.5MB
  };
  const largePayloadRes = await makeRequest('/auth/login', {
    method: 'POST',
    body: oversizedPayload
  });
  assert.strictEqual(largePayloadRes.status, 413, 'Payload exceeding 1MB must return HTTP 413 Payload Too Large');
  console.log('✓ 1.5MB oversized payload correctly rejected with 413 Payload Too Large');

  // ── 3. JWT Signature & Expiration Security ────────────────────────────────
  console.log('\n--- 3. Testing JWT Validation & Tamper Protection ---');

  // Missing token
  const noTokenRes = await makeRequest('/users/me');
  assert.strictEqual(noTokenRes.status, 401, 'Missing token must return 401');

  // Malformed token
  const malformedRes = await makeRequest('/users/me', {
    headers: { Authorization: 'Bearer this-is-not-a-jwt-token' }
  });
  assert.strictEqual(malformedRes.status, 401, 'Malformed token must return 401');

  // Forged signature
  const forgedToken = jwt.sign(
    { id: 'usr-user-003', email: 'user@portal.com', role: 'SUPER_ADMIN' },
    'wrong-forged-secret-key-123456789'
  );
  const forgedRes = await makeRequest('/users/me', {
    headers: { Authorization: `Bearer ${forgedToken}` }
  });
  assert.strictEqual(forgedRes.status, 401, 'Forged JWT signature must return 401');

  // Expired token
  const expiredToken = jwt.sign(
    { id: 'usr-user-003', email: 'user@portal.com', role: 'USER' },
    JWT_SECRET,
    { expiresIn: -10 } // expired 10 seconds ago
  );
  const expiredRes = await makeRequest('/users/me', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert.strictEqual(expiredRes.status, 401, 'Expired token must return 401 with TOKEN_EXPIRED');
  assert.strictEqual(expiredRes.body?.code, 'TOKEN_EXPIRED');
  console.log('✓ Missing, malformed, forged, and expired tokens strictly rejected with 401');

  // ── 4. Role Authorization Matrix (Server-Side Enforcement) ────────────────
  console.log('\n--- 4. Testing Role Authorization Matrix ---');

  // USER blocked from Admin dashboard (403)
  const userAdminDash = await makeRequest('/dashboard/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userAdminDash.status, 403, 'USER blocked from Admin dashboard');

  // USER blocked from Super Admin dashboard (403)
  const userSuperDash = await makeRequest('/dashboard/super-admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userSuperDash.status, 403, 'USER blocked from Super Admin dashboard');

  // ADMIN blocked from Super Admin dashboard (403)
  const adminSuperDash = await makeRequest('/dashboard/super-admin', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminSuperDash.status, 403, 'ADMIN blocked from Super Admin dashboard');

  // ADMIN blocked from Super Admin audit logs (403)
  const adminAuditLogs = await makeRequest('/superadmin/audit-logs', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminAuditLogs.status, 403, 'ADMIN blocked from Super Admin audit logs');

  console.log('✓ Strict server-side RBAC enforced across all protected endpoints');

  // ── 5. IDOR (Insecure Direct Object Reference) Protection ─────────────────
  console.log('\n--- 5. Testing IDOR Vulnerability Defenses ---');

  // Fetch a submission not owned by USER
  const userPayload = jwt.decode(userToken);
  const currentUserId = userPayload?.id;

  const adminSubs = await makeRequest('/submissions', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  let notOwnedSub = adminSubs.body?.data?.find(s => s.userId !== currentUserId);

  if (!notOwnedSub) {
    // Create a temporary secondary user and a submission to guarantee an IDOR target exists
    const tempOtherEmail = `other-creator-${Date.now()}@portal.com`;
    const regRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Other Creator', email: tempOtherEmail, password: 'OtherPassword123!' }
    });
    const otherToken = regRes.body?.token;
    const activeAccs = await makeRequest('/social-accounts/active', {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    const targetAcc = activeAccs.body?.data?.[0];
    const createdSub = await makeRequest('/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}` },
      body: {
        platform: targetAcc.platform,
        actionType: 'LIKE',
        postUrl: 'https://instagram.com/p/C0987654321',
        screenshotUrl: '/api/uploads/screenshots/test.png',
        socialAccountId: targetAcc.id
      }
    });
    notOwnedSub = createdSub.body?.data;
  }

  assert(notOwnedSub, 'Must have a submission not owned by USER to test IDOR');
  const idorSubRes = await makeRequest(`/submissions/${notOwnedSub.id}`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(idorSubRes.status, 403, 'USER cannot access another users submission via ID parameter (IDOR protected)');
  assert.strictEqual(idorSubRes.body?.code, 'FORBIDDEN_OWNERSHIP');
  console.log('✓ IDOR blocked: Normal user cannot view other users submissions');

  // IDOR on notification read: USER cannot mark another users notification
  const idorNotifRes = await makeRequest('/notifications/notif-someone-else/read', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert(idorNotifRes.status === 403 || idorNotifRes.status === 404, 'USER cannot tamper with other users notification');
  console.log('✓ IDOR blocked: Normal user cannot tamper with other users notifications');

  // ── 6. Privilege Escalation Prevention on Profile & Registration ─────────
  console.log('\n--- 6. Testing Privilege Escalation Defenses ---');

  // Self-role elevation via PUT /api/users/me
  const elevateRes = await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: 'Sarah Connor', role: 'SUPER_ADMIN' }
  });
  assert.strictEqual(elevateRes.status, 403, 'Self-role escalation blocked');

  // Protected status modification via PUT /api/users/me
  const statusRes = await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: 'Sarah Connor', status: 'INACTIVE' }
  });
  assert.strictEqual(statusRes.status, 400, 'Modifying protected status field blocked');

  // Registration role spoofing: sending role='SUPER_ADMIN' in POST /api/auth/register
  const tempEmail = `test-elevate-${Date.now()}@portal.com`;
  const registerSpoofRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: {
      name: 'Hacker Joe',
      email: tempEmail,
      password: 'HackerPassword123!',
      role: 'SUPER_ADMIN' // Attempt to inject role
    }
  });
  assert.strictEqual(registerSpoofRes.status, 201, 'Registration succeeded');
  assert.strictEqual(registerSpoofRes.body?.user?.role, 'USER', 'Role in registration is forced to USER server-side');
  console.log('✓ Registration role tampering blocked: always assigned USER');

  // ── 7. Password Security & Sanitization ──────────────────────────────────
  console.log('\n--- 7. Testing Password Policy & Leak Prevention ---');

  // Registration password < 8 characters
  const shortPassRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: {
      name: 'Weak Pass',
      email: `weak-${Date.now()}@portal.com`,
      password: 'weak'
    }
  });
  assert.strictEqual(shortPassRes.status, 400, 'Password < 8 characters must be rejected');

  // Verify no password hash is returned anywhere
  const meRes = await makeRequest('/users/me', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(meRes.body?.user?.password, undefined, 'GET /users/me must not return password');

  const adminUsersRes = await makeRequest('/users', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  for (const u of adminUsersRes.body?.data || []) {
    assert.strictEqual(u.password, undefined, 'User directory must never return password hashes');
  }
  console.log('✓ Zero password hashes exposed across user directory and profile responses');

  // ── 8. Safe File Handling & Path Traversal Prevention ────────────────────
  console.log('\n--- 8. Testing File Upload Validation & Path Traversal ---');

  // Path traversal on screenshot retrieval
  const traversalRes = await makeRequest('/uploads/screenshots/../../etc/passwd', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert.strictEqual(traversalRes.status, 404, 'Path traversal must be safely rejected with 404');
  console.log('✓ Path traversal attempt safely blocked');

  console.log('\n========================================================');
  console.log('       ALL FULL-STACK SECURITY AUDIT TESTS PASSED       ');
  console.log('========================================================\n');
}

runSecurityAudit().catch(err => {
  console.error('❌ Security Audit Failed:', err);
  process.exit(1);
});
