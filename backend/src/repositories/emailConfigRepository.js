/**
 * Email Configuration & System Settings Repository
 * Social Media Activity Verification Portal
 * 
 * Manages Super Admin email template modifications, global event toggles,
 * and security constraints.
 */

const { prisma, checkDatabaseConnection } = require('../config/db');

// Security-critical templates that MUST remain safe and cannot be disabled
const SECURITY_CRITICAL_TEMPLATES = new Set([
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'EMAIL_CHANGED'
]);

const DEFAULT_TEMPLATES = [
  {
    templateKey: 'ACCOUNT_CREATED',
    name: 'Account Created Welcome',
    subject: 'Welcome to PJ Social Media Verification Portal 🎉',
    category: 'SECURITY',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'LOGIN_NOTIFICATION',
    name: 'Login Notification Alert',
    subject: 'Security Alert: New Sign-in to Your Account',
    category: 'SECURITY',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'PASSWORD_RESET',
    name: 'Password Reset',
    subject: 'Password Reset Request - Secure Verification Link',
    category: 'SECURITY',
    isEnabled: true,
    isSecurity: true, // CANNOT BE DISABLED
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'PASSWORD_CHANGED',
    name: 'Password Changed Confirmation',
    subject: 'Your Account Password Has Been Changed',
    category: 'SECURITY',
    isEnabled: true,
    isSecurity: true, // CANNOT BE DISABLED
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'EMAIL_CHANGED',
    name: 'Email Changed Notice',
    subject: 'Security Alert: Your Portal Account Email Has Changed',
    category: 'SECURITY',
    isEnabled: true,
    isSecurity: true, // CANNOT BE DISABLED
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'SUBMISSION_RECEIVED',
    name: 'Submission Received',
    subject: 'Your submission has been received.',
    category: 'ACTIVITY',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'SUBMISSION_APPROVED',
    name: 'Submission Approved',
    subject: 'Your submission has been approved! 🎉',
    category: 'ACTIVITY',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'SUBMISSION_REJECTED',
    name: 'Submission Rejected',
    subject: 'Your submission was rejected.',
    category: 'ACTIVITY',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'CLARIFICATION_REQUEST',
    name: 'Clarification Required',
    subject: 'Additional information is required.',
    category: 'ACTIVITY',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'XP_AWARDED',
    name: 'XP Earned',
    subject: '⚡ You earned XP!',
    category: 'GAMIFICATION',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'LEVEL_UP',
    name: 'Level Up Celebration',
    subject: '🏆 LEVEL UP!',
    category: 'GAMIFICATION',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'ANNOUNCEMENTS',
    name: 'Platform Announcements',
    subject: 'Important Announcement - PJ Social Media Verification Portal',
    category: 'SYSTEM',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  },
  {
    templateKey: 'TEST_EMAIL',
    name: 'Super Admin Operational Test',
    subject: 'Operational Test: PJ Social Media Verification Portal Transactional Email System',
    category: 'SYSTEM',
    isEnabled: true,
    isSecurity: false,
    customHeader: null,
    customNotes: null
  }
];

const DEFAULT_SYSTEM_SETTINGS = {
  key: 'GLOBAL_EVENT_TOGGLES',
  loginNotification: true,
  submissionApproval: true,
  submissionRejection: true,
  xpEarned: true,
  levelUp: true,
  announcements: true,
  passwordReset: true,      // Immutable
  passwordChanged: true,    // Immutable
  accountSecurity: true     // Immutable
};

// In-memory fallbacks
let inMemoryTemplateConfigs = new Map(DEFAULT_TEMPLATES.map(t => [t.templateKey, { ...t, updatedAt: new Date() }]));
let inMemorySystemSettings = { ...DEFAULT_SYSTEM_SETTINGS, updatedAt: new Date() };

/**
 * Sanitizes input strings by stripping script tags, javascript: protocols, and event handlers
 */
const sanitizeText = (str) => {
  if (!str || typeof str !== 'string') return null;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .substring(0, 1000);
};

/**
 * Retrieve all email template configurations
 */
const getTemplateConfigs = async () => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailTemplateConfig) {
    try {
      const records = await prisma.emailTemplateConfig.findMany({
        orderBy: { category: 'asc' }
      });

      if (records.length === 0) {
        // Seed default template configurations
        await prisma.emailTemplateConfig.createMany({
          data: DEFAULT_TEMPLATES,
          skipDuplicates: true
        });
        return await prisma.emailTemplateConfig.findMany({
          orderBy: { category: 'asc' }
        });
      }

      return records;
    } catch (err) {
      console.warn('[EmailConfigRepo] Prisma getTemplateConfigs failed:', err.message);
    }
  }

  return Array.from(inMemoryTemplateConfigs.values());
};

/**
 * Update an email template configuration
 */
const updateTemplateConfig = async (templateKey, updates = {}, actor = 'SUPER_ADMIN') => {
  const cleanKey = (templateKey || '').toUpperCase().trim();
  const isSecurity = SECURITY_CRITICAL_TEMPLATES.has(cleanKey);

  // Security critical templates cannot be disabled
  const targetIsEnabled = isSecurity ? true : (updates.isEnabled !== undefined ? Boolean(updates.isEnabled) : undefined);
  const cleanSubject = updates.subject ? sanitizeText(updates.subject) : undefined;
  const cleanHeader = updates.customHeader !== undefined ? sanitizeText(updates.customHeader) : undefined;
  const cleanNotes = updates.customNotes !== undefined ? sanitizeText(updates.customNotes) : undefined;

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailTemplateConfig) {
    try {
      const data = {
        updatedBy: actor,
        updatedAt: new Date()
      };
      if (cleanSubject !== undefined) data.subject = cleanSubject;
      if (targetIsEnabled !== undefined) data.isEnabled = targetIsEnabled;
      if (cleanHeader !== undefined) data.customHeader = cleanHeader;
      if (cleanNotes !== undefined) data.customNotes = cleanNotes;

      return await prisma.emailTemplateConfig.upsert({
        where: { templateKey: cleanKey },
        update: data,
        create: {
          templateKey: cleanKey,
          name: cleanKey.replace(/_/g, ' '),
          subject: cleanSubject || cleanKey,
          category: isSecurity ? 'SECURITY' : 'ACTIVITY',
          isEnabled: isSecurity ? true : (targetIsEnabled !== undefined ? targetIsEnabled : true),
          isSecurity,
          customHeader: cleanHeader,
          customNotes: cleanNotes,
          updatedBy: actor
        }
      });
    } catch (err) {
      console.warn('[EmailConfigRepo] Prisma updateTemplateConfig failed:', err.message);
    }
  }

  // Memory fallback
  const existing = inMemoryTemplateConfigs.get(cleanKey) || {
    templateKey: cleanKey,
    name: cleanKey.replace(/_/g, ' '),
    subject: cleanSubject || cleanKey,
    category: isSecurity ? 'SECURITY' : 'ACTIVITY',
    isEnabled: true,
    isSecurity
  };

  const updated = {
    ...existing,
    ...(cleanSubject !== undefined && { subject: cleanSubject }),
    ...(targetIsEnabled !== undefined && { isEnabled: isSecurity ? true : targetIsEnabled }),
    ...(cleanHeader !== undefined && { customHeader: cleanHeader }),
    ...(cleanNotes !== undefined && { customNotes: cleanNotes }),
    updatedBy: actor,
    updatedAt: new Date()
  };

  inMemoryTemplateConfigs.set(cleanKey, updated);
  return updated;
};

/**
 * Retrieve global email system settings & event toggles
 */
const getSystemSettings = async () => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailSystemSetting) {
    try {
      let setting = await prisma.emailSystemSetting.findUnique({
        where: { key: 'GLOBAL_EVENT_TOGGLES' }
      });

      if (!setting) {
        setting = await prisma.emailSystemSetting.create({
          data: DEFAULT_SYSTEM_SETTINGS
        });
      }

      // Security-critical events must ALWAYS be true
      return {
        ...setting,
        passwordReset: true,
        passwordChanged: true,
        accountSecurity: true
      };
    } catch (err) {
      console.warn('[EmailConfigRepo] Prisma getSystemSettings failed:', err.message);
    }
  }

  return {
    ...inMemorySystemSettings,
    passwordReset: true,
    passwordChanged: true,
    accountSecurity: true
  };
};

/**
 * Update global email system settings & event toggles
 */
const updateSystemSettings = async (updates = {}, actor = 'SUPER_ADMIN') => {
  const data = {
    updatedBy: actor,
    updatedAt: new Date(),
    // Security critical events CANNOT be disabled
    passwordReset: true,
    passwordChanged: true,
    accountSecurity: true
  };

  if (updates.loginNotification !== undefined) data.loginNotification = Boolean(updates.loginNotification);
  if (updates.submissionApproval !== undefined) data.submissionApproval = Boolean(updates.submissionApproval);
  if (updates.submissionRejection !== undefined) data.submissionRejection = Boolean(updates.submissionRejection);
  if (updates.xpEarned !== undefined) data.xpEarned = Boolean(updates.xpEarned);
  if (updates.levelUp !== undefined) data.levelUp = Boolean(updates.levelUp);
  if (updates.announcements !== undefined) data.announcements = Boolean(updates.announcements);

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma?.emailSystemSetting) {
    try {
      return await prisma.emailSystemSetting.upsert({
        where: { key: 'GLOBAL_EVENT_TOGGLES' },
        update: data,
        create: {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...data
        }
      });
    } catch (err) {
      console.warn('[EmailConfigRepo] Prisma updateSystemSettings failed:', err.message);
    }
  }

  inMemorySystemSettings = {
    ...inMemorySystemSettings,
    ...data
  };
  return { ...inMemorySystemSettings };
};

module.exports = {
  getTemplateConfigs,
  updateTemplateConfig,
  getSystemSettings,
  updateSystemSettings,
  SECURITY_CRITICAL_TEMPLATES,
  DEFAULT_TEMPLATES
};
