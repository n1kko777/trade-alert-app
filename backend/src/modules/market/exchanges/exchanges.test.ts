import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pino } from 'pino';
import { BinanceExchange } from './binance.js';
import { BybitExchange } from './bybit.js';
import { OkxExchange } from './okx.js';
import { MexcExchange } from './mexc.js';

const logger = pino({ level: 'silent' });

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Exchange Adapters', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseExchange validation', () => {
    const exchange = new BinanceExchange(logger);

    it('should throw error for empty symbol', async () => {
      await expect(exchange.getTicker('')).rejects.toThrow('Invalid symbol');
    });

    it('should throw error for null symbol', async () => {
      await expect(exchange.getTicker(null as unknown as string)).rejects.toThrow('Invalid symbol');
    });

    it('should throw error for empty interval in getCandles', async () => {
      await expect(exchange.getCandles('BTCUSDT', '')).rejects.toThrow('Invalid interval');
    });
  });

  describe('BinanceExchange', () => {
    let exchange: BinanceExchange;

    beforeEach(() => {
      exchange = new BinanceExchange(logger);
    });

    it('should have correct id and name', () => {
      expect(exchange.id).toBe('binance');
      expect(exchange.name).toBe('Binance');
    });

    describe('getTicker', () => {
      it('should return ticker data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            symbol: 'BTCUSDT',
            lastPrice: '50000.00',
            priceChange: '1000.00',
            priceChangePercent: '2.04',
            volume: '10000',
            highPrice: '51000.00',
            lowPrice: '49000.00',
          }),
        });

        const ticker = await exchange.getTicker('BTCUSDT');

        expect(ticker.symbol).toBe('BTCUSDT');
        expect(ticker.price).toBe(50000);
        expect(ticker.change24h).toBe(2.04);
        expect(ticker.volume24h).toBe(10000);
        expect(ticker.high24h).toBe(51000);
        expect(ticker.low24h).toBe(49000);
        expect(typeof ticker.timestamp).toBe('number');
      });

      it('should throw error on API failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        await expect(exchange.getTicker('BTCUSDT')).rejects.toThrow('Binance API error: 500');
      });
    });

    describe('getAllTickers', () => {
      it('should return filtered USDT tickers', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { symbol: 'BTCUSDT', lastPrice: '50000', priceChange: '1000', priceChangePercent: '2', volume: '10000', highPrice: '51000', lowPrice: '49000' },
            { symbol: 'ETHUSDT', lastPrice: '3000', priceChange: '100', priceChangePercent: '3.5', volume: '5000', highPrice: '3100', lowPrice: '2900' },
            { symbol: 'BTCBUSD', lastPrice: '50001', priceChange: '1001', priceChangePercent: '2.1', volume: '100', highPrice: '51001', lowPrice: '49001' },
          ],
        });

        const tickers = await exchange.getAllTickers();

        expect(tickers).toHaveLength(2);
        expect(tickers[0]!.symbol).toBe('BTCUSDT');
        expect(tickers[1]!.symbol).toBe('ETHUSDT');
      });
    });

    describe('getOrderBook', () => {
      it('should return order book data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bids: [['49999', '1.5'], ['49998', '2.0']],
            asks: [['50001', '1.0'], ['50002', '0.5']],
          }),
        });

        const orderBook = await exchange.getOrderBook('BTCUSDT', 10);

        expect(orderBook.symbol).toBe('BTCUSDT');
        expect(orderBook.bids).toHaveLength(2);
        expect(orderBook.asks).toHaveLength(2);
        expect(orderBook.bids[0]!.price).toBe(49999);
        expect(orderBook.bids[0]!.quantity).toBe(1.5);
        expect(orderBook.bids[0]!.total).toBe(1.5);
        expect(orderBook.bids[1]!.total).toBe(3.5);
        expect(orderBook.asks[0]!.price).toBe(50001);
      });
    });

    describe('getCandles', () => {
      it('should return candle data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            [1704067200000, '50000', '51000', '49500', '50500', '1000'],
            [1704067260000, '50500', '50800', '50200', '50600', '800'],
          ],
        });

        const candles = await exchange.getCandles('BTCUSDT', '1m', 2);

        expect(candles).toHaveLength(2);
        expect(candles[0]!.timestamp).toBe(1704067200000);
        expect(candles[0]!.open).toBe(50000);
        expect(candles[0]!.high).toBe(51000);
        expect(candles[0]!.low).toBe(49500);
        expect(candles[0]!.close).toBe(50500);
        expect(candles[0]!.volume).toBe(1000);
      });
    });
  });

  describe('BybitExchange', () => {
    let exchange: BybitExchange;

    beforeEach(() => {
      exchange = new BybitExchange(logger);
    });

    it('should have correct id and name', () => {
      expect(exchange.id).toBe('bybit');
      expect(exchange.name).toBe('Bybit');
    });

    describe('getTicker', () => {
      it('should return ticker data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            retCode: 0,
            retMsg: 'OK',
            result: {
              list: [{
                symbol: 'BTCUSDT',
                lastPrice: '50000',
                price24hPcnt: '0.02',
                volume24h: '10000',
                highPrice24h: '51000',
                lowPrice24h: '49000',
                prevPrice24h: '49000',
              }],
            },
          }),
        });

        const ticker = await exchange.getTicker('BTCUSDT');

        expect(ticker.symbol).toBe('BTCUSDT');
        expect(ticker.price).toBe(50000);
        expect(ticker.change24h).toBe(2);
        expect(ticker.volume24h).toBe(10000);
      });

      it('should throw error when retCode is not 0', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            retCode: 10001,
            retMsg: 'Symbol not found',
            result: { list: [] },
          }),
        });

        await expect(exchange.getTicker('INVALID')).rejects.toThrow('Bybit API error: Symbol not found');
      });

      it('should throw error when no data returned', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            retCode: 0,
            retMsg: 'OK',
            result: { list: [] },
          }),
        });

        await expect(exchange.getTicker('BTCUSDT')).rejects.toThrow('No ticker data');
      });
    });

    describe('getOrderBook', () => {
      it('should return order book data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            retCode: 0,
            retMsg: 'OK',
            result: {
              s: 'BTCUSDT',
              b: [['49999', '1.5']],
              a: [['50001', '1.0']],
            },
          }),
        });

        const orderBook = await exchange.getOrderBook('BTCUSDT');

        expect(orderBook.bids).toHaveLength(1);
        expect(orderBook.asks).toHaveLength(1);
      });
    });

    describe('getCandles', () => {
      it('should return candles in correct order (reversed)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            retCode: 0,
            retMsg: 'OK',
            result: {
              list: [
                ['1704067260000', '50500', '50800', '50200', '50600', '800'],
                ['1704067200000', '50000', '51000', '49500', '50500', '1000'],
              ],
            },
          }),
        });

        const candles = await exchange.getCandles('BTCUSDT', '1m');

        expect(candles).toHaveLength(2);
        expect(candles[0]!.timestamp).toBe(1704067200000);
        expect(candles[1]!.timestamp).toBe(1704067260000);
      });

      it('should map interval correctly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            retCode: 0,
            retMsg: 'OK',
            result: { list: [] },
          }),
        });

        await exchange.getCandles('BTCUSDT', '1h');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('interval=60'),
          expect.any(Object)
        );
      });
    });
  });

  describe('OkxExchange', () => {
    let exchange: OkxExchange;

    beforeEach(() => {
      exchange = new OkxExchange(logger);
    });

    it('should have correct id and name', () => {
      expect(exchange.id).toBe('okx');
      expect(exchange.name).toBe('OKX');
    });

    describe('getTicker', () => {
      it('should convert symbol format and return ticker', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '0',
            msg: '',
            data: [{
              instId: 'BTC-USDT',
              last: '50000',
              open24h: '49000',
              high24h: '51000',
              low24h: '48500',
              vol24h: '10000',
            }],
          }),
        });

        const ticker = await exchange.getTicker('BTCUSDT');

        expect(ticker.symbol).toBe('BTCUSDT');
        expect(ticker.price).toBe(50000);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('instId=BTC-USDT'),
          expect.any(Object)
        );
      });

      it('should calculate price change correctly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '0',
            msg: '',
            data: [{
              instId: 'BTC-USDT',
              last: '51000',
              open24h: '50000',
              high24h: '52000',
              low24h: '49000',
              vol24h: '10000',
            }],
          }),
        });

        const ticker = await exchange.getTicker('BTCUSDT');

        expect(ticker.change24h).toBe(2); // (51000 - 50000) / 50000 * 100
      });

      it('should throw error when code is not 0', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '51001',
            msg: 'Instrument ID does not exist',
            data: [],
          }),
        });

        await expect(exchange.getTicker('INVALID')).rejects.toThrow('OKX API error');
      });
    });

    describe('getAllTickers', () => {
      it('should filter and convert USDT pairs', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '0',
            msg: '',
            data: [
              { instId: 'BTC-USDT', last: '50000', open24h: '49000', high24h: '51000', low24h: '48500', vol24h: '10000' },
              { instId: 'ETH-USDT', last: '3000', open24h: '2900', high24h: '3100', low24h: '2800', vol24h: '5000' },
              { instId: 'BTC-USDC', last: '50001', open24h: '49001', high24h: '51001', low24h: '48501', vol24h: '100' },
            ],
          }),
        });

        const tickers = await exchange.getAllTickers();

        expect(tickers).toHaveLength(2);
        expect(tickers[0]!.symbol).toBe('BTCUSDT');
        expect(tickers[1]!.symbol).toBe('ETHUSDT');
      });
    });

    describe('getOrderBook', () => {
      it('should return order book with correct mapping', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '0',
            msg: '',
            data: [{
              bids: [['49999', '1.5', '0', '1']],
              asks: [['50001', '1.0', '0', '1']],
            }],
          }),
        });

        const orderBook = await exchange.getOrderBook('BTCUSDT');

        expect(orderBook.symbol).toBe('BTCUSDT');
        expect(orderBook.bids[0]!.price).toBe(49999);
        expect(orderBook.asks[0]!.price).toBe(50001);
      });
    });

    describe('getCandles', () => {
      it('should return candles in reversed order', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '0',
            msg: '',
            data: [
              ['1704067260000', '50500', '50800', '50200', '50600', '800'],
              ['1704067200000', '50000', '51000', '49500', '50500', '1000'],
            ],
          }),
        });

        const candles = await exchange.getCandles('BTCUSDT', '1m');

        expect(candles[0]!.timestamp).toBe(1704067200000);
      });

      it('should map interval correctly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '0',
            msg: '',
            data: [],
          }),
        });

        await exchange.getCandles('BTCUSDT', '1h');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('bar=1H'),
          expect.any(Object)
        );
      });
    });
  });

  describe('MexcExchange', () => {
    let exchange: MexcExchange;

    beforeEach(() => {
      exchange = new MexcExchange(logger);
    });

    it('should have correct id and name', () => {
      expect(exchange.id).toBe('mexc');
      expect(exchange.name).toBe('MEXC');
    });

    describe('getTicker', () => {
      it('should return ticker data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            symbol: 'BTCUSDT',
            lastPrice: '50000.00',
            priceChange: '1000.00',
            priceChangePercent: '2.04',
            volume: '10000',
            highPrice: '51000.00',
            lowPrice: '49000.00',
          }),
        });

        const ticker = await exchange.getTicker('BTCUSDT');

        expect(ticker.symbol).toBe('BTCUSDT');
        expect(ticker.price).toBe(50000);
        expect(ticker.change24h).toBe(2.04);
      });
    });

    describe('getAllTickers', () => {
      it('should filter USDT pairs', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { symbol: 'BTCUSDT', lastPrice: '50000', priceChange: '1000', priceChangePercent: '2', volume: '10000', highPrice: '51000', lowPrice: '49000' },
            { symbol: 'ETHUSDT', lastPrice: '3000', priceChange: '100', priceChangePercent: '3.5', volume: '5000', highPrice: '3100', lowPrice: '2900' },
            { symbol: 'BTCETH', lastPrice: '16', priceChange: '0.1', priceChangePercent: '0.5', volume: '50', highPrice: '17', lowPrice: '15' },
          ],
        });

        const tickers = await exchange.getAllTickers();

        expect(tickers).toHaveLength(2);
      });
    });

    describe('getOrderBook', () => {
      it('should return order book data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bids: [['49999', '1.5']],
            asks: [['50001', '1.0']],
          }),
        });

        const orderBook = await exchange.getOrderBook('BTCUSDT');

        expect(orderBook.bids).toHaveLength(1);
        expect(orderBook.asks).toHaveLength(1);
      });
    });

    describe('getCandles', () => {
      it('should return candle data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            [1704067200000, '50000', '51000', '49500', '50500', '1000'],
            [1704067260000, '50500', '50800', '50200', '50600', '800'],
          ],
        });

        const candles = await exchange.getCandles('BTCUSDT', '1m');

        expect(candles).toHaveLength(2);
        expect(candles[0]!.open).toBe(50000);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const exchange = new BinanceExchange(logger);

      await expect(exchange.getTicker('BTCUSDT')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const exchange = new BinanceExchange(logger);

      await expect(exchange.getTicker('BTCUSDT')).rejects.toThrow('Request timeout');
    });
  });
});
