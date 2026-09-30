const http = require('http');
const assert = require('assert');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api`;

const makeRequest = (endpoint, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
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
  assert(res.body.token, `Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
};

async function runProfileManagementTests() {
  console.log('=== Starting Profile Management End-to-End Test Suite ===\n');

  // Log in as all three roles
  const superToken = await login('superadmin@portal.com', 'SuperAdmin123!');
  const adminToken = await login('admin@portal.com', 'Admin123!');
  const userToken = await login('user@portal.com', 'User123!');

  console.log('✓ Successfully authenticated SUPER_ADMIN, ADMIN, and USER');

  // ── 1. Test GET /api/users/me (All 3 roles + Unauthenticated) ───────────
  console.log('\n--- 1. Testing GET /api/users/me ---');

  const unauthRes = await makeRequest('/users/me');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
  console.log('✓ Unauthenticated request blocked with 401 Unauthorized');

  // USER
  const userMe = await makeRequest('/users/me', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userMe.status, 200, 'USER can fetch own profile');
  assert.strictEqual(userMe.body.user.role, 'USER', 'USER profile has role USER');
  assert.strictEqual(userMe.body.user.email, 'user@portal.com', 'USER profile email matches');
  assert.strictEqual(userMe.body.user.password, undefined, 'Password hash must never be returned');
  console.log('✓ Normal User profile retrieved successfully without password leak');

  // ADMIN
  const adminMe = await makeRequest('/users/me', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminMe.status, 200, 'ADMIN can fetch own profile');
  assert.strictEqual(adminMe.body.user.role, 'ADMIN', 'ADMIN profile has role ADMIN');
  assert.strictEqual(adminMe.body.user.password, undefined, 'Password hash must never be returned');
  console.log('✓ Admin Moderator profile retrieved successfully without password leak');

  // SUPER_ADMIN
  const superMe = await makeRequest('/users/me', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert.strictEqual(superMe.status, 200, 'SUPER_ADMIN can fetch own profile');
  assert.strictEqual(superMe.body.user.role, 'SUPER_ADMIN', 'SUPER_ADMIN profile has role SUPER_ADMIN');
  assert.strictEqual(superMe.body.user.password, undefined, 'Password hash must never be returned');
  console.log('✓ Super Admin profile retrieved successfully without password leak');

  // ── 2. Test PUT /api/users/me (Allowed fields & Protected fields guardrails) ──
  console.log('\n--- 2. Testing PUT /api/users/me & Security Guardrails ---');

  // Test privilege escalation / self-role change prevention
  const roleTamperRes = await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: 'Sarah Connor', role: 'SUPER_ADMIN' }
  });
  assert.strictEqual(roleTamperRes.status, 403, 'Users must be strictly forbidden from changing their own role (403)');
  console.log('✓ Prevented privilege escalation: User cannot modify own role');

  // Test protected account status prevention
  const statusTamperRes = await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: 'Sarah Connor', status: 'SUSPENDED' }
  });
  assert.strictEqual(statusTamperRes.status, 400, 'Users cannot modify account status via profile update');
  console.log('✓ Prevented status modification via profile update');

  // Test password modification prevention via PUT /api/users/me
  const passInProfileRes = await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: 'Sarah Connor', password: 'HackedPassword123!' }
  });
  assert.strictEqual(passInProfileRes.status, 400, 'Users cannot supply password in PUT /api/users/me');
  console.log('✓ Prevented password injection in profile update');

  // Test email modification prevention
  const emailTamperRes = await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: 'Sarah Connor', email: 'different@portal.com' }
  });
  assert.strictEqual(emailTamperRes.status, 400, 'Users cannot modify protected email field');
  console.log('✓ Prevented modifying protected email identifier');

  // Test valid name update
  const originalUserName = userMe.body.user.name;
  const updatedNameRes = await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: 'Sarah Connor (Verified Creator)' }
  });
  assert.strictEqual(updatedNameRes.status, 200, 'Valid name update returns 200');
  assert.strictEqual(updatedNameRes.body.user.name, 'Sarah Connor (Verified Creator)');
  assert.strictEqual(updatedNameRes.body.user.password, undefined, 'Password hash must never be returned');
  console.log('✓ Allowed profile field (name) updated successfully');

  // Revert name back to clean state
  await makeRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { name: originalUserName }
  });
  console.log('✓ User name reverted cleanly');

  // ── 3. Test PUT /api/users/change-password ───────────────────────────────
  console.log('\n--- 3. Testing PUT /api/users/change-password ---');

  // Missing fields
  const missingFieldRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { currentPassword: 'User123!' }
  });
  assert.strictEqual(missingFieldRes.status, 400, 'Missing newPassword must return 400');
  console.log('✓ Missing newPassword rejected with 400');

  // Password too short (< 8 chars)
  const shortPassRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { currentPassword: 'User123!', newPassword: 'short' }
  });
  assert.strictEqual(shortPassRes.status, 400, 'Password < 8 characters must return 400');
  console.log('✓ Password length < 8 chars rejected with 400');

  // Confirm password mismatch
  const mismatchRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { currentPassword: 'User123!', newPassword: 'NewSecurePassword123!', confirmPassword: 'DifferentPassword123!' }
  });
  assert.strictEqual(mismatchRes.status, 400, 'Password mismatch must return 400');
  console.log('✓ Password confirmation mismatch rejected with 400');

  // Same as current password
  const samePassRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { currentPassword: 'User123!', newPassword: 'User123!' }
  });
  assert.strictEqual(samePassRes.status, 400, 'Same password as current must return 400');
  console.log('✓ Identical new password rejected with 400');

  // Wrong current password
  const wrongCurrentRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { currentPassword: 'WrongPassword999!', newPassword: 'NewValidPassword123!' }
  });
  assert.strictEqual(wrongCurrentRes.status, 400, 'Incorrect current password must return 400');
  console.log('✓ Incorrect current password rejected with 400');

  // Valid password change
  const validChangeRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      currentPassword: 'User123!',
      newPassword: 'BrandNewPassword123!',
      confirmPassword: 'BrandNewPassword123!'
    }
  });
  assert.strictEqual(validChangeRes.status, 200, 'Valid password change returns 200');
  assert.strictEqual(validChangeRes.body.success, true);
  assert.strictEqual(validChangeRes.body.password, undefined, 'Never leak password hash in response');
  console.log('✓ Password changed successfully');

  // Verify can log in with new password
  const newLoginToken = await login('user@portal.com', 'BrandNewPassword123!');
  assert(newLoginToken, 'Login with new password succeeded');
  console.log('✓ Login verified with newly updated password');

  // Revert password back to original 'User123!'
  const revertChangeRes = await makeRequest('/users/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newLoginToken}` },
    body: {
      currentPassword: 'BrandNewPassword123!',
      newPassword: 'User123!',
      confirmPassword: 'User123!'
    }
  });
  assert.strictEqual(revertChangeRes.status, 200, 'Reverting password returns 200');
  console.log('✓ Password restored to original demo credential');

  // Verify original login works
  const restoredLoginToken = await login('user@portal.com', 'User123!');
  assert(restoredLoginToken, 'Login with restored password works');
  console.log('✓ Restored credentials verified successfully');

  console.log('\n=== ALL PROFILE MANAGEMENT TESTS PASSED (100%) ===\n');
}

runProfileManagementTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
