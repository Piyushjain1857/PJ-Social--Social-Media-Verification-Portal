const {
  getUserEmailPreferences,
  updateUserEmailPreferences
} = require('../repositories/emailPreferenceRepository');

/**
 * GET /api/users/email-preferences
 * Protected: USER, ADMIN, SUPER_ADMIN
 * Retrieves the authenticated user's email notification preferences
 */
const getMyEmailPreferences = async (req, res, next) => {
  try {
    const preferences = await getUserEmailPreferences(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Email preferences retrieved successfully.',
      data: preferences,
      securityNote: 'Security-critical emails (e.g. password resets, credential updates, and account deactivations) cannot be disabled.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/email-preferences
 * Protected: USER, ADMIN, SUPER_ADMIN
 * Updates the authenticated user's email notification preferences
 */
const updateMyEmailPreferences = async (req, res, next) => {
  try {
    const {
      accountSecurity,
      submissionUpdates,
      gamificationUpdates,
      announcements
    } = req.body;

    const updates = {};
    if (typeof accountSecurity === 'boolean') updates.accountSecurity = accountSecurity;
    if (typeof submissionUpdates === 'boolean') updates.submissionUpdates = submissionUpdates;
    if (typeof gamificationUpdates === 'boolean') updates.gamificationUpdates = gamificationUpdates;
    if (typeof announcements === 'boolean') updates.announcements = announcements;

    const updated = await updateUserEmailPreferences(req.user.id, updates);

    return res.status(200).json({
      success: true,
      message: 'Email preferences updated successfully.',
      data: updated,
      securityNote: 'Security-critical emails remain active to safeguard your account.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyEmailPreferences,
  updateMyEmailPreferences
};
