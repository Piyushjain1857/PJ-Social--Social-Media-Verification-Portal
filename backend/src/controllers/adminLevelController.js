const { prisma, checkDatabaseConnection } = require('../config/db');
const {
  getActiveLevels,
  buildLevelThresholds,
  invalidateLevelsCache
} = require('../services/levelService');
const { recordAuditLog } = require('../services/auditLogService');
const { LEVEL_NAMES } = require('../../prisma/seedLevels');

/**
 * Helper to fetch all levels (active + inactive) sorted by levelNumber ASC
 */
const getAllLevelsFromDb = async () => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    return await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' }
    });
  }
  return [];
};

/**
 * GET /api/admin/levels
 * Protected: SUPER_ADMIN ONLY
 * Returns all configured levels enriched with dynamic cumulative thresholds.
 */
const listLevels = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const levels = await getAllLevelsFromDb();

    // Sort all levels (active + inactive) by levelNumber for display
    const sorted = [...levels].sort(
      (a, b) => (parseInt(a.levelNumber, 10) || 0) - (parseInt(b.levelNumber, 10) || 0)
    );

    // Compute cumulative XP thresholds using ONLY active levels (for XP range display)
    let runningXP = 0;
    const activeThresholds = {};
    sorted
      .filter((l) => l.isActive !== false)
      .forEach((l) => {
        const reqXP = Math.max(1, parseInt(l.xpRequired, 10) || 100);
        activeThresholds[l.id] = {
          cumulativeStartXP: runningXP,
          cumulativeEndXP: runningXP + reqXP - 1
        };
        runningXP += reqXP;
      });

    // Enrich ALL levels (including inactive) with cumulative XP where available
    const enriched = sorted.map((l) => {
      const reqXP = Math.max(1, parseInt(l.xpRequired, 10) || 100);
      const thresholdInfo = activeThresholds[l.id] || {
        cumulativeStartXP: null,
        cumulativeEndXP: null
      };
      return {
        ...l,
        levelNumber: parseInt(l.levelNumber, 10),
        xpRequired: reqXP,
        ...thresholdInfo
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};


/**
 * GET /api/admin/levels/configuration
 * Protected: SUPER_ADMIN ONLY
 * Returns high-level telemetry and summary of the level engine:
 * Total Levels, Active Levels, Highest Level, Total XP Required (XP to Max Level)
 */
const getLevelConfiguration = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const levels = await getAllLevelsFromDb();
    const activeLevels = levels.filter(l => l.isActive);
    const thresholds = buildLevelThresholds(activeLevels);

    const totalLevels = levels.length;
    const activeLevelsCount = activeLevels.length;
    const highestLevel = activeLevels.length > 0
      ? Math.max(...activeLevels.map(l => l.levelNumber))
      : (levels.length > 0 ? Math.max(...levels.map(l => l.levelNumber)) : 0);

    const totalXPRequired = activeLevels.reduce((sum, l) => sum + (l.xpRequired || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalLevels,
        activeLevels: activeLevelsCount,
        highestLevel,
        totalXPRequired,
        xpToMaxLevel: totalXPRequired
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/levels
 * Protected: SUPER_ADMIN ONLY
 * Creates a new level.
 */
const createLevel = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const { levelNumber, name, xpRequired, icon, description, isActive = true } = req.body;

    const parsedLevelNumber = parseInt(levelNumber, 10);
    const parsedXP = parseInt(xpRequired, 10);

    // Validation 1: Level Number
    if (isNaN(parsedLevelNumber) || parsedLevelNumber < 1) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_LEVEL_NUMBER',
        message: 'Level number must be a positive integer greater than or equal to 1.'
      });
    }

    // Validation 2: Level Name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: 'NAME_REQUIRED',
        message: 'Level name is required and cannot be empty.'
      });
    }

    // Validation 3: XP Required
    if (isNaN(parsedXP) || parsedXP < 1) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_XP_REQUIRED',
        message: 'XP requirement must be a positive integer greater than 0.'
      });
    }

    const cleanName = name.trim();
    const cleanDescription = description ? description.trim() : `Level ${parsedLevelNumber} achievement`;
    const cleanIcon = icon ? icon.trim() : '⭐';

    // Check duplicate levelNumber
    const existing = await prisma.level.findUnique({
      where: { levelNumber: parsedLevelNumber }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_LEVEL_NUMBER',
        message: `Level number ${parsedLevelNumber} already exists (${existing.name}). Choose a different level number or reorder existing levels.`
      });
    }

    const newLevel = await prisma.level.create({
      data: {
        levelNumber: parsedLevelNumber,
        name: cleanName,
        xpRequired: parsedXP,
        icon: cleanIcon,
        description: cleanDescription,
        isActive: Boolean(isActive)
      }
    });

    invalidateLevelsCache();

    // Record Audit Log
    await recordAuditLog({
      actor: req.user.email || req.user.id,
      action: 'LEVEL_CREATED',
      entity: 'Level',
      entityId: newLevel.id,
      details: `Super Admin created Level ${parsedLevelNumber} ("${cleanName}", ${parsedXP} XP)`,
      metadata: {
        levelNumber: parsedLevelNumber,
        name: cleanName,
        xpRequired: parsedXP,
        icon: cleanIcon
      }
    });

    const allLevels = await getAllLevelsFromDb();
    const thresholds = buildLevelThresholds(allLevels);
    const createdWithThreshold = thresholds.find(t => t.id === newLevel.id) || newLevel;

    return res.status(201).json({
      success: true,
      message: `Level ${parsedLevelNumber} ("${cleanName}") created successfully.`,
      data: createdWithThreshold
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/levels/:id
 * Protected: SUPER_ADMIN ONLY
 * Modifies an existing level: name, xpRequired, icon, description, active status.
 */
const updateLevel = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const { id } = req.params;
    const { levelNumber, name, xpRequired, icon, description, isActive } = req.body;

    const existing = await prisma.level.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'LEVEL_NOT_FOUND',
        message: 'Level not found.'
      });
    }

    const updates = {};
    const auditChanges = [];

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          code: 'NAME_REQUIRED',
          message: 'Level name cannot be empty.'
        });
      }
      updates.name = name.trim();
      if (updates.name !== existing.name) {
        auditChanges.push(`name from "${existing.name}" to "${updates.name}"`);
      }
    }

    if (xpRequired !== undefined) {
      const parsedXP = parseInt(xpRequired, 10);
      if (isNaN(parsedXP) || parsedXP < 1) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_XP_REQUIRED',
          message: 'XP requirement must be a positive integer greater than 0.'
        });
      }
      updates.xpRequired = parsedXP;
      if (parsedXP !== existing.xpRequired) {
        auditChanges.push(`XP requirement from ${existing.xpRequired} to ${parsedXP}`);
      }
    }

    if (levelNumber !== undefined) {
      const parsedLevelNum = parseInt(levelNumber, 10);
      if (isNaN(parsedLevelNum) || parsedLevelNum < 1) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_LEVEL_NUMBER',
          message: 'Level number must be an integer >= 1.'
        });
      }
      if (parsedLevelNum !== existing.levelNumber) {
        const collision = await prisma.level.findUnique({ where: { levelNumber: parsedLevelNum } });
        if (collision && collision.id !== id) {
          return res.status(400).json({
            success: false,
            code: 'DUPLICATE_LEVEL_NUMBER',
            message: `Level number ${parsedLevelNum} is already used by "${collision.name}".`
          });
        }
        updates.levelNumber = parsedLevelNum;
        auditChanges.push(`level number from ${existing.levelNumber} to ${parsedLevelNum}`);
      }
    }

    if (icon !== undefined) {
      updates.icon = icon ? icon.trim() : '⭐';
      if (updates.icon !== existing.icon) {
        auditChanges.push(`icon from "${existing.icon}" to "${updates.icon}"`);
      }
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
      if (updates.isActive !== existing.isActive) {
        auditChanges.push(`status to ${updates.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      }
    }

    const updated = await prisma.level.update({
      where: { id },
      data: updates
    });

    invalidateLevelsCache();

    // Record Audit Log
    const changesText = auditChanges.length > 0 ? auditChanges.join(', ') : 'no critical fields changed';
    await recordAuditLog({
      actor: req.user.email || req.user.id,
      action: 'LEVEL_UPDATED',
      entity: 'Level',
      entityId: id,
      details: `Super Admin changed Level ${existing.levelNumber} ${changesText}`,
      metadata: {
        previous: {
          levelNumber: existing.levelNumber,
          name: existing.name,
          xpRequired: existing.xpRequired,
          isActive: existing.isActive
        },
        current: {
          levelNumber: updated.levelNumber,
          name: updated.name,
          xpRequired: updated.xpRequired,
          isActive: updated.isActive
        }
      }
    });

    const allLevels = await getAllLevelsFromDb();
    const thresholds = buildLevelThresholds(allLevels);
    const updatedWithThreshold = thresholds.find(t => t.id === id) || updated;

    return res.status(200).json({
      success: true,
      message: `Level ${updated.levelNumber} updated successfully.`,
      data: updatedWithThreshold
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/levels/:id/status
 * Protected: SUPER_ADMIN ONLY
 * Toggle active/inactive status of a level.
 */
const updateLevelStatus = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        code: 'BOOLEAN_REQUIRED',
        message: 'isActive must be a boolean (true or false).'
      });
    }

    const existing = await prisma.level.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'LEVEL_NOT_FOUND',
        message: 'Level not found.'
      });
    }

    const updated = await prisma.level.update({
      where: { id },
      data: { isActive }
    });

    invalidateLevelsCache();

    // Record Audit Log
    await recordAuditLog({
      actor: req.user.email || req.user.id,
      action: isActive ? 'LEVEL_ACTIVATED' : 'LEVEL_DEACTIVATED',
      entity: 'Level',
      entityId: id,
      details: `Super Admin ${isActive ? 'activated' : 'deactivated'} Level ${existing.levelNumber} ("${existing.name}")`,
      metadata: {
        levelNumber: existing.levelNumber,
        name: existing.name,
        isActive
      }
    });

    return res.status(200).json({
      success: true,
      message: `Level ${existing.levelNumber} is now ${isActive ? 'Active' : 'Inactive'}.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/levels/:id
 * Protected: SUPER_ADMIN ONLY
 * Safely handles level deletion.
 * Provides protection: warns if users have reached or would be affected,
 * and prefers deactivation over permanent destructive deletion.
 */
const deleteLevel = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const { id } = req.params;
    const { force = false, deactivateInstead = false } = req.body || {};

    const existing = await prisma.level.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'LEVEL_NOT_FOUND',
        message: 'Level not found.'
      });
    }

    // If caller opted for safe deactivation:
    if (deactivateInstead) {
      const deactivated = await prisma.level.update({
        where: { id },
        data: { isActive: false }
      });
      invalidateLevelsCache();

      await recordAuditLog({
        actor: req.user.email || req.user.id,
        action: 'LEVEL_DEACTIVATED',
        entity: 'Level',
        entityId: id,
        details: `Super Admin deactivated Level ${existing.levelNumber} instead of deleting`,
        metadata: { levelNumber: existing.levelNumber, name: existing.name }
      });

      return res.status(200).json({
        success: true,
        message: `Level ${existing.levelNumber} was safely deactivated to preserve historical user progression.`,
        data: deactivated
      });
    }

    // Safety Check: Check if users have achieved this level or higher
    const activeLevels = await getActiveLevels();
    const thresholds = buildLevelThresholds(activeLevels);
    const targetThreshold = thresholds.find(t => t.id === id);

    let usersAffectedCount = 0;
    if (targetThreshold) {
      usersAffectedCount = await prisma.user.count({
        where: {
          totalXP: { gte: targetThreshold.cumulativeStartXP }
        }
      });
    }

    if (usersAffectedCount > 0 && !force) {
      return res.status(409).json({
        success: false,
        code: 'SAFE_DELETION_WARNING',
        message: `Cannot safely delete Level ${existing.levelNumber} ("${existing.name}"): ${usersAffectedCount} user(s) have reached or progressed past this level. Deactivate this level instead to preserve historical records, or pass force: true to permanently delete.`,
        usersAffected: usersAffectedCount,
        canDeactivate: true,
        levelNumber: existing.levelNumber
      });
    }

    // Perform deletion
    await prisma.level.delete({ where: { id } });
    invalidateLevelsCache();

    // Record Audit Log
    await recordAuditLog({
      actor: req.user.email || req.user.id,
      action: 'LEVEL_DELETED',
      entity: 'Level',
      entityId: id,
      details: `Super Admin permanently deleted Level ${existing.levelNumber} ("${existing.name}")`,
      metadata: {
        levelNumber: existing.levelNumber,
        name: existing.name,
        xpRequired: existing.xpRequired
      }
    });

    return res.status(200).json({
      success: true,
      message: `Level ${existing.levelNumber} ("${existing.name}") deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/levels/generate
 * Protected: SUPER_ADMIN ONLY
 * Bulk generates / reconfigures levels.
 *
 * Example:
 * Number of Levels: 50
 * XP Per Level: 250
 *
 * Safety:
 * - Does NOT modify existing user XP!
 * - Confirms before changing level structure.
 * - If decreasing count: deactivates or truncates safely.
 */
const generateLevels = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const {
      count = 50,
      xpPerLevel = 250,
      confirmModify = false,
      actionOnDecrease = 'deactivate' // 'deactivate' (safe default) or 'delete'
    } = req.body;

    const targetCount = parseInt(count, 10);
    const targetXP = parseInt(xpPerLevel, 10);

    if (isNaN(targetCount) || targetCount < 1 || targetCount > 200) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_COUNT',
        message: 'Number of levels must be between 1 and 200.'
      });
    }

    if (isNaN(targetXP) || targetXP < 1) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_XP',
        message: 'XP per level must be a positive integer greater than 0.'
      });
    }

    const existingLevels = await getAllLevelsFromDb();

    // Confirmation safety check if levels already exist and confirmModify is false
    if (existingLevels.length > 0 && !confirmModify) {
      return res.status(400).json({
        success: false,
        code: 'CONFIRMATION_REQUIRED',
        message: 'This will modify the existing level structure. Existing user XP will remain unchanged.',
        currentCount: existingLevels.length,
        targetCount,
        xpPerLevel: targetXP
      });
    }

    // Default title generator
    const getLevelTitle = (num) => {
      const match = LEVEL_NAMES.find(l => l.level === num);
      if (match) return match.name;
      if (num === 1) return 'Beginner';
      if (num === 2) return 'Starter';
      if (num === 3) return 'Explorer';
      if (num === 4) return 'Active';
      if (num === 5) return 'Contributor';
      return `Level ${num}`;
    };

    const getLevelIcon = (num) => {
      const match = LEVEL_NAMES.find(l => l.level === num);
      if (match) return match.icon;
      if (num >= 45) return '👑';
      if (num >= 30) return '💎';
      if (num >= 20) return '🏆';
      if (num >= 10) return '🚀';
      if (num >= 5) return '⚡';
      return '🌱';
    };

    // 1. Upsert levels from 1 to targetCount
    for (let i = 1; i <= targetCount; i++) {
      const existing = existingLevels.find(l => l.levelNumber === i);
      const name = existing ? existing.name : getLevelTitle(i);
      const icon = existing ? (existing.icon || getLevelIcon(i)) : getLevelIcon(i);

      await prisma.level.upsert({
        where: { levelNumber: i },
        update: {
          xpRequired: targetXP,
          isActive: true
        },
        create: {
          levelNumber: i,
          name,
          xpRequired: targetXP,
          icon,
          description: `Level ${i} (${name}) — ${targetXP} XP required to advance`,
          isActive: true
        }
      });
    }

    // 2. Handle levels above targetCount if decreasing (e.g. 50 -> 30)
    if (existingLevels.length > targetCount) {
      const excessLevels = existingLevels.filter(l => l.levelNumber > targetCount);
      for (const ex of excessLevels) {
        if (actionOnDecrease === 'delete') {
          await prisma.level.delete({ where: { id: ex.id } });
        } else {
          await prisma.level.update({
            where: { id: ex.id },
            data: { isActive: false }
          });
        }
      }
    }

    invalidateLevelsCache();

    // Record Audit Log
    await recordAuditLog({
      actor: req.user.email || req.user.id,
      action: 'LEVELS_GENERATED',
      entity: 'Level',
      entityId: `levels-1-${targetCount}`,
      details: `Super Admin generated ${targetCount} levels (${targetXP} XP each)`,
      metadata: {
        count: targetCount,
        xpPerLevel: targetXP,
        previousCount: existingLevels.length,
        actionOnDecrease
      }
    });

    const allUpdatedLevels = await getAllLevelsFromDb();
    const thresholds = buildLevelThresholds(allUpdatedLevels);

    return res.status(200).json({
      success: true,
      message: `Successfully generated ${targetCount} levels with ${targetXP} XP per level. User XP balances remain untouched.`,
      count: thresholds.length,
      data: thresholds
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listLevels,
  getLevelConfiguration,
  createLevel,
  updateLevel,
  updateLevelStatus,
  deleteLevel,
  generateLevels
};
