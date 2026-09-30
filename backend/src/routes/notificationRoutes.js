const express = require('express');
const router = express.Router();
const { getMyNotifications } = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * USER Permission: View own profile and notifications
 * Returns notifications for currently authenticated user.
 */
router.get('/my', authenticate, authorize('USER', 'ADMIN', 'SUPER_ADMIN'), getMyNotifications);

module.exports = router;
