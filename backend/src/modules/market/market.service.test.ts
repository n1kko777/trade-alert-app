import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pino } from 'pino';
import type { Ticker } from './exchanges/base.exchange.js';

// Create mock functions at top level for hoisting
const mockGetCachedTickers = vi.fn();
const mockGetCachedTicker = vi.fn();
const mockGetCachedOrderBook = vi.fn();
const mockGetCachedCandles = vi.fn();
const mockSetCachedOrderBook = vi.fn();
const mockSetCachedCandles = vi.fn();
const mockGetCachedLiquidations = vi.fn();
const mockSetCachedLiquidations = vi.fn();
const mockExchangeGetOrderBook = vi.fn();
const mockExchangeGetCandles = vi.fn();

// Mock cache service
vi.mock('../../services/cache.service.js', () => ({
  getCachedTickers: () => mockGetCachedTickers(),
  getCachedTicker: (symbol: string) => mockGetCachedTicker(symbol),
  getCachedOrderBook: (exchange: string, symbol: string) => mockGetCachedOrderBook(exchange, symbol),
  getCachedCandles: (exchange: string, symbol: string, interval: string) => mockGetCachedCandles(exchange, symbol, interval),
  setCachedOrderBook: (exchange: string, symbol: string, data: unknown) => mockSetCachedOrderBook(exchange, symbol, data),
  setCachedCandles: (exchange: string, symbol: string, interval: string, data: unknown) => mockSetCachedCandles(exchange, symbol, interval, data),
  getCachedLiquidations: (symbol: string) => mockGetCachedLiquidations(symbol),
  setCachedLiquidations: (symbol: string, data: unknown) => mockSetCachedLiquidations(symbol, data),
}));

// Mock exchange classes
vi.mock('./exchanges/index.js', () => {
  class MockBinanceExchange {
    id = 'binance';
    name = 'Binance';
    getOrderBook(symbol: string, depth: number) {
      return mockExchangeGetOrderBook(symbol, depth);
    }
    getCandles(symbol: string, interval: string, limit: number) {
      return mockExchangeGetCandles(symbol, interval, limit);
    }
  }

  class MockBybitExchange {
    id = 'bybit';
    name = 'Bybit';
    getOrderBook(symbol: string, depth: number) {
      return mockExchangeGetOrderBook(symbol, depth);
    }
    getCandles(symbol: string, interval: string, limit: number) {
      return mockExchangeGetCandles(symbol, interval, limit);
    }
  }

  class MockOkxExchange {
    id = 'okx';
    name = 'OKX';
    getOrderBook(symbol: string, depth: number) {
      return mockExchangeGetOrderBook(symbol, depth);
    }
    getCandles(symbol: string, interval: string, limit: number) {
      return mockExchangeGetCandles(symbol, interval, limit);
    }
  }

  class MockMexcExchange {
    id = 'mexc';
    name = 'MEXC';
    getOrderBook(symbol: string, depth: number) {
      return mockExchangeGetOrderBook(symbol, depth);
    }
    getCandles(symbol: string, interval: string, limit: number) {
      return mockExchangeGetCandles(symbol, interval, limit);
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
vi.mock('../../utils/logger.js', () => ({
  getLogger: () => pino({ level: 'silent' }),
}));

// Import after mocks
import {
  getTickers,
  getTicker,
  getOrderBook,
  getCandles,
  getLiquidations,
  getLiquidationMap,
  calculateLiquidationLevels,
  resetExchangeInstances,
  LEVERAGE_LEVELS,
  VOLUME_DECAY_FACTOR,
  BASE_VOLUME,
  type LiquidationMap,
} from './market.service.js';

// Sample test data
interface AggregatedTicker extends Ticker {
  exchanges: string[];
}

const mockTicker: AggregatedTicker = {
  symbol: 'BTCUSDT',
  price: 50000,
  volume24h: 1000000,
  change24h: 2.5,
  high24h: 51000,
  low24h: 49000,
  timestamp: Date.now(),
  exchanges: ['binance', 'bybit'],
};

const mockOrderBookData = {
  symbol: 'BTCUSDT',
  bids: [
    { price: 49990, quantity: 1.5, total: 1.5 },
    { price: 49980, quantity: 2.0, total: 3.5 },
  ],
  asks: [
    { price: 50010, quantity: 1.2, total: 1.2 },
    { price: 50020, quantity: 1.8, total: 3.0 },
  ],
  timestamp: Date.now(),
};

const mockCandlesData = [
  { timestamp: 1704067200000, open: 49000, high: 50500, low: 48500, close: 50000, volume: 1000 },
  { timestamp: 1704070800000, open: 50000, high: 51000, low: 49500, close: 50500, volume: 1200 },
];

describe('Market Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetExchangeInstances();
  });

  describe('getTickers', () => {
    it('should return tickers from cache', async () => {
      mockGetCachedTickers.mockResolvedValue([mockTicker]);

      const result = await getTickers();

      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe('BTCUSDT');
      expect(mockGetCachedTickers).toHaveBeenCalled();
    });

    it('should return empty array when cache is empty', async () => {
      mockGetCachedTickers.mockResolvedValue(null);

      const result = await getTickers();

      expect(result).toEqual([]);
    });
  });

  describe('getTicker', () => {
    it('should return ticker from cache', async () => {
      mockGetCachedTicker.mockResolvedValue(mockTicker);

      const result = await getTicker('BTCUSDT');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('BTCUSDT');
      expect(mockGetCachedTicker).toHaveBeenCalledWith('BTCUSDT');
    });

    it('should return null when ticker not in cache', async () => {
      mockGetCachedTicker.mockResolvedValue(null);

      const result = await getTicker('UNKNOWNUSDT');

      expect(result).toBeNull();
    });
  });

  describe('getOrderBook', () => {
    it('should return orderbook from cache when available', async () => {
      mockGetCachedOrderBook.mockResolvedValue(mockOrderBookData);

      const result = await getOrderBook('binance', 'BTCUSDT');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('BTCUSDT');
      expect(mockGetCachedOrderBook).toHaveBeenCalledWith('binance', 'BTCUSDT');
      expect(mockExchangeGetOrderBook).not.toHaveBeenCalled();
    });

    it('should fetch from exchange when not in cache', async () => {
      mockGetCachedOrderBook.mockResolvedValue(null);
      mockExchangeGetOrderBook.mockResolvedValue(mockOrderBookData);

      const result = await getOrderBook('binance', 'BTCUSDT');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('BTCUSDT');
      expect(mockExchangeGetOrderBook).toHaveBeenCalledWith('BTCUSDT', 20);
      expect(mockSetCachedOrderBook).toHaveBeenCalledWith('binance', 'BTCUSDT', mockOrderBookData);
    });

    it('should use custom depth when fetching from exchange', async () => {
      mockGetCachedOrderBook.mockResolvedValue(null);
      mockExchangeGetOrderBook.mockResolvedValue(mockOrderBookData);

      await getOrderBook('binance', 'BTCUSDT', 50);

      expect(mockExchangeGetOrderBook).toHaveBeenCalledWith('BTCUSDT', 50);
    });

    it('should return null when exchange fetch fails', async () => {
      mockGetCachedOrderBook.mockResolvedValue(null);
      mockExchangeGetOrderBook.mockRejectedValue(new Error('Exchange error'));

      const result = await getOrderBook('binance', 'BTCUSDT');

      expect(result).toBeNull();
    });
  });

  describe('getCandles', () => {
    it('should return candles from cache when available', async () => {
      mockGetCachedCandles.mockResolvedValue(mockCandlesData);

      const result = await getCandles('binance', 'BTCUSDT', '1h');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(mockGetCachedCandles).toHaveBeenCalledWith('binance', 'BTCUSDT', '1h');
      expect(mockExchangeGetCandles).not.toHaveBeenCalled();
    });

    it('should fetch from exchange when not in cache', async () => {
      mockGetCachedCandles.mockResolvedValue(null);
      mockExchangeGetCandles.mockResolvedValue(mockCandlesData);

      const result = await getCandles('binance', 'BTCUSDT', '1h');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(mockExchangeGetCandles).toHaveBeenCalledWith('BTCUSDT', '1h', 100);
      expect(mockSetCachedCandles).toHaveBeenCalledWith('binance', 'BTCUSDT', '1h', mockCandlesData);
    });

    it('should use custom limit when fetching from exchange', async () => {
      mockGetCachedCandles.mockResolvedValue(null);
      mockExchangeGetCandles.mockResolvedValue(mockCandlesData);

      await getCandles('binance', 'BTCUSDT', '1h', 50);

      expect(mockExchangeGetCandles).toHaveBeenCalledWith('BTCUSDT', '1h', 50);
    });

    it('should return null when exchange fetch fails', async () => {
      mockGetCachedCandles.mockResolvedValue(null);
      mockExchangeGetCandles.mockRejectedValue(new Error('Exchange error'));

      const result = await getCandles('binance', 'BTCUSDT', '1h');

      expect(result).toBeNull();
    });
  });

  describe('getLiquidations', () => {
    it('should return empty array (placeholder)', async () => {
      const result = await getLiquidations('BTCUSDT');

      expect(result).toEqual([]);
    });
  });

  describe('Liquidation Calculator', () => {
    describe('LEVERAGE_LEVELS constant', () => {
      it('should have correct leverage levels', () => {
        expect(LEVERAGE_LEVELS).toEqual([2, 3, 5, 10, 25, 50, 100]);
      });
    });

    describe('VOLUME_DECAY_FACTOR constant', () => {
      it('should be 0.8 for realistic volume decay', () => {
        expect(VOLUME_DECAY_FACTOR).toBe(0.8);
      });
    });

    describe('calculateLiquidationLevels', () => {
      it('should calculate correct long liquidation prices', () => {
        const currentPrice = 50000;
        const levels = calculateLiquidationLevels('BTCUSDT', currentPrice);

        // Long liquidation = price * (1 - 1/leverage)
        // For 2x: 50000 * (1 - 1/2) = 50000 * 0.5 = 25000
        expect(levels[0]?.longPrice).toBe(25000);

        // For 3x: 50000 * (1 - 1/3) = 50000 * 0.6667 = 33333.33
        expect(levels[1]?.longPrice).toBeCloseTo(33333.33, 1);

        // For 5x: 50000 * (1 - 1/5) = 50000 * 0.8 = 40000
        expect(levels[2]?.longPrice).toBe(40000);

        // For 10x: 50000 * (1 - 1/10) = 50000 * 0.9 = 45000
        expect(levels[3]?.longPrice).toBe(45000);

        // For 25x: 50000 * (1 - 1/25) = 50000 * 0.96 = 48000
        expect(levels[4]?.longPrice).toBe(48000);

        // For 50x: 50000 * (1 - 1/50) = 50000 * 0.98 = 49000
        expect(levels[5]?.longPrice).toBe(49000);

        // For 100x: 50000 * (1 - 1/100) = 50000 * 0.99 = 49500
        expect(levels[6]?.longPrice).toBe(49500);
      });

      it('should calculate correct short liquidation prices', () => {
        const currentPrice = 50000;
        const levels = calculateLiquidationLevels('BTCUSDT', currentPrice);

        // Short liquidation = price * (1 + 1/leverage)
        // For 2x: 50000 * (1 + 1/2) = 50000 * 1.5 = 75000
        expect(levels[0]?.shortPrice).toBe(75000);

        // For 3x: 50000 * (1 + 1/3) = 50000 * 1.3333 = 66666.67
        expect(levels[1]?.shortPrice).toBeCloseTo(66666.67, 1);

        // For 5x: 50000 * (1 + 1/5) = 50000 * 1.2 = 60000
        expect(levels[2]?.shortPrice).toBe(60000);

        // For 10x: 50000 * (1 + 1/10) = 50000 * 1.1 = 55000
        // Using toBeCloseTo due to floating point precision
        expect(levels[3]?.shortPrice).toBeCloseTo(55000, 5);

        // For 25x: 50000 * (1 + 1/25) = 50000 * 1.04 = 52000
        expect(levels[4]?.shortPrice).toBe(52000);

        // For 50x: 50000 * (1 + 1/50) = 50000 * 1.02 = 51000
        expect(levels[5]?.shortPrice).toBe(51000);

        // For 100x: 50000 * (1 + 1/100) = 50000 * 1.01 = 50500
        expect(levels[6]?.shortPrice).toBe(50500);
      });

      it('should calculate estimated volume with decay factor', () => {
        const currentPrice = 50000;
        const levels = calculateLiquidationLevels('BTCUSDT', currentPrice);

        // Estimated volume = baseVolume * decayFactor^(leverage/10)
        // decayFactor = 0.8, baseVolume = 1000000

        // For 2x: 1000000 * 0.8^(2/10) = 1000000 * 0.8^0.2 = 1000000 * 0.9564 = ~956458
        expect(levels[0]?.estimatedVolume).toBeCloseTo(BASE_VOLUME * Math.pow(VOLUME_DECAY_FACTOR, 2 / 10), 0);

        // For 10x: 1000000 * 0.8^(10/10) = 1000000 * 0.8^1 = 800000
        expect(levels[3]?.estimatedVolume).toBe(BASE_VOLUME * VOLUME_DECAY_FACTOR);

        // For 100x: 1000000 * 0.8^(100/10) = 1000000 * 0.8^10 = ~107374
        expect(levels[6]?.estimatedVolume).toBeCloseTo(BASE_VOLUME * Math.pow(VOLUME_DECAY_FACTOR, 10), 0);
      });

      it('should return correct number of levels', () => {
        const levels = calculateLiquidationLevels('BTCUSDT', 50000);
        expect(levels).toHaveLength(LEVERAGE_LEVELS.length);
      });

      it('should include correct leverage values in each level', () => {
        const levels = calculateLiquidationLevels('BTCUSDT', 50000);

        levels.forEach((level, index) => {
          expect(level.leverage).toBe(LEVERAGE_LEVELS[index]);
        });
      });

      it('should handle different price values', () => {
        // Test with lower price
        const levels100 = calculateLiquidationLevels('TESTUSDT', 100);
        expect(levels100[0]?.longPrice).toBe(50); // 2x: 100 * 0.5 = 50
        expect(levels100[0]?.shortPrice).toBe(150); // 2x: 100 * 1.5 = 150

        // Test with higher price
        const levels100k = calculateLiquidationLevels('BTCUSDT', 100000);
        expect(levels100k[0]?.longPrice).toBe(50000); // 2x: 100000 * 0.5 = 50000
        expect(levels100k[0]?.shortPrice).toBe(150000); // 2x: 100000 * 1.5 = 150000
      });
    });

    describe('getLiquidationMap', () => {
      beforeEach(() => {
        mockGetCachedTicker.mockReset();
        mockGetCachedLiquidations.mockReset();
        mockSetCachedLiquidations.mockReset();
      });

      it('should return cached liquidation map if available', async () => {
        const cachedMap: LiquidationMap = {
          symbol: 'BTCUSDT',
          currentPrice: 50000,
          levels: calculateLiquidationLevels('BTCUSDT', 50000),
          updatedAt: Date.now(),
        };
        mockGetCachedLiquidations.mockResolvedValue(cachedMap);

        const result = await getLiquidationMap('BTCUSDT');

        expect(result).toEqual(cachedMap);
        expect(mockGetCachedLiquidations).toHaveBeenCalledWith('BTCUSDT');
        expect(mockGetCachedTicker).not.toHaveBeenCalled();
      });

      it('should calculate and cache liquidation map when not in cache', async () => {
        mockGetCachedLiquidations.mockResolvedValue(null);
        mockGetCachedTicker.mockResolvedValue(mockTicker);

        const result = await getLiquidationMap('BTCUSDT');

        expect(result).not.toBeNull();
        expect(result?.symbol).toBe('BTCUSDT');
        expect(result?.currentPrice).toBe(50000);
        expect(result?.levels).toHaveLength(LEVERAGE_LEVELS.length);
        expect(mockSetCachedLiquidations).toHaveBeenCalledWith('BTCUSDT', expect.any(Object));
      });

      it('should return null if ticker not found', async () => {
        mockGetCachedLiquidations.mockResolvedValue(null);
        mockGetCachedTicker.mockResolvedValue(null);

        const result = await getLiquidationMap('UNKNOWNUSDT');

        expect(result).toBeNull();
        expect(mockSetCachedLiquidations).not.toHaveBeenCalled();
      });

      it('should include updatedAt timestamp', async () => {
        mockGetCachedLiquidations.mockResolvedValue(null);
        mockGetCachedTicker.mockResolvedValue(mockTicker);
        const beforeCall = Date.now();

        const result = await getLiquidationMap('BTCUSDT');

        const afterCall = Date.now();
        expect(result?.updatedAt).toBeGreaterThanOrEqual(beforeCall);
        expect(result?.updatedAt).toBeLessThanOrEqual(afterCall);
      });
    });
  });
});
