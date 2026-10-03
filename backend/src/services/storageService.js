const fs = require('fs');
const path = require('path');

/**
 * Storage Service
 * ---------------
 * Encapsulates screenshot persistence and retrieval.
 *
 * Current Backend: Local Protected Filesystem
 * Cloud Migration Ready: To switch to AWS S3, Google Cloud Storage, or Cloudflare R2,
 * replace the methods below with your cloud SDK calls (e.g. PutObjectCommand, S3.upload).
 * The controller and middleware consume this service interface without modification.
 */

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/screenshots');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Save screenshot binary buffer.
 *
 * @param {string} filename - Unique generated filename
 * @param {Buffer} buffer - Validated image buffer
 * @param {string} mimetype - Validated MIME type
 * @returns {Promise<{ filename: string, screenshotRef: string }>}
 */
const saveScreenshot = async (filename, buffer, mimetype) => {
  // CLOUD MIGRATION HOOK:
  // If process.env.STORAGE_DRIVER === 's3', upload to S3/GCS bucket here:
  // e.g.:
  // const s3Client = new S3Client({ region: process.env.AWS_REGION });
  // await s3Client.send(new PutObjectCommand({
  //   Bucket: process.env.S3_BUCKET_NAME,
  //   Key: `screenshots/${filename}`,
  //   Body: buffer,
  //   ContentType: mimetype
  // }));
  // return { filename, screenshotRef: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/screenshots/${filename}` };

  const targetPath = path.join(UPLOAD_DIR, filename);

  // Path traversal guard
  if (!targetPath.startsWith(UPLOAD_DIR + path.sep) && targetPath !== UPLOAD_DIR) {
    throw new Error('Invalid storage path: potential traversal detected.');
  }

  await fs.promises.writeFile(targetPath, buffer);

  // Return API reference path (never expose server root or internal absolute path)
  return {
    filename,
    screenshotRef: `/api/uploads/screenshots/${filename}`
  };
};

/**
 * Resolve an absolute file path safely for local streaming.
 * Validates against traversal and strictly checks the generated filename pattern.
 *
 * @param {string} filename
 * @returns {string|null}
 */
const resolveScreenshotPath = (filename) => {
  if (!filename || /[/\\]/.test(filename) || filename.includes('..')) {
    return null;
  }

  // Only allow valid evidence filename structure (generated or seed/test files)
  if (!/^evidence-[a-zA-Z0-9_\-.]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return null;
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return null;
  }

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return filePath;
};

/**
 * Get readable stream for a screenshot.
 *
 * @param {string} filename
 * @returns {fs.ReadStream|null}
 */
const getScreenshotStream = (filename) => {
  const filePath = resolveScreenshotPath(filename);
  if (!filePath) return null;
  return fs.createReadStream(filePath);
};

module.exports = {
  UPLOAD_DIR,
  saveScreenshot,
  resolveScreenshotPath,
  getScreenshotStream,
};
