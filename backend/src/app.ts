import Fastify, { FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { getConfig } from './config/index.js';
import { initLogger, getLogger } from './utils/logger.js';
import errorHandlerPlugin from './plugins/errorHandler.js';

export async function buildApp(): Promise<FastifyInstance> {
  const config = getConfig();

  // Initialize standalone logger
  initLogger();
  const logger = getLogger();

  const loggerOptions: Record<string, unknown> = {
    level: config.LOG_LEVEL,
  };

  if (config.NODE_ENV === 'development') {
    loggerOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    };
  }

  const app = Fastify({
    logger: loggerOptions,
  });

  // Register error handler plugin
  await app.register(errorHandlerPlugin);

  // Request logging hook
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const duration = request.startTime ? Date.now() - request.startTime : 0;
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
      },
      'Request completed'
    );
  });

  // Security headers
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });

  // CORS
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  // Rate limiting
  await app.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
  });

  // Cookies
  await app.register(fastifyCookie);

  // JWT
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: '15m',
    },
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  logger.info('Application built successfully');

  return app;
}

export type { FastifyInstance };
