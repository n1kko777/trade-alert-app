import 'dotenv/config';
import { loadConfig } from './config/index.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  // Load and validate configuration
  const config = loadConfig();

  // Build the Fastify app
  const app = await buildApp();

  // Graceful shutdown handlers
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.close();
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
