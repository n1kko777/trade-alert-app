import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import {
  registerRateLimitPlugin,
  getRateLimitOptions,
  getAuthRateLimitConfig,
  createKeyGenerator,
} from './rateLimit.middleware.js';

// Mock Redis - throw error to force fallback to in-memory store
vi.mock('../config/redis.js', () => ({
  getRedis: vi.fn(() => {
    throw new Error('Redis not connected');
  }),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Generate unique IP addresses for each test to avoid rate limit state interference
let ipCounter = 0;
function getUniqueIp(): string {
  ipCounter++;
  const a = Math.floor(ipCounter / (256 * 256 * 256)) % 256;
  const b = Math.floor(ipCounter / (256 * 256)) % 256;
  const c = Math.floor(ipCounter / 256) % 256;
  const d = ipCounter % 256;
  return `${a}.${b}.${c}.${d}`;
}

describe('Rate Limit Middleware', () => {
  describe('getRateLimitOptions', () => {
    it('should return correct global rate limit configuration', () => {
      const options = getRateLimitOptions();

      expect(options.max).toBe(100);
      expect(options.timeWindow).toBe('1 minute');
    });

    it('should include a custom key generator', () => {
      const options = getRateLimitOptions();

      expect(options.keyGenerator).toBeDefined();
      expect(typeof options.keyGenerator).toBe('function');
    });

    it('should configure proper error response handler', () => {
      const options = getRateLimitOptions();

      expect(options.errorResponseBuilder).toBeDefined();
      expect(typeof options.errorResponseBuilder).toBe('function');
    });
  });

  describe('getAuthRateLimitConfig', () => {
    it('should return stricter rate limit for auth endpoints', () => {
      const config = getAuthRateLimitConfig();

      expect(config.max).toBe(10);
      expect(config.timeWindow).toBe('1 minute');
    });
  });

  describe('createKeyGenerator', () => {
    it('should generate key with IP when user is not authenticated', () => {
      const keyGenerator = createKeyGenerator();
      const mockRequest = {
        ip: '192.168.1.1',
        user: undefined,
      } as unknown as Parameters<typeof keyGenerator>[0];

      const key = keyGenerator(mockRequest);

      expect(key).toBe('192.168.1.1');
    });

    it('should generate key with IP and userId when user is authenticated', () => {
      const keyGenerator = createKeyGenerator();
      const mockRequest = {
        ip: '192.168.1.1',
        user: { userId: 'user-123' },
      } as unknown as Parameters<typeof keyGenerator>[0];

      const key = keyGenerator(mockRequest);

      expect(key).toBe('192.168.1.1:user-123');
    });
  });

  describe('Error Response', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify();

      await app.register(fastifyJwt, {
        secret: 'test-secret-key-for-jwt-signing',
      });

      await registerRateLimitPlugin(app);

      // Test route with very low limit for testing
      app.get('/test', {
        config: {
          rateLimit: {
            max: 1,
            timeWindow: '1 minute',
          },
        },
      }, async () => {
        return { success: true };
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should return 429 status code when rate limit exceeded', async () => {
      const ip = getUniqueIp();

      // First request should succeed
      const firstResponse = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': ip },
      });
      expect(firstResponse.statusCode).toBe(200);

      // Second request should be rate limited
      const secondResponse = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': ip },
      });
      expect(secondResponse.statusCode).toBe(429);
    });

    it('should include Retry-After header when rate limited', async () => {
      const ip = getUniqueIp();

      // First request
      await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': ip },
      });

      // Second request should be rate limited
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': ip },
      });

      expect(response.statusCode).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should return proper error message in response body', async () => {
      const ip = getUniqueIp();

      // First request
      await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': ip },
      });

      // Second request should be rate limited
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': ip },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('RATE_LIMIT');
      expect(body.message).toBe('Too many requests');
    });
  });

  describe('Auth Routes Rate Limiting', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify();

      await app.register(fastifyJwt, {
        secret: 'test-secret-key-for-jwt-signing',
      });

      await registerRateLimitPlugin(app);

      // Simulate auth route with strict rate limit
      const authConfig = getAuthRateLimitConfig();
      app.post('/api/v1/auth/login', {
        config: {
          rateLimit: {
            max: 2, // Lower for testing
            timeWindow: authConfig.timeWindow,
          },
        },
      }, async () => {
        return { success: true };
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should allow requests within auth rate limit', async () => {
      const ip = getUniqueIp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': ip },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it('should rate limit auth endpoints after exceeding limit', async () => {
      const ip = getUniqueIp();

      // First two requests should succeed (limit is 2)
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': ip },
        payload: {},
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': ip },
        payload: {},
      });

      // Third request should be rate limited
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': ip },
        payload: {},
      });

      expect(response.statusCode).toBe(429);
    });
  });

  describe('Rate Limit Headers', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify();

      await app.register(fastifyJwt, {
        secret: 'test-secret-key-for-jwt-signing',
      });

      await registerRateLimitPlugin(app);

      app.get('/headers-test', {
        config: {
          rateLimit: {
            max: 5,
            timeWindow: '1 minute',
          },
        },
      }, async () => {
        return { success: true };
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should include rate limit headers in response', async () => {
      const ip = getUniqueIp();

      const response = await app.inject({
        method: 'GET',
        url: '/headers-test',
        headers: { 'x-forwarded-for': ip },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should decrement remaining count with each request', async () => {
      const ip = getUniqueIp();

      const firstResponse = await app.inject({
        method: 'GET',
        url: '/headers-test',
        headers: { 'x-forwarded-for': ip },
      });

      const firstRemaining = parseInt(firstResponse.headers['x-ratelimit-remaining'] as string, 10);

      const secondResponse = await app.inject({
        method: 'GET',
        url: '/headers-test',
        headers: { 'x-forwarded-for': ip },
      });

      const secondRemaining = parseInt(secondResponse.headers['x-ratelimit-remaining'] as string, 10);

      expect(secondRemaining).toBe(firstRemaining - 1);
    });
  });
});
