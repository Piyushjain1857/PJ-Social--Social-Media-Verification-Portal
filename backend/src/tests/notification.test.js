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
  if (!res.body || !res.body.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
};

async function testNotificationSystem() {
  console.log('=== Starting Notification System End-to-End Tests ===\n');

  // 1. Authenticate users
  const creator = await login('user@portal.com', 'User123!');
  const admin = await login('admin@portal.com', 'Admin123!');
  const superAdmin = await login('superadmin@portal.com', 'SuperAdmin123!');
  console.log('✓ Successfully authenticated creator, admin, and superadmin.');

  // 2. Unauthenticated access check (401)
  const unauthedRes = await makeRequest('/notifications');
  console.log('Unauthenticated GET /api/notifications status:', unauthedRes.status);
  if (unauthedRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthedRes.status}`);
  }
  console.log('✓ Unauthenticated requests properly rejected with 401.');

  // 3. Creator fetches own notifications (GET /api/notifications)
  const creatorNotifsRes = await makeRequest('/notifications', {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  console.log('Creator GET /api/notifications status:', creatorNotifsRes.status);
  if (creatorNotifsRes.status !== 200 || !creatorNotifsRes.body.success) {
    throw new Error(`Failed to fetch creator notifications: ${JSON.stringify(creatorNotifsRes.body)}`);
  }
  console.log('Creator notifications count:', creatorNotifsRes.body.count, 'unreadCount:', creatorNotifsRes.body.unreadCount);
  console.log('✓ GET /api/notifications returns user notifications & unread count.');

  // 4. Verify user can only access their own notifications
  const allBelongToCreator = creatorNotifsRes.body.data.every(n => n.userId === creator.user.id);
  if (!allBelongToCreator) {
    throw new Error('Data breach: Found notifications not belonging to creator user!');
  }
  console.log('✓ Data isolation verified: all returned notifications belong to caller.');

  // 5. Submit activity and verify review notification workflow (Approve)
  const subApproveRes = await makeRequest('/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creator.token}` },
    body: {
      platform: 'INSTAGRAM',
      actionType: 'STORY',
      postUrl: 'https://instagram.com/stories/verification/987654321',
      screenshotUrl: 'https://example.com/proof-story.png',
      description: 'Story proof for verification'
    }
  });
  if (subApproveRes.status !== 201 || !subApproveRes.body.data) {
    throw new Error(`Submission creation failed: ${JSON.stringify(subApproveRes.body)}`);
  }
  const subApproveId = subApproveRes.body.data.id;
  console.log('Created submission for approval:', subApproveId);

  // Admin approves submission
  const approveRes = await makeRequest(`/reviews/${subApproveId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}` },
    body: { feedback: 'Story verified and confirmed.' }
  });
  if (approveRes.status !== 200) {
    throw new Error(`Approval failed: ${JSON.stringify(approveRes.body)}`);
  }

  // Check creator received APPROVAL notification
  const notifsAfterApprove = await makeRequest('/notifications', {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  const approveNotif = notifsAfterApprove.body.data.find(n =>
    n.message && n.message.includes('Story verified and confirmed')
  );
  if (!approveNotif) {
    throw new Error('Approval notification was not generated for creator!');
  }
  console.log('✓ Approval notification generated:', approveNotif.title, '-', approveNotif.message);

  // 6. Submit activity and verify review notification workflow (Reject)
  const subRejectRes = await makeRequest('/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creator.token}` },
    body: {
      platform: 'LINKEDIN',
      actionType: 'LIKE',
      postUrl: 'https://linkedin.com/posts/activity-12345',
      screenshotUrl: 'https://example.com/proof-like.png',
      description: 'LinkedIn like proof'
    }
  });
  if (subRejectRes.status !== 201 || !subRejectRes.body.data) {
    throw new Error(`Submission creation failed: ${JSON.stringify(subRejectRes.body)}`);
  }
  const subRejectId = subRejectRes.body.data.id;

  // Admin rejects submission
  const rejectRes = await makeRequest(`/reviews/${subRejectId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}` },
    body: { feedback: 'Like handle did not match registered account.' }
  });
  if (rejectRes.status !== 200) {
    throw new Error(`Rejection failed: ${JSON.stringify(rejectRes.body)}`);
  }

  // Check creator received REJECTION notification
  const notifsAfterReject = await makeRequest('/notifications', {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  const rejectNotif = notifsAfterReject.body.data.find(n =>
    n.message && n.message.includes('Like handle did not match')
  );
  if (!rejectNotif) {
    throw new Error('Rejection notification was not generated for creator!');
  }
  console.log('✓ Rejection notification generated:', rejectNotif.title, '-', rejectNotif.message);

  // 7. Important Admin Action Notification (Role change on user)
  const roleChangeRes = await makeRequest(`/users/${creator.user.id}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdmin.token}` },
    body: { role: 'USER' } // Reassert role
  });
  console.log('Admin role update status:', roleChangeRes.status);

  const notifsAfterRoleChange = await makeRequest('/notifications', {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  const roleChangeNotif = notifsAfterRoleChange.body.data.find(n =>
    n.type === 'ACCOUNT_ALERT' || (n.title && n.title.includes('Role'))
  );
  if (!roleChangeNotif) {
    throw new Error('Account alert notification was not generated for user role modification!');
  }
  console.log('✓ Admin action notification generated:', roleChangeNotif.title, '-', roleChangeNotif.message);

  // 8. Test mark individual notification as read (PATCH /api/notifications/:id/read)
  const targetNotif = notifsAfterRoleChange.body.data.find(n => !n.isRead) || approveNotif;
  const markReadRes = await makeRequest(`/notifications/${targetNotif.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  console.log('PATCH /api/notifications/:id/read status:', markReadRes.status);
  if (markReadRes.status !== 200 || !markReadRes.body.success) {
    throw new Error(`Failed to mark notification as read: ${JSON.stringify(markReadRes.body)}`);
  }
  if (!markReadRes.body.data.isRead) {
    throw new Error('Notification record isRead flag was not set to true!');
  }
  console.log('✓ PATCH /api/notifications/:id/read successfully marked notification as read.');

  // 9. Strict Ownership Protection: Admin tries to mark creator's notification as read (Should fail with 403 FORBIDDEN_OWNERSHIP)
  const crossUserAttempt = await makeRequest(`/notifications/${targetNotif.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${admin.token}` } // Admin user attempting to modify creator's notif
  });
  console.log('Cross-user notification mark read status (expected 403):', crossUserAttempt.status, crossUserAttempt.body.code);
  if (crossUserAttempt.status !== 403 || crossUserAttempt.body.code !== 'FORBIDDEN_OWNERSHIP') {
    throw new Error(`Security breach! Expected 403 FORBIDDEN_OWNERSHIP, got ${crossUserAttempt.status}`);
  }
  console.log('✓ Security check passed: Users can only mark their own notifications as read (403 returned).');

  // 10. Test mark all notifications as read (PATCH /api/notifications/read-all)
  const markAllRes = await makeRequest('/notifications/read-all', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  console.log('PATCH /api/notifications/read-all status:', markAllRes.status, 'marked count:', markAllRes.body.count);
  if (markAllRes.status !== 200 || !markAllRes.body.success) {
    throw new Error(`Failed to mark all notifications as read: ${JSON.stringify(markAllRes.body)}`);
  }

  // Verify all creator notifications are now read
  const finalCheckRes = await makeRequest('/notifications', {
    headers: { Authorization: `Bearer ${creator.token}` }
  });
  console.log('Final unread count for creator:', finalCheckRes.body.unreadCount);
  if (finalCheckRes.body.unreadCount !== 0) {
    throw new Error(`Expected unreadCount to be 0 after read-all, got ${finalCheckRes.body.unreadCount}`);
  }
  console.log('✓ PATCH /api/notifications/read-all successfully marked all caller notifications as read.');

  console.log('\n🎉 ALL NOTIFICATION SYSTEM END-TO-END TESTS PASSED SUCCESSFULLY!');
}

testNotificationSystem().catch(err => {
  console.error('\n❌ Notification test failed:', err);
  process.exit(1);
});
