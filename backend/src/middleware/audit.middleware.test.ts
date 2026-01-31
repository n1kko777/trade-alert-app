import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import {
  AuditAction,
  logAuditEvent,
  createAuditLoggerHelper,
  registerAuditHooks,
  getAuditableRoutes,
} from './audit.middleware.js';

// Mock database
const mockQuery = vi.fn();
vi.mock('../config/database.js', () => ({
  getPool: vi.fn(() => ({
    query: mockQuery,
  })),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('Audit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  describe('AuditAction enum', () => {
    it('should define all required action types', () => {
      expect(AuditAction.LOGIN_SUCCESS).toBe('login_success');
      expect(AuditAction.LOGIN_FAILED).toBe('login_failed');
      expect(AuditAction.LOGOUT).toBe('logout');
      expect(AuditAction.REGISTER).toBe('register');
      expect(AuditAction.TOTP_SETUP).toBe('2fa_setup');
      expect(AuditAction.TOTP_VERIFY).toBe('2fa_verify');
      expect(AuditAction.TOTP_DISABLE).toBe('2fa_disable');
      expect(AuditAction.PASSWORD_CHANGE).toBe('password_change');
      expect(AuditAction.SIGNAL_VIEW).toBe('signal_view');
      expect(AuditAction.TOKEN_REFRESH).toBe('token_refresh');
      expect(AuditAction.SESSION_REVOKE).toBe('session_revoke');
    });
  });

  describe('logAuditEvent', () => {
    // Helper to wait for setImmediate callbacks
    const waitForSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

    it('should insert audit log into database', async () => {
      await logAuditEvent({
        userId: 'user-123',
        action: AuditAction.LOGIN_SUCCESS,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { browser: 'Chrome' },
      });

      // Wait for async fire-and-forget to execute
      await waitForSetImmediate();
      await waitForSetImmediate();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          'user-123',
          'login_success',
          '192.168.1.1',
          'Mozilla/5.0',
          expect.any(String), // JSON metadata
        ])
      );
    });

    it('should handle null userId for anonymous actions', async () => {
      await logAuditEvent({
        userId: null,
        action: AuditAction.LOGIN_FAILED,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Wait for async fire-and-forget to execute
      await waitForSetImmediate();
      await waitForSetImmediate();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          null,
          'login_failed',
          '192.168.1.1',
          'Mozilla/5.0',
          null,
        ])
      );
    });

    it('should not throw on database errors (fire-and-forget)', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(
        logAuditEvent({
          userId: 'user-123',
          action: AuditAction.LOGIN_SUCCESS,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).resolves.toBeUndefined();

      // Wait for async error handling
      await waitForSetImmediate();
      await waitForSetImmediate();
    });

    it('should handle missing optional fields', async () => {
      await logAuditEvent({
        userId: 'user-123',
        action: AuditAction.LOGOUT,
        ipAddress: '10.0.0.1',
      });

      // Wait for async fire-and-forget to execute
      await waitForSetImmediate();
      await waitForSetImmediate();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          'user-123',
          'logout',
          '10.0.0.1',
          null,
          null,
        ])
      );
    });
  });

  describe('createAuditLoggerHelper', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify();
      await app.register(fastifyJwt, {
        secret: 'test-secret-key-for-jwt-signing',
      });

      app.get('/test', async (request) => {
        const auditLog = createAuditLoggerHelper(request);
        await auditLog(AuditAction.SIGNAL_VIEW, { signalId: 'sig-123' });
        return { success: true };
      });

      app.post('/authenticated-test', async (request) => {
        // Simulate authenticated user
        (request as any).user = { userId: 'auth-user-123' };
        const auditLog = createAuditLoggerHelper(request);
        await auditLog(AuditAction.SIGNAL_VIEW);
        return { success: true };
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    // Helper to wait for setImmediate callbacks
    const waitForSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

    it('should create helper that extracts request info automatically', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'user-agent': 'Test Agent',
        },
      });

      expect(response.statusCode).toBe(200);

      // Wait for async fire-and-forget to execute
      await waitForSetImmediate();
      await waitForSetImmediate();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          null, // No authenticated user
          'signal_view',
          '127.0.0.1', // Fastify inject uses 127.0.0.1
          'Test Agent',
          '{"signalId":"sig-123"}',
        ]
      );
    });

    it('should use authenticated user ID when available', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/authenticated-test',
        headers: {
          'user-agent': 'Auth Test Agent',
        },
      });

      expect(response.statusCode).toBe(200);

      // Wait for async fire-and-forget to execute
      await waitForSetImmediate();
      await waitForSetImmediate();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          'auth-user-123',
          'signal_view',
          '127.0.0.1', // Fastify inject uses 127.0.0.1
          'Auth Test Agent',
          null,
        ]
      );
    });
  });

  describe('getAuditableRoutes', () => {
    it('should return list of routes that should be auto-logged', () => {
      const routes = getAuditableRoutes();

      expect(routes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: '/api/v1/auth/login',
          }),
          expect.objectContaining({
            method: 'POST',
            path: '/api/v1/auth/logout',
          }),
          expect.objectContaining({
            method: 'POST',
            path: '/api/v1/auth/register',
          }),
        ])
      );
    });

    it('should include action type for each route', () => {
      const routes = getAuditableRoutes();

      routes.forEach((route) => {
        expect(route.action).toBeDefined();
        expect(typeof route.action).toBe('string');
      });
    });
  });

  describe('registerAuditHooks', () => {
    let app: FastifyInstance;

    beforeEach(async () => {
      vi.clearAllMocks();
      mockQuery.mockResolvedValue({ rows: [] });
      app = Fastify();
      await app.register(fastifyJwt, {
        secret: 'test-secret-key-for-jwt-signing',
      });
    });

    afterEach(async () => {
      await app.close();
    });

    it('should register hooks without errors', async () => {
      await expect(registerAuditHooks(app)).resolves.toBeUndefined();
    });

    it('should log audit events for configured routes on success', async () => {
      await registerAuditHooks(app);

      // Create test route that matches auditable pattern
      app.post('/api/v1/auth/login', async () => {
        return { success: true };
      });

      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'x-forwarded-for': '192.168.1.200',
          'user-agent': 'Hook Test Agent',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);

      // Wait for async logging to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should not log audit events for non-auditable routes', async () => {
      await registerAuditHooks(app);

      app.get('/api/v1/health', async () => {
        return { status: 'ok' };
      });

      await app.ready();

      await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      // Wait for any potential async logging
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('Async logging behavior', () => {
    it('should not block request handling', async () => {
      // Simulate slow database
      mockQuery.mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve({ rows: [] }), 500));
      });

      const startTime = Date.now();

      await logAuditEvent({
        userId: 'user-123',
        action: AuditAction.LOGIN_SUCCESS,
        ipAddress: '192.168.1.1',
        userAgent: 'Test',
      });

      const duration = Date.now() - startTime;

      // Should return immediately (fire-and-forget), not wait for 500ms
      expect(duration).toBeLessThan(100);
    });
  });
});
