/**
 * API Service for Social Media Verification Portal
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

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

export const logoutUser = async () => {
  try {
    return await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } catch {
    return { success: true };
  }
};
