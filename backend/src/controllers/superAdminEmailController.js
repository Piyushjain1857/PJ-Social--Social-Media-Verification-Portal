const { sendTestEmail, retryFailedEmail, getMailSystemStatus } = require('../services/emailService');
const {
  getEmailLogs,
  getDistinctTemplates,
  getEmailMetrics,
  getEmailAnalytics,
  getEmailLogById,
  getFailedEmailLogs
} = require('../repositories/emailLogRepository');
const {
  getTemplateConfigs,
  updateTemplateConfig,
  getSystemSettings,
  updateSystemSettings
} = require('../repositories/emailConfigRepository');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/super-admin/email/test
 * Super Admin Protected endpoint to send a test transactional email
 */
const postTestEmail = async (req, res, next) => {
  try {
    const { recipient, template } = req.body;

    if (!recipient || typeof recipient !== 'string' || !EMAIL_REGEX.test(recipient.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid recipient email address is required (e.g. user@example.com).'
      });
    }

    const cleanRecipient = recipient.trim().toLowerCase();
    const cleanTemplate = template ? String(template).trim() : 'TEST_EMAIL';
    const result = await sendTestEmail(cleanRecipient, cleanTemplate);

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Test email (${cleanTemplate}) dispatched successfully to ${cleanRecipient}.`
        : `Email delivery could not be completed: ${result.error || 'Check server configuration'}`,
      data: {
        recipient: cleanRecipient,
        template: cleanTemplate,
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
      dateTo,
      recipient
    } = req.query;

    const effectiveSearch = search || recipient || null;

    const result = await getEmailLogs({
      page,
      limit,
      search: effectiveSearch,
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
        search: effectiveSearch,
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
 * GET /api/super-admin/email/logs/:id
 * Retrieve single EmailLog details with secrets safely redacted
 */
const getEmailLogDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await getEmailLogById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: `Email log not found for ID: ${id}`
      });
    }

    return res.status(200).json({
      success: true,
      data: log
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/overview
 * Overview metrics: Sent Today, This Week, This Month, Status counts, and Delivery success rate
 */
const getOverviewMetrics = async (req, res, next) => {
  try {
    const metrics = await getEmailMetrics();
    return res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/analytics
 * Charts data: daily trend, status breakdown, template breakdown, event categories
 */
const getEmailAnalyticsEndpoint = async (req, res, next) => {
  try {
    const { days = 14 } = req.query;
    const analytics = await getEmailAnalytics(days);
    return res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/failed
 * Retrieve failed email delivery logs
 */
const getFailedEmails = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const result = await getFailedEmailLogs({ page, limit, search });
    return res.status(200).json({
      success: true,
      count: result.count,
      data: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/super-admin/email/retry/:id
 * Retry sending a failed email without duplicate application events
 */
const postRetryEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await retryFailedEmail(id);

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Email retry succeeded. Dispatched to ${result.recipient}.`
        : `Email retry failed: ${result.error || 'Check server configuration'}`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/settings
 * Super Admin Protected endpoint to view safe configuration status & global event toggles
 * NEVER displays passwords, tokens, or OAuth secrets
 */
const getEmailSettings = async (req, res, next) => {
  try {
    const telemetry = getMailSystemStatus();
    const eventToggles = await getSystemSettings();

    return res.status(200).json({
      success: true,
      data: {
        telemetry: {
          provider: telemetry.provider,
          sender: telemetry.from,
          user: telemetry.user,
          smtpStatus: telemetry.smtpStatus,
          oauthStatus: telemetry.oauthStatus,
          isConfigured: telemetry.isConfigured,
          host: telemetry.host,
          port: telemetry.port,
          isSecure: telemetry.isSecure
        },
        eventToggles
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/super-admin/email/settings/events
 * Super Admin Protected endpoint to update optional email event toggles
 * Security-critical events remain strictly enabled
 */
const updateEventToggles = async (req, res, next) => {
  try {
    const actor = req.user?.email || 'SUPER_ADMIN';
    const updated = await updateSystemSettings(req.body, actor);

    return res.status(200).json({
      success: true,
      message: 'Email event toggles updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/templates/config
 * Retrieve editable email template configurations
 */
const getTemplateConfigsEndpoint = async (req, res, next) => {
  try {
    const configs = await getTemplateConfigs();
    return res.status(200).json({
      success: true,
      data: configs
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/super-admin/email/templates/config/:key
 * Update an email template subject and content safely
 */
const updateTemplateConfigEndpoint = async (req, res, next) => {
  try {
    const { key } = req.params;
    const actor = req.user?.email || 'SUPER_ADMIN';
    const updated = await updateTemplateConfig(key, req.body, actor);

    return res.status(200).json({
      success: true,
      message: `Template "${key}" configuration updated successfully.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/super-admin/email/status
 * Legacy/backward-compatible telemetry endpoint
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
 * Retrieve available distinct template names
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
  getEmailLogDetails,
  getOverviewMetrics,
  getEmailAnalyticsEndpoint,
  getFailedEmails,
  postRetryEmail,
  getEmailSettings,
  updateEventToggles,
  getTemplateConfigsEndpoint,
  updateTemplateConfigEndpoint,
  getEmailStatus,
  listEmailTemplates
};
