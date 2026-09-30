const fs = require('fs');
const path = require('path');
const { resolveScreenshotPath } = require('../middlewares/uploadMiddleware');
const { getSubmissionByScreenshotRef } = require('../repositories/submissionRepository');

/**
 * GET /api/uploads/screenshots/:filename
 * Auth-gated screenshot server.
 *
 * Access rules:
 *   - USER: can only view screenshots from their own submissions
 *   - ADMIN / SUPER_ADMIN: can view any screenshot
 *
 * Never exposes the real server path in headers or error messages.
 */
const serveScreenshot = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Resolve to an absolute path — middleware validates the name pattern
    const filePath = resolveScreenshotPath(filename);

    if (!filePath) {
      return res.status(404).json({
        success: false,
        code: 'SCREENSHOT_NOT_FOUND',
        message: 'Screenshot evidence not found.',
      });
    }

    const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    // For normal users: verify the screenshot belongs to one of their submissions
    if (!isStaff) {
      const screenshotRef = `/api/uploads/screenshots/${filename}`;
      const submission = await getSubmissionByScreenshotRef(screenshotRef, req.user.id);

      if (!submission) {
        // Return 404 not 403 — don't reveal whether the file exists to unauthorized callers
        return res.status(404).json({
          success: false,
          code: 'SCREENSHOT_NOT_FOUND',
          message: 'Screenshot evidence not found.',
        });
      }
    }

    // Determine content type from extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Security headers — prevent the browser from running scripts from these images
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="evidence${ext}"`);
    // Cache-control: allow browser to cache for 1 hour but require revalidation
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', () => {
      res.status(404).json({
        success: false,
        code: 'SCREENSHOT_NOT_FOUND',
        message: 'Screenshot evidence not found.',
      });
    });
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = { serveScreenshot };
