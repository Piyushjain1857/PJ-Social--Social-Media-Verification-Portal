/**
 * Centralized Transactional Email Service
 * Social Media Activity Verification Portal
 * 
 * Powered by Nodemailer with Gmail SMTP / Google App Password / OAuth2 support.
 * All email sending is backend-authoritative, fault-tolerant, and non-blocking.
 * Secrets and credentials are NEVER exposed to the frontend or in logs.
 */

const nodemailer = require('nodemailer');
const { createEmailLog, updateEmailLog, hasSentEmail } = require('../repositories/emailLogRepository');
const { getUserEmailPreferences } = require('../repositories/emailPreferenceRepository');
const {
  PORTAL_NAME,
  getAccountCreatedTemplate,
  getLoginNotificationTemplate,
  getPasswordChangedTemplate,
  getPasswordResetTemplate,
  getEmailChangedOldAddressTemplate,
  getEmailChangedNewAddressTemplate,
  getAccountDeactivatedTemplate,
  getAccountReactivatedTemplate,
  getSubmissionReceivedTemplate,
  getSubmissionApprovedTemplate,
  getSubmissionRejectedTemplate,
  getClarificationTemplate,
  getXPEarnedTemplate,
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
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
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
  templateName = 'CUSTOM',
  entityId = null
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
      entityId,
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
      entityId,
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
    role: user.role || options.role || 'USER',
    createdAt: user.createdAt || options.createdAt || new Date(),
    loginUrl: options.loginUrl
  });

  return sendEmail({
    to: user.email,
    subject: `Welcome to ${PORTAL_NAME} 🎉`,
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
    subject: `Your password was changed successfully - ${PORTAL_NAME}`,
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
    expiryTime: resetDetails.expiryTime || '1 hour'
  });

  return sendEmail({
    to: user.email,
    subject: `Password Reset Request - ${PORTAL_NAME}`,
    html,
    templateName: 'PASSWORD_RESET'
  });
};

/**
 * 5. Email Change Security Notifications
 */
const sendEmailChangedNotification = async ({ user, oldEmail, newEmail, ip }) => {
  const dateStr = new Date().toUTCString();
  const promises = [];

  // Notify old address
  if (oldEmail) {
    const oldHtml = getEmailChangedOldAddressTemplate({
      name: user?.name || 'User',
      oldEmail,
      newEmail,
      date: dateStr
    });
    promises.push(
      sendEmail({
        to: oldEmail,
        subject: `Your account email was changed - ${PORTAL_NAME}`,
        html: oldHtml,
        templateName: 'EMAIL_CHANGED_OLD'
      }).catch(err => {
        console.warn('[EmailService] Old email change notice failed:', err.message);
      })
    );
  }

  // Notify new address
  if (newEmail) {
    const newHtml = getEmailChangedNewAddressTemplate({
      name: user?.name || 'User',
      newEmail,
      date: dateStr
    });
    promises.push(
      sendEmail({
        to: newEmail,
        subject: `Your email has been added to the account - ${PORTAL_NAME}`,
        html: newHtml,
        templateName: 'EMAIL_CHANGED_NEW'
      }).catch(err => {
        console.warn('[EmailService] New email confirmation notice failed:', err.message);
      })
    );
  }

  const results = await Promise.all(promises);
  return { success: true, count: results.length };
};

/**
 * 6. Account Deactivation Notice
 */
const sendAccountDeactivatedEmail = async (user, options = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getAccountDeactivatedTemplate({
    name: user.name,
    email: user.email,
    reason: options.reason || 'Administrative policy review.',
    date: options.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    supportEmail: options.supportEmail || 'support@portal.com'
  });

  return sendEmail({
    to: user.email,
    subject: `Your account has been deactivated - ${PORTAL_NAME}`,
    html,
    templateName: 'ACCOUNT_DEACTIVATED'
  });
};

/**
 * 7. Account Reactivation Notice
 */
const sendAccountReactivatedEmail = async (user, options = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const html = getAccountReactivatedTemplate({
    name: user.name,
    email: user.email,
    date: options.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    loginUrl: options.loginUrl
  });

  return sendEmail({
    to: user.email,
    subject: `Your account has been reactivated - ${PORTAL_NAME}`,
    html,
    templateName: 'ACCOUNT_REACTIVATED'
  });
};

/**
 * 5a. Submission Received Email (Optional notification)
 * Triggers when user submits an activity.
 * Subject: "Your submission has been received."
 * Includes: Submission ID, Platform, Action, Submission date, Current status
 */
const sendSubmissionReceivedEmail = async (user, submission) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  if (!submission) return { success: false, error: 'Submission object is required' };

  // 1. Check user email preferences
  if (user.id) {
    try {
      const prefs = await getUserEmailPreferences(user.id);
      if (prefs.submissionUpdates === false) {
        console.log(`[EmailService] Submission received email skipped for user ${user.id} (submissionUpdates disabled).`);
        return { success: true, skipped: true, reason: 'PREFERENCE_DISABLED' };
      }
    } catch (e) {
      // Non-fatal preference check error
    }
  }

  // 2. Prevent duplicate emails on retry
  const alreadySent = await hasSentEmail({
    recipient: user.email,
    template: 'SUBMISSION_RECEIVED',
    entityId: submission.id
  });
  if (alreadySent) {
    console.log(`[EmailService] Duplicate submission received email prevented for submission ${submission.id}`);
    return { success: true, duplicatePrevented: true };
  }

  const html = getSubmissionReceivedTemplate({
    name: user.name,
    submissionId: submission.id,
    platform: submission.platform || 'INSTAGRAM',
    actionType: submission.actionType || 'LIKE',
    submissionDate: submission.createdAt || new Date(),
    status: submission.status || 'PENDING'
  });

  return sendEmail({
    to: user.email,
    subject: 'Your submission has been received.',
    html,
    templateName: 'SUBMISSION_RECEIVED',
    entityId: submission.id
  });
};

/**
 * 5b. Submission Approved Email
 * Triggers when Admin approves a submission.
 * Subject: "Your submission has been approved! 🎉"
 * Includes: Platform, Action, Submission ID, Approval date, XP earned, Current Level, [View Dashboard]
 * Strictly truthful verification without claiming beyond admin review.
 */
const sendSubmissionApprovedEmail = async (user, submission, pointsAwarded = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  if (!submission) return { success: false, error: 'Submission is required' };

  // 1. Check user email preferences
  if (user.id) {
    try {
      const prefs = await getUserEmailPreferences(user.id);
      if (prefs.submissionUpdates === false) {
        console.log(`[EmailService] Submission approved email skipped for user ${user.id} (submissionUpdates disabled).`);
        return { success: true, skipped: true, reason: 'PREFERENCE_DISABLED' };
      }
    } catch (e) {
      // Non-fatal
    }
  }

  // 2. Prevent duplicate emails on retry
  const alreadySent = await hasSentEmail({
    recipient: user.email,
    template: 'SUBMISSION_APPROVED',
    entityId: submission.id
  });
  if (alreadySent) {
    console.log(`[EmailService] Duplicate submission approved email prevented for submission ${submission.id}`);
    return { success: true, duplicatePrevented: true };
  }

  const xpEarned = pointsAwarded.xp ?? pointsAwarded.points ?? 0;
  const currentLevel = pointsAwarded.level?.currentLevel ?? pointsAwarded.level?.level ?? user.level ?? 1;
  const levelName = pointsAwarded.level?.levelName ?? pointsAwarded.level?.name ?? 'Verified Creator';

  const html = getSubmissionApprovedTemplate({
    name: user.name,
    submissionId: submission.id,
    platform: submission.platform || 'INSTAGRAM',
    actionType: submission.actionType || 'LIKE',
    xpAwarded: xpEarned,
    approvalDate: new Date(),
    currentLevel,
    levelName
  });

  return sendEmail({
    to: user.email,
    subject: 'Your submission has been approved! 🎉',
    html,
    templateName: 'SUBMISSION_APPROVED',
    entityId: submission.id
  });
};

/**
 * 6. Submission Rejected Email
 * Triggers when Admin rejects a submission.
 * Subject: "Your submission was rejected."
 * Includes: Submission ID, Platform, Action, Reason if the admin provided one, Date.
 * NEVER exposes internal admin notes.
 */
const sendSubmissionRejectedEmail = async (user, submission, reason = '') => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  if (!submission) return { success: false, error: 'Submission is required' };

  // 1. Check user email preferences
  if (user.id) {
    try {
      const prefs = await getUserEmailPreferences(user.id);
      if (prefs.submissionUpdates === false) {
        console.log(`[EmailService] Submission rejected email skipped for user ${user.id} (submissionUpdates disabled).`);
        return { success: true, skipped: true, reason: 'PREFERENCE_DISABLED' };
      }
    } catch (e) {
      // Non-fatal
    }
  }

  // 2. Prevent duplicate emails on retry
  const alreadySent = await hasSentEmail({
    recipient: user.email,
    template: 'SUBMISSION_REJECTED',
    entityId: submission.id
  });
  if (alreadySent) {
    console.log(`[EmailService] Duplicate submission rejected email prevented for submission ${submission.id}`);
    return { success: true, duplicatePrevented: true };
  }

  const html = getSubmissionRejectedTemplate({
    name: user.name,
    submissionId: submission.id,
    platform: submission.platform || 'INSTAGRAM',
    actionType: submission.actionType || 'LIKE',
    reason: (typeof reason === 'string' ? reason.trim() : '') || '',
    date: new Date()
  });

  return sendEmail({
    to: user.email,
    subject: 'Your submission was rejected.',
    html,
    templateName: 'SUBMISSION_REJECTED',
    entityId: submission.id
  });
};

/**
 * 7. Clarification Request Email
 * Triggers when Admin requests clarification on a submission.
 * Subject: "Additional information is required."
 * Includes: Submission ID, What information is needed, Button: View Submission
 */
const sendClarificationEmail = async (user, submission, clarification = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  if (!submission) return { success: false, error: 'Submission is required' };

  // 1. Check user email preferences
  if (user.id) {
    try {
      const prefs = await getUserEmailPreferences(user.id);
      if (prefs.submissionUpdates === false) {
        console.log(`[EmailService] Clarification email skipped for user ${user.id} (submissionUpdates disabled).`);
        return { success: true, skipped: true, reason: 'PREFERENCE_DISABLED' };
      }
    } catch (e) {
      // Non-fatal
    }
  }

  const message = typeof clarification === 'string' ? clarification : (clarification.message || '');
  const reviewerName = clarification.reviewerName || 'Moderation Team';
  const clarificationKey = clarification.id ? `${submission.id}-${clarification.id}` : submission.id;

  // 2. Prevent duplicate emails on retry
  const alreadySent = await hasSentEmail({
    recipient: user.email,
    template: 'CLARIFICATION_REQUEST',
    entityId: clarificationKey
  });
  if (alreadySent) {
    console.log(`[EmailService] Duplicate clarification email prevented for submission ${submission.id}`);
    return { success: true, duplicatePrevented: true };
  }

  const html = getClarificationTemplate({
    name: user.name,
    submissionId: submission.id,
    platform: submission.platform || 'INSTAGRAM',
    actionType: submission.actionType || 'LIKE',
    message,
    reviewerName
  });

  return sendEmail({
    to: user.email,
    subject: 'Additional information is required.',
    html,
    templateName: 'CLARIFICATION_REQUEST',
    entityId: clarificationKey
  });
};

/**
 * 8. XP Earned Email
 * Triggers when XP is successfully awarded.
 * Only send this after the XP transaction succeeds.
 * Subject: "⚡ You earned XP!"
 * Includes: +XP, Reason, Total XP, Current Level
 */
const sendXPEarnedEmail = async (user, xpDetails = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };

  // 1. Check user email preferences
  if (user.id) {
    try {
      const prefs = await getUserEmailPreferences(user.id);
      if (prefs.gamificationUpdates === false) {
        console.log(`[EmailService] XP earned email skipped for user ${user.id} (gamificationUpdates disabled).`);
        return { success: true, skipped: true, reason: 'PREFERENCE_DISABLED' };
      }
    } catch (e) {
      // Non-fatal
    }
  }

  const xpAmount = xpDetails.xp ?? xpDetails.points ?? 0;
  const totalXP = xpDetails.totalXP ?? xpDetails.newTotalXP ?? user.totalXP ?? 0;
  const currentLevel = xpDetails.currentLevel ?? xpDetails.level?.currentLevel ?? user.level ?? 1;
  const reason = xpDetails.reason || (xpDetails.actionType ? `Approved ${xpDetails.actionType}` : 'Verified Activity');
  const entityId = xpDetails.transactionId || xpDetails.submissionId || `${user.id}-${totalXP}`;

  // 2. Prevent duplicate emails on retry
  if (entityId) {
    const alreadySent = await hasSentEmail({
      recipient: user.email,
      template: 'XP_EARNED',
      entityId: String(entityId)
    });
    if (alreadySent) {
      console.log(`[EmailService] Duplicate XP earned email prevented for entity ${entityId}`);
      return { success: true, duplicatePrevented: true };
    }
  }

  const html = getXPEarnedTemplate({
    name: user.name,
    xpAmount,
    reason,
    totalXP,
    currentLevel
  });

  return sendEmail({
    to: user.email,
    subject: '⚡ You earned XP!',
    html,
    templateName: 'XP_EARNED',
    entityId: String(entityId)
  });
};

const sendXPNotificationEmail = sendXPEarnedEmail;

/**
 * 9. Level Up Email
 * Triggers when user's level changes.
 * Subject: "🏆 LEVEL UP!"
 * Includes: Previous Level, New Level, Level Name, Current XP
 * Prevents duplicate level-up emails!
 */
const sendLevelUpEmail = async (user, levelDetails = {}) => {
  if (!user || !user.email) return { success: false, error: 'User email is required' };

  // 1. Check user email preferences
  if (user.id) {
    try {
      const prefs = await getUserEmailPreferences(user.id);
      if (prefs.gamificationUpdates === false) {
        console.log(`[EmailService] Level up email skipped for user ${user.id} (gamificationUpdates disabled).`);
        return { success: true, skipped: true, reason: 'PREFERENCE_DISABLED' };
      }
    } catch (e) {
      // Non-fatal
    }
  }

  const previousLevel = levelDetails.previousLevel ?? (levelDetails.currentLevel ? Math.max(1, levelDetails.currentLevel - 1) : 1);
  const newLevel = levelDetails.newLevel ?? levelDetails.currentLevel ?? levelDetails.level ?? 2;
  const levelName = levelDetails.levelName ?? levelDetails.name ?? 'Active Creator';
  const totalXP = levelDetails.totalXP ?? levelDetails.currentXP ?? user.totalXP ?? 0;
  const icon = levelDetails.icon ?? levelDetails.badge ?? '🏆';

  // 2. Deduplication: strictly prevent duplicate level-up emails for this user & level
  const entityId = `${user.id}-level-${newLevel}`;
  const alreadySent = await hasSentEmail({
    recipient: user.email,
    template: 'LEVEL_UP',
    entityId
  });
  if (alreadySent) {
    console.log(`[EmailService] Duplicate level-up email prevented for user ${user.email} (Level ${newLevel})`);
    return { success: true, duplicatePrevented: true };
  }

  const html = getLevelUpTemplate({
    name: user.name,
    previousLevel,
    newLevel,
    levelName,
    totalXP,
    icon
  });

  return sendEmail({
    to: user.email,
    subject: '🏆 LEVEL UP!',
    html,
    templateName: 'LEVEL_UP',
    entityId
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
  sendEmailChangedNotification,
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
  sendSubmissionReceivedEmail,
  sendSubmissionApprovedEmail,
  sendSubmissionRejectedEmail,
  sendClarificationEmail,
  sendXPEarnedEmail,
  sendXPNotificationEmail,
  sendLevelUpEmail,
  sendTestEmail,
  getMailSystemStatus,
  isEmailConfigured
};
