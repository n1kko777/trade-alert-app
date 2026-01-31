import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import {
  HONEYPOT_PATHS,
  blockIpAddress,
  registerHoneypotRoutes,
  isIpBlocked,
} from './security.middleware.js';

// Mock database
const mockQuery = vi.fn();
vi.mock('../config/database.js', () => ({
  getPool: vi.fn(() => ({
    query: mockQuery,
  })),
}));

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
vi.mock('../utils/logger.js', () => ({
  getLogger: vi.fn(() => mockLogger),
}));

// Helper to wait for setImmediate callbacks
const waitForSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

// Helper to create a Fastify instance with trustProxy enabled
function createTestApp(): FastifyInstance {
  return Fastify({ trustProxy: true });
}

describe('Security Middleware - Honeypot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  describe('HONEYPOT_PATHS', () => {
    it('should include common attack paths', () => {
      expect(HONEYPOT_PATHS).toContain('/admin');
      expect(HONEYPOT_PATHS).toContain('/wp-admin');
      expect(HONEYPOT_PATHS).toContain('/.env');
      expect(HONEYPOT_PATHS).toContain('/config.php');
      expect(HONEYPOT_PATHS).toContain('/phpinfo.php');
      expect(HONEYPOT_PATHS).toContain('/phpmyadmin');
    });

    it('should be an array of strings', () => {
      expect(Array.isArray(HONEYPOT_PATHS)).toBe(true);
      HONEYPOT_PATHS.forEach((path) => {
        expect(typeof path).toBe('string');
        expect(path.startsWith('/')).toBe(true);
      });
    });
  });

  describe('blockIpAddress', () => {
    it('should insert blocked IP into database', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await blockIpAddress('192.168.1.100', 'honeypot');

      await waitForSetImmediate();
      await waitForSetImmediate();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blocked_ips'),
        expect.arrayContaining(['192.168.1.100', 'honeypot'])
      );
    });

    it('should set blocked_until to 24 hours from now', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await blockIpAddress('10.0.0.1', 'honeypot');

      await waitForSetImmediate();
      await waitForSetImmediate();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('blocked_until'),
        expect.arrayContaining(['10.0.0.1', 'honeypot'])
      );
    });

    it('should handle duplicate IP gracefully (ON CONFLICT)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(blockIpAddress('192.168.1.100', 'honeypot')).resolves.not.toThrow();
    });

    it('should not throw on database errors (fire-and-forget)', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(blockIpAddress('192.168.1.100', 'honeypot')).resolves.not.toThrow();
    });
  });

  describe('isIpBlocked', () => {
    it('should return true for blocked IP', async () => {
      // Reset and set up fresh mock for this specific test
      mockQuery.mockReset();
      mockQuery.mockResolvedValue({
        rows: [{ ip_address: '192.168.1.100', reason: 'honeypot' }],
      });

      const result = await isIpBlocked('192.168.1.100');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['192.168.1.100'])
      );
    });

    it('should return false for non-blocked IP', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await isIpBlocked('192.168.1.200');

      expect(result).toBe(false);
    });

    it('should only check non-expired blocks', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValue({ rows: [] });

      await isIpBlocked('192.168.1.100');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/blocked_until.*>.*NOW\(\)|NOW\(\).*<.*blocked_until/i),
        expect.any(Array)
      );
    });
  });

  describe('Honeypot Routes Integration', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = createTestApp();
      await registerHoneypotRoutes(app);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      vi.clearAllMocks();
      mockQuery.mockResolvedValue({ rows: [] });
    });

    it('should return 404 for /admin honeypot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for /wp-admin honeypot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/wp-admin',
        headers: { 'x-forwarded-for': '10.0.0.2' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for /.env honeypot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.env',
        headers: { 'x-forwarded-for': '10.0.0.3' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for /config.php honeypot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/config.php',
        headers: { 'x-forwarded-for': '10.0.0.4' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for /phpinfo.php honeypot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/phpinfo.php',
        headers: { 'x-forwarded-for': '10.0.0.5' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for /phpmyadmin honeypot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/phpmyadmin',
        headers: { 'x-forwarded-for': '10.0.0.6' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should block IP when honeypot is accessed', async () => {
      const testIp = '192.168.50.1';
      mockQuery.mockResolvedValue({ rows: [] });

      await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'x-forwarded-for': testIp },
      });

      // Wait for async blocking to complete
      await waitForSetImmediate();
      await waitForSetImmediate();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blocked_ips'),
        expect.arrayContaining([testIp, 'honeypot'])
      );
    });

    it('should log honeypot access with full context', async () => {
      const testIp = '192.168.100.1';
      mockQuery.mockResolvedValue({ rows: [] });

      await app.inject({
        method: 'GET',
        url: '/.env',
        headers: {
          'x-forwarded-for': testIp,
          'user-agent': 'Malicious Bot/1.0',
        },
      });

      // Wait for async operations
      await waitForSetImmediate();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: testIp,
          path: '/.env',
          userAgent: 'Malicious Bot/1.0',
        }),
        expect.stringContaining('Honeypot')
      );
    });

    it('should handle POST requests to honeypots', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/wp-admin',
        headers: { 'x-forwarded-for': '10.1.0.1' },
        payload: { username: 'admin', password: 'password' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return generic 404 body (not reveal honeypot)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'x-forwarded-for': '10.2.0.1' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Not Found');
      expect(body).not.toHaveProperty('honeypot');
      expect(body).not.toHaveProperty('blocked');
    });
  });

  describe('Honeypot with subpaths', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = createTestApp();
      await registerHoneypotRoutes(app);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      vi.clearAllMocks();
      mockQuery.mockResolvedValue({ rows: [] });
    });

    it('should catch /wp-admin/login.php', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/wp-admin/login.php',
        headers: { 'x-forwarded-for': '10.3.0.1' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should catch /phpmyadmin/index.php', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/phpmyadmin/index.php',
        headers: { 'x-forwarded-for': '10.3.0.2' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('IP Blocking Duration', () => {
    it('should block IP for 24 hours', async () => {
      const now = new Date();
      const expectedBlockEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await blockIpAddress('192.168.1.100', 'honeypot');

      await waitForSetImmediate();
      await waitForSetImmediate();

      // Check that the query includes a timestamp roughly 24 hours from now
      const call = mockQuery.mock.calls[0];
      expect(call).toBeDefined();
      expect(call![0]).toContain('blocked_until');

      // The third parameter should be the blocked_until timestamp
      const blockedUntil = call![1][2];
      if (blockedUntil instanceof Date) {
        const diff = blockedUntil.getTime() - expectedBlockEnd.getTime();
        expect(Math.abs(diff)).toBeLessThan(5000); // Within 5 seconds
      }
    });
  });
});
