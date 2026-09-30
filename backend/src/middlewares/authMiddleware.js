const { verifyToken } = require('../utils/jwt');
const { authorize } = require('./roleMiddleware');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  // Remove potential surrounding quotes from client transmission
  if (token && (token.startsWith('"') || token.startsWith("'"))) {
    token = token.slice(1, -1).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
      message: 'Authentication required. No valid bearer token provided.'
    });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'TOKEN_PAYLOAD_INVALID',
        message: 'Invalid session payload. Please re-authenticate.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    const isExpired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      message: isExpired ? 'Token has expired. Please log in again.' : 'Invalid or malformed authentication token.'
    });
  }
};

module.exports = {
  authenticate,
  authorize
};

