const express = require('express');
const router = express.Router();
const { login, register, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);

// Protected routes (requires valid Bearer JWT)
router.get('/me', authenticate, getMe);

module.exports = router;
