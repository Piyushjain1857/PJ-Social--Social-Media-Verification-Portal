/**
 * Super Admin Gamification API Client Service
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const fetchSuperAdminOverview = async () => {
  const res = await fetch('/api/super-admin/gamification/overview', {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch overview: ${res.statusText}`);
  return res.json();
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
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.statusText}`);
  return res.json();
};

export const fetchSuperAdminAdmins = async () => {
  const res = await fetch('/api/super-admin/gamification/admins', {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch admins: ${res.statusText}`);
  return res.json();
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
  if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.statusText}`);
  return res.json();
};

export const fetchSuperAdminAnalytics = async () => {
  const res = await fetch('/api/super-admin/gamification/analytics', {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.statusText}`);
  return res.json();
};

export const fetchGamificationSettings = async () => {
  const res = await fetch('/api/super-admin/gamification/settings', {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
  return res.json();
};

export const updateGamificationSettings = async (updates, reason) => {
  const res = await fetch('/api/super-admin/gamification/settings', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ updates, reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to update settings: ${res.statusText}`);
  }
  return res.json();
};

export const submitSuperAdminAdjustXP = async (userId, { type, amount, reason }) => {
  const res = await fetch(`/api/super-admin/gamification/users/${userId}/adjust-xp`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ type, amount, reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to adjust user XP: ${res.statusText}`);
  }
  return res.json();
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
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
  return res.json();
};
