const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../repositories/notificationRepository');

/**
 * GET /api/notifications
 * GET /api/notifications/my
 * Protected: Authenticated users (USER, ADMIN, SUPER_ADMIN)
 * Returns notifications addressed exclusively to the authenticated caller.
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Protected: Authenticated users
 * Marks an individual notification as read.
 * Users can only mark their own notifications as read.
 */
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await markNotificationAsRead(id, req.user.id);

    if (result.error) {
      const statusCode = result.code === 'FORBIDDEN_OWNERSHIP' ? 403 : 404;
      return res.status(statusCode).json({
        success: false,
        code: result.code,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Protected: Authenticated users
 * Marks all notifications belonging to the authenticated caller as read.
 */
const markAllRead = async (req, res, next) => {
  try {
    const result = await markAllNotificationsAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      count: result.count
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getMyNotifications: getNotifications, // Backwards compatibility alias
  markRead,
  markAllRead
};
