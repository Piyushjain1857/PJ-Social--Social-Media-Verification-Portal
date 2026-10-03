const { findUserByEmail, findUserById, createUser } = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { sendAccountCreatedEmail, sendLoginNotificationEmail } = require('../services/emailService');

// Simple regex for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

module.exports = {
  register,
  login,
  getMe,
  logout
};
