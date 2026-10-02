/**
 * Test Suite: Admin User Visibility & Count Telemetry
 * Verifies that normal ADMIN users have powers to see:
 * 1. Number of platform users on Admin Dashboard (GET /api/dashboard/admin)
 * 2. Complete user count statistics on User Directory (GET /api/users)
 * 3. Paginated user counts and telemetry (GET /api/users?page=1&limit=10)
 * 4. User profile metrics containing user totals (GET /api/users/me and GET /api/users/profile)
 * 5. User details inspection (GET /api/users/:id)
 * 6. RBAC boundaries remain strictly enforced (USER is blocked from /users, ADMIN cannot alter roles).
 */

const assert = require('assert');
const http = require('http');
const app = require('../app');

let server;
let port;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: path.startsWith('/api') ? path : `/api${path}`,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch (e) {
          body = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await makeRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  if (res.status !== 200 || !res.body.success) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

async function runTests() {
  console.log('========================================================');
  console.log('  Testing Admin User Visibility & Count Telemetry      ');
  console.log('========================================================\n');

  // 1. Authenticate personas
  console.log('1. Authenticating test users...');
  const adminToken = await loginUser('admin@portal.com', 'Admin123!');
  const userToken = await loginUser('user@portal.com', 'User123!');
  console.log('   Tokens acquired.\n');

  // 2. Admin Dashboard user counts
  console.log('2. Verifying user counts on GET /api/dashboard/admin...');
  const dashRes = await makeRequest('/dashboard/admin', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  assert.strictEqual(dashRes.status, 200, 'Admin dashboard returned 200 OK');
  assert.ok(dashRes.body.success, 'Response success is true');
  assert.ok(dashRes.body.data?.stats, 'Response includes stats object');

  const { stats } = dashRes.body.data;
  console.log(`   Admin Dashboard stats: totalUsers=${stats.totalUsers}, creators=${stats.creatorsCount}, admins=${stats.totalAdmins}`);
  assert.strictEqual(typeof stats.totalUsers, 'number', 'stats.totalUsers is a number');
  assert.strictEqual(typeof stats.creatorsCount, 'number', 'stats.creatorsCount is a number');
  assert.strictEqual(typeof stats.totalAdmins, 'number', 'stats.totalAdmins is a number');
  assert.ok(stats.totalUsers >= 1, 'Total users count >= 1');
  assert.strictEqual(stats.totalUsers, stats.creatorsCount + stats.totalAdmins, 'totalUsers equals creators + admins');
  console.log('   ✅ PASS: Normal admin can see the number of users on Admin Dashboard.\n');

  // 3. User Directory (unpaged) user count telemetry
  console.log('3. Verifying user count telemetry on GET /api/users...');
  const usersRes = await makeRequest('/users', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  assert.strictEqual(usersRes.status, 200, 'GET /api/users returned 200 OK');
  assert.ok(usersRes.body.success, 'Response success is true');
  assert.ok(Array.isArray(usersRes.body.data), 'User list returned');
  assert.ok(usersRes.body.stats, 'User count statistics returned');
  assert.strictEqual(typeof usersRes.body.stats.total, 'number', 'stats.total is a number');
  assert.strictEqual(typeof usersRes.body.stats.usersCount, 'number', 'stats.usersCount is a number');
  assert.strictEqual(typeof usersRes.body.stats.adminsCount, 'number', 'stats.adminsCount is a number');
  console.log(`   Directory stats: total=${usersRes.body.stats.total}, active=${usersRes.body.stats.active}, creators=${usersRes.body.stats.usersCount}`);
  console.log('   ✅ PASS: Normal admin can retrieve user directory and stats summary.\n');

  // 4. Paginated User Directory
  console.log('4. Verifying paginated user count telemetry (GET /api/users?page=1&limit=10)...');
  const pagedRes = await makeRequest('/users?page=1&limit=10', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  assert.strictEqual(pagedRes.status, 200, 'Paginated GET /api/users returned 200 OK');
  assert.ok(pagedRes.body.pagination, 'Pagination object present');
  assert.ok(pagedRes.body.pagination.totalCount >= 1, 'Pagination totalCount >= 1');
  assert.ok(pagedRes.body.stats, 'Stats object present on paged response');
  assert.strictEqual(pagedRes.body.stats.total, pagedRes.body.pagination.totalCount, 'Stats total matches pagination totalCount');
  console.log(`   Paged response: totalCount=${pagedRes.body.pagination.totalCount}, totalPages=${pagedRes.body.pagination.totalPages}`);
  console.log('   ✅ PASS: Normal admin receives full pagination and telemetry on users.\n');

  // 5. Admin profile stats reflecting user count
  console.log('5. Verifying user total metrics on GET /api/users/me and GET /api/users/profile...');
  const meRes = await makeRequest('/users/me', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  assert.strictEqual(meRes.status, 200, 'GET /api/users/me returned 200 OK');
  assert.ok(meRes.body.stats, 'stats object present on /api/users/me');
  assert.strictEqual(typeof meRes.body.stats.totalUsers, 'number', 'stats.totalUsers is a number on /api/users/me');
  assert.strictEqual(typeof meRes.body.stats.totalCreators, 'number', 'stats.totalCreators is a number on /api/users/me');
  assert.strictEqual(typeof meRes.body.stats.totalAdmins, 'number', 'stats.totalAdmins is a number on /api/users/me');
  console.log(`   /api/users/me stats: totalUsers=${meRes.body.stats.totalUsers}, creators=${meRes.body.stats.totalCreators}, admins=${meRes.body.stats.totalAdmins}`);

  const profileRes = await makeRequest('/users/profile', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(profileRes.status, 200, 'GET /api/users/profile returned 200 OK');
  assert.strictEqual(typeof profileRes.body.profile.stats.totalUsers, 'number', 'profile.stats.totalUsers is a number on /api/users/profile');
  console.log('   ✅ PASS: Admin profile includes user count metrics.\n');

  // 6. Inspecting User Details dossier (GET /api/users/:id)
  console.log('6. Verifying normal admin inspection of user dossier (GET /api/users/:id)...');
  const targetUser = usersRes.body.data[0];
  assert.ok(targetUser, 'Found user to inspect');

  const detailRes = await makeRequest(`/users/${targetUser.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(detailRes.status, 200, 'GET /api/users/:id returned 200 OK for ADMIN');
  assert.ok(detailRes.body.data, 'User details returned');
  assert.strictEqual(detailRes.body.data.id, targetUser.id, 'User ID matches');
  assert.strictEqual(detailRes.body.data.password, undefined, 'Password hash is strictly omitted');
  console.log(`   Inspected user "${detailRes.body.data.name}" (${detailRes.body.data.email}) - submissionsCount: ${detailRes.body.data.submissionsCount ?? 0}`);
  console.log('   ✅ PASS: Normal admin can view user details dossier without security leaks.\n');

  // 7. Security & RBAC boundary verification
  console.log('7. Verifying RBAC boundaries remain inviolate...');
  // Normal user cannot access /api/users
  const userAccessDir = await makeRequest('/users', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userAccessDir.status, 403, 'Normal USER is blocked from GET /api/users with 403 Forbidden');

  // Normal admin cannot alter roles
  const adminAlterRole = await makeRequest(`/users/${targetUser.id}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { role: 'SUPER_ADMIN' }
  });
  assert.strictEqual(adminAlterRole.status, 403, 'Normal ADMIN is blocked from modifying roles with 403 Forbidden');
  console.log('   ✅ PASS: Security boundaries intact (USER blocked from directory, ADMIN blocked from role elevation).\n');

  console.log('========================================================');
  console.log('🎉 ALL ADMIN USER VISIBILITY & COUNT TESTS PASSED!');
  console.log('========================================================\n');
}

// Start temporary test server
server = app.listen(0, async () => {
  port = server.address().port;
  try {
    await runTests();
    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    server.close(() => {
      process.exit(1);
    });
  }
});
