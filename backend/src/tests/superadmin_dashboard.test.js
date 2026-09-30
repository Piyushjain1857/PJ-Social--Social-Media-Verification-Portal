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
  assert(res.body.token, `Login failed for ${email}`);
  return res.body.token;
};

async function testSuperAdminDashboard() {
  console.log('--- Starting Super Admin Dashboard End-to-End Test Suite ---');

  const superToken = await login('superadmin@portal.com', 'SuperAdmin123!');
  const adminToken = await login('admin@portal.com', 'Admin123!');
  const userToken = await login('user@portal.com', 'User123!');

  console.log('1. Testing RBAC Protection on GET /api/dashboard/super-admin...');

  // 1a. Unauthenticated -> 401
  const unauthRes = await makeRequest('/dashboard/super-admin');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401 Unauthorized');
  console.log('✓ Unauthenticated request rejected with 401');

  // 1b. Normal User -> 403
  const userRes = await makeRequest('/dashboard/super-admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userRes.status, 403, 'Normal USER must receive 403 Forbidden');
  console.log('✓ Normal USER received 403 Forbidden');

  // 1c. Admin Moderator -> 403
  const adminRes = await makeRequest('/dashboard/super-admin', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminRes.status, 403, 'ADMIN moderator must receive 403 Forbidden');
  console.log('✓ ADMIN received 403 Forbidden');

  // 1d. Super Admin -> 200
  const superRes = await makeRequest('/dashboard/super-admin', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert.strictEqual(superRes.status, 200, 'SUPER_ADMIN must receive 200 OK');
  console.log('✓ SUPER_ADMIN received 200 OK');

  console.log('2. Verifying Required Analytics & Metric Fields...');
  const data = superRes.body.data;
  assert(data, 'Response must contain data property');
  assert(data.stats, 'Response must contain stats object');

  const stats = data.stats;

  // Field: Total users
  assert.strictEqual(typeof stats.totalUsers, 'number', 'stats.totalUsers must be a number');
  assert(stats.totalUsers >= 1, 'Total users must be at least 1');
  console.log(`✓ Total Users: ${stats.totalUsers} (${stats.creatorsCount} Creators, ${stats.totalAdmins} Staff)`);

  // Field: Total admins
  assert.strictEqual(typeof stats.totalAdmins, 'number', 'stats.totalAdmins must be a number');
  assert(stats.totalAdmins >= 1, 'Total admins must be at least 1');
  console.log(`✓ Total Admins: ${stats.totalAdmins} (${stats.adminsCount} Admins, ${stats.superAdminsCount} Super Admins)`);

  // Field: Total submissions
  assert.strictEqual(typeof stats.totalSubmissions, 'number', 'stats.totalSubmissions must be a number');
  console.log(`✓ Total Submissions: ${stats.totalSubmissions}`);

  // Field: Pending submissions
  assert.strictEqual(typeof stats.pendingSubmissions, 'number', 'stats.pendingSubmissions must be a number');
  console.log(`✓ Pending Submissions: ${stats.pendingSubmissions}`);

  // Field: Approved submissions
  assert.strictEqual(typeof stats.approvedSubmissions, 'number', 'stats.approvedSubmissions must be a number');
  console.log(`✓ Approved Submissions: ${stats.approvedSubmissions}`);

  // Field: Rejected submissions
  assert.strictEqual(typeof stats.rejectedSubmissions, 'number', 'stats.rejectedSubmissions must be a number');
  console.log(`✓ Rejected Submissions: ${stats.rejectedSubmissions}`);

  // Consistency check
  assert.strictEqual(
    stats.totalSubmissions,
    stats.pendingSubmissions + stats.approvedSubmissions + stats.rejectedSubmissions,
    'totalSubmissions must equal pending + approved + rejected'
  );
  console.log('✓ Submissions count arithmetic consistency verified');

  // Field: Active social accounts
  assert.strictEqual(typeof stats.activeSocialAccounts, 'number', 'stats.activeSocialAccounts must be a number');
  assert(stats.activeSocialAccounts >= 1, 'Active social accounts must be at least 1');
  console.log(`✓ Active Social Accounts: ${stats.activeSocialAccounts}`);

  // Field: Recent submissions
  console.log('3. Verifying Recent Submissions List...');
  assert(Array.isArray(data.recentSubmissions), 'data.recentSubmissions must be an array');
  if (data.recentSubmissions.length > 0) {
    const sampleSub = data.recentSubmissions[0];
    assert(sampleSub.id, 'Submission must have id');
    assert(sampleSub.platform, 'Submission must have platform');
    assert(sampleSub.actionType, 'Submission must have actionType');
    assert(sampleSub.status, 'Submission must have status');
    assert(sampleSub.userName, 'Submission must include userName');
    assert(sampleSub.socialAccountName, 'Submission must include socialAccountName');
    console.log(`✓ Recent Submissions contains valid entries (sample: ${sampleSub.platform} ${sampleSub.actionType} by ${sampleSub.userName})`);
  }

  // Field: Recent activity
  console.log('4. Verifying Recent Activity & Audit Trail...');
  assert(Array.isArray(data.recentActivity), 'data.recentActivity must be an array');
  if (data.recentActivity.length > 0) {
    const sampleAct = data.recentActivity[0];
    assert(sampleAct.id, 'Activity must have id');
    assert(sampleAct.type, 'Activity must have type');
    assert(sampleAct.action, 'Activity must have action');
    assert(sampleAct.actorName, 'Activity must have actorName');
    assert(sampleAct.timestamp, 'Activity must have timestamp');
    console.log(`✓ Recent Activity contains valid audit trail (sample: ${sampleAct.type} ${sampleAct.action} by ${sampleAct.actorName})`);
  }

  console.log('5. Verifying Platform Breakdown...');
  assert(data.platformBreakdown, 'Response must contain platformBreakdown');
  assert(typeof data.platformBreakdown.INSTAGRAM === 'number', 'INSTAGRAM breakdown must be a number');
  assert(typeof data.platformBreakdown.LINKEDIN === 'number', 'LINKEDIN breakdown must be a number');
  assert(typeof data.platformBreakdown.FACEBOOK === 'number', 'FACEBOOK breakdown must be a number');
  console.log(`✓ Platform Breakdown: IG: ${data.platformBreakdown.INSTAGRAM}, LI: ${data.platformBreakdown.LINKEDIN}, FB: ${data.platformBreakdown.FACEBOOK}`);

  console.log('\n======================================================');
  console.log('Super Admin Dashboard End-to-End Tests Passed! (5/5)');
  console.log('======================================================\n');
}

testSuperAdminDashboard().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
