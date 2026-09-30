const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log(`====================================================`);
  console.log(` Social Media Verification Portal API Server`);
  console.log(` Listening on port: ${env.PORT}`);
  console.log(` Environment:       ${env.NODE_ENV}`);
  console.log(` Health endpoint:   http://localhost:${env.PORT}/api/health`);
  console.log(`====================================================`);
});

// Handle graceful shutdown
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
