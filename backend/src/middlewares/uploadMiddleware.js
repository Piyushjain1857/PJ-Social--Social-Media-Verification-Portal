const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure destination upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed image MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif'
]);

// 5 MB maximum file size limit
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    try {
      // Safe extension extraction
      const rawExt = path.extname(file.originalname).toLowerCase();
      const safeExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.png';

      // Clean base name: alphanumeric only, max 30 chars
      const sanitizedBase = path
        .basename(file.originalname, rawExt)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);

      // Cryptographically random unique suffix
      const randomSuffix = crypto.randomBytes(6).toString('hex');
      const uniqueFileName = `evidence-${Date.now()}-${randomSuffix}-${sanitizedBase}${safeExt}`;

      cb(null, uniqueFileName);
    } catch (err) {
      cb(err);
    }
  }
});

const fileFilter = (req, file, cb) => {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    const error = new Error(
      `Invalid file type "${file.mimetype}". Only image files (JPEG, PNG, WebP, GIF) are accepted for activity evidence.`
    );
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  // Validate extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(
      `Invalid file extension "${ext}". Allowed extensions are: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
    );
    error.code = 'INVALID_FILE_EXTENSION';
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1
  }
});

/**
 * Express middleware wrapper to catch Multer errors gracefully
 * and return structured JSON responses.
 */
const uploadEvidenceScreenshot = (req, res, next) => {
  const singleUpload = upload.single('screenshot');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            message: `Uploaded screenshot exceeds maximum allowed size of 5MB.`
          });
        }
        return res.status(400).json({
          success: false,
          code: 'UPLOAD_ERROR',
          message: `File upload error: ${err.message}`
        });
      }

      if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_FILE_EXTENSION') {
        return res.status(400).json({
          success: false,
          code: err.code,
          message: err.message
        });
      }

      return res.status(400).json({
        success: false,
        code: 'UPLOAD_ERROR',
        message: err.message || 'Error processing uploaded screenshot evidence.'
      });
    }

    next();
  });
};

module.exports = {
  uploadEvidenceScreenshot,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES
};
