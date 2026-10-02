const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');

const router = express.Router();

// Custom CSS for a sleek, modern dark-themed Swagger UI
const customCss = `
  .swagger-ui {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .swagger-ui .topbar {
    background-color: #0b1120;
    border-bottom: 1px solid #1e293b;
    padding: 12px 0;
  }
  .swagger-ui .topbar .download-url-wrapper {
    display: none;
  }
  .swagger-ui .topbar-wrapper img {
    content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛡️</text></svg>');
    height: 38px;
    width: 38px;
  }
  .swagger-ui .topbar-wrapper .link {
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f8fafc !important;
  }
  .swagger-ui .info {
    margin: 30px 0;
  }
  .swagger-ui .info .title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #0f172a;
    font-weight: 800;
  }
  .swagger-ui .opblock.opblock-get {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
  .swagger-ui .opblock.opblock-post {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }
  .swagger-ui .opblock.opblock-put {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
  }
  .swagger-ui .opblock.opblock-delete {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }
  .swagger-ui .btn.authorize {
    background-color: #6366f1;
    border-color: #6366f1;
    color: #ffffff;
    font-weight: 700;
    border-radius: 8px;
  }
  .swagger-ui .btn.authorize svg {
    fill: #ffffff;
  }
`;

const swaggerUiOptions = {
  customCss,
  customSiteTitle: 'PJ Social API Explorer & Documentation',
  customfavIcon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛡️</text></svg>',
  swaggerOptions: {
    persistAuthorization: true,
    filter: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true
  }
};

// Serve Raw OpenAPI JSON Specification
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Interactive Swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

module.exports = router;
