/**
 * Centralized Application Error Middleware
 * 
 * Enforces:
 * - Proper HTTP status codes (400, 401, 403, 404, 409, 413, 500)
 * - Safe error representations (zero secrets, internal database internals, or stack traces in production)
 * - Specific handling for Multer, JWT, JSON parse, and database constraint errors
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status;
  let errorCode = err.code || null;
  let message = err.message || 'Internal Server Error';

  // 1. Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
      message = 'Uploaded file exceeds the maximum allowed 5MB limit.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      statusCode = 400;
      errorCode = 'TOO_MANY_FILES';
      message = 'Too many files uploaded in request.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      errorCode = 'UNEXPECTED_FIELD';
      message = `Unexpected upload field "${err.field || 'file'}".`;
    } else {
      statusCode = 400;
      errorCode = 'UPLOAD_ERROR';
    }
  }

  // 2. Body Parser malformed JSON errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'MALFORMED_JSON';
    message = 'Malformed JSON payload in request body.';
  }

  // 3. JWT verification errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'TOKEN_INVALID';
    message = 'Invalid authentication token signature.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Session token has expired. Please log in again.';
  }

  // 4. Database / Prisma constraint errors
  if (err.code === 'P2002') {
    statusCode = 409;
    errorCode = 'CONFLICT_UNIQUE';
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    message = `A resource with this ${target} already exists.`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Requested record was not found in the database.';
  }

  // Fallback status code determination
  if (!statusCode || statusCode < 400 || statusCode > 599) {
    statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  }

  const isProd = process.env.NODE_ENV === 'production';

  // Log error on server side
  console.error(`[Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err.message);
  if (!isProd && err.stack) {
    console.error(err.stack);
  }

  // Never leak internal stack traces or raw database error details on 500 errors
  const safeMessage = (isProd || statusCode === 500)
    ? (statusCode === 500 ? 'An internal server error occurred. Please try again later.' : message)
    : message;

  res.status(statusCode).json({
    success: false,
    error: errorCode || (statusCode >= 500 ? 'InternalServerError' : 'ClientError'),
    code: errorCode,
    message: safeMessage,
    errors: err.errors || null
  });
};

module.exports = errorHandler;
