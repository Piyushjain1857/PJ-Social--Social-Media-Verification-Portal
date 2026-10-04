const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const path = require('path');
const app = express();

// Disable x-powered-by header to prevent fingerprinting
app.disable('x-powered-by');

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Maintain support for Vite/client preview assets
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow verified screenshot streaming across origins
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
  })
);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow local development ports dynamically or configured origin
    if (
      origin === env.CORS_ORIGIN ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }
    
    const corsErr = new Error('Blocked by CORS policy');
    corsErr.statusCode = 403;
    return callback(corsErr);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Explicit request size limits to guard against memory exhaustion
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Request logger and Phase 12 Write Request Tracker
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    let tokenUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { verifyToken } = require('./utils/jwt');
        tokenUser = verifyToken(authHeader.substring(7).trim());
      } catch (e) {}
    }

    console.log('\n========================================');
    console.log('DATABASE WRITE REQUEST');
    console.log('========================================');
    console.log(`METHOD:    ${req.method}`);
    console.log(`URL:       ${req.originalUrl}`);
    console.log(`USER:      ${tokenUser ? (tokenUser.email || tokenUser.name) : (req.body?.email || 'Anonymous')}`);
    console.log(`USER ID:   ${tokenUser ? tokenUser.id : 'N/A'}`);
    console.log(`ROLE:      ${tokenUser ? tokenUser.role : 'N/A'}`);
    console.log(`TIMESTAMP: ${timestamp}`);
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = '***REDACTED***';
      console.log(`PAYLOAD:   ${JSON.stringify(sanitizedBody)}`);
    }
    console.log('========================================\n');
  }

  next();
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Social Media Activity Verification Portal API',
    status: 'online',
    docs: '/api/docs',
    healthCheck: '/api/health',
    info: '/api/info'
  });
});

// Top-level Swagger Docs alias
app.get('/docs', (req, res) => res.redirect('/api/docs'));

// Mount API routes
app.use('/api', apiRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
