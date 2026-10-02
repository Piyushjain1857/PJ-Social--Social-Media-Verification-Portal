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
const reviewRoutes = require('./reviewRoutes');
const socialAccountRoutes = require('./socialAccountRoutes');
const searchRoutes = require('./searchRoutes');
const pointsRoutes = require('./pointsRoutes');
const gamificationRoutes = require('./gamificationRoutes');

// Authentication routes (/api/auth)
router.use('/auth', authRoutes);

// Activity Submissions & Moderation routes (/api/submissions)
router.use('/submissions', submissionRoutes);

// Admin Moderation & Review Queue routes (/api/reviews)
router.use('/reviews', reviewRoutes);

// Gamification XP & Level Engine routes (/api/gamification)
router.use('/gamification', gamificationRoutes);

// Gamification Points & Transactions routes (/api/points)
router.use('/points', pointsRoutes);

// Direct /api/leaderboard endpoint alias
const { getLeaderboardList } = require('../controllers/pointsController');
const { authenticate } = require('../middlewares/authMiddleware');
router.get('/leaderboard', authenticate, getLeaderboardList);

// User Directory & Role Management routes (/api/users)
router.use('/users', userRoutes);

// Notifications routes (/api/notifications)
router.use('/notifications', notificationRoutes);

// Super Admin Level Management routes (/api/admin/levels & /api/superadmin/levels)
const adminLevelRoutes = require('./adminLevelRoutes');
router.use('/admin/levels', adminLevelRoutes);
router.use('/superadmin/levels', adminLevelRoutes);

// Super Admin Exclusive Governance routes (/api/superadmin)
router.use('/superadmin', superAdminRoutes);

// Official Social Accounts (active accounts for submission targeting) (/api/social-accounts)
router.use('/social-accounts', socialAccountRoutes);

// Unified Global Search endpoint (/api/search)
router.use('/search', searchRoutes);

// Dashboard data routes (/api/dashboard)
router.use('/dashboard', dashboardRoutes);

// Auth-gated screenshot serving (/api/uploads)
// Replaces the public /uploads static serve — files are only served to authorized users.
router.use('/uploads', uploadRoutes);

// Swagger OpenAPI Documentation (/api/docs and /api/swagger.json)
const swaggerRoutes = require('./swaggerRoutes');
router.use('/docs', swaggerRoutes);
router.get('/swagger.json', (req, res) => res.redirect('/api/docs/json'));

// Health and Diagnostics
router.use('/', healthRoutes);

module.exports = router;

