import 'dotenv/config';
import { loadConfig } from './config/index.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { connectRedis, closeRedis } from './config/redis.js';
import { buildApp } from './app.js';
import { startAllJobs, stopAllJobs } from './jobs/index.js';

async function main(): Promise<void> {
  // Load and validate configuration
  const config = loadConfig();

  // Connect to database
  await connectDatabase();
  console.log('Database connected');

  // Connect to Redis
  await connectRedis();
  console.log('Redis connected');

  // Build the Fastify app
  const app = await buildApp();

  // Start background jobs
  startAllJobs();

  // Graceful shutdown handlers
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      stopAllJobs();
      await app.close();
      await closeRedis();
      await closeDatabase();
      process.exit(0);
    });
  });

  // Start the server
  try {
    await app.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });
    app.log.info(`Server running on http://localhost:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
