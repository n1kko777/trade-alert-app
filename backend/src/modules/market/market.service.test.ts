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
  resetExchangeInstances,
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
});
