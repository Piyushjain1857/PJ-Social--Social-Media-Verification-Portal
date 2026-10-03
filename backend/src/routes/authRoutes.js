const express = require('express');
const router = express.Router();
const {
  login,
  register,
  getMe,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword
} = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);

// Password Reset Flow
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Protected routes (requires valid Bearer JWT)
router.get('/me', authenticate, getMe);

module.exports = router;
