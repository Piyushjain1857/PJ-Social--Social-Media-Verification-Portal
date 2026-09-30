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

async function runOfficialSocialAccountsTests() {
  console.log('--- Starting Official Social Media Accounts Test Suite ---');

  const superToken = await login('superadmin@portal.com', 'SuperAdmin123!');
  const adminToken = await login('admin@portal.com', 'Admin123!');
  const userToken = await login('user@portal.com', 'User123!');

  console.log('1. Testing RBAC restrictions on Official Accounts Management...');

  // 1a. Normal user cannot list Super Admin social accounts (403)
  const userListRes = await makeRequest('/superadmin/social-accounts', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userListRes.status, 403, 'Normal USER must receive 403 Forbidden for Super Admin accounts list');
  console.log('✓ Normal USER receives 403 on /superadmin/social-accounts');

  // 1b. Admin cannot list Super Admin social accounts (403)
  const adminListRes = await makeRequest('/superadmin/social-accounts', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminListRes.status, 403, 'ADMIN must receive 403 Forbidden for Super Admin accounts list');
  console.log('✓ ADMIN receives 403 on /superadmin/social-accounts');

  // 1c. Normal user cannot create official account (403)
  const userCreateRes = await makeRequest('/superadmin/social-accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: { platform: 'INSTAGRAM', name: 'Rogue Account', accountUrl: 'https://instagram.com/rogue' }
  });
  assert.strictEqual(userCreateRes.status, 403, 'Normal USER must receive 403 Forbidden for create');
  console.log('✓ Normal USER receives 403 on POST /superadmin/social-accounts');

  // 1d. Admin cannot create official account (403)
  const adminCreateRes = await makeRequest('/superadmin/social-accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { platform: 'INSTAGRAM', name: 'Rogue Account', accountUrl: 'https://instagram.com/rogue' }
  });
  assert.strictEqual(adminCreateRes.status, 403, 'ADMIN must receive 403 Forbidden for create');
  console.log('✓ ADMIN receives 403 on POST /superadmin/social-accounts');


  // 1c. Super Admin CAN list social accounts
  const superListRes = await makeRequest('/superadmin/social-accounts', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert.strictEqual(superListRes.status, 200, 'SUPER_ADMIN must receive 200 OK');
  assert(Array.isArray(superListRes.body.data), 'Accounts list data should be an array');
  assert(superListRes.body.data.length >= 3, 'Default seeded official accounts should be present');
  console.log(`✓ SUPER_ADMIN can list official accounts (${superListRes.body.data.length} found)`);

  // 2. Authenticated Active Accounts listing for submission selection
  console.log('2. Testing /api/social-accounts/active for creators...');
  const activeRes = await makeRequest('/social-accounts/active', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(activeRes.status, 200, 'Authenticated creator can list active official accounts');
  assert(activeRes.body.data.every(a => a.isActive === true), 'All returned accounts must be active');
  console.log(`✓ Active accounts listing returns ${activeRes.body.data.length} active official accounts`);

  // 3. Testing URL Validation on Account Creation
  console.log('3. Testing Domain and URL Validation when registering official accounts...');

  // 3a. Invalid platform
  const invalidPlatformRes = await makeRequest('/superadmin/social-accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      platform: 'TIKTOK',
      name: 'TikTok Channel',
      accountUrl: 'https://tiktok.com/@krmuniv'
    }
  });
  assert.strictEqual(invalidPlatformRes.status, 400, 'Invalid platform must return 400');
  console.log('✓ Reject invalid platform');

  // 3b. Mismatched domain (e.g. twitter.com as instagram)
  const badDomainRes = await makeRequest('/superadmin/social-accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      platform: 'INSTAGRAM',
      name: 'Fake IG',
      accountUrl: 'https://twitter.com/fake_account'
    }
  });
  assert.strictEqual(badDomainRes.status, 400, 'Mismatched domain must return 400');
  console.log('✓ Reject mismatched domain for Instagram account');

  // 3c. Root URL without handle
  const rootUrlRes = await makeRequest('/superadmin/social-accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      platform: 'INSTAGRAM',
      name: 'IG Homepage',
      accountUrl: 'https://instagram.com/'
    }
  });
  assert.strictEqual(rootUrlRes.status, 400, 'Root homepage URL must return 400');
  console.log('✓ Reject root homepage URL without handle');

  // 4. Create a new official account
  console.log('4. Creating a valid official LinkedIn account as SUPER_ADMIN...');
  const createRes = await makeRequest('/superadmin/social-accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      platform: 'LINKEDIN',
      name: 'K.R. Mangalam University Engineering & Tech Alumni',
      accountUrl: 'https://www.linkedin.com/school/krmuniv/',
      description: 'Official alumni association for K.R. Mangalam University Engineering & Tech graduates.',
      isActive: true
    }
  });
  assert.strictEqual(createRes.status, 201, 'Valid account creation returns 201 Created');
  const newAccount = createRes.body.data;
  assert(newAccount.id, 'Created account has an ID');
  assert.strictEqual(newAccount.platform, 'LINKEDIN');
  assert.strictEqual(newAccount.isActive, true);
  console.log(`✓ Created official account ID: ${newAccount.id}`);

  // 5. Update the official account
  console.log('5. Updating the official account...');
  const updateRes = await makeRequest(`/superadmin/social-accounts/${newAccount.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      name: 'K.R. Mangalam University Engineering & Tech Alumni',
      description: 'Updated description for university alumni community.'
    }
  });
  assert.strictEqual(updateRes.status, 200, 'Account update returns 200 OK');
  assert.strictEqual(updateRes.body.data.name, 'K.R. Mangalam University Engineering & Tech Alumni');
  console.log('✓ Updated official account details');

  // 6. Status toggle (Deactivate account)
  console.log('6. Deactivating the official account...');
  const deactRes = await makeRequest(`/superadmin/social-accounts/${newAccount.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: { isActive: false }
  });
  assert.strictEqual(deactRes.status, 200, 'Deactivation returns 200 OK');
  assert.strictEqual(deactRes.body.data.isActive, false, 'Account status is now false');
  console.log('✓ Deactivated official account');

  // 7. Verify inactive account is excluded from /api/social-accounts/active
  const activeAfterDeact = await makeRequest('/social-accounts/active', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const foundInactive = activeAfterDeact.body.data.find(a => a.id === newAccount.id);
  assert(!foundInactive, 'Inactive account must not appear in active accounts list');
  console.log('✓ Inactive account excluded from creators active accounts list');

  // 8. Test submission creation validation against inactive account
  console.log('8. Testing submission validation against inactive official account...');
  const subInactiveRes = await makeRequest('/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      platform: 'LINKEDIN',
      actionType: 'LIKE',
      postUrl: 'https://linkedin.com/feed/update/urn:li:activity:999999999',
      screenshotUrl: 'https://example.com/screenshot.png',
      socialAccountId: newAccount.id
    }
  });
  assert.strictEqual(subInactiveRes.status, 400, 'Submission against inactive account must fail with 400');
  assert.strictEqual(subInactiveRes.body.code, 'INACTIVE_OFFICIAL_ACCOUNT');
  console.log('✓ Blocked submission targeting inactive official account (INACTIVE_OFFICIAL_ACCOUNT)');

  // 9. Reactivate account and create a valid submission targeting it
  console.log('9. Reactivating account and creating a valid submission...');
  const reactRes = await makeRequest(`/superadmin/social-accounts/${newAccount.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: { isActive: true }
  });
  assert.strictEqual(reactRes.status, 200);

  const subValidRes = await makeRequest('/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      platform: 'LINKEDIN',
      actionType: 'LIKE',
      postUrl: 'https://linkedin.com/feed/update/urn:li:activity:999999999',
      screenshotUrl: 'https://example.com/screenshot.png',
      socialAccountId: newAccount.id
    }
  });
  assert.strictEqual(subValidRes.status, 201, 'Valid submission created successfully');
  assert.strictEqual(subValidRes.body.data.socialAccountId, newAccount.id);
  console.log(`✓ Created submission linked to official account: ${subValidRes.body.data.id}`);

  // 10. Delete the created test account
  console.log('10. Deleting the test official account as SUPER_ADMIN...');
  const delRes = await makeRequest(`/superadmin/social-accounts/${newAccount.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert.strictEqual(delRes.status, 200, 'Delete account returns 200 OK');
  console.log('✓ Successfully deleted test account');

  console.log('\n======================================================');
  console.log('All Official Social Media Accounts Tests Passed! (10/10)');
  console.log('======================================================\n');
}

runOfficialSocialAccountsTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
