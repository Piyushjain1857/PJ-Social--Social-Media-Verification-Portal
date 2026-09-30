const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markRead,
  markAllRead
} = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

/**
 * Notification Routes - /api/notifications
 * All authenticated users (USER, ADMIN, SUPER_ADMIN) have access to their own notifications.
 */

// GET /api/notifications
// Retrieves notifications for the caller
router.get('/', authenticate, getNotifications);
router.get('/my', authenticate, getNotifications);

// PATCH /api/notifications/read-all
// Marks all unread notifications belonging to the caller as read
// Note: registered before /:id/read so 'read-all' is not captured as an :id parameter
router.patch('/read-all', authenticate, markAllRead);
router.put('/read-all', authenticate, markAllRead);
router.post('/read-all', authenticate, markAllRead);

// PATCH /api/notifications/:id/read
// Marks a specific notification as read (with caller ownership verification)
router.patch('/:id/read', authenticate, markRead);
router.put('/:id/read', authenticate, markRead);

module.exports = router;
