const { sendTestEmail, getMailSystemStatus } = require('../services/emailService');
const { getEmailLogs, getDistinctTemplates } = require('../repositories/emailLogRepository');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/super-admin/email/test
 * Super Admin Protected endpoint to send a test transactional email
 */
const postTestEmail = async (req, res, next) => {
  try {
    const { recipient } = req.body;

    if (!recipient || typeof recipient !== 'string' || !EMAIL_REGEX.test(recipient.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid recipient email address is required (e.g. user@example.com).'
      });
    }

    const cleanRecipient = recipient.trim().toLowerCase();
    const result = await sendTestEmail(cleanRecipient);

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Test email dispatched successfully to ${cleanRecipient}.`
        : `Email delivery could not be completed: ${result.error || 'Check server configuration'}`,
      data: {
        recipient: cleanRecipient,
        status: result.status,
        messageId: result.messageId || null,
        sentAt: result.sentAt || null,
        error: result.error || null,
        simulated: Boolean(result.simulated)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/logs
 * Super Admin Protected endpoint to retrieve filtered, searchable, paginated email delivery logs
 */
const listEmailLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      template,
      startDate,
      endDate,
      dateFrom,
      dateTo
    } = req.query;

    const result = await getEmailLogs({
      page,
      limit,
      search,
      status,
      template,
      startDate,
      endDate,
      dateFrom,
      dateTo
    });

    return res.status(200).json({
      success: true,
      count: result.count,
      data: result.data,
      pagination: result.pagination,
      filters: {
        search: search || null,
        status: status || 'ALL',
        template: template || 'ALL',
        startDate: startDate || dateFrom || null,
        endDate: endDate || dateTo || null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/status
 * Super Admin Protected endpoint to retrieve safe email system telemetry (NO credentials leaked)
 */
const getEmailStatus = async (req, res, next) => {
  try {
    const status = getMailSystemStatus();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/templates
 * Super Admin Protected endpoint to retrieve available templates
 */
const listEmailTemplates = async (req, res, next) => {
  try {
    const distinctUsed = await getDistinctTemplates();
    const systemTemplates = [
      'ACCOUNT_CREATED',
      'LOGIN_NOTIFICATION',
      'PASSWORD_CHANGED',
      'PASSWORD_RESET',
      'SUBMISSION_APPROVED',
      'SUBMISSION_REJECTED',
      'CLARIFICATION_REQUEST',
      'XP_AWARDED',
      'LEVEL_UP',
      'TEST_EMAIL'
    ];

    const allTemplates = Array.from(new Set([...systemTemplates, ...distinctUsed]));

    return res.status(200).json({
      success: true,
      data: allTemplates
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  postTestEmail,
  listEmailLogs,
  getEmailStatus,
  listEmailTemplates
};
