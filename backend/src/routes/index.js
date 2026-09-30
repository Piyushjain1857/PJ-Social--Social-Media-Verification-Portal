const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');

// Authentication routes (/api/auth)
router.use('/auth', authRoutes);

// Health and Diagnostics
router.use('/', healthRoutes);

module.exports = router;
