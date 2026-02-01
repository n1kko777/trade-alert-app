import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyRateLimit, { RateLimitPluginOptions, errorResponseBuilderContext } from '@fastify/rate-limit';
import { getLogger } from '../utils/logger.js';

/**
 * Rate limiting constants
 */
export const GLOBAL_RATE_LIMIT = {
  max: 100,
  timeWindow: '1 minute' as const,
};

export const AUTH_RATE_LIMIT = {
  max: 10,
  timeWindow: '1 minute' as const,
};

/**
 * Creates a custom key generator that uses IP + userId (if authenticated)
 * This ensures that rate limits are applied per-IP for anonymous users
 * and per-IP+user for authenticated users
 */
export function createKeyGenerator() {
  return (request: FastifyRequest): string => {
    const ip = request.ip;
    const userId = request.user?.userId;

    if (userId) {
      return `${ip}:${userId}`;
    }

    return ip;
  };
}

/**
 * Custom error response builder for rate limit errors
 * Returns proper 429 response with error code and message
 */
function createErrorResponseBuilder() {
  return (
    request: FastifyRequest,
    context: errorResponseBuilderContext
  ) => {
    // Log rate limit hit for monitoring
    request.log.warn({
      ip: request.ip,
      url: request.url,
      method: request.method,
      retryAfter: context.after,
    }, 'Rate limit exceeded');

    return {
      statusCode: 429,
      error: 'RATE_LIMIT',
      message: 'Too many requests',
      retryAfter: context.after,
    };
  };
}

/**
 * Gets the global rate limit configuration options
 */
export function getRateLimitOptions(): RateLimitPluginOptions {
  return {
    max: GLOBAL_RATE_LIMIT.max,
    timeWindow: GLOBAL_RATE_LIMIT.timeWindow,
    keyGenerator: createKeyGenerator(),
    errorResponseBuilder: createErrorResponseBuilder(),
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  };
}

/**
 * Gets the stricter rate limit configuration for auth endpoints
 */
export function getAuthRateLimitConfig() {
  return {
    max: AUTH_RATE_LIMIT.max,
    timeWindow: AUTH_RATE_LIMIT.timeWindow,
  };
}

/**
 * Creates Redis store options for distributed rate limiting
 * NOTE: Currently disabled due to Redis client compatibility issues
 * Falls back to in-memory store
 */
function getRedisStoreOptions(): Partial<RateLimitPluginOptions> {
  // Using in-memory store for now - Redis v4 client is not compatible
  // with @fastify/rate-limit's Redis store (requires ioredis or redis v3)
  return {};
}

/**
 * Registers the rate limiting plugin with the Fastify instance
 */
export async function registerRateLimitPlugin(fastify: FastifyInstance): Promise<void> {
  const baseOptions = getRateLimitOptions();
  const redisOptions = getRedisStoreOptions();

  await fastify.register(fastifyRateLimit, {
    ...baseOptions,
    ...redisOptions,
  });

  const logger = getLogger();
  logger.info({
    globalLimit: GLOBAL_RATE_LIMIT.max,
    authLimit: AUTH_RATE_LIMIT.max,
    timeWindow: GLOBAL_RATE_LIMIT.timeWindow,
  }, 'Rate limiting plugin registered');
}

/**
 * Route configuration for auth endpoints with stricter rate limits
 */
export const authRateLimitConfig = {
  rateLimit: getAuthRateLimitConfig(),
};
