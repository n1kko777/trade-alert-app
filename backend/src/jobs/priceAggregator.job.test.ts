import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pino } from 'pino';
import type { Ticker } from '../modules/market/exchanges/base.exchange.js';

// Create mock functions at top level for hoisting
const mockRedisHSet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisExpire = vi.fn();
const mockCronSchedule = vi.fn();
const mockGetAllTickers = vi.fn();

// Mock Redis
vi.mock('../config/redis.js', () => ({
  getRedis: () => ({
    hSet: mockRedisHSet,
    set: mockRedisSet,
    expire: mockRedisExpire,
  }),
}));

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: (expression: string, fn: () => void, options: object) =>
      mockCronSchedule(expression, fn, options),
  },
  schedule: (expression: string, fn: () => void, options: object) =>
    mockCronSchedule(expression, fn, options),
}));

// Mock exchanges with proper class implementations
vi.mock('../modules/market/exchanges/index.js', () => {
  class MockBinanceExchange {
    id = 'binance';
    name = 'Binance';
    getAllTickers() {
      return mockGetAllTickers();
    }
  }

  class MockBybitExchange {
    id = 'bybit';
    name = 'Bybit';
    getAllTickers() {
      return mockGetAllTickers();
    }
  }

  class MockOkxExchange {
    id = 'okx';
    name = 'OKX';
    getAllTickers() {
      return mockGetAllTickers();
    }
  }

  class MockMexcExchange {
    id = 'mexc';
    name = 'MEXC';
    getAllTickers() {
      return mockGetAllTickers();
    }
  }

  return {
    BinanceExchange: MockBinanceExchange,
    BybitExchange: MockBybitExchange,
    OkxExchange: MockOkxExchange,
    MexcExchange: MockMexcExchange,
  };
});

// Mock logger
vi.mock('../utils/logger.js', () => ({
  getLogger: () => pino({ level: 'silent' }),
}));

// Import after mocks
import {
  aggregateTickers,
  fetchAllTickers,
  storeTickers,
  startPriceAggregatorJob,
  stopPriceAggregatorJob,
  REDIS_KEYS,
  REDIS_TTL,
} from './priceAggregator.job.js';

describe('Price Aggregator Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllTickers.mockReset();
    mockCronSchedule.mockReset();
    mockRedisHSet.mockReset();
    mockRedisSet.mockReset();
    mockRedisExpire.mockReset();
  });

  afterEach(() => {
    stopPriceAggregatorJob();
  });

  describe('REDIS_KEYS', () => {
    it('should have correct key formats', () => {
      expect(REDIS_KEYS.TICKERS_HASH).toBe('market:tickers');
      expect(REDIS_KEYS.TICKER_PREFIX).toBe('market:ticker:');
    });
  });

  describe('REDIS_TTL', () => {
    it('should be 30 seconds', () => {
      expect(REDIS_TTL).toBe(30);
    });
  });

  describe('aggregateTickers', () => {
    it('should aggregate tickers from multiple exchanges by symbol', () => {
      const exchangeTickers: Map<string, Ticker[]> = new Map([
        ['binance', [
          { symbol: 'BTCUSDT', price: 50000, volume24h: 1000, change24h: 2, high24h: 51000, low24h: 49000, timestamp: Date.now() },
          { symbol: 'ETHUSDT', price: 3000, volume24h: 500, change24h: 1.5, high24h: 3100, low24h: 2900, timestamp: Date.now() },
        ]],
        ['bybit', [
          { symbol: 'BTCUSDT', price: 50100, volume24h: 800, change24h: 2.1, high24h: 51100, low24h: 49100, timestamp: Date.now() },
        ]],
      ]);

      const aggregated = aggregateTickers(exchangeTickers);

      expect(aggregated.has('BTCUSDT')).toBe(true);
      expect(aggregated.has('ETHUSDT')).toBe(true);

      const btc = aggregated.get('BTCUSDT')!;
      expect(btc.symbol).toBe('BTCUSDT');
      expect(btc.price).toBe(50050); // Average of 50000 and 50100
      expect(btc.volume24h).toBe(1800); // Sum of volumes
      expect(btc.exchanges).toEqual(['binance', 'bybit']);

      const eth = aggregated.get('ETHUSDT')!;
      expect(eth.symbol).toBe('ETHUSDT');
      expect(eth.price).toBe(3000);
      expect(eth.exchanges).toEqual(['binance']);
    });

    it('should handle empty input', () => {
      const exchangeTickers: Map<string, Ticker[]> = new Map();
      const aggregated = aggregateTickers(exchangeTickers);
      expect(aggregated.size).toBe(0);
    });

    it('should calculate average for multiple exchanges with same symbol', () => {
      const exchangeTickers: Map<string, Ticker[]> = new Map([
        ['binance', [{ symbol: 'BTCUSDT', price: 100, volume24h: 10, change24h: 1, high24h: 110, low24h: 90, timestamp: Date.now() }]],
        ['bybit', [{ symbol: 'BTCUSDT', price: 200, volume24h: 20, change24h: 2, high24h: 210, low24h: 190, timestamp: Date.now() }]],
        ['okx', [{ symbol: 'BTCUSDT', price: 300, volume24h: 30, change24h: 3, high24h: 310, low24h: 290, timestamp: Date.now() }]],
      ]);

      const aggregated = aggregateTickers(exchangeTickers);
      const btc = aggregated.get('BTCUSDT')!;

      expect(btc.price).toBe(200); // (100 + 200 + 300) / 3
      expect(btc.volume24h).toBe(60); // 10 + 20 + 30
      expect(btc.change24h).toBe(2); // (1 + 2 + 3) / 3
      expect(btc.high24h).toBe(310); // max
      expect(btc.low24h).toBe(90); // min
    });
  });

  describe('fetchAllTickers', () => {
    it('should fetch tickers from all exchanges concurrently', async () => {
      const mockTickers: Ticker[] = [
        { symbol: 'BTCUSDT', price: 50000, volume24h: 1000, change24h: 2, high24h: 51000, low24h: 49000, timestamp: Date.now() },
      ];
      mockGetAllTickers.mockResolvedValue(mockTickers);

      const result = await fetchAllTickers();

      expect(result.size).toBe(4); // 4 exchanges
      expect(mockGetAllTickers).toHaveBeenCalledTimes(4);
    });

    it('should handle individual exchange failures gracefully', async () => {
      mockGetAllTickers
        .mockResolvedValueOnce([{ symbol: 'BTCUSDT', price: 50000, volume24h: 1000, change24h: 2, high24h: 51000, low24h: 49000, timestamp: Date.now() }])
        .mockRejectedValueOnce(new Error('Exchange error'))
        .mockResolvedValueOnce([{ symbol: 'BTCUSDT', price: 50100, volume24h: 800, change24h: 2.1, high24h: 51100, low24h: 49100, timestamp: Date.now() }])
        .mockRejectedValueOnce(new Error('Another error'));

      const result = await fetchAllTickers();

      // Should still return results from successful exchanges
      expect(result.size).toBe(2);
    });

    it('should return empty map if all exchanges fail', async () => {
      mockGetAllTickers.mockRejectedValue(new Error('All failed'));

      const result = await fetchAllTickers();

      expect(result.size).toBe(0);
    });
  });

  describe('storeTickers', () => {
    it('should store tickers in Redis hash and individual keys', async () => {
      const aggregatedTickers = new Map([
        ['BTCUSDT', {
          symbol: 'BTCUSDT',
          price: 50000,
          volume24h: 1000,
          change24h: 2,
          high24h: 51000,
          low24h: 49000,
          timestamp: Date.now(),
          exchanges: ['binance', 'bybit'],
        }],
        ['ETHUSDT', {
          symbol: 'ETHUSDT',
          price: 3000,
          volume24h: 500,
          change24h: 1.5,
          high24h: 3100,
          low24h: 2900,
          timestamp: Date.now(),
          exchanges: ['binance'],
        }],
      ]);

      await storeTickers(aggregatedTickers);

      // Should store in hash
      expect(mockRedisHSet).toHaveBeenCalled();

      // Should store individual keys with TTL
      expect(mockRedisSet).toHaveBeenCalledTimes(2);
      expect(mockRedisSet).toHaveBeenCalledWith(
        'market:ticker:BTCUSDT',
        expect.any(String),
        { EX: 30 }
      );
      expect(mockRedisSet).toHaveBeenCalledWith(
        'market:ticker:ETHUSDT',
        expect.any(String),
        { EX: 30 }
      );

      // Should set TTL on hash
      expect(mockRedisExpire).toHaveBeenCalledWith('market:tickers', 30);
    });

    it('should handle empty tickers gracefully', async () => {
      const emptyTickers = new Map();

      await storeTickers(emptyTickers);

      expect(mockRedisHSet).not.toHaveBeenCalled();
      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe('startPriceAggregatorJob', () => {
    it('should schedule job to run every 5 seconds', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPriceAggregatorJob();

      expect(mockCronSchedule).toHaveBeenCalledWith(
        '*/5 * * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true })
      );
    });

    it('should not start multiple jobs if already running', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPriceAggregatorJob();
      startPriceAggregatorJob();

      expect(mockCronSchedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopPriceAggregatorJob', () => {
    it('should stop the running job', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPriceAggregatorJob();
      stopPriceAggregatorJob();

      expect(mockTask.stop).toHaveBeenCalled();
    });

    it('should handle stopping when no job is running', () => {
      expect(() => stopPriceAggregatorJob()).not.toThrow();
    });
  });
});
