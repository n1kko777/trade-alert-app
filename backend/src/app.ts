import Fastify, { FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import { getConfig } from './config/index.js';
import { initLogger, getLogger } from './utils/logger.js';
import errorHandlerPlugin from './plugins/errorHandler.js';
import { registerRateLimitPlugin } from './middleware/rateLimit.middleware.js';
import { registerHoneypotRoutes, createBlockedIpCheck } from './middleware/security.middleware.js';
import { healthRoutes } from './modules/health/health.controller.js';
import authRoutes from './modules/auth/auth.routes.js';
import marketRoutes from './modules/market/market.routes.js';
import pumpsRoutes from './modules/pumps/pumps.routes.js';
import signalsRoutes from './modules/signals/signals.routes.js';
import { registerWebSocketServer } from './websocket/index.js';

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
    trustProxy: true, // Trust X-Forwarded-For header for proper IP detection
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

  // Security: Honeypot routes (register early to catch malicious requests)
  await registerHoneypotRoutes(app);

  // Security: Check for blocked IPs on all routes
  app.addHook('preHandler', createBlockedIpCheck());

  // Security headers
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });

  // CORS
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  // Rate limiting with Redis store and custom key generator
  await registerRateLimitPlugin(app);

  // Cookies
  await app.register(fastifyCookie);

  // JWT
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: '15m',
    },
  });

  // Health check routes
  await app.register(healthRoutes);

  // Auth routes
  await app.register(authRoutes);

  // Market data routes
  await app.register(marketRoutes);

  // Pump detection routes
  await app.register(pumpsRoutes);

  // Signal routes
  await app.register(signalsRoutes);

  // WebSocket server
  await app.register(fastifyWebsocket);
  await registerWebSocketServer(app);

  logger.info('Application built successfully');

  return app;
}

export type { FastifyInstance };
