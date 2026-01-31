import { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from './auth.schema.js';
import * as authService from './auth.service.js';

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

  // Login (tokens will be added in Phase 2.2)
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

      request.log.info({ userId: user.id }, 'User logged in');

      // Tokens will be generated here in Phase 2.2
      return reply.send({
        message: 'Login successful',
        user,
        // tokens: { accessToken, refreshToken } - Phase 2.2
      });
    }
  );
}
