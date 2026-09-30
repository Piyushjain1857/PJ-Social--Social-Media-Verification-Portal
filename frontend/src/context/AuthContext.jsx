import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, fetchCurrentUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate existing stored token on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetchCurrentUser();
        if (response.success && response.user) {
          setUser(response.user);
          setToken(storedToken);
        } else {
          // Token invalid or unconfirmed
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.warn('[AuthContext] Session verification failed:', err.message);
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Global listener for session expiration triggered by API 401 responses
    const handleSessionExpired = (event) => {
      console.warn('[AuthContext] Session expired:', event.detail?.message);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      setError(event.detail?.message || 'Your session has expired. Please sign in again.');
    };

    const handleForbidden = (event) => {
      console.warn('[AuthContext] Forbidden request intercepted:', event.detail?.message);
      setError(event.detail?.message || 'Access denied: Insufficient role permissions.');
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    window.addEventListener('auth:forbidden', handleForbidden);

    return () => {
      window.removeEventListener('auth:session_expired', handleSessionExpired);
      window.removeEventListener('auth:forbidden', handleForbidden);
    };
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginUser(email, password);
      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token);
        setToken(response.token);
        setUser(response.user);
        setIsLoading(false);
        return { success: true, user: response.user };
      } else {
        throw new Error(response.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'Authentication error.');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  const register = async (name, email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await registerUser(name, email, password);
      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token);
        setToken(response.token);
        setUser(response.user);
        setIsLoading(false);
        return { success: true, user: response.user };
      } else {
        throw new Error(response.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Registration error.');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Continue cleanup regardless
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  const clearError = () => setError(null);

  const updateUserContext = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : updatedFields));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    register,
    logout,
    updateUserContext,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
