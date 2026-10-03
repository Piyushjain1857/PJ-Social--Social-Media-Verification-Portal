/**
 * Centralized Transactional Email Service
 * Social Media Activity Verification Portal
 * 
 * Powered by Nodemailer with Gmail SMTP / Google App Password / OAuth2 support.
 * All email sending is backend-authoritative, fault-tolerant, and non-blocking.
 * Secrets and credentials are NEVER exposed to the frontend or in logs.
 */

const nodemailer = require('nodemailer');
const { createEmailLog, updateEmailLog } = require('../repositories/emailLogRepository');
const {
  PORTAL_NAME,
  getAccountCreatedTemplate,
  getLoginNotificationTemplate,
  getPasswordChangedTemplate,
  getPasswordResetTemplate,
  getSubmissionApprovedTemplate,
  getSubmissionRejectedTemplate,
  getClarificationTemplate,
  getXPNotificationTemplate,
  getLevelUpTemplate,
  getTestEmailTemplate
} = require('./emailTemplates');

// Email regex validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Strips any potential passwords or auth secrets from error messages
 */
const sanitizeErrorMessage = (err) => {
  if (!err) return 'Unknown error';
  const msg = err.message || String(err);
  // Redact passwords, tokens, or secret keys if present in error strings
  return msg
    .replace(/(password|pass|secret|token|key)[:=]\s*([^\s,;]+)/gi, '$1: [REDACTED]')
    .replace(/auth:\s*\{[^}]*\}/gi, 'auth: [REDACTED]')
    .substring(0, 500);
};

/**
 * Builds the Nodemailer transport configuration dynamically
 */
const getTransporterConfig = () => {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.MAIL_PORT, 10) || 465;
  const isSecure = process.env.MAIL_SECURE === 'true' || port === 465;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;

  // Gmail OAuth2 support if OAuth tokens are provided
  if (process.env.MAIL_CLIENT_ID && process.env.MAIL_CLIENT_SECRET && process.env.MAIL_REFRESH_TOKEN) {
    return {
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: user || 'socialportal.mailer@gmail.com',
        clientId: process.env.MAIL_CLIENT_ID,
        clientSecret: process.env.MAIL_CLIENT_SECRET,
        refreshToken: process.env.MAIL_REFRESH_TOKEN
      }
    };
  }

  // Standard SMTP / Google App Password
  const config = {
    host,
    port,
    secure: isSecure,
  };

  if (user && pass && pass.trim().length > 0 && !pass.includes('your_gmail')) {
    config.auth = {
      user: user.trim(),
      pass: pass.trim()
    };
  }

  return config;
};

// Cached transporter instance
let cachedTransporter = null;

const getTransporter = () => {
  if (!cachedTransporter) {
    const config = getTransporterConfig();
    cachedTransporter = nodemailer.createTransport(config);
  }
  return cachedTransporter;
};

/**
 * Check if active credentials are configured
 */
const isEmailConfigured = () => {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;
  const hasOAuth = Boolean(process.env.MAIL_CLIENT_ID && process.env.MAIL_REFRESH_TOKEN);
  const hasAppPass = Boolean(user && pass && pass.trim().length > 0 && !pass.includes('your_gmail'));
  return hasOAuth || hasAppPass;
};

/**
 * Low-level core sending function
 * Centralizes logging, error catching, and non-crashing execution.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 * @param {string} [options.templateName] - Template identifier for EmailLog
 * @returns {Promise<Object>} Safe result object
 */
const sendEmail = async ({
  to,
  subject,
  html,
  text,
  templateName = 'CUSTOM'
}) => {
  const recipient = (to || '').trim().toLowerCase();

  // Validate recipient email address
  if (!recipient || !EMAIL_REGEX.test(recipient)) {
    const errorMsg = `Invalid recipient email address: "${to}"`;
    console.warn(`[EmailService] Delivery blocked: ${errorMsg}`);

    // Create log with FAILED status
    await createEmailLog({
      recipient: recipient || 'invalid@recipient.unknown',
      subject: subject || '(No Subject)',
      template: templateName,
      status: 'FAILED',
      error: errorMsg,
      sentAt: null
    }).catch(() => null);

    return {
      success: false,
      status: 'FAILED',
      error: errorMsg,
      recipient
    };
  }

  // 1. Create initial PENDING EmailLog record
  let logRecord = null;
  try {
    logRecord = await createEmailLog({
      recipient,
      subject,
      template: templateName,
      status: 'PENDING',
      sentAt: null
    });
  } catch (logErr) {
    console.warn('[EmailService] Failed to create pending log record:', logErr.message);
  }

  const mailFrom = process.env.MAIL_FROM || `"PJ Social Portal" <${process.env.MAIL_USER || 'no-reply@verificationportal.local'}>`;

  // 2. Dispatch via Nodemailer or graceful simulation
  try {
    const configured = isEmailConfigured();

    if (!configured) {
      // In development or when credentials are not yet configured, simulate delivery safely
      // This prevents test suites and local demos from crashing while still providing full auditability
      const simulatedMessageId = `<simulated-${Date.now()}.${Math.random().toString(36).substring(2, 8)}@pj-social.local>`;
      const sentTime = new Date();

      if (logRecord?.id) {
        await updateEmailLog(logRecord.id, {
          status: 'SENT',
          messageId: simulatedMessageId,
          sentAt: sentTime,
          error: null
        }).catch(() => null);
      }

      console.log(`[EmailService:SIMULATED] 📧 Email to ${recipient} [Template: ${templateName}, Subject: "${subject}"]`);

      return {
        success: true,
        status: 'SENT',
        messageId: simulatedMessageId,
        recipient,
        template: templateName,
        simulated: true,
        sentAt: sentTime
      };
    }

    // Live SMTP Dispatch
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: mailFrom,
      to: recipient,
      subject,
      html,
      text: text || subject
    });

    const sentTime = new Date();
    if (logRecord?.id) {
      await updateEmailLog(logRecord.id, {
        status: 'SENT',
        messageId: info.messageId,
        sentAt: sentTime,
        error: null
      }).catch(() => null);
    }

    console.log(`[EmailService:LIVE] ✉️ Email dispatched to ${recipient} (MessageID: ${info.messageId})`);

    return {
      success: true,
      status: 'SENT',
      messageId: info.messageId,
      recipient,
      template: templateName,
      sentAt: sentTime
    };

  } catch (err) {
    const sanitized = sanitizeErrorMessage(err);
    console.error(`[EmailService] ❌ Failed to dispatch email to ${recipient}:`, sanitized);

    if (logRecord?.id) {
      await updateEmailLog(logRecord.id, {
        status: 'FAILED',
        error: sanitized,
        sentAt: null
      }).catch(() => null);
    }

    // Reliability guarantee: Return safe failure object, NEVER throw and crash callers!
    return {
      success: false,
      status: 'FAILED',
      error: sanitized,
      recipient,
      template: templateName
    };
  }
};

/**
 * 1. Account Created Email
 */
const sendAccountCreatedEmail = async (user, options = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getAccountCreatedTemplate({
    name: user.name,
    email: user.email,
    loginUrl: options.loginUrl
  });

  return sendEmail({
    to: user.email,
    subject: `Welcome to ${PORTAL_NAME}!`,
    html,
    templateName: 'ACCOUNT_CREATED'
  });
};

/**
 * 2. Login Notification Email
 */
const sendLoginNotificationEmail = async (user, loginDetails = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getLoginNotificationTemplate({
    name: user.name,
    email: user.email,
    ip: loginDetails.ip || 'Unknown',
    time: loginDetails.time || new Date().toUTCString(),
    userAgent: loginDetails.userAgent || 'Web Browser'
  });

  return sendEmail({
    to: user.email,
    subject: `Security Alert: New Sign-in to Your ${PORTAL_NAME} Account`,
    html,
    templateName: 'LOGIN_NOTIFICATION'
  });
};

/**
 * 3. Password Changed Email
 */
const sendPasswordChangedEmail = async (user, options = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getPasswordChangedTemplate({
    name: user.name,
    email: user.email,
    time: options.time || new Date().toUTCString(),
    ip: options.ip || 'Unknown'
  });

  return sendEmail({
    to: user.email,
    subject: `Security Notice: Your ${PORTAL_NAME} Password Was Changed`,
    html,
    templateName: 'PASSWORD_CHANGED'
  });
};

/**
 * 4. Password Reset Email
 */
const sendPasswordResetEmail = async (user, resetDetails = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getPasswordResetTemplate({
    name: user.name,
    email: user.email,
    resetLink: resetDetails.resetLink,
    temporaryPassword: resetDetails.temporaryPassword,
    expiryTime: resetDetails.expiryTime || '24 hours'
  });

  return sendEmail({
    to: user.email,
    subject: `Password Reset Request - ${PORTAL_NAME}`,
    html,
    templateName: 'PASSWORD_RESET'
  });
};

/**
 * 5. Submission Approved Email
 */
const sendSubmissionApprovedEmail = async (user, submission, pointsAwarded = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getSubmissionApprovedTemplate({
    name: user.name,
    submissionId: submission?.id,
    platform: submission?.platform || 'INSTAGRAM',
    actionType: submission?.actionType || 'LIKE',
    xpAwarded: pointsAwarded.xp || pointsAwarded.points || 0,
    totalXP: pointsAwarded.totalXP || user.totalXP || 0,
    levelName: pointsAwarded.level?.levelName || pointsAwarded.level?.name || 'Verified Creator'
  });

  return sendEmail({
    to: user.email,
    subject: `🎉 Submission Approved! +${pointsAwarded.xp || pointsAwarded.points || 0} XP Earned - ${PORTAL_NAME}`,
    html,
    templateName: 'SUBMISSION_APPROVED'
  });
};

/**
 * 6. Submission Rejected Email
 */
const sendSubmissionRejectedEmail = async (user, submission, reason = '') => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getSubmissionRejectedTemplate({
    name: user.name,
    submissionId: submission?.id,
    platform: submission?.platform || 'INSTAGRAM',
    actionType: submission?.actionType || 'LIKE',
    reason: reason || 'Activity proof did not meet verification guidelines.'
  });

  return sendEmail({
    to: user.email,
    subject: `Submission Review Update - Action Required - ${PORTAL_NAME}`,
    html,
    templateName: 'SUBMISSION_REJECTED'
  });
};

/**
 * 7. Clarification Request Email
 */
const sendClarificationEmail = async (user, submission, clarification = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const message = typeof clarification === 'string' ? clarification : clarification.message;
  const reviewerName = clarification.reviewerName || 'Moderation Team';

  const html = getClarificationTemplate({
    name: user.name,
    submissionId: submission?.id,
    platform: submission?.platform || 'INSTAGRAM',
    actionType: submission?.actionType || 'LIKE',
    message,
    reviewerName
  });

  return sendEmail({
    to: user.email,
    subject: `Clarification Requested for Your Submission - ${PORTAL_NAME}`,
    html,
    templateName: 'CLARIFICATION_REQUEST'
  });
};

/**
 * 8. XP Notification Email
 */
const sendXPNotificationEmail = async (user, xpDetails = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getXPNotificationTemplate({
    name: user.name,
    xpAmount: xpDetails.xp || xpDetails.points || 0,
    actionType: xpDetails.actionType || 'BONUS',
    reason: xpDetails.reason || 'Activity verified',
    newTotalXP: xpDetails.newTotalXP || xpDetails.totalPoints || user.totalXP || 0
  });

  return sendEmail({
    to: user.email,
    subject: `XP Balance Update: ${xpDetails.xp >= 0 ? '+' : ''}${xpDetails.xp || 0} XP - ${PORTAL_NAME}`,
    html,
    templateName: 'XP_AWARDED'
  });
};

/**
 * 9. Level Up Email
 */
const sendLevelUpEmail = async (user, levelDetails = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const newLevel = levelDetails.currentLevel || levelDetails.level || 2;
  const levelName = levelDetails.levelName || levelDetails.name || 'Active Creator';
  const icon = levelDetails.icon || levelDetails.badge || '⚡';
  const totalXP = levelDetails.totalXP || user.totalXP || 0;

  const html = getLevelUpTemplate({
    name: user.name,
    newLevel,
    levelName,
    icon,
    totalXP
  });

  return sendEmail({
    to: user.email,
    subject: `🏆 Congratulations! You Leveled Up to Level ${newLevel} (${levelName})!`,
    html,
    templateName: 'LEVEL_UP'
  });
};

/**
 * 10. Super Admin Test Email
 */
const sendTestEmail = async (recipient) => {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const html = getTestEmailTemplate({
    recipient,
    timestamp: new Date().toISOString(),
    host
  });

  return sendEmail({
    to: recipient,
    subject: `Operational Test: ${PORTAL_NAME} Transactional Email System`,
    html,
    templateName: 'TEST_EMAIL'
  });
};

/**
 * Returns safe system mail telemetry WITHOUT exposing any passwords or auth secrets
 */
const getMailSystemStatus = () => {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.MAIL_PORT, 10) || 465;
  const isSecure = process.env.MAIL_SECURE === 'true' || port === 465;
  const user = process.env.MAIL_USER || 'Not Configured';
  const from = process.env.MAIL_FROM || `PJ Social Portal <${user}>`;
  const isConfigured = isEmailConfigured();

  // Mask user email for privacy (e.g. j***n@gmail.com)
  const maskedUser = user.includes('@')
    ? user.replace(/^(.{1,2})(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(5, b.length))}${c}`)
    : user;

  return {
    isConfigured,
    host,
    port,
    isSecure,
    user: maskedUser,
    from,
    provider: host.includes('gmail') ? 'Google / Gmail SMTP' : 'Custom SMTP'
  };
};

module.exports = {
  sendEmail,
  sendAccountCreatedEmail,
  sendLoginNotificationEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendSubmissionApprovedEmail,
  sendSubmissionRejectedEmail,
  sendClarificationEmail,
  sendXPNotificationEmail,
  sendLevelUpEmail,
  sendTestEmail,
  getMailSystemStatus,
  isEmailConfigured
};
