const {
  getUserNotifications,
  getUserNotificationsPaginated,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../repositories/notificationRepository');

/**
 * GET /api/notifications
 * GET /api/notifications/my
 * Protected: Authenticated users (USER, ADMIN, SUPER_ADMIN)
 * Returns notifications addressed exclusively to the authenticated caller with search, filtering, and pagination.
 */
const getNotifications = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      search,
      type,
      isRead,
      startDate,
      endDate,
      sortBy,
      sortOrder
    } = req.query;

    const result = await getUserNotificationsPaginated(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : (page ? 10 : 50),
      search: search || '',
      type: type || 'ALL',
      isRead: isRead !== undefined ? isRead : 'ALL',
      startDate: startDate || null,
      endDate: endDate || null,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    });

    return res.status(200).json({
      success: true,
      count: result.records.length,
      unreadCount: result.totalUnread,
      data: result.records,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      },
      filters: {
        search: search || null,
        type: type || 'ALL',
        isRead: isRead !== undefined ? isRead : 'ALL',
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      }
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
