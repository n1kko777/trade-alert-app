import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import {
  HONEYPOT_PATHS,
  blockIpAddress,
  registerHoneypotRoutes,
  isIpBlocked,
  trackFailedLogin,
  getFailedLoginCount,
  clearFailedLogins,
  getAutoBlockDuration,
  FAILED_LOGIN_THRESHOLD,
  FAILED_LOGIN_TTL_SECONDS,
  AUTO_BLOCK_DURATION_FIRST_MS,
  AUTO_BLOCK_DURATION_REPEAT_MS,
} from './security.middleware.js';

// Mock Redis
const mockRedisClient = {
  incr: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  set: vi.fn(),
};
vi.mock('../config/redis.js', () => ({
  getRedis: () => mockRedisClient,
}));

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

    it('should return true for permanently blocked IP (blocked_until is null)', async () => {
      mockQuery.mockReset();
      mockQuery.mockResolvedValue({
        rows: [{ ip_address: '192.168.1.100', blocked_until: null }],
      });

      const result = await isIpBlocked('192.168.1.100');

      expect(result).toBe(true);
      // Query should check for NULL blocked_until
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/blocked_until\s+IS\s+NULL/i),
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

describe('Security Middleware - Failed Login Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
  });

  describe('trackFailedLogin', () => {
    it('should increment failed login counter in Redis', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.incr.mockResolvedValue(1);

      const count = await trackFailedLogin(ip);

      expect(mockRedisClient.incr).toHaveBeenCalledWith(`failed_login:${ip}`);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `failed_login:${ip}`,
        FAILED_LOGIN_TTL_SECONDS
      );
      expect(count).toBe(1);
    });

    it('should return incremented count on subsequent calls', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.incr.mockResolvedValue(3);

      const count = await trackFailedLogin(ip);

      expect(count).toBe(3);
    });

    it('should handle Redis errors gracefully', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.incr.mockRejectedValue(new Error('Redis error'));

      const count = await trackFailedLogin(ip);

      expect(count).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getFailedLoginCount', () => {
    it('should return 0 when no failed attempts exist', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.get.mockResolvedValue(null);

      const count = await getFailedLoginCount(ip);

      expect(count).toBe(0);
    });

    it('should return the current count from Redis', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.get.mockResolvedValue('4');

      const count = await getFailedLoginCount(ip);

      expect(count).toBe(4);
    });

    it('should handle Redis errors gracefully', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const count = await getFailedLoginCount(ip);

      expect(count).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('clearFailedLogins', () => {
    it('should delete the failed login counter from Redis', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.del.mockResolvedValue(1);

      await clearFailedLogins(ip);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`failed_login:${ip}`);
    });

    it('should handle Redis errors gracefully', async () => {
      const ip = '192.168.1.1';
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(clearFailedLogins(ip)).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getAutoBlockDuration', () => {
    it('should return 1 hour for first offense (no previous blocks)', async () => {
      const ip = '192.168.1.1';
      mockQuery.mockResolvedValue({ rows: [] });

      const duration = await getAutoBlockDuration(ip);

      expect(duration).toBe(AUTO_BLOCK_DURATION_FIRST_MS);
      expect(duration).toBe(60 * 60 * 1000); // 1 hour in milliseconds
    });

    it('should return 24 hours for repeat offenders', async () => {
      const ip = '192.168.1.1';
      mockQuery.mockResolvedValue({
        rows: [{ ip_address: ip, blocked_until: new Date() }],
      });

      const duration = await getAutoBlockDuration(ip);

      expect(duration).toBe(AUTO_BLOCK_DURATION_REPEAT_MS);
      expect(duration).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
    });

    it('should query database for previous blocks', async () => {
      const ip = '192.168.1.1';
      mockQuery.mockResolvedValue({ rows: [] });

      await getAutoBlockDuration(ip);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([ip])
      );
    });

    it('should handle database errors gracefully by returning first offense duration', async () => {
      const ip = '192.168.1.1';
      mockQuery.mockRejectedValue(new Error('DB error'));

      const duration = await getAutoBlockDuration(ip);

      expect(duration).toBe(AUTO_BLOCK_DURATION_FIRST_MS);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('blockIpAddress with duration parameter', () => {
    it('should use provided duration when specified', async () => {
      const ip = '192.168.1.1';
      const customDuration = 60 * 60 * 1000; // 1 hour
      mockQuery.mockResolvedValue({ rows: [] });

      await blockIpAddress(ip, 'failed_logins', customDuration);

      await waitForSetImmediate();
      await waitForSetImmediate();

      const call = mockQuery.mock.calls[0];
      expect(call).toBeDefined();
      const blockedUntil = call![1][2];
      if (blockedUntil instanceof Date) {
        const expectedBlockEnd = new Date(Date.now() + customDuration);
        const diff = Math.abs(blockedUntil.getTime() - expectedBlockEnd.getTime());
        expect(diff).toBeLessThan(5000); // Within 5 seconds
      }
    });

    it('should set blocked_until to null for permanent blocks', async () => {
      const ip = '192.168.1.1';
      mockQuery.mockResolvedValue({ rows: [] });

      await blockIpAddress(ip, 'permanent', null);

      await waitForSetImmediate();
      await waitForSetImmediate();

      const call = mockQuery.mock.calls[0];
      expect(call).toBeDefined();
      const blockedUntil = call![1][2];
      expect(blockedUntil).toBeNull();
    });
  });

  describe('Constants', () => {
    it('should have threshold of 5 failed attempts', () => {
      expect(FAILED_LOGIN_THRESHOLD).toBe(5);
    });

    it('should have TTL of 15 minutes (900 seconds)', () => {
      expect(FAILED_LOGIN_TTL_SECONDS).toBe(900);
    });

    it('should have first offense duration of 1 hour', () => {
      expect(AUTO_BLOCK_DURATION_FIRST_MS).toBe(60 * 60 * 1000);
    });

    it('should have repeat offense duration of 24 hours', () => {
      expect(AUTO_BLOCK_DURATION_REPEAT_MS).toBe(24 * 60 * 60 * 1000);
    });
  });
});
