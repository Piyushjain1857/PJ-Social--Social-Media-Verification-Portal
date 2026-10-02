const app = require('./app');
const env = require('./config/env');
const { disconnectDatabase } = require('./config/db');

let server;

const startServer = (port) => {
  server = app.listen(port, () => {
    console.log(`====================================================`);
    console.log(` Social Media Verification Portal API Server`);
    console.log(` Listening on port: ${port}`);
    console.log(` Environment:       ${env.NODE_ENV}`);
    console.log(` Health endpoint:   http://localhost:${port}/api/health`);
    console.log(` Swagger UI Docs:   http://localhost:${port}/api/docs`);
    console.log(` Database status:   http://localhost:${port}/api/database/status`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = Number(port) + 1;
      console.warn(`[Server] Port ${port} is in use (e.g. macOS AirPlay). Attempting fallback port ${fallbackPort}...`);
      startServer(fallbackPort);
    } else {
      console.error('[Server] Fatal server error:', err);
      process.exit(1);
    }
  });
};

startServer(env.PORT);

// Handle graceful shutdown
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await disconnectDatabase();
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
