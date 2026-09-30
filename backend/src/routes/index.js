const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const submissionRoutes = require('./submissionRoutes');
const userRoutes = require('./userRoutes');
const notificationRoutes = require('./notificationRoutes');
const superAdminRoutes = require('./superAdminRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const uploadRoutes = require('./uploadRoutes');

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

// Dashboard data routes (/api/dashboard)
router.use('/dashboard', dashboardRoutes);

// Auth-gated screenshot serving (/api/uploads)
// Replaces the public /uploads static serve — files are only served to authorized users.
router.use('/uploads', uploadRoutes);

// Health and Diagnostics
router.use('/', healthRoutes);

module.exports = router;

