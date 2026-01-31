import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from './auth.schema.js';
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
import { AuthError, NotFoundError } from '../../utils/errors.js';

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{ Body: RegisterInput }>(
    '/api/v1/auth/register',
    async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const user = await authService.register(input);

      request.log.info({ userId: user.id }, 'User registered');

      return reply.status(201).send({
        message: 'Registration successful',
        user,
      });
    }
  );

  // Login
  fastify.post<{ Body: LoginInput }>(
    '/api/v1/auth/login',
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const { user, requires2FA } = await authService.login(input);

      if (requires2FA) {
        return reply.send({
          message: '2FA required',
          requires2FA: true,
          userId: user.id,
        });
      }

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

  // Refresh token
  fastify.post<{ Body: { refreshToken: string } }>(
    '/api/v1/auth/refresh',
    async (request, reply) => {
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
      const { refreshToken } = logoutSchema.parse(request.body);

      await revokeRefreshToken(refreshToken);

      request.log.info('User logged out');

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
      const { id } = request.params;
      const revoked = await revokeSession(request.user.userId, id);

      if (!revoked) {
        throw new NotFoundError('Session not found');
      }

      request.log.info({ sessionId: id }, 'Session revoked');

      return reply.send({
        message: 'Session revoked',
      });
    }
  );
}
