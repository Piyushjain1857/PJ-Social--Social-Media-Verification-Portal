const http = require('http');

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

async function testSuperAdminUserManagement() {
  console.log('=== Starting Super Admin User Management End-to-End Tests ===\n');

  // 1. Authenticate actors
  const creator = await login('user@portal.com', 'User123!');
  const admin = await login('admin@portal.com', 'Admin123!');
  const superAdmin = await login('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Successfully authenticated creator, admin, and superadmin.');

  // 2. Security & RBAC: Only SUPER_ADMIN can access user management endpoints
  console.log('\n--- 2. RBAC Enforcement on Super Admin User Management APIs ---');

  // Unauthenticated -> 401
  const unauthedRes = await makeRequest('/superadmin/users');
  if (unauthedRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated GET /superadmin/users, got ${unauthedRes.status}`);
  }
  console.log('✓ Unauthenticated request rejected with 401.');

  // Normal USER -> 403 Forbidden
  const userAccessRes = await makeRequest('/superadmin/users', {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  if (userAccessRes.status !== 403) {
    throw new Error(`Expected 403 for USER accessing /superadmin/users, got ${userAccessRes.status}`);
  }
  console.log('✓ Normal USER rejected with 403 Forbidden.');

  // ADMIN -> 403 Forbidden
  const adminAccessRes = await makeRequest('/superadmin/users', {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  if (adminAccessRes.status !== 403) {
    throw new Error(`Expected 403 for ADMIN accessing /superadmin/users, got ${adminAccessRes.status}`);
  }
  console.log('✓ ADMIN rejected with 403 Forbidden.');

  // SUPER_ADMIN -> 200 Allowed
  const superAdminAccessRes = await makeRequest('/superadmin/users', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  if (superAdminAccessRes.status !== 200 || !superAdminAccessRes.body.success) {
    throw new Error(`Expected 200 for SUPER_ADMIN accessing /superadmin/users, got ${superAdminAccessRes.status}`);
  }
  console.log('✓ SUPER_ADMIN successfully accessed /superadmin/users with 200 OK.');

  // 3. Password Hashes Must Never Be Exposed
  console.log('\n--- 3. Verifying Password Hashes Are Never Exposed ---');
  const userList = superAdminAccessRes.body.data;
  const anyHasPassword = userList.some(u => u.password !== undefined);
  if (anyHasPassword) {
    throw new Error('Security vulnerability: Password hash exposed in user list response!');
  }
  console.log('✓ Confirmed: No password hashes exposed in list response.');

  // 4. Pagination, Search, Role, and Status Filtering
  console.log('\n--- 4. Testing Pagination, Search, and Filtering ---');

  // Pagination test
  const pagedRes = await makeRequest('/superadmin/users?page=1&limit=2', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  if (pagedRes.body.data.length > 2 || !pagedRes.body.pagination) {
    throw new Error(`Pagination failed: ${JSON.stringify(pagedRes.body.pagination)}`);
  }
  console.log('✓ Pagination works: returned page size', pagedRes.body.data.length, 'limit', pagedRes.body.pagination.limit);

  // Search test
  const searchRes = await makeRequest('/superadmin/users?search=Sarah', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  const foundSarah = searchRes.body.data.some(u => u.name.includes('Sarah'));
  if (!foundSarah) {
    throw new Error('Search failed: Sarah Connor not found by search query');
  }
  console.log('✓ Search works: successfully queried user by name.');

  // Role filter test
  const roleFilterRes = await makeRequest('/superadmin/users?role=ADMIN', {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  const allAreAdmins = roleFilterRes.body.data.every(u => u.role === 'ADMIN');
  if (!allAreAdmins) {
    throw new Error('Role filter failed: found non-ADMIN users in role=ADMIN filter!');
  }
  console.log('✓ Role filter works: all returned users have role=ADMIN.');

  // 5. Creating Users (Normal User and Admin)
  console.log('\n--- 5. Testing Create User API & Password Hashing ---');

  // Input validation tests
  const invalidEmailRes = await makeRequest('/superadmin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      name: 'Test Bad Email',
      email: 'not-an-email',
      password: 'ValidPassword123!',
      role: 'USER'
    }
  });
  if (invalidEmailRes.status !== 400 || invalidEmailRes.body.code !== 'INVALID_EMAIL') {
    throw new Error('Failed to reject invalid email on user creation');
  }
  console.log('✓ Rejected invalid email with 400 INVALID_EMAIL.');

  const shortPasswordRes = await makeRequest('/superadmin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      name: 'Test Short Pwd',
      email: 'shortpwd@portal.com',
      password: 'short',
      role: 'USER'
    }
  });
  if (shortPasswordRes.status !== 400 || shortPasswordRes.body.code !== 'INVALID_PASSWORD') {
    throw new Error('Failed to reject short password on user creation');
  }
  console.log('✓ Rejected short password (< 8 chars) with 400 INVALID_PASSWORD.');

  // Create new Creator User
  const timestamp = Date.now().toString(36);
  const newCreatorEmail = `newcreator_${timestamp}@portal.com`;
  const newCreatorPassword = 'CreatedUserPass123!';
  const createCreatorRes = await makeRequest('/superadmin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      name: 'Created Creator User',
      email: newCreatorEmail,
      password: newCreatorPassword,
      role: 'USER',
      status: 'ACTIVE'
    }
  });

  if (createCreatorRes.status !== 201 || !createCreatorRes.body.data) {
    throw new Error(`Failed to create creator user: ${JSON.stringify(createCreatorRes.body)}`);
  }
  const createdCreator = createCreatorRes.body.data;
  if (createdCreator.password !== undefined) {
    throw new Error('Security leak: Password returned in created user response!');
  }
  console.log('✓ Super Admin created new Normal User:', createdCreator.id, createdCreator.email);

  // Verify created user can authenticate with the hashed password
  const newCreatorLogin = await login(newCreatorEmail, newCreatorPassword);
  if (!newCreatorLogin.token || newCreatorLogin.user.role !== 'USER') {
    throw new Error('Newly created user failed to authenticate with provisioned password!');
  }
  console.log('✓ Confirmed: Newly created user can authenticate with hashed password.');

  // Create new Admin Moderator
  const newAdminEmail = `newadmin_${timestamp}@portal.com`;
  const newAdminPassword = 'CreatedAdminPass123!';
  const createAdminRes = await makeRequest('/superadmin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      name: 'Created Admin Moderator',
      email: newAdminEmail,
      password: newAdminPassword,
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });
  if (createAdminRes.status !== 201 || createAdminRes.body.data.role !== 'ADMIN') {
    throw new Error(`Failed to create admin: ${JSON.stringify(createAdminRes.body)}`);
  }
  console.log('✓ Super Admin created new Admin Moderator:', createAdminRes.body.data.id);

  // 6. View User Details Dossier
  console.log('\n--- 6. Testing View User Details Dossier ---');
  const detailsRes = await makeRequest(`/superadmin/users/${createdCreator.id}`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  if (detailsRes.status !== 200 || !detailsRes.body.data) {
    throw new Error(`Failed to fetch user details: ${JSON.stringify(detailsRes.body)}`);
  }
  if (detailsRes.body.data.password !== undefined) {
    throw new Error('Security leak: Password hash returned in user details dossier!');
  }
  console.log('✓ User details dossier retrieved without password exposure.');

  // 7. Editing Users & Password Reset
  console.log('\n--- 7. Testing Edit User & Password Reset ---');
  const updatedCreatorPassword = 'NewResetPassword999!';
  const editRes = await makeRequest(`/superadmin/users/${createdCreator.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: {
      name: 'Updated Creator Name',
      password: updatedCreatorPassword
    }
  });
  if (editRes.status !== 200 || editRes.body.data.name !== 'Updated Creator Name') {
    throw new Error(`Failed to edit user: ${JSON.stringify(editRes.body)}`);
  }
  console.log('✓ User details edited successfully.');

  // Verify login with new password
  const newPwdLogin = await login(newCreatorEmail, updatedCreatorPassword);
  if (!newPwdLogin.token) {
    throw new Error('User failed to log in after password reset!');
  }
  console.log('✓ User successfully authenticated with updated password.');

  // 8. Activating / Deactivating / Suspending Users
  console.log('\n--- 8. Testing Activate / Deactivate User Status ---');
  const deactivateRes = await makeRequest(`/superadmin/users/${createdCreator.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { status: 'INACTIVE' }
  });
  if (deactivateRes.status !== 200 || deactivateRes.body.data.status !== 'INACTIVE') {
    throw new Error(`Failed to deactivate user: ${JSON.stringify(deactivateRes.body)}`);
  }
  console.log('✓ User successfully deactivated (status: INACTIVE).');

  const reactivateRes = await makeRequest(`/superadmin/users/${createdCreator.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { status: 'ACTIVE' }
  });
  if (reactivateRes.status !== 200 || reactivateRes.body.data.status !== 'ACTIVE') {
    throw new Error(`Failed to re-activate user: ${JSON.stringify(reactivateRes.body)}`);
  }
  console.log('✓ User successfully re-activated (status: ACTIVE).');

  // 9. Privilege Safeguard: Protection Against Deactivating or Demoting the Sole Super Admin
  console.log('\n--- 9. Testing Super Admin Privilege Protection Safeguards ---');

  // Attempt to demote sole Super Admin
  const demoteSuperAdminRes = await makeRequest(`/superadmin/users/${superAdmin.user.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { role: 'USER' }
  });
  console.log('Demoting sole Super Admin status (expected 400):', demoteSuperAdminRes.status, demoteSuperAdminRes.body.code);
  if (demoteSuperAdminRes.status !== 400 || demoteSuperAdminRes.body.code !== 'SOLE_SUPER_ADMIN_PROTECTED') {
    throw new Error('Privilege violation! System allowed demoting the sole Super Administrator!');
  }
  console.log('✓ Safeguard passed: Cannot demote the sole active Super Administrator.');

  // Attempt to deactivate sole Super Admin
  const deactivateSuperAdminRes = await makeRequest(`/superadmin/users/${superAdmin.user.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { status: 'INACTIVE' }
  });
  console.log('Deactivating sole Super Admin status (expected 400):', deactivateSuperAdminRes.status, deactivateSuperAdminRes.body.code);
  if (deactivateSuperAdminRes.status !== 400 || deactivateSuperAdminRes.body.code !== 'SOLE_SUPER_ADMIN_PROTECTED') {
    throw new Error('Privilege violation! System allowed deactivating the sole Super Administrator!');
  }
  console.log('✓ Safeguard passed: Cannot deactivate the sole active Super Administrator.');

  // Attempt to delete self
  const deleteSelfRes = await makeRequest(`/superadmin/users/${superAdmin.user.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  console.log('Deleting self status (expected 400):', deleteSelfRes.status, deleteSelfRes.body.code);
  if (deleteSelfRes.status !== 400 || deleteSelfRes.body.code !== 'CANNOT_DELETE_SELF') {
    throw new Error('Privilege violation! Super Admin allowed to delete their own active session!');
  }
  console.log('✓ Safeguard passed: Super Admin cannot delete their own active session.');

  console.log('\n🎉 ALL SUPER ADMIN USER MANAGEMENT END-TO-END TESTS PASSED!');
}

testSuperAdminUserManagement().catch(err => {
  console.error('\n❌ Super Admin test failed:', err);
  process.exit(1);
});
