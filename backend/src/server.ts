import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { disconnectDb } from './config/database';

const server = app.listen(env.PORT, () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down server gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await disconnectDb();
      logger.info('Database connections closed.');
      process.exit(0);
    } catch (err) {
      logger.error(err, 'Error during database disconnection during shutdown');
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
