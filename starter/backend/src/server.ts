import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const PORT = Number(env.PORT);
const HOSTNAME = env.HOSTNAME;

const server = app.listen(PORT, HOSTNAME, () => {
  logger.info({ env: env.NODE_ENV }, `Server is running on http://${HOSTNAME}:${PORT}/`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});
