import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AggregatedTicker } from '../jobs/priceAggregator.job.js';
import type { OrderBook, Candle } from '../modules/market/exchanges/base.exchange.js';

// Create mock functions at top level for hoisting
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisKeys = vi.fn();
const mockRedisHGet = vi.fn();
const mockRedisHGetAll = vi.fn();

// Mock Redis
vi.mock('../config/redis.js', () => ({
  getRedis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    keys: mockRedisKeys,
    hGet: mockRedisHGet,
    hGetAll: mockRedisHGetAll,
  }),
}));

// Import after mocks
import {
  getCache,
  setCache,
  invalidateCache,
  invalidatePattern,
  CACHE_KEYS,
  CACHE_TTL,
  getCachedTickers,
  getCachedTicker,
  getCachedOrderBook,
  setCachedOrderBook,
  getCachedCandles,
  setCachedCandles,
  getCachedLiquidations,
  setCachedLiquidations,
} from './cache.service.js';

// Type for liquidation data
interface LiquidationLevel {
  leverage: number;
  longPrice: number;
  shortPrice: number;
  estimatedVolume: number;
}

interface LiquidationMap {
  symbol: string;
  currentPrice: number;
  levels: LiquidationLevel[];
  updatedAt: number;
}

describe('Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CACHE_KEYS', () => {
    it('should have correct key prefixes', () => {
      expect(CACHE_KEYS.TICKERS).toBe('market:tickers');
      expect(CACHE_KEYS.TICKER).toBe('market:ticker:');
      expect(CACHE_KEYS.ORDERBOOK).toBe('market:orderbook:');
      expect(CACHE_KEYS.CANDLES).toBe('market:candles:');
      expect(CACHE_KEYS.LIQUIDATIONS).toBe('market:liquidations:');
    });
  });

  describe('CACHE_TTL', () => {
    it('should have correct TTL values in seconds', () => {
      expect(CACHE_TTL.TICKERS).toBe(10);
      expect(CACHE_TTL.ORDERBOOK).toBe(5);
      expect(CACHE_TTL.CANDLES).toBe(60);
      expect(CACHE_TTL.LIQUIDATIONS).toBe(60);
    });
  });

  describe('getCache', () => {
    it('should return parsed JSON data when key exists', async () => {
      const testData = { foo: 'bar', count: 42 };
      mockRedisGet.mockResolvedValue(JSON.stringify(testData));

      const result = await getCache<typeof testData>('test:key');

      expect(mockRedisGet).toHaveBeenCalledWith('test:key');
      expect(result).toEqual(testData);
    });

    it('should return null when key does not exist', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await getCache<{ foo: string }>('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should return null on JSON parse error', async () => {
      mockRedisGet.mockResolvedValue('invalid json {{{');

      const result = await getCache<{ foo: string }>('test:key');

      expect(result).toBeNull();
    });
  });

  describe('setCache', () => {
    it('should store JSON stringified data with TTL', async () => {
      const testData = { foo: 'bar', count: 42 };
      mockRedisSet.mockResolvedValue('OK');

      await setCache('test:key', testData, 60);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(testData),
        { EX: 60 }
      );
    });

    it('should handle arrays', async () => {
      const testData = [1, 2, 3, 'test'];
      mockRedisSet.mockResolvedValue('OK');

      await setCache('test:array', testData, 30);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'test:array',
        JSON.stringify(testData),
        { EX: 30 }
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete the specified key', async () => {
      mockRedisDel.mockResolvedValue(1);

      await invalidateCache('test:key');

      expect(mockRedisDel).toHaveBeenCalledWith('test:key');
    });

    it('should handle non-existent keys gracefully', async () => {
      mockRedisDel.mockResolvedValue(0);

      await expect(invalidateCache('nonexistent:key')).resolves.not.toThrow();
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching the pattern', async () => {
      const matchingKeys = ['market:orderbook:binance:BTCUSDT', 'market:orderbook:binance:ETHUSDT'];
      mockRedisKeys.mockResolvedValue(matchingKeys);
      mockRedisDel.mockResolvedValue(2);

      await invalidatePattern('market:orderbook:binance:*');

      expect(mockRedisKeys).toHaveBeenCalledWith('market:orderbook:binance:*');
      expect(mockRedisDel).toHaveBeenCalledWith(matchingKeys);
    });

    it('should not call del when no keys match', async () => {
      mockRedisKeys.mockResolvedValue([]);

      await invalidatePattern('nonexistent:*');

      expect(mockRedisKeys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockRedisDel).not.toHaveBeenCalled();
    });
  });

  describe('getCachedTickers', () => {
    it('should return parsed tickers from Redis hash', async () => {
      const tickersData: Record<string, string> = {
        BTCUSDT: JSON.stringify({
          symbol: 'BTCUSDT',
          price: 50000,
          volume24h: 1000,
          change24h: 2,
          high24h: 51000,
          low24h: 49000,
          timestamp: Date.now(),
          exchanges: ['binance', 'bybit'],
        }),
        ETHUSDT: JSON.stringify({
          symbol: 'ETHUSDT',
          price: 3000,
          volume24h: 500,
          change24h: 1.5,
          high24h: 3100,
          low24h: 2900,
          timestamp: Date.now(),
          exchanges: ['binance'],
        }),
      };
      mockRedisHGetAll.mockResolvedValue(tickersData);

      const result = await getCachedTickers();

      expect(mockRedisHGetAll).toHaveBeenCalledWith('market:tickers');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result?.[0]?.symbol).toBe('BTCUSDT');
      expect(result?.[1]?.symbol).toBe('ETHUSDT');
    });

    it('should return null when no tickers are cached', async () => {
      mockRedisHGetAll.mockResolvedValue({});

      const result = await getCachedTickers();

      expect(result).toBeNull();
    });

    it('should return null when hash does not exist', async () => {
      mockRedisHGetAll.mockResolvedValue(null);

      const result = await getCachedTickers();

      expect(result).toBeNull();
    });
  });

  describe('getCachedTicker', () => {
    it('should return parsed ticker for a specific symbol', async () => {
      const ticker: AggregatedTicker = {
        symbol: 'BTCUSDT',
        price: 50000,
        volume24h: 1000,
        change24h: 2,
        high24h: 51000,
        low24h: 49000,
        timestamp: Date.now(),
        exchanges: ['binance', 'bybit'],
      };
      mockRedisHGet.mockResolvedValue(JSON.stringify(ticker));

      const result = await getCachedTicker('BTCUSDT');

      expect(mockRedisHGet).toHaveBeenCalledWith('market:tickers', 'BTCUSDT');
      expect(result).toEqual(ticker);
    });

    it('should return null when ticker is not cached', async () => {
      mockRedisHGet.mockResolvedValue(null);

      const result = await getCachedTicker('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('getCachedOrderBook', () => {
    it('should return parsed order book for exchange and symbol', async () => {
      const orderBook: OrderBook = {
        symbol: 'BTCUSDT',
        bids: [{ price: 50000, quantity: 1, total: 1 }],
        asks: [{ price: 50100, quantity: 0.5, total: 0.5 }],
        timestamp: Date.now(),
      };
      mockRedisGet.mockResolvedValue(JSON.stringify(orderBook));

      const result = await getCachedOrderBook('binance', 'BTCUSDT');

      expect(mockRedisGet).toHaveBeenCalledWith('market:orderbook:binance:BTCUSDT');
      expect(result).toEqual(orderBook);
    });

    it('should return null when order book is not cached', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await getCachedOrderBook('binance', 'UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('setCachedOrderBook', () => {
    it('should store order book with correct TTL', async () => {
      const orderBook: OrderBook = {
        symbol: 'BTCUSDT',
        bids: [{ price: 50000, quantity: 1, total: 1 }],
        asks: [{ price: 50100, quantity: 0.5, total: 0.5 }],
        timestamp: Date.now(),
      };
      mockRedisSet.mockResolvedValue('OK');

      await setCachedOrderBook('binance', 'BTCUSDT', orderBook);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'market:orderbook:binance:BTCUSDT',
        JSON.stringify(orderBook),
        { EX: 5 }
      );
    });
  });

  describe('getCachedCandles', () => {
    it('should return parsed candles for exchange, symbol, and interval', async () => {
      const candles: Candle[] = [
        { timestamp: Date.now(), open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
        { timestamp: Date.now() - 60000, open: 49500, high: 50000, low: 49000, close: 50000, volume: 80 },
      ];
      mockRedisGet.mockResolvedValue(JSON.stringify(candles));

      const result = await getCachedCandles('binance', 'BTCUSDT', '1m');

      expect(mockRedisGet).toHaveBeenCalledWith('market:candles:binance:BTCUSDT:1m');
      expect(result).toEqual(candles);
    });

    it('should return null when candles are not cached', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await getCachedCandles('binance', 'BTCUSDT', '1h');

      expect(result).toBeNull();
    });
  });

  describe('setCachedCandles', () => {
    it('should store candles with correct TTL', async () => {
      const candles: Candle[] = [
        { timestamp: Date.now(), open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
      ];
      mockRedisSet.mockResolvedValue('OK');

      await setCachedCandles('binance', 'BTCUSDT', '1m', candles);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'market:candles:binance:BTCUSDT:1m',
        JSON.stringify(candles),
        { EX: 60 }
      );
    });
  });

  describe('getCachedLiquidations', () => {
    it('should return parsed liquidation map for symbol', async () => {
      const liquidationMap: LiquidationMap = {
        symbol: 'BTCUSDT',
        currentPrice: 50000,
        levels: [
          { leverage: 2, longPrice: 25000, shortPrice: 75000, estimatedVolume: 956458 },
          { leverage: 10, longPrice: 45000, shortPrice: 55000, estimatedVolume: 800000 },
        ],
        updatedAt: Date.now(),
      };
      mockRedisGet.mockResolvedValue(JSON.stringify(liquidationMap));

      const result = await getCachedLiquidations('BTCUSDT');

      expect(mockRedisGet).toHaveBeenCalledWith('market:liquidations:BTCUSDT');
      expect(result).toEqual(liquidationMap);
    });

    it('should return null when liquidation map is not cached', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await getCachedLiquidations('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('setCachedLiquidations', () => {
    it('should store liquidation map with correct TTL (60s)', async () => {
      const liquidationMap: LiquidationMap = {
        symbol: 'BTCUSDT',
        currentPrice: 50000,
        levels: [
          { leverage: 2, longPrice: 25000, shortPrice: 75000, estimatedVolume: 956458 },
        ],
        updatedAt: Date.now(),
      };
      mockRedisSet.mockResolvedValue('OK');

      await setCachedLiquidations('BTCUSDT', liquidationMap);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'market:liquidations:BTCUSDT',
        JSON.stringify(liquidationMap),
        { EX: 60 }
      );
    });
  });
});
