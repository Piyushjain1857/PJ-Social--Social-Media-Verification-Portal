/**
 * Automated RBAC Verification Test Suite
 *
 * Verifies role-based authorization for:
 *   - SUPER_ADMIN: Full system access, audit logs, system stats, role modification.
 *   - ADMIN: Submissions review queue, user directory, cannot manage Super Admin privileges.
 *   - USER: Create submissions, view own submissions, view profile & notifications, blocked from admin endpoints.
 */

const http = require('http');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api`;

const makeRequest = (endpoint, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
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
  if (!res.body.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
};

async function runTests() {
  console.log('\n========================================');
  console.log('VeriSocial RBAC Automated Test Runner');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      failed++;
    }
  };

  try {
    console.log('1. Authenticating test users...');
    const userToken = await login('user@portal.com', 'User123!');
    const adminToken = await login('admin@portal.com', 'Admin123!');
    const superToken = await login('superadmin@portal.com', 'SuperAdmin123!');
    console.log('   All 3 role tokens acquired successfully.\n');

    console.log('2. Testing USER Role Permissions:');
    // USER can view own submissions
    const mySubRes = await makeRequest('/submissions/my', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(mySubRes.status === 200 && mySubRes.body.success, 'USER can view own submissions (GET /api/submissions/my)');

    // USER can view own profile
    const userProfileRes = await makeRequest('/users/profile', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userProfileRes.status === 200 && userProfileRes.body.profile?.role === 'USER', 'USER can fetch authenticated profile (GET /api/users/profile)');

    // USER can view own notifications
    const notifRes = await makeRequest('/notifications/my', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(notifRes.status === 200 && notifRes.body.success, 'USER can view own notifications (GET /api/notifications/my)');

    // USER can create submission
    const createSubRes = await makeRequest('/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        platform: 'INSTAGRAM',
        actionType: 'LIKE',
        postUrl: 'https://instagram.com/p/automated-test',
        description: 'Automated test submission'
      }
    });
    assert(createSubRes.status === 201 && createSubRes.body.success, 'USER can create submission (POST /api/submissions)');
    const createdSubId = createSubRes.body.data?.id;

    // USER CANNOT access full submission moderation queue
    const userQueueRes = await makeRequest('/submissions', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userQueueRes.status === 403, 'USER is blocked from all-submissions queue (GET /api/submissions -> 403)');

    // USER CANNOT review submissions
    const userReviewRes = await makeRequest(`/submissions/${createdSubId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { status: 'APPROVED', feedback: 'Illegitimate review' }
    });
    assert(userReviewRes.status === 403, 'USER is blocked from reviewing submissions (POST /api/submissions/:id/review -> 403)');

    // USER CANNOT view user directory
    const userUsersRes = await makeRequest('/users', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userUsersRes.status === 403, 'USER is blocked from user directory (GET /api/users -> 403)');

    // USER CANNOT access Super Admin audit logs
    const userAuditRes = await makeRequest('/superadmin/audit-logs', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userAuditRes.status === 403, 'USER is blocked from Super Admin logs (GET /api/superadmin/audit-logs -> 403)');

    // USER Dashboard tests
    const userDashRes = await makeRequest('/dashboard/user', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(
      userDashRes.status === 200 &&
      userDashRes.body.success &&
      userDashRes.body.data?.stats?.total !== undefined &&
      userDashRes.body.data?.user?.email === 'user@portal.com',
      'USER can access personal dashboard with scoped stats (GET /api/dashboard/user)'
    );

    // Unauthenticated access to dashboard is rejected
    const unauthDashRes = await makeRequest('/dashboard/user');
    assert(unauthDashRes.status === 401, 'Unauthenticated request to dashboard is blocked (401)');

    console.log('\n3. Testing ADMIN Role Permissions:');
    // ADMIN can access moderation queue
    const adminQueueRes = await makeRequest('/submissions', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminQueueRes.status === 200 && adminQueueRes.body.success, 'ADMIN can view submissions queue (GET /api/submissions)');

    // ADMIN can review submission
    const adminReviewRes = await makeRequest(`/submissions/${createdSubId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'APPROVED', feedback: 'Verified by automated admin test' }
    });
    assert(adminReviewRes.status === 200 && adminReviewRes.body.success, 'ADMIN can review submission (POST /api/submissions/:id/review)');

    // ADMIN can view user directory
    const adminUsersRes = await makeRequest('/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminUsersRes.status === 200 && adminUsersRes.body.success, 'ADMIN can view relevant users (GET /api/users)');

    // ADMIN CANNOT access Super Admin audit logs
    const adminAuditRes = await makeRequest('/superadmin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminAuditRes.status === 403, 'ADMIN is blocked from Super Admin audit logs (GET /api/superadmin/audit-logs -> 403)');

    // ADMIN CANNOT manage Super Admin privileges or roles
    const adminRoleChangeRes = await makeRequest('/users/usr-user-003/role', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'SUPER_ADMIN' }
    });
    assert(adminRoleChangeRes.status === 403, 'ADMIN cannot manage Super Admin privileges (PATCH /api/users/:id/role -> 403)');

    console.log('\n4. Testing SUPER_ADMIN Role Permissions:');
    // SUPER_ADMIN has full system access
    const superAuditRes = await makeRequest('/superadmin/audit-logs', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert(superAuditRes.status === 200 && superAuditRes.body.success, 'SUPER_ADMIN can access system audit logs (GET /api/superadmin/audit-logs)');

    const superStatsRes = await makeRequest('/superadmin/system-stats', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert(superStatsRes.status === 200 && superStatsRes.body.success, 'SUPER_ADMIN can access system stats (GET /api/superadmin/system-stats)');

    const superUsersRes = await makeRequest('/users', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert(superUsersRes.status === 200 && superUsersRes.body.success, 'SUPER_ADMIN can view all users (GET /api/users)');

    const superQueueRes = await makeRequest('/submissions', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert(superQueueRes.status === 200 && superQueueRes.body.success, 'SUPER_ADMIN can inspect all submissions (GET /api/submissions)');

    // SUPER_ADMIN can manage user roles
    const superRoleChangeRes = await makeRequest('/users/usr-user-003/role', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}` },
      body: { role: 'USER' }
    });
    assert(superRoleChangeRes.status === 200 && superRoleChangeRes.body.success, 'SUPER_ADMIN can manage user roles (PATCH /api/users/:id/role)');

    console.log('\n========================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
