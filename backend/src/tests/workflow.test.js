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
  return res.body.token;
};

async function testWorkflow() {
  console.log('Testing End-to-End Approval / Rejection Workflow...');
  const userToken = await login('user@portal.com', 'User123!');
  const adminToken = await login('admin@portal.com', 'Admin123!');

  // 1. User creates submission 1
  const sub1 = await makeRequest('/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      platform: 'INSTAGRAM',
      actionType: 'STORY',
      postUrl: 'https://instagram.com/stories/verification/111',
      screenshotUrl: 'https://example.com/screenshot1.jpg',
      description: 'Story verification'
    }
  });
  const sub1Id = sub1.body.data.id;
  console.log('Created submission 1 (for approval):', sub1Id);

  // 2. Admin approves submission 1 via POST /api/reviews/:id/approve
  const approveRes = await makeRequest(`/reviews/${sub1Id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { feedback: 'Great proof, approved!' }
  });
  console.log('Approval response status:', approveRes.status, 'status:', approveRes.body.data?.submission?.status);
  if (approveRes.status !== 200 || approveRes.body.data?.submission?.status !== 'APPROVED') {
    throw new Error('Approval failed');
  }

  // 3. Verify reviewer and review timestamp recorded
  const reviewRecord = approveRes.body.data?.review;
  console.log('Review record adminId:', reviewRecord?.adminId, 'createdAt:', reviewRecord?.createdAt);
  if (!reviewRecord?.adminId || !reviewRecord?.createdAt) {
    throw new Error('Review record missing reviewer or timestamp');
  }

  // 4. Try re-approving (invalid state transition)
  const reApprove = await makeRequest(`/reviews/${sub1Id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('Re-approve response status (expected 400):', reApprove.status, reApprove.body.message);
  if (reApprove.status !== 400) throw new Error('Re-approval should fail');

  // 5. Try rejecting an approved submission (invalid state transition)
  const rejectApproved = await makeRequest(`/reviews/${sub1Id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { feedback: 'Late reject' }
  });
  console.log('Reject approved response status (expected 400):', rejectApproved.status, rejectApproved.body.message);
  if (rejectApproved.status !== 400) throw new Error('Reject approved should fail');

  // 6. User creates submission 2 (for rejection)
  const sub2 = await makeRequest('/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      platform: 'FACEBOOK',
      actionType: 'LIKE',
      postUrl: 'https://facebook.com/posts/222',
      screenshotUrl: 'https://example.com/screenshot2.jpg',
      description: 'Facebook like verification'
    }
  });
  const sub2Id = sub2.body.data.id;
  console.log('Created submission 2 (for rejection):', sub2Id);

  // 7. Admin tries to reject without reason (should fail 400)
  const rejectNoReason = await makeRequest(`/reviews/${sub2Id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { feedback: '' }
  });
  console.log('Reject without reason status (expected 400):', rejectNoReason.status, rejectNoReason.body.message);
  if (rejectNoReason.status !== 400) throw new Error('Reject without reason should fail');

  // 8. Admin rejects with reason
  const rejectRes = await makeRequest(`/reviews/${sub2Id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { feedback: 'Timestamp missing from screenshot proof.' }
  });
  console.log('Reject response status:', rejectRes.status, 'status:', rejectRes.body.data?.submission?.status);
  if (rejectRes.status !== 200 || rejectRes.body.data?.submission?.status !== 'REJECTED') {
    throw new Error('Rejection failed');
  }

  // 9. Try re-rejecting (invalid state transition)
  const reReject = await makeRequest(`/reviews/${sub2Id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { feedback: 'Another reason' }
  });
  console.log('Re-reject response status (expected 400):', reReject.status, reReject.body.message);
  if (reReject.status !== 400) throw new Error('Re-reject should fail');

  // 10. Check that user received notifications for both decisions
  const userNotifs = await makeRequest('/notifications/my', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const feedbackNotifs = userNotifs.body.data.filter(n => n.type === 'REVIEW_FEEDBACK');
  console.log('User received feedback notifications count:', feedbackNotifs.length);
  if (feedbackNotifs.length < 2) throw new Error('Missing review feedback notifications');

  // 11. Normal user attempts to review submission (should fail 403)
  const userAttempt = await makeRequest(`/reviews/${sub1Id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` }
  });
  console.log('Normal user review attempt status (expected 403):', userAttempt.status);
  if (userAttempt.status !== 403) throw new Error('Normal user review should be blocked');

  console.log('\n🎉 ALL APPROVAL & REJECTION WORKFLOW INTEGRATION TESTS PASSED!');
}

testWorkflow().catch(err => {
  console.error('Workflow test failed:', err);
  process.exit(1);
});
