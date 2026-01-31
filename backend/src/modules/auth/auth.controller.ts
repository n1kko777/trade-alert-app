import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerSchema, loginSchema, totpVerifySchema, RegisterInput, LoginInput, TotpVerifyInput } from './auth.schema.js';
import * as authService from './auth.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getUserSessions,
  revokeSession,
} from './strategies/jwt.strategy.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authRateLimitConfig } from '../../middleware/rateLimit.middleware.js';
import { AuthError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { AuditAction, createAuditLoggerHelper } from '../../middleware/audit.middleware.js';
import {
  trackFailedLogin,
  clearFailedLogins,
  getAutoBlockDuration,
  blockIpAddress,
  FAILED_LOGIN_THRESHOLD,
} from '../../middleware/security.middleware.js';

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register - stricter rate limit (10 requests/minute)
  fastify.post<{ Body: RegisterInput }>(
    '/api/v1/auth/register',
    { config: authRateLimitConfig },
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const input = registerSchema.parse(request.body);
      const user = await authService.register(input);

      request.log.info({ userId: user.id }, 'User registered');
      auditLog(AuditAction.REGISTER, { userId: user.id, email: user.email });

      return reply.status(201).send({
        message: 'Registration successful',
        user,
      });
    }
  );

  // Login - stricter rate limit (10 requests/minute)
  fastify.post<{ Body: LoginInput }>(
    '/api/v1/auth/login',
    { config: authRateLimitConfig },
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const input = loginSchema.parse(request.body);
      const ipAddress = request.ip;

      let loginResult;
      try {
        loginResult = await authService.login(input);
      } catch (error) {
        // Track failed login attempt
        const failedCount = await trackFailedLogin(ipAddress);

        // Log failed login attempt
        auditLog(AuditAction.LOGIN_FAILED, { email: input.email, reason: (error as Error).message });

        // Auto-block IP after threshold reached
        if (failedCount >= FAILED_LOGIN_THRESHOLD) {
          const blockDuration = await getAutoBlockDuration(ipAddress);
          blockIpAddress(ipAddress, 'failed_logins', blockDuration);
          request.log.warn(
            { ip: ipAddress, failedCount, blockDuration },
            'IP blocked due to failed login attempts'
          );
          auditLog(AuditAction.IP_BLOCKED, { ip: ipAddress, reason: 'failed_logins', failedCount });
        }

        throw error;
      }

      const { user, requires2FA } = loginResult;

      if (requires2FA) {
        // If TOTP code is provided, verify it
        if (input.totpCode) {
          const isValid = await authService.verify2FALogin(user.id, input.totpCode);
          if (!isValid) {
            // Track failed 2FA attempt
            const failedCount = await trackFailedLogin(ipAddress);
            auditLog(AuditAction.LOGIN_FAILED, { userId: user.id, reason: 'Invalid 2FA code' });

            // Auto-block IP after threshold reached
            if (failedCount >= FAILED_LOGIN_THRESHOLD) {
              const blockDuration = await getAutoBlockDuration(ipAddress);
              blockIpAddress(ipAddress, 'failed_logins', blockDuration);
              request.log.warn(
                { ip: ipAddress, failedCount, blockDuration },
                'IP blocked due to failed 2FA attempts'
              );
              auditLog(AuditAction.IP_BLOCKED, { ip: ipAddress, reason: 'failed_2fa', failedCount });
            }

            throw new ValidationError('Invalid 2FA code');
          }
        } else {
          return reply.send({
            message: '2FA required',
            requires2FA: true,
            userId: user.id,
          });
        }
      }

      // Clear failed login counter on successful login
      await clearFailedLogins(ipAddress);

      // Generate tokens
      const accessToken = generateAccessToken(fastify, {
        userId: user.id,
        email: user.email,
        subscription: user.subscription,
      });

      const refreshToken = generateRefreshToken();

      // Save refresh token with device info
      const deviceInfo = {
        ip: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown',
      };
      await saveRefreshToken(user.id, refreshToken, deviceInfo);

      request.log.info({ userId: user.id }, 'User logged in');
      auditLog(AuditAction.LOGIN_SUCCESS, { userId: user.id });

      return reply.send({
        message: 'Login successful',
        user,
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    }
  );

  // Refresh token - stricter rate limit (10 requests/minute)
  fastify.post<{ Body: { refreshToken: string } }>(
    '/api/v1/auth/refresh',
    { config: authRateLimitConfig },
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const { refreshToken } = refreshSchema.parse(request.body);

      // Validate the refresh token
      const tokenRecord = await validateRefreshToken(refreshToken);

      // Get user
      const user = await authService.getUserById(tokenRecord.user_id);
      if (!user) {
        throw new AuthError('User not found');
      }

      if (user.is_blocked) {
        await revokeAllUserTokens(user.id);
        throw new AuthError('Account is blocked');
      }

      // Generate new access token
      const accessToken = generateAccessToken(fastify, {
        userId: user.id,
        email: user.email,
        subscription: user.subscription,
      });

      // Optionally rotate refresh token
      const newRefreshToken = generateRefreshToken();
      const deviceInfo = {
        ip: request.ip,
        userAgent: request.headers['user-agent'] || 'unknown',
      };

      // Revoke old refresh token and save new one
      await revokeRefreshToken(refreshToken);
      await saveRefreshToken(user.id, newRefreshToken, deviceInfo);

      request.log.info({ userId: user.id }, 'Token refreshed');
      auditLog(AuditAction.TOKEN_REFRESH, { userId: user.id });

      return reply.send({
        message: 'Token refreshed',
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
    }
  );

  // Logout
  fastify.post<{ Body: { refreshToken: string } }>(
    '/api/v1/auth/logout',
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const { refreshToken } = logoutSchema.parse(request.body);

      await revokeRefreshToken(refreshToken);

      request.log.info('User logged out');
      auditLog(AuditAction.LOGOUT);

      return reply.send({
        message: 'Logout successful',
      });
    }
  );

  // Get current user (protected)
  fastify.get(
    '/api/v1/user/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = await authService.getUserById(request.user.userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return reply.send({
        user,
      });
    }
  );

  // Get user sessions (protected)
  fastify.get(
    '/api/v1/user/sessions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const sessions = await getUserSessions(request.user.userId);

      // Map sessions to remove sensitive data
      const safeSessions = sessions.map((session) => ({
        id: session.id,
        deviceInfo: session.device_info,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
      }));

      return reply.send({
        sessions: safeSessions,
      });
    }
  );

  // Revoke specific session (protected)
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/user/sessions/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const { id } = request.params;
      const revoked = await revokeSession(request.user.userId, id);

      if (!revoked) {
        throw new NotFoundError('Session not found');
      }

      request.log.info({ sessionId: id }, 'Session revoked');
      auditLog(AuditAction.SESSION_REVOKE, { sessionId: id });

      return reply.send({
        message: 'Session revoked',
      });
    }
  );

  // Setup 2FA (protected)
  fastify.post(
    '/api/v1/auth/2fa/setup',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const { secret, uri } = await authService.setup2FA(request.user.userId);

      request.log.info({ userId: request.user.userId }, '2FA setup initiated');
      auditLog(AuditAction.TOTP_SETUP);

      return reply.send({
        message: '2FA setup initiated',
        secret,
        uri,
      });
    }
  );

  // Verify and enable 2FA (protected)
  fastify.post<{ Body: TotpVerifyInput }>(
    '/api/v1/auth/2fa/verify',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const { code } = totpVerifySchema.parse(request.body);

      await authService.verify2FASetup(request.user.userId, code);

      request.log.info({ userId: request.user.userId }, '2FA enabled');
      auditLog(AuditAction.TOTP_VERIFY);

      return reply.send({
        message: '2FA enabled successfully',
      });
    }
  );

  // Disable 2FA (protected)
  fastify.post<{ Body: TotpVerifyInput }>(
    '/api/v1/auth/2fa/disable',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const auditLog = createAuditLoggerHelper(request);
      const { code } = totpVerifySchema.parse(request.body);

      await authService.disable2FA(request.user.userId, code);

      request.log.info({ userId: request.user.userId }, '2FA disabled');
      auditLog(AuditAction.TOTP_DISABLE);

      return reply.send({
        message: '2FA disabled successfully',
      });
    }
  );
}
