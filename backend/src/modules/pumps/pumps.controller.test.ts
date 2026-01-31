import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import type { PumpEvent } from './pumps.detector.js';

// Create mock functions
const mockGetActivePumps = vi.fn();
const mockGetPump = vi.fn();

// Mock pumps service
vi.mock('./pumps.service.js', () => ({
  getActivePumps: () => mockGetActivePumps(),
  getPump: (symbol: string) => mockGetPump(symbol),
}));

// Mock auth middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: vi.fn().mockImplementation(async (_req, _reply) => {
    // Simulate authenticated user
  }),
  requireTier: () => vi.fn().mockImplementation(async (_req, _reply) => {
    // Simulate tier check passing
  }),
}));

// Import after mocks
import { pumpsController } from './pumps.controller.js';

describe('Pumps Controller', () => {
  let app: FastifyInstance;

  const createPumpEvent = (overrides: Partial<PumpEvent> = {}): PumpEvent => ({
    symbol: 'TESTUSDT',
    exchanges: ['binance', 'bybit'],
    startPrice: 100,
    currentPrice: 110,
    changePct: 10,
    volume24h: 2000000,
    volumeMultiplier: 2,
    detectedAt: Date.now(),
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(pumpsController);
    await app.ready();
  });

  describe('GET /api/v1/pumps', () => {
    it('should return empty array when no active pumps', async () => {
      mockGetActivePumps.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pumps).toEqual([]);
    });

    it('should return all active pumps', async () => {
      const pumps = [
        createPumpEvent({ symbol: 'BTCUSDT' }),
        createPumpEvent({ symbol: 'ETHUSDT' }),
      ];
      mockGetActivePumps.mockResolvedValue(pumps);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pumps).toHaveLength(2);
      expect(body.pumps[0].symbol).toBe('BTCUSDT');
      expect(body.pumps[1].symbol).toBe('ETHUSDT');
    });

    it('should include count in response', async () => {
      const pumps = [
        createPumpEvent({ symbol: 'BTCUSDT' }),
        createPumpEvent({ symbol: 'ETHUSDT' }),
        createPumpEvent({ symbol: 'SOLUSDT' }),
      ];
      mockGetActivePumps.mockResolvedValue(pumps);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(3);
    });
  });

  describe('GET /api/v1/pumps/:symbol', () => {
    it('should return pump for existing symbol', async () => {
      const pump = createPumpEvent({ symbol: 'BTCUSDT' });
      mockGetPump.mockResolvedValue(pump);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps/BTCUSDT',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pump.symbol).toBe('BTCUSDT');
      expect(mockGetPump).toHaveBeenCalledWith('BTCUSDT');
    });

    it('should normalize symbol to uppercase', async () => {
      const pump = createPumpEvent({ symbol: 'BTCUSDT' });
      mockGetPump.mockResolvedValue(pump);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps/btcusdt',
      });

      expect(response.statusCode).toBe(200);
      expect(mockGetPump).toHaveBeenCalledWith('BTCUSDT');
    });

    it('should return 404 for non-existent pump', async () => {
      mockGetPump.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps/NONEXISTENT',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });

    it('should validate symbol format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps/ab', // Too short
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject symbols with invalid characters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pumps/BTC-USDT', // Invalid character
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
