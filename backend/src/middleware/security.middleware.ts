import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../config/database.js';
import { getRedis } from '../config/redis.js';
import { getLogger } from '../utils/logger.js';

/**
 * Honeypot paths - common attack vectors that legitimate users would never access
 * These endpoints are traps to detect and block malicious actors
 */
export const HONEYPOT_PATHS = [
  '/admin',
  '/wp-admin',
  '/.env',
  '/config.php',
  '/phpinfo.php',
  '/phpmyadmin',
] as const;

/**
 * Block duration in milliseconds (24 hours) - default for honeypot blocks
 */
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Failed login tracking constants
 */
export const FAILED_LOGIN_THRESHOLD = 5;
export const FAILED_LOGIN_TTL_SECONDS = 900; // 15 minutes
export const AUTO_BLOCK_DURATION_FIRST_MS = 60 * 60 * 1000; // 1 hour
export const AUTO_BLOCK_DURATION_REPEAT_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Redis key prefix for failed login tracking
 */
const FAILED_LOGIN_KEY_PREFIX = 'failed_login:';

/**
 * Block an IP address by adding it to the blocked_ips table
 * This is a fire-and-forget operation to not slow down the response
 *
 * @param ipAddress - The IP address to block
 * @param reason - The reason for blocking (e.g., 'honeypot', 'failed_logins')
 * @param durationMs - Duration in milliseconds (default 24 hours), null for permanent block
 */
export async function blockIpAddress(
  ipAddress: string,
  reason: string,
  durationMs: number | null = BLOCK_DURATION_MS
): Promise<void> {
  setImmediate(async () => {
    try {
      const pool = getPool();
      const blockedUntil = durationMs === null ? null : new Date(Date.now() + durationMs);

      await pool.query(
        `INSERT INTO blocked_ips (ip_address, reason, blocked_until)
         VALUES ($1, $2, $3)
         ON CONFLICT (ip_address) DO UPDATE SET
           reason = EXCLUDED.reason,
           blocked_until = EXCLUDED.blocked_until,
           created_at = NOW()`,
        [ipAddress, reason, blockedUntil]
      );

      const logger = getLogger();
      logger.info({ ip: ipAddress, reason, blockedUntil }, 'IP address blocked');
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, ip: ipAddress, reason }, 'Failed to block IP address');
    }
  });
}

/**
 * Check if an IP address is currently blocked
 * Supports both temporary blocks (blocked_until set) and permanent blocks (blocked_until = null)
 *
 * @param ipAddress - The IP address to check
 * @returns true if the IP is blocked, false otherwise
 */
export async function isIpBlocked(ipAddress: string): Promise<boolean> {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT ip_address FROM blocked_ips
       WHERE ip_address = $1
         AND (blocked_until IS NULL OR blocked_until > NOW())`,
      [ipAddress]
    );

    return result.rows.length > 0;
  } catch (error) {
    const logger = getLogger();
    logger.error({ error, ip: ipAddress }, 'Failed to check if IP is blocked');
    // On error, don't block the request (fail open for availability)
    return false;
  }
}

/**
 * Track a failed login attempt for an IP address
 * Increments the counter in Redis with a TTL
 *
 * @param ipAddress - The IP address to track
 * @returns The current number of failed attempts
 */
export async function trackFailedLogin(ipAddress: string): Promise<number> {
  try {
    const redis = getRedis();
    const key = `${FAILED_LOGIN_KEY_PREFIX}${ipAddress}`;

    const count = await redis.incr(key);
    await redis.expire(key, FAILED_LOGIN_TTL_SECONDS);

    return count;
  } catch (error) {
    const logger = getLogger();
    logger.error({ error, ip: ipAddress }, 'Failed to track failed login');
    return 0;
  }
}

/**
 * Get the current failed login count for an IP address
 *
 * @param ipAddress - The IP address to check
 * @returns The current number of failed attempts
 */
export async function getFailedLoginCount(ipAddress: string): Promise<number> {
  try {
    const redis = getRedis();
    const key = `${FAILED_LOGIN_KEY_PREFIX}${ipAddress}`;

    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    const logger = getLogger();
    logger.error({ error, ip: ipAddress }, 'Failed to get failed login count');
    return 0;
  }
}

/**
 * Clear failed login attempts for an IP address
 * Call this on successful login
 *
 * @param ipAddress - The IP address to clear
 */
export async function clearFailedLogins(ipAddress: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = `${FAILED_LOGIN_KEY_PREFIX}${ipAddress}`;

    await redis.del(key);
  } catch (error) {
    const logger = getLogger();
    logger.error({ error, ip: ipAddress }, 'Failed to clear failed logins');
  }
}

/**
 * Get the appropriate block duration based on previous blocks
 * First offense: 1 hour, Repeat offense: 24 hours
 *
 * @param ipAddress - The IP address to check
 * @returns Duration in milliseconds
 */
export async function getAutoBlockDuration(ipAddress: string): Promise<number> {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT ip_address FROM blocked_ips WHERE ip_address = $1`,
      [ipAddress]
    );

    // If IP has been blocked before, return repeat offense duration
    if (result.rows.length > 0) {
      return AUTO_BLOCK_DURATION_REPEAT_MS;
    }

    return AUTO_BLOCK_DURATION_FIRST_MS;
  } catch (error) {
    const logger = getLogger();
    logger.error({ error, ip: ipAddress }, 'Failed to get auto block duration');
    // Default to first offense duration on error
    return AUTO_BLOCK_DURATION_FIRST_MS;
  }
}

/**
 * Handle honeypot access - log the malicious attempt and block the IP
 */
async function handleHoneypotAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ipAddress = request.ip;
  const path = request.url;
  const userAgent = request.headers['user-agent'] || 'unknown';
  const method = request.method;

  const logger = getLogger();

  // Log the honeypot access with full context
  logger.warn(
    {
      ip: ipAddress,
      path,
      userAgent,
      method,
      headers: {
        host: request.headers.host,
        referer: request.headers.referer,
        acceptLanguage: request.headers['accept-language'],
      },
    },
    'Honeypot accessed - blocking IP'
  );

  // Block the IP address (fire-and-forget)
  blockIpAddress(ipAddress, 'honeypot');

  // Return a generic 404 to not reveal it's a honeypot
  reply.status(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: 'Not Found',
  });
}

/**
 * Register honeypot routes on the Fastify instance
 * These routes trap malicious actors trying to access common attack vectors
 *
 * @param fastify - The Fastify instance
 */
export async function registerHoneypotRoutes(fastify: FastifyInstance): Promise<void> {
  const logger = getLogger();

  // Register exact honeypot paths
  for (const path of HONEYPOT_PATHS) {
    // Handle GET requests
    fastify.get(path, async (request, reply) => {
      await handleHoneypotAccess(request, reply);
    });

    // Handle POST requests (for login-type honeypots)
    fastify.post(path, async (request, reply) => {
      await handleHoneypotAccess(request, reply);
    });

    // Also catch subpaths using wildcard routes
    fastify.get(`${path}/*`, async (request, reply) => {
      await handleHoneypotAccess(request, reply);
    });

    fastify.post(`${path}/*`, async (request, reply) => {
      await handleHoneypotAccess(request, reply);
    });
  }

  logger.info(
    { honeypotPaths: HONEYPOT_PATHS.length },
    'Honeypot routes registered'
  );
}

/**
 * Creates a preHandler hook to check if the requesting IP is blocked
 * This should be registered early in the request pipeline
 */
export function createBlockedIpCheck() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const ipAddress = request.ip;

    if (await isIpBlocked(ipAddress)) {
      const logger = getLogger();
      logger.warn({ ip: ipAddress, path: request.url }, 'Request from blocked IP');

      reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied',
      });
    }
  };
}

/**
 * Register security middleware on the Fastify instance
 * This includes honeypot routes and blocked IP checking
 *
 * @param fastify - The Fastify instance
 */
export async function registerSecurityMiddleware(fastify: FastifyInstance): Promise<void> {
  // Register honeypot routes first (before other routes)
  await registerHoneypotRoutes(fastify);

  // Add preHandler hook to check for blocked IPs on all routes
  fastify.addHook('preHandler', createBlockedIpCheck());

  const logger = getLogger();
  logger.info('Security middleware registered');
}
