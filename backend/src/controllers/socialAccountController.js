const {
  getAllOfficialAccounts,
  getActiveOfficialAccounts,
  getOfficialAccountById,
  createOfficialAccount,
  updateOfficialAccount,
  updateOfficialAccountStatus,
  deleteOfficialAccount
} = require('../repositories/socialAccountRepository');
const {
  VALID_PLATFORMS,
  validateOfficialAccountUrl
} = require('../utils/urlValidator');

/**
 * GET /api/superadmin/social-accounts
 * Protected: SUPER_ADMIN only
 * Returns all official college social media accounts with search, platform, and status filtering.
 */
const listAccounts = async (req, res, next) => {
  try {
    const { platform, status, search } = req.query;
    let accounts = await getAllOfficialAccounts();

    if (platform && platform !== 'ALL') {
      accounts = accounts.filter(a => a.platform === platform.toUpperCase());
    }

    if (status && status !== 'ALL') {
      const wantActive = status.toUpperCase() === 'ACTIVE' || status === 'true';
      accounts = accounts.filter(a => a.isActive === wantActive);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      accounts = accounts.filter(a =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.handle && a.handle.toLowerCase().includes(q)) ||
        (a.accountUrl && a.accountUrl.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q))
      );
    }

    return res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/social-accounts/active
 * Protected: Authenticated users (USER, ADMIN, SUPER_ADMIN)
 * Returns active official accounts that users can target for activity submissions.
 */
const getActiveAccounts = async (req, res, next) => {
  try {
    const { platform } = req.query;
    const accounts = await getActiveOfficialAccounts(platform);

    return res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/superadmin/social-accounts/:id or /api/social-accounts/:id
 * Protected: Authenticated (SUPER_ADMIN or any logged-in user checking account dossier)
 */
const getAccountDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await getOfficialAccountById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Official social media account not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/superadmin/social-accounts
 * Protected: SUPER_ADMIN only
 * Creates a new official college social media account.
 */
const createAccount = async (req, res, next) => {
  try {
    const { name, platform, accountUrl, handle, description, isActive } = req.body;

    // Validate Platform
    if (!platform || !VALID_PLATFORMS.includes(platform.toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PLATFORM',
        message: `Platform is required and must be one of: ${VALID_PLATFORMS.join(', ')}`
      });
    }

    // Validate Account Name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_NAME',
        message: 'Official account name is required (e.g. K.R. Mangalam University Official Instagram).'
      });
    }

    // Validate Account URL & Domain Integrity
    const urlValidation = validateOfficialAccountUrl(platform, accountUrl);
    if (!urlValidation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ACCOUNT_URL',
        message: urlValidation.message
      });
    }

    // Infer or clean handle
    let finalHandle = handle && typeof handle === 'string' && handle.trim()
      ? handle.trim()
      : (urlValidation.inferredHandle || name.trim().toLowerCase().replace(/\s+/g, '_'));

    if (platform.toUpperCase() === 'INSTAGRAM' && !finalHandle.startsWith('@')) {
      finalHandle = `@${finalHandle}`;
    }

    const newAccount = await createOfficialAccount({
      name: name.trim(),
      platform: platform.toUpperCase(),
      accountUrl: urlValidation.cleanUrl,
      handle: finalHandle,
      description: description && typeof description === 'string' ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: 'Official college social media account registered successfully.',
      data: newAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/superadmin/social-accounts/:id
 * Protected: SUPER_ADMIN only
 * Updates details of an official social media account.
 */
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getOfficialAccountById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Official social media account not found.'
      });
    }

    const { name, platform, accountUrl, handle, description, isActive } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_NAME',
          message: 'Account name cannot be empty.'
        });
      }
      updates.name = name.trim();
    }

    const targetPlatform = platform ? platform.toUpperCase() : existing.platform;
    if (platform !== undefined) {
      if (!VALID_PLATFORMS.includes(targetPlatform)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PLATFORM',
          message: `Platform must be one of: ${VALID_PLATFORMS.join(', ')}`
        });
      }
      updates.platform = targetPlatform;
    }

    if (accountUrl !== undefined) {
      const urlValidation = validateOfficialAccountUrl(targetPlatform, accountUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ACCOUNT_URL',
          message: urlValidation.message
        });
      }
      updates.accountUrl = urlValidation.cleanUrl;
    }

    if (handle !== undefined) {
      let cleanH = handle.trim();
      if (targetPlatform === 'INSTAGRAM' && !cleanH.startsWith('@')) {
        cleanH = `@${cleanH}`;
      }
      updates.handle = cleanH;
    }

    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() : '';
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    const updated = await updateOfficialAccount(id, updates);

    return res.status(200).json({
      success: true,
      message: 'Official social media account updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/superadmin/social-accounts/:id/status
 * Protected: SUPER_ADMIN only
 * Activates or deactivates an official social account.
 */
const toggleAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_STATUS',
        message: 'Field isActive (boolean) is required.'
      });
    }

    const existing = await getOfficialAccountById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Official social media account not found.'
      });
    }

    const updated = await updateOfficialAccountStatus(id, Boolean(isActive));

    return res.status(200).json({
      success: true,
      message: `Official social account ${Boolean(isActive) ? 'activated' : 'deactivated'} successfully.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/superadmin/social-accounts/:id
 * Protected: SUPER_ADMIN only
 * Removes an official social account.
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getOfficialAccountById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Official social media account not found.'
      });
    }

    await deleteOfficialAccount(id);

    return res.status(200).json({
      success: true,
      message: `Official social account "${existing.name || existing.handle}" deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAccounts,
  getActiveAccounts,
  getAccountDetails,
  createAccount,
  updateAccount,
  toggleAccountStatus,
  deleteAccount
};
