import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../config/database.js';
import { getLogger } from '../utils/logger.js';

/**
 * Audit action types for tracking user activities
 */
export const AuditAction = {
  // Authentication actions
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  REGISTER: 'register',
  TOKEN_REFRESH: 'token_refresh',

  // 2FA actions
  TOTP_SETUP: '2fa_setup',
  TOTP_VERIFY: '2fa_verify',
  TOTP_DISABLE: '2fa_disable',

  // Account actions
  PASSWORD_CHANGE: 'password_change',
  SESSION_REVOKE: 'session_revoke',

  // Resource access
  SIGNAL_VIEW: 'signal_view',
  PORTFOLIO_UPDATE: 'portfolio_update',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

/**
 * Audit event parameters
 */
export interface AuditEventParams {
  userId: string | null;
  action: AuditActionType;
  ipAddress: string;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Route configuration for automatic audit logging
 */
interface AuditableRoute {
  method: string;
  path: string;
  action: AuditActionType;
  extractUserId?: (request: FastifyRequest, reply: FastifyReply) => string | null;
}

/**
 * Log an audit event to the database (fire-and-forget)
 * This function does not await the database operation to avoid blocking the request
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  const { userId, action, ipAddress, userAgent, metadata } = params;

  // Fire-and-forget: start the async operation but don't await it
  setImmediate(async () => {
    try {
      const pool = getPool();
      const metadataJson = metadata ? JSON.stringify(metadata) : null;

      await pool.query(
        `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, ipAddress, userAgent || null, metadataJson]
      );

      const logger = getLogger();
      logger.debug({ userId, action, ipAddress }, 'Audit event logged');
    } catch (error) {
      // Log error but don't throw - audit logging should never break the app
      const logger = getLogger();
      logger.error({ error, userId, action }, 'Failed to log audit event');
    }
  });
}

/**
 * Creates a helper function bound to a specific request
 * This makes it easy to log audit events from route handlers
 */
export function createAuditLoggerHelper(request: FastifyRequest) {
  const ipAddress = request.ip;
  const userAgent = request.headers['user-agent'] || null;
  const userId = (request as any).user?.userId || null;

  return function auditLog(
    action: AuditActionType,
    metadata?: Record<string, unknown>
  ): void {
    logAuditEvent({
      userId,
      action,
      ipAddress,
      userAgent,
      metadata: metadata || null,
    });
  };
}

/**
 * Returns the list of routes that should be automatically audited
 */
export function getAuditableRoutes(): AuditableRoute[] {
  return [
    {
      method: 'POST',
      path: '/api/v1/auth/login',
      action: AuditAction.LOGIN_SUCCESS,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/logout',
      action: AuditAction.LOGOUT,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/register',
      action: AuditAction.REGISTER,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      action: AuditAction.TOKEN_REFRESH,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/2fa/setup',
      action: AuditAction.TOTP_SETUP,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/2fa/verify',
      action: AuditAction.TOTP_VERIFY,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/2fa/disable',
      action: AuditAction.TOTP_DISABLE,
    },
    {
      method: 'DELETE',
      path: '/api/v1/user/sessions/:id',
      action: AuditAction.SESSION_REVOKE,
    },
  ];
}

/**
 * Register audit logging hooks on the Fastify instance
 * Automatically logs audit events for configured sensitive routes
 */
export async function registerAuditHooks(fastify: FastifyInstance): Promise<void> {
  const auditableRoutes = getAuditableRoutes();

  // Create a map for faster lookup
  const routeMap = new Map<string, AuditableRoute>();
  for (const route of auditableRoutes) {
    // Handle parameterized routes by creating a regex pattern
    const key = `${route.method}:${route.path}`;
    routeMap.set(key, route);
  }

  // Add hook to log audit events after response
  fastify.addHook('onResponse', async (request, reply) => {
    // Only log successful responses (2xx, 3xx)
    if (reply.statusCode >= 400) {
      return;
    }

    // Check if this route should be audited
    const routeKey = `${request.method}:${request.routeOptions?.url || request.url}`;
    const route = routeMap.get(routeKey);

    if (!route) {
      // Try matching with path params replaced
      const urlWithoutParams = request.routeOptions?.url || request.url;
      const altRouteKey = `${request.method}:${urlWithoutParams}`;
      const altRoute = routeMap.get(altRouteKey);

      if (!altRoute) {
        return;
      }

      // Log the audit event asynchronously
      logAuditEvent({
        userId: (request as any).user?.userId || null,
        action: altRoute.action,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        metadata: null,
      });
      return;
    }

    // Log the audit event asynchronously
    logAuditEvent({
      userId: (request as any).user?.userId || null,
      action: route.action,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      metadata: null,
    });
  });

  const logger = getLogger();
  logger.info(
    { auditableRoutes: auditableRoutes.length },
    'Audit logging hooks registered'
  );
}

/**
 * Decorator to manually log an audit event from a route handler
 * Use this when you need to log with custom metadata or for non-configured routes
 */
export function withAuditLog(
  action: AuditActionType,
  getMetadata?: (request: FastifyRequest) => Record<string, unknown>
) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const metadata = getMetadata ? getMetadata(request) : null;

    logAuditEvent({
      userId: (request as any).user?.userId || null,
      action,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      metadata,
    });
  };
}
