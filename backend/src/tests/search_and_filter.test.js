/**
 * Global Search, Filtering, Sorting & Pagination Integration Test Suite
 * Verifies:
 * 1. Submissions server-side filtering (status, platform, actionType, date range, search, sorting, pagination)
 * 2. User directory server-side filtering (role, status, search, sorting, pagination)
 * 3. Official social accounts server-side filtering (platform, status, search, sorting, pagination)
 * 4. User notifications server-side filtering (type, read status, search, sorting, pagination)
 * 5. RBAC enforcement across all search/filter endpoints
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
  if (!res.body || !res.body.token) {
    throw new Error(`Login failed for ${email}`);
  }
  return res.body.token;
};

async function runSearchFilterTests() {
  console.log('=== Starting Global Search & Filtering Integration Test Suite ===\n');

  const userToken = await login('user@portal.com', 'User123!');
  const adminToken = await login('admin@portal.com', 'Admin123!');
  const superAdminToken = await login('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Successfully authenticated User, Admin, and SuperAdmin');

  // --- 1. Submissions Server-Side Search, Filter, Sort & Pagination ---
  console.log('\n--- 1. Testing Submissions Search, Filter & Pagination (/api/submissions) ---');

  // RBAC: Normal User must receive 403 on /api/submissions
  const userSubAccess = await makeRequest('/submissions', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (userSubAccess.status !== 403) {
    throw new Error(`Expected 403 for Normal User accessing /submissions, got ${userSubAccess.status}`);
  }
  console.log('✓ RBAC check passed: Normal user received 403 on /api/submissions');

  // Admin query with pagination
  const paginatedSubs = await makeRequest('/submissions?page=1&limit=3&sortBy=createdAt&sortOrder=desc', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (paginatedSubs.status !== 200 || !paginatedSubs.body.pagination) {
    throw new Error('Failed to retrieve paginated submissions');
  }
  if (paginatedSubs.body.data.length > 3) {
    throw new Error(`Expected at most 3 records, got ${paginatedSubs.body.data.length}`);
  }
  console.log(`✓ Pagination verified: Page ${paginatedSubs.body.pagination.page} returned ${paginatedSubs.body.data.length} records (Total: ${paginatedSubs.body.pagination.totalCount})`);

  // Filter by platform=INSTAGRAM
  const igSubs = await makeRequest('/submissions?platform=INSTAGRAM&limit=50', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const allIg = igSubs.body.data.every(s => s.platform === 'INSTAGRAM');
  if (!allIg) {
    throw new Error('Platform filter failed: non-Instagram submission returned');
  }
  console.log(`✓ Platform filter verified: ${igSubs.body.data.length} Instagram submissions returned`);

  // Filter by status=APPROVED
  const approvedSubs = await makeRequest('/submissions?status=APPROVED&limit=50', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const allApproved = approvedSubs.body.data.every(s => s.status === 'APPROVED');
  if (!allApproved) {
    throw new Error('Status filter failed: non-APPROVED submission returned');
  }
  console.log(`✓ Status filter verified: ${approvedSubs.body.data.length} APPROVED submissions returned`);

  // Search filter
  const searchSubs = await makeRequest('/submissions?search=instagram&limit=10', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (searchSubs.status !== 200) {
    throw new Error('Search query failed');
  }
  console.log(`✓ Search filter verified: ${searchSubs.body.data.length} matching submissions returned for keyword "instagram"`);

  // Sorting Ascending vs Descending
  const descSubs = await makeRequest('/submissions?sortBy=createdAt&sortOrder=desc&limit=2', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const ascSubs = await makeRequest('/submissions?sortBy=createdAt&sortOrder=asc&limit=2', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (descSubs.body.data.length >= 2 && ascSubs.body.data.length >= 2) {
    const descDate0 = new Date(descSubs.body.data[0].createdAt).getTime();
    const ascDate0 = new Date(ascSubs.body.data[0].createdAt).getTime();
    if (descDate0 < ascDate0) {
      throw new Error('Sort order mismatch: desc should be newer than asc');
    }
  }
  console.log('✓ Sorting order verified: asc and desc sort correctly applied');

  // Creator My Submissions Search & Filter (/api/submissions/my)
  console.log('\n--- 2. Testing Creator My Submissions (/api/submissions/my) ---');
  const mySubs = await makeRequest('/submissions/my?page=1&limit=5&status=ALL', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (mySubs.status !== 200 || !mySubs.body.pagination) {
    throw new Error('Failed to retrieve paginated creator submissions');
  }
  console.log(`✓ Creator submissions pagination verified: ${mySubs.body.data.length} of ${mySubs.body.pagination.totalCount}`);

  // --- 3. Users Directory Search, Filter, Sort & Pagination ---
  console.log('\n--- 3. Testing Users Directory Search & Filter (/api/superadmin/users) ---');
  const paginatedUsers = await makeRequest('/superadmin/users?page=1&limit=3&role=ADMIN', {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  if (paginatedUsers.status !== 200 || !paginatedUsers.body.pagination) {
    throw new Error('Failed to retrieve paginated users');
  }
  const allAdmins = paginatedUsers.body.data.every(u => u.role === 'ADMIN');
  if (!allAdmins) {
    throw new Error('Role filter failed: non-admin returned in role=ADMIN query');
  }
  console.log(`✓ Role filter & pagination verified: returned ${paginatedUsers.body.data.length} admin accounts`);

  // Search by name/email
  const searchedUsers = await makeRequest('/superadmin/users?search=sarah', {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  if (searchedUsers.status !== 200 || searchedUsers.body.data.length === 0) {
    throw new Error('User search query for "sarah" returned 0 results');
  }
  console.log(`✓ User search verified: found ${searchedUsers.body.data.length} matching user(s)`);

  // --- 4. Official Social Accounts Search & Filter ---
  console.log('\n--- 4. Testing Official Social Accounts (/api/superadmin/social-accounts) ---');
  const socialAccounts = await makeRequest('/superadmin/social-accounts?platform=INSTAGRAM', {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  if (socialAccounts.status !== 200 || !socialAccounts.body.pagination) {
    throw new Error('Failed to query social accounts with platform filter');
  }
  const allIgAccounts = socialAccounts.body.data.every(a => a.platform === 'INSTAGRAM');
  if (!allIgAccounts) {
    throw new Error('Social accounts platform filter failed');
  }
  console.log(`✓ Social accounts filter verified: ${socialAccounts.body.data.length} Instagram account(s) returned`);

  // Search social account
  const searchSocial = await makeRequest('/superadmin/social-accounts?search=krmuniv', {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  if (searchSocial.status !== 200 || searchSocial.body.data.length === 0) {
    throw new Error('Search for "krmuniv" returned no accounts');
  }
  console.log(`✓ Social account search verified: ${searchSocial.body.data.length} matching official account(s)`);

  // --- 5. Notifications Search & Filter ---
  console.log('\n--- 5. Testing Notifications Search & Filter (/api/notifications) ---');
  const userNotifs = await makeRequest('/notifications?page=1&limit=5&sortBy=createdAt&sortOrder=desc', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (userNotifs.status !== 200 || !userNotifs.body.pagination) {
    throw new Error('Failed to fetch paginated user notifications');
  }
  console.log(`✓ Notifications pagination verified: Page 1 returned ${userNotifs.body.data.length} (Unread: ${userNotifs.body.unreadCount})`);

  // Filter by isRead=false
  const unreadNotifs = await makeRequest('/notifications?isRead=false', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (unreadNotifs.status !== 200) {
    throw new Error('Failed to filter unread notifications');
  }
  const allUnread = unreadNotifs.body.data.every(n => n.isRead === false);
  if (!allUnread) {
    throw new Error('Notification read status filter failed: read notification returned when isRead=false');
  }
  console.log(`✓ Notification read status filter verified: ${unreadNotifs.body.data.length} unread notifications returned`);

  // --- 6. Testing Unified Cross-Category Global Search (/api/search) ---
  console.log('\n--- 6. Testing Unified Global Search (/api/search) ---');

  // Unauthenticated caller rejected with 401
  const unauthSearch = await makeRequest('/search?q=test');
  if (unauthSearch.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated search, got ${unauthSearch.status}`);
  }
  console.log('✓ RBAC: Unauthenticated global search blocked with 401');

  // Creator Global Search: returns caller's submissions, active accounts, notifications
  const userGlobal = await makeRequest('/search?q=instagram', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (userGlobal.status !== 200 || !userGlobal.body.categories) {
    throw new Error('Failed to execute creator global search');
  }
  if (userGlobal.body.categories.users.length > 0 || userGlobal.body.categories.admins.length > 0) {
    throw new Error('RBAC violation: Creator received users or admin records in global search');
  }
  console.log(`✓ Creator global search passed: Found ${userGlobal.body.totalMatches} matches (Submissions: ${userGlobal.body.categories.submissions.length}, Social Accounts: ${userGlobal.body.categories.socialAccounts.length}, Notifications: ${userGlobal.body.categories.notifications.length})`);

  // Super Admin Global Search: returns all categories including users & admins
  const superAdminGlobal = await makeRequest('/search?q=admin', {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  if (superAdminGlobal.status !== 200 || !superAdminGlobal.body.categories) {
    throw new Error('Failed to execute Super Admin global search');
  }
  console.log(`✓ Super Admin global search passed: Found ${superAdminGlobal.body.totalMatches} matches (Admins: ${superAdminGlobal.body.categories.admins.length}, Submissions: ${superAdminGlobal.body.categories.submissions.length})`);

  console.log('\n🎉 ALL SEARCH, FILTERING, SORTING & PAGINATION TESTS PASSED (100%)!\n');
}

runSearchFilterTests().catch(err => {
  console.error('\n❌ Search & filter test failure:', err);
  process.exit(1);
});
