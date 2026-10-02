/**
 * Super Admin Gamification API Client Service
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res, defaultErrMsg) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = data?.message || defaultErrMsg || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const fetchSuperAdminOverview = async () => {
  const res = await fetch('/api/super-admin/gamification/overview', {
    headers: getAuthHeaders()
  });
  return handleResponse(res, 'Failed to fetch gamification overview');
};

export const fetchSuperAdminUsers = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      query.append(k, v);
    }
  });
  const res = await fetch(`/api/super-admin/gamification/users?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res, 'Failed to fetch users');
};

export const fetchSuperAdminAdmins = async () => {
  const res = await fetch('/api/super-admin/gamification/admins', {
    headers: getAuthHeaders()
  });
  return handleResponse(res, 'Failed to fetch admins');
};

export const fetchSuperAdminTransactions = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      query.append(k, v);
    }
  });
  const res = await fetch(`/api/super-admin/gamification/transactions?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res, 'Failed to fetch transactions');
};

export const fetchSuperAdminAnalytics = async () => {
  const res = await fetch('/api/super-admin/gamification/analytics', {
    headers: getAuthHeaders()
  });
  return handleResponse(res, 'Failed to fetch analytics');
};

export const fetchGamificationSettings = async () => {
  const res = await fetch('/api/super-admin/gamification/settings', {
    headers: getAuthHeaders()
  });
  return handleResponse(res, 'Failed to fetch settings');
};

export const updateGamificationSettings = async (updates, reason) => {
  const res = await fetch('/api/super-admin/gamification/settings', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ updates, reason })
  });
  return handleResponse(res, 'Failed to update settings');
};

export const submitSuperAdminAdjustXP = async (userId, { type, amount, reason }) => {
  const res = await fetch(`/api/super-admin/gamification/users/${userId}/adjust-xp`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ type, amount, reason })
  });
  return handleResponse(res, 'Failed to adjust user XP');
};

export const fetchSuperAdminAuditLogs = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      query.append(k, v);
    }
  });
  const res = await fetch(`/api/super-admin/gamification/audit-logs?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res, 'Failed to fetch audit logs');
};
