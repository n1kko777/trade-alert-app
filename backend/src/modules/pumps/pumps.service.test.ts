import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PumpEvent } from './pumps.detector.js';

// Create mock functions at top level for hoisting
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisKeys = vi.fn();
const mockRedisMGet = vi.fn();

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  getRedis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    keys: mockRedisKeys,
    mGet: mockRedisMGet,
  }),
}));

// Import after mocks
import {
  getActivePumps,
  storePump,
  clearPump,
  getPump,
  PUMP_TTL,
  PUMP_KEY_PREFIX,
} from './pumps.service.js';

describe('Pumps Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('Constants', () => {
    it('should have correct TTL of 15 minutes (900 seconds)', () => {
      expect(PUMP_TTL).toBe(900);
    });

    it('should have correct key prefix', () => {
      expect(PUMP_KEY_PREFIX).toBe('pumps:active:');
    });
  });

  describe('storePump', () => {
    it('should store pump event in Redis with TTL', async () => {
      const pump = createPumpEvent({ symbol: 'BTCUSDT' });

      await storePump(pump);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'pumps:active:BTCUSDT',
        JSON.stringify(pump),
        { EX: 900 }
      );
    });

    it('should use symbol as part of the key', async () => {
      const pump = createPumpEvent({ symbol: 'ETHUSDT' });

      await storePump(pump);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'pumps:active:ETHUSDT',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('getPump', () => {
    it('should return pump event for existing symbol', async () => {
      const pump = createPumpEvent({ symbol: 'BTCUSDT' });
      mockRedisGet.mockResolvedValue(JSON.stringify(pump));

      const result = await getPump('BTCUSDT');

      expect(mockRedisGet).toHaveBeenCalledWith('pumps:active:BTCUSDT');
      expect(result).toEqual(pump);
    });

    it('should return null for non-existent symbol', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await getPump('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      mockRedisGet.mockResolvedValue('invalid json');

      const result = await getPump('BTCUSDT');

      expect(result).toBeNull();
    });
  });

  describe('clearPump', () => {
    it('should delete pump from Redis', async () => {
      await clearPump('BTCUSDT');

      expect(mockRedisDel).toHaveBeenCalledWith('pumps:active:BTCUSDT');
    });
  });

  describe('getActivePumps', () => {
    it('should return empty array when no active pumps', async () => {
      mockRedisKeys.mockResolvedValue([]);

      const result = await getActivePumps();

      expect(result).toEqual([]);
    });

    it('should return all active pumps', async () => {
      const pump1 = createPumpEvent({ symbol: 'BTCUSDT' });
      const pump2 = createPumpEvent({ symbol: 'ETHUSDT' });

      mockRedisKeys.mockResolvedValue(['pumps:active:BTCUSDT', 'pumps:active:ETHUSDT']);
      mockRedisMGet.mockResolvedValue([JSON.stringify(pump1), JSON.stringify(pump2)]);

      const result = await getActivePumps();

      expect(mockRedisKeys).toHaveBeenCalledWith('pumps:active:*');
      expect(mockRedisMGet).toHaveBeenCalledWith(['pumps:active:BTCUSDT', 'pumps:active:ETHUSDT']);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(pump1);
      expect(result).toContainEqual(pump2);
    });

    it('should skip invalid JSON entries', async () => {
      const validPump = createPumpEvent({ symbol: 'BTCUSDT' });

      mockRedisKeys.mockResolvedValue(['pumps:active:BTCUSDT', 'pumps:active:INVALID']);
      mockRedisMGet.mockResolvedValue([JSON.stringify(validPump), 'invalid json']);

      const result = await getActivePumps();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validPump);
    });

    it('should skip null entries', async () => {
      const validPump = createPumpEvent({ symbol: 'BTCUSDT' });

      mockRedisKeys.mockResolvedValue(['pumps:active:BTCUSDT', 'pumps:active:EXPIRED']);
      mockRedisMGet.mockResolvedValue([JSON.stringify(validPump), null]);

      const result = await getActivePumps();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validPump);
    });
  });
});
