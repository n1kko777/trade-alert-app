import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';

// Import after mocks
import { validateWsToken, extractToken, WsAuthError } from './ws.auth.js';
import type { TokenPayload } from '../types/fastify.js';

describe('WebSocket Authentication', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(fastifyJwt, {
      secret: 'test-secret-key-that-is-at-least-32-chars',
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('extractToken', () => {
    it('should extract token from query parameter', () => {
      const url = '/ws?token=my-jwt-token';
      const headers = {};

      const token = extractToken(url, headers);

      expect(token).toBe('my-jwt-token');
    });

    it('should extract token from Authorization header with Bearer prefix', () => {
      const url = '/ws';
      const headers = { authorization: 'Bearer my-jwt-token' };

      const token = extractToken(url, headers);

      expect(token).toBe('my-jwt-token');
    });

    it('should prefer query parameter over header', () => {
      const url = '/ws?token=query-token';
      const headers = { authorization: 'Bearer header-token' };

      const token = extractToken(url, headers);

      expect(token).toBe('query-token');
    });

    it('should return null if no token is provided', () => {
      const url = '/ws';
      const headers = {};

      const token = extractToken(url, headers);

      expect(token).toBeNull();
    });

    it('should return null for Authorization header without Bearer prefix', () => {
      const url = '/ws';
      const headers = { authorization: 'Basic some-token' };

      const token = extractToken(url, headers);

      expect(token).toBeNull();
    });

    it('should handle empty Authorization header', () => {
      const url = '/ws';
      const headers = { authorization: '' };

      const token = extractToken(url, headers);

      expect(token).toBeNull();
    });
  });

  describe('validateWsToken', () => {
    it('should return user payload for valid access token', async () => {
      const payload: Omit<TokenPayload, 'type'> = {
        userId: 'user-123',
        email: 'test@example.com',
        subscription: 'premium',
      };
      const token = app.jwt.sign({ ...payload, type: 'access' }, { expiresIn: '15m' });

      const result = await validateWsToken(app, token);

      // Check core payload fields (JWT adds exp and iat)
      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.subscription).toBe('premium');
      expect(result.type).toBe('access');
    });

    it('should throw WsAuthError for invalid token', async () => {
      await expect(validateWsToken(app, 'invalid-token')).rejects.toThrow(WsAuthError);
    });

    it('should throw WsAuthError for expired token', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        subscription: 'premium',
        type: 'access' as const,
        // Create an already expired token by setting exp in the past
        exp: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
      };
      const token = app.jwt.sign(payload);

      await expect(validateWsToken(app, token)).rejects.toThrow(WsAuthError);
    });

    it('should throw WsAuthError for refresh token (only access allowed)', async () => {
      const payload: Omit<TokenPayload, 'type'> = {
        userId: 'user-123',
        email: 'test@example.com',
        subscription: 'premium',
      };
      const token = app.jwt.sign({ ...payload, type: 'refresh' }, { expiresIn: '7d' });

      await expect(validateWsToken(app, token)).rejects.toThrow(WsAuthError);
      await expect(validateWsToken(app, token)).rejects.toThrow('Invalid token type');
    });

    it('should throw WsAuthError for empty token', async () => {
      await expect(validateWsToken(app, '')).rejects.toThrow(WsAuthError);
    });

    it('should throw WsAuthError for null token', async () => {
      await expect(validateWsToken(app, null as unknown as string)).rejects.toThrow(WsAuthError);
    });
  });

  describe('WsAuthError', () => {
    it('should have correct name and message', () => {
      const error = new WsAuthError('Test error message');

      expect(error.name).toBe('WsAuthError');
      expect(error.message).toBe('Test error message');
      expect(error instanceof Error).toBe(true);
    });
  });
});
