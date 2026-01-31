import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { marketRoutes } from './market.routes.js';
import errorHandlerPlugin from '../../plugins/errorHandler.js';
import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';
import type { OrderBook, Candle } from './exchanges/base.exchange.js';

// Mock the market service
const mockGetTickers = vi.fn();
const mockGetTicker = vi.fn();
const mockGetOrderBook = vi.fn();
const mockGetCandles = vi.fn();
const mockGetLiquidations = vi.fn();
const mockGetLiquidationMap = vi.fn();

vi.mock('./market.service.js', () => ({
  getTickers: (...args: unknown[]) => mockGetTickers(...args),
  getTicker: (...args: unknown[]) => mockGetTicker(...args),
  getOrderBook: (...args: unknown[]) => mockGetOrderBook(...args),
  getCandles: (...args: unknown[]) => mockGetCandles(...args),
  getLiquidations: (...args: unknown[]) => mockGetLiquidations(...args),
  getLiquidationMap: (...args: unknown[]) => mockGetLiquidationMap(...args),
}));

// Sample test data
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

const mockOrderBook: OrderBook = {
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

const mockCandles: Candle[] = [
  { timestamp: 1704067200000, open: 49000, high: 50500, low: 48500, close: 50000, volume: 1000 },
  { timestamp: 1704070800000, open: 50000, high: 51000, low: 49500, close: 50500, volume: 1200 },
];

describe('Market Controller', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ trustProxy: true });
    await app.register(errorHandlerPlugin);
    await app.register(fastifyJwt, { secret: 'test-secret' });
    await app.register(marketRoutes);
    await app.ready();

    // Generate a test access token
    accessToken = app.jwt.sign({
      userId: 'test-user-id',
      email: 'test@example.com',
      subscription: 'pro',
      type: 'access',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/market/tickers', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/tickers',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return all tickers from cache', async () => {
      mockGetTickers.mockResolvedValue([mockTicker]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/tickers',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tickers).toHaveLength(1);
      expect(body.tickers[0].symbol).toBe('BTCUSDT');
      expect(mockGetTickers).toHaveBeenCalled();
    });

    it('should return empty array when no tickers in cache', async () => {
      mockGetTickers.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/tickers',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tickers).toEqual([]);
    });
  });

  describe('GET /api/v1/market/ticker/:symbol', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/ticker/BTCUSDT',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return ticker for valid symbol', async () => {
      mockGetTicker.mockResolvedValue(mockTicker);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/ticker/BTCUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ticker.symbol).toBe('BTCUSDT');
      expect(body.ticker.price).toBe(50000);
      expect(mockGetTicker).toHaveBeenCalledWith('BTCUSDT');
    });

    it('should return 404 for unknown symbol', async () => {
      mockGetTicker.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/ticker/UNKNOWNUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate symbol format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/ticker/ab',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/market/orderbook/:symbol', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/orderbook/BTCUSDT',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return orderbook from service', async () => {
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/orderbook/BTCUSDT?exchange=binance',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.orderbook.symbol).toBe('BTCUSDT');
      expect(body.orderbook.bids).toHaveLength(2);
      expect(body.orderbook.asks).toHaveLength(2);
      expect(mockGetOrderBook).toHaveBeenCalledWith('binance', 'BTCUSDT', 20);
    });

    it('should use default exchange (binance) when not specified', async () => {
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/orderbook/BTCUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockGetOrderBook).toHaveBeenCalledWith('binance', 'BTCUSDT', 20);
    });

    it('should validate exchange parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/orderbook/BTCUSDT?exchange=invalid',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept depth parameter', async () => {
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/orderbook/BTCUSDT?exchange=binance&depth=50',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockGetOrderBook).toHaveBeenCalledWith('binance', 'BTCUSDT', 50);
    });

    it('should return 404 when orderbook not found', async () => {
      mockGetOrderBook.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/orderbook/BTCUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/market/candles/:symbol', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/candles/BTCUSDT',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return candles from service', async () => {
      mockGetCandles.mockResolvedValue(mockCandles);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/candles/BTCUSDT?exchange=binance&interval=1h',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.candles).toHaveLength(2);
      expect(body.candles[0].open).toBe(49000);
      expect(mockGetCandles).toHaveBeenCalledWith('binance', 'BTCUSDT', '1h', 100);
    });

    it('should use default values for exchange and interval', async () => {
      mockGetCandles.mockResolvedValue(mockCandles);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/candles/BTCUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockGetCandles).toHaveBeenCalledWith('binance', 'BTCUSDT', '1h', 100);
    });

    it('should validate interval parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/candles/BTCUSDT?interval=invalid',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate limit parameter range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/candles/BTCUSDT?limit=2000',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept custom limit parameter', async () => {
      mockGetCandles.mockResolvedValue(mockCandles);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/candles/BTCUSDT?limit=50',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockGetCandles).toHaveBeenCalledWith('binance', 'BTCUSDT', '1h', 50);
    });

    it('should return 404 when candles not found', async () => {
      mockGetCandles.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/candles/BTCUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/market/liquidations/:symbol', () => {
    const mockLiquidationMap = {
      symbol: 'BTCUSDT',
      currentPrice: 50000,
      levels: [
        { leverage: 2, longPrice: 25000, shortPrice: 75000, estimatedVolume: 956458 },
        { leverage: 3, longPrice: 33333.33, shortPrice: 66666.67, estimatedVolume: 928318 },
        { leverage: 5, longPrice: 40000, shortPrice: 60000, estimatedVolume: 885870 },
        { leverage: 10, longPrice: 45000, shortPrice: 55000, estimatedVolume: 800000 },
        { leverage: 25, longPrice: 48000, shortPrice: 52000, estimatedVolume: 640000 },
        { leverage: 50, longPrice: 49000, shortPrice: 51000, estimatedVolume: 512000 },
        { leverage: 100, longPrice: 49500, shortPrice: 50500, estimatedVolume: 107374 },
      ],
      updatedAt: Date.now(),
    };

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/liquidations/BTCUSDT',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return liquidation map when data is available', async () => {
      mockGetLiquidationMap.mockResolvedValue(mockLiquidationMap);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/liquidations/BTCUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.symbol).toBe('BTCUSDT');
      expect(body.currentPrice).toBe(50000);
      expect(body.levels).toHaveLength(7);
      expect(body.levels[0].leverage).toBe(2);
      expect(body.levels[0].longPrice).toBe(25000);
      expect(body.levels[0].shortPrice).toBe(75000);
      expect(body.updatedAt).toBeDefined();
      expect(mockGetLiquidationMap).toHaveBeenCalledWith('BTCUSDT');
    });

    it('should return 404 when symbol ticker not found', async () => {
      mockGetLiquidationMap.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/liquidations/UNKNOWNUSDT',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate symbol format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/liquidations/ab',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should normalize symbol to uppercase', async () => {
      mockGetLiquidationMap.mockResolvedValue(mockLiquidationMap);

      await app.inject({
        method: 'GET',
        url: '/api/v1/market/liquidations/btcusdt',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(mockGetLiquidationMap).toHaveBeenCalledWith('BTCUSDT');
    });
  });

  describe('Tier-based access control', () => {
    it('should allow free tier access to tickers', async () => {
      const freeToken = app.jwt.sign({
        userId: 'test-user-id',
        email: 'test@example.com',
        subscription: 'free',
        type: 'access',
      });
      mockGetTickers.mockResolvedValue([mockTicker]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/market/tickers',
        headers: { authorization: `Bearer ${freeToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
