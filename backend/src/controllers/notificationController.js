const { getUserNotifications } = require('../repositories/notificationRepository');

/**
 * GET /api/notifications/my
 * Protected: Authenticated users (USER, ADMIN, SUPER_ADMIN)
 * Returns notifications addressed to the caller.
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications
};
