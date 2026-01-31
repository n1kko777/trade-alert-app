import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import type { Signal, SignalStats } from './signals.schema.js';

// Create mock functions
const mockGetSignals = vi.fn();
const mockGetSignalById = vi.fn();
const mockGetSignalStats = vi.fn();

// Mock signals service
vi.mock('./signals.service.js', () => ({
  getSignals: (filters: unknown) => mockGetSignals(filters),
  getSignalById: (id: string) => mockGetSignalById(id),
  getSignalStats: () => mockGetSignalStats(),
}));

// Mock auth middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: vi.fn().mockImplementation(async (req, _reply) => {
    // Default to pro user - can be overridden in tests
    req.user = {
      userId: 'test-user-id',
      email: 'test@example.com',
      subscription: 'pro',
      type: 'access',
    };
  }),
  requireTier: () => vi.fn().mockImplementation(async (_req, _reply) => {
    // Simulate tier check passing
  }),
}));

// Import after mocks
import { signalsController } from './signals.controller.js';

describe('Signals Controller', () => {
  let app: FastifyInstance;

  const createSignal = (overrides: Partial<Signal> = {}): Signal => ({
    id: 'test-signal-id',
    symbol: 'BTCUSDT',
    exchange: 'binance',
    direction: 'buy',
    entryPrice: 50000,
    stopLoss: 49000,
    takeProfit1: 51000,
    takeProfit2: 52000,
    takeProfit3: 53000,
    aiConfidence: 75,
    aiTriggers: [{ type: 'pump_detection', confidence: 75 }],
    status: 'active',
    resultPnl: null,
    closedAt: null,
    createdAt: new Date(),
    minTier: 'free',
    ...overrides,
  });

  const createSignalStats = (overrides: Partial<SignalStats> = {}): SignalStats => ({
    totalSignals: 100,
    activeSignals: 10,
    closedSignals: 90,
    winRate: 65.5,
    averagePnl: 2.5,
    totalPnl: 225,
    signalsByTrigger: {
      pump_detection: 40,
      volume_anomaly: 30,
      support_bounce: 20,
      macd_cross: 10,
    },
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(signalsController);
    await app.ready();
  });

  describe('GET /api/v1/signals', () => {
    it('should return empty array when no signals', async () => {
      mockGetSignals.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.signals).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('should return list of signals', async () => {
      const signals = [
        createSignal({ symbol: 'BTCUSDT' }),
        createSignal({ symbol: 'ETHUSDT', id: 'signal-2' }),
      ];
      mockGetSignals.mockResolvedValue(signals);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.signals).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it('should include tier limit in response', async () => {
      mockGetSignals.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tierLimit).toBe(50); // pro tier limit
    });

    it('should pass filters to service', async () => {
      mockGetSignals.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/v1/signals?status=active&symbol=BTCUSDT&direction=buy&limit=10&offset=5',
      });

      expect(mockGetSignals).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          symbol: 'BTCUSDT',
          direction: 'buy',
          limit: 10,
          offset: 5,
        })
      );
    });

    it('should reject invalid status filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals?status=invalid',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid limit value', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals?limit=500', // Max is 100
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/signals/:id', () => {
    it('should return signal by ID', async () => {
      const signal = createSignal();
      mockGetSignalById.mockResolvedValue(signal);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/123e4567-e89b-12d3-a456-426614174000',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.signal.symbol).toBe('BTCUSDT');
    });

    it('should return 404 for non-existent signal', async () => {
      mockGetSignalById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/123e4567-e89b-12d3-a456-426614174000',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });

    it('should reject invalid UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/invalid-id',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/signals/stats', () => {
    it('should return signal statistics', async () => {
      const stats = createSignalStats();
      mockGetSignalStats.mockResolvedValue(stats);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats.totalSignals).toBe(100);
      expect(body.stats.winRate).toBe(65.5);
      expect(body.stats.signalsByTrigger).toBeDefined();
    });

    it('should include all stat fields', async () => {
      const stats = createSignalStats();
      mockGetSignalStats.mockResolvedValue(stats);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/stats',
      });

      const body = JSON.parse(response.body);
      expect(body.stats).toHaveProperty('totalSignals');
      expect(body.stats).toHaveProperty('activeSignals');
      expect(body.stats).toHaveProperty('closedSignals');
      expect(body.stats).toHaveProperty('winRate');
      expect(body.stats).toHaveProperty('averagePnl');
      expect(body.stats).toHaveProperty('totalPnl');
      expect(body.stats).toHaveProperty('signalsByTrigger');
    });
  });

  describe('Tier-based access', () => {
    it('should respect tier limit for signals list', async () => {
      const signals = Array(100).fill(null).map((_, i) =>
        createSignal({ id: `signal-${i}`, symbol: `COIN${i}USDT` })
      );
      mockGetSignals.mockResolvedValue(signals.slice(0, 50)); // Service returns tier-limited results

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals?limit=100',
      });

      expect(response.statusCode).toBe(200);
      // Pro tier limit is 50, so limit should be capped
      expect(mockGetSignals).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50, // Capped to tier limit
        })
      );
    });
  });
});
