const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const submissionRoutes = require('./submissionRoutes');
const userRoutes = require('./userRoutes');
const notificationRoutes = require('./notificationRoutes');
const superAdminRoutes = require('./superAdminRoutes');

// Authentication routes (/api/auth)
router.use('/auth', authRoutes);

// Activity Submissions & Moderation routes (/api/submissions)
router.use('/submissions', submissionRoutes);

// User Directory & Role Management routes (/api/users)
router.use('/users', userRoutes);

// Notifications routes (/api/notifications)
router.use('/notifications', notificationRoutes);

// Super Admin Exclusive Governance routes (/api/superadmin)
router.use('/superadmin', superAdminRoutes);

// Health and Diagnostics
router.use('/', healthRoutes);

module.exports = router;

