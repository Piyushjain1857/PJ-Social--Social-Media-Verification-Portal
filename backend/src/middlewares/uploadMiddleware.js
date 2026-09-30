const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const {
  saveScreenshot,
  resolveScreenshotPath,
  UPLOAD_DIR
} = require('../services/storageService');

// ─── Allowed types ─────────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Map MIME → canonical extension (we choose the extension — never trust the client's)
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Magic-byte signatures for MIME validation independent of Content-Type header
// Each entry: [byteOffset, expectedBytes (hex)]
const MAGIC_BYTES = {
  'image/jpeg': { offset: 0, magic: 'ffd8ff' },
  'image/png':  { offset: 0, magic: '89504e47' },
  'image/webp': { offset: 8, magic: '57454250' },   // "WEBP" at byte 8
  'image/gif':  { offset: 0, magic: '474946' },     // "GIF"
};

// 5 MB limit
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Verify the first bytes of the file buffer match its declared MIME type.
 * Protects against clients lying about Content-Type.
 * @param {Buffer} buffer - First bytes of the file
 * @param {string} mimetype - Claimed MIME type
 * @returns {boolean}
 */
const validateMagicBytes = (buffer, mimetype) => {
  const sig = MAGIC_BYTES[mimetype];
  if (!sig) return false;

  const actual = buffer
    .slice(sig.offset, sig.offset + sig.magic.length / 2)
    .toString('hex');
  return actual === sig.magic;
};

// ─── Multer memory storage (read bytes before writing) ────────────────────────
// We use memoryStorage first to validate magic bytes, then write manually.
const memStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    const err = new Error(
      `Invalid file type "${mime}". Only JPEG, PNG, WebP, and GIF screenshots are accepted.`
    );
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }
  cb(null, true);
};

const upload = multer({
  storage: memStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

/**
 * Generate a cryptographically unique, safe filename.
 * Never uses the original filename. Never exposes user data in the filename.
 * Format: evidence-<timestamp>-<16 random hex chars><.ext>
 * @param {string} mimetype
 * @returns {string}
 */
const generateSafeFilename = (mimetype) => {
  const ext = MIME_TO_EXT[mimetype] || '.bin';
  const randomHex = crypto.randomBytes(8).toString('hex');
  const ts = Date.now();
  return `evidence-${ts}-${randomHex}${ext}`;
};



/**
 * Express middleware that:
 *  1. Parses the multipart file using Multer (memory storage)
 *  2. Validates magic bytes against declared MIME type
 *  3. Writes to disk with a safe generated filename
 *  4. Attaches { filename, screenshotPath, screenshotRef } to req.uploadedFile
 *
 * Designed to be swappable: replace step 3 with a cloud SDK call.
 */
const uploadEvidenceScreenshot = (req, res, next) => {
  const single = upload.single('screenshot');

  single(req, res, (err) => {
    if (err) {
      // Multer-specific errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            message: `Screenshot exceeds the 5 MB maximum size limit.`,
          });
        }
        return res.status(400).json({
          success: false,
          code: 'UPLOAD_ERROR',
          message: `File upload error: ${err.message}`,
        });
      }

      // Custom filter errors
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          code: 'INVALID_FILE_TYPE',
          message: err.message,
        });
      }

      return res.status(400).json({
        success: false,
        code: 'UPLOAD_ERROR',
        message: err.message || 'Failed to process uploaded screenshot.',
      });
    }

    // No file? That's fine — controller validates presence.
    if (!req.file) {
      return next();
    }

    const mime = req.file.mimetype.toLowerCase();

    // ── Magic-byte validation ─────────────────────────────────────────────────
    if (!validateMagicBytes(req.file.buffer, mime)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FILE_CONTENT',
        message: `File content does not match declared type "${mime}". Please upload a genuine image file.`,
      });
    }

    // ── Persist with safe generated filename via storage service ─────────────
    const safeFilename = generateSafeFilename(mime);
    saveScreenshot(safeFilename, req.file.buffer, mime)
      .then((saved) => {
        // Attach to req so controller can use it.
        // screenshotRef is the value stored in the DB — opaque, no server path.
        req.uploadedFile = {
          filename: saved.filename,
          originalMime: mime,
          sizeBytes: req.file.size,
          screenshotRef: saved.screenshotRef,
        };

        // Also attach to req.file for compatibility
        req.file.filename = saved.filename;
        req.file.screenshotRef = saved.screenshotRef;

        next();
      })
      .catch((writeErr) => {
        console.error('[Upload] Failed to save screenshot:', writeErr.message);
        return res.status(500).json({
          success: false,
          code: 'UPLOAD_WRITE_ERROR',
          message: 'Failed to save uploaded screenshot. Please try again.',
        });
      });
  });
};



module.exports = {
  uploadEvidenceScreenshot,
  resolveScreenshotPath,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  UPLOAD_DIR,
};
