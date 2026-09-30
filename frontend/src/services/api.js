/**
 * API Service for Social Media Verification Portal
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('auth_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
};

// Health & Telemetry
export const fetchHealth = async () => {
  const startTime = performance.now();
  try {
    const res = await apiFetch('/health');
    const latency = Math.round(performance.now() - startTime);
    return {
      success: true,
      latency,
      data: res.data,
      raw: res,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latency,
      error: error.message,
      status: error.status || 500,
    };
  }
};

export const fetchDatabaseStatus = async () => {
  const startTime = performance.now();
  try {
    const res = await apiFetch('/database/status');
    const latency = Math.round(performance.now() - startTime);
    return {
      success: true,
      latency,
      data: res.data,
      raw: res,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latency,
      error: error.message,
      status: error.status || 500,
    };
  }
};

export const fetchPortalInfo = async () => {
  return await apiFetch('/info');
};

// Authentication Endpoints
export const loginUser = async (email, password) => {
  return await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = async (name, email, password) => {
  return await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
};

export const fetchCurrentUser = async () => {
  return await apiFetch('/auth/me', {
    method: 'GET',
  });
};

export const fetchUserProfile = async () => {
  return await apiFetch('/users/profile', {
    method: 'GET',
  });
};

export const logoutUser = async () => {
  try {
    return await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } catch {
    return { success: true };
  }
};

// Submissions Endpoints
export const fetchMySubmissions = async () => {
  return await apiFetch('/submissions/my');
};

export const fetchAllSubmissions = async () => {
  return await apiFetch('/submissions');
};

export const createSubmission = (submissionData, onProgress) => {
  const url = `${BASE_URL}/submissions`;
  const token = localStorage.getItem('auth_token');

  // If payload is FormData, use XMLHttpRequest for real upload progress tracking
  if (submissionData instanceof FormData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            const error = new Error(data.message || `Upload failed with status ${xhr.status}`);
            error.status = xhr.status;
            error.code = data.code;
            reject(error);
          }
        } catch {
          reject(new Error(`Failed to parse server response (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload. Please check your connection.'));
      xhr.send(submissionData);
    });
  }

  // Fallback for standard JSON payload
  return apiFetch('/submissions', {
    method: 'POST',
    body: JSON.stringify(submissionData),
  });
};

export const reviewSubmission = async (id, status, feedback) => {
  return await apiFetch(`/submissions/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, feedback }),
  });
};

// User Directory & Role Management Endpoints
export const fetchUsers = async () => {
  return await apiFetch('/users');
};

export const updateUserRole = async (userId, role) => {
  return await apiFetch(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

// Notifications Endpoints
export const fetchMyNotifications = async () => {
  return await apiFetch('/notifications/my');
};

// Dashboard Endpoints
export const fetchUserDashboard = async () => {
  return await apiFetch('/dashboard/user');
};



// Super Admin Exclusive Endpoints
export const fetchAuditLogs = async () => {
  return await apiFetch('/superadmin/audit-logs');
};

export const fetchSystemStats = async () => {
  return await apiFetch('/superadmin/system-stats');
};

// Direct Restricted Endpoint Probe (for live in-app testing of 403 Forbidden responses)
export const testRestrictedEndpoint = async (endpoint, options = {}) => {
  try {
    const data = await apiFetch(endpoint, options);
    return {
      allowed: true,
      status: 200,
      data
    };
  } catch (error) {
    return {
      allowed: false,
      status: error.status || 403,
      code: error.code,
      message: error.message,
      data: error.data
    };
  }
};

