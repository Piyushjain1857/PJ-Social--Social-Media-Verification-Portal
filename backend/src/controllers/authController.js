const crypto = require('crypto');
const { findUserByEmail, findUserById, createUser, updateUser } = require('../repositories/userRepository');
const { createResetToken, findTokenByHash, markTokenUsed } = require('../repositories/passwordResetRepository');
const { createNotification } = require('../repositories/notificationRepository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const {
  sendAccountCreatedEmail,
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} = require('../services/emailService');

// Simple regex for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory rate limiting map for password reset requests: key -> [timestamps]
const resetRateLimitMap = new Map();
const RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_ATTEMPTS = 5;

const isResetRateLimited = (key) => {
  const now = Date.now();
  const timestamps = (resetRateLimitMap.get(key) || []).filter(t => now - t < RESET_RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_RESET_ATTEMPTS) {
    return true;
  }
  timestamps.push(now);
  resetRateLimitMap.set(key, timestamps);
  return false;
};

/**
 * POST /api/auth/register
 * Registers a new user. The backend strictly enforces the role as USER.
 * Role information sent from the frontend is NEVER trusted.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 70) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be between 2 and 70 characters long.'
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || email.trim().length > 120 || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required (maximum 120 characters).'
      });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 8 characters long.'
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // CRITICAL: The backend must never trust role information sent by the frontend.
    // Public registration always assigns the 'USER' role.
    const newUser = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'USER', // Enforced server-side
      status: 'ACTIVE'
    });

    // Generate JWT
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });

    // Asynchronously dispatch transactional welcome email (fault-tolerant, never blocks registration)
    sendAccountCreatedEmail(newUser).catch(err => {
      console.warn('[AuthController] Account created email notification skipped:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns a JWT token.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required.'
      });
    }

    // Lookup user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify account status
    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Your account is currently ${user.status.toLowerCase()}. Please contact support.`
      });
    }

    // Compare bcrypt password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT containing user identity and verified server-side role
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    // Asynchronously dispatch transactional login notification email (non-blocking)
    sendLoginNotificationEmail(user, {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Web Browser',
      time: new Date().toUTCString()
    }).catch(err => {
      console.warn('[AuthController] Login notification email skipped:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Retrieves profile of the currently authenticated user based on verified token.
 */
const getMe = async (req, res, next) => {
  try {
    // req.user was populated by authenticate middleware
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Acknowledges user logout on client side and clears session context.
 */
const logout = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

/**
 * POST /api/auth/forgot-password
 * Initiates secure password reset flow without revealing user existence
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rateLimitKey = `${req.ip}_${cleanEmail}`;

    // Rate limit check: max 5 requests per 15 minutes
    if (isResetRateLimited(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts. Please wait a few minutes before trying again.'
      });
    }

    // Always standard response text to avoid account enumeration
    const genericSuccessResponse = {
      success: true,
      message: 'If an account exists with that email address, password reset instructions have been sent.'
    };

    const user = await findUserByEmail(cleanEmail);
    if (!user || user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      // Do not reveal whether user exists
      return res.status(200).json(genericSuccessResponse);
    }

    // Generate cryptographically secure random token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    // Store SHA-256 hash in database
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    await createResetToken({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    const portalUrl = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0] : 'http://localhost:5173';
    const resetLink = `${portalUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch transactional password reset email (non-blocking)
    sendPasswordResetEmail(user, {
      resetLink,
      expiryTime: '1 hour'
    }).catch(err => {
      console.warn('[AuthController] Password reset email skipped:', err.message);
    });

    return res.status(200).json(genericSuccessResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/verify-reset-token
 * Validates if a password reset token is active and unexpired
 */
const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid or missing reset token.'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const record = await findTokenByHash(tokenHash);

    if (!record || record.usedAt !== null || new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'This password reset link is invalid, has expired, or has already been used.'
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      message: 'Token is valid.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Consumes reset token and applies new password with bcrypt
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required.'
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password is required and must be at least 8 characters long.'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const record = await findTokenByHash(tokenHash);

    if (!record) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid password reset token.'
      });
    }

    if (record.usedAt !== null) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_ALREADY_USED',
        message: 'This password reset link has already been used. Please request a new one.'
      });
    }

    if (new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'This password reset link has expired. Please request a new one.'
      });
    }

    const user = await findUserById(record.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    // Hash new password using bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Save updated password
    await updateUser(user.id, { password: hashedPassword });

    // Mark single-use token as consumed
    await markTokenUsed(record.id);

    // Record in-app notification
    try {
      await createNotification({
        userId: user.id,
        type: 'ACCOUNT_ALERT',
        title: 'Password Reset Successful',
        message: 'Your account password was successfully reset using a security link. If you did not make this change, please contact support immediately.'
      });
    } catch (notifErr) {
      console.warn('[AuthController] Reset notification skipped:', notifErr.message);
    }

    // Dispatch transactional confirmation email
    sendPasswordChangedEmail(user, {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown',
      time: new Date().toUTCString()
    }).catch(err => {
      console.warn('[AuthController] Password reset confirmation email skipped:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword
};
