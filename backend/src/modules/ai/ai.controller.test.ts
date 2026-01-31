import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { aiRoutes } from './ai.routes.js';
import errorHandlerPlugin from '../../plugins/errorHandler.js';
import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';

// Mock AI service
const mockAnalyzeSymbol = vi.fn();
const mockChat = vi.fn();
vi.mock('./ai.service.js', () => ({
  analyzeSymbol: (...args: unknown[]) => mockAnalyzeSymbol(...args),
  chat: (...args: unknown[]) => mockChat(...args),
  AI_RATE_LIMITS: { pro: 10, premium: 50, vip: 100 },
}));

// Mock market service
const mockGetTicker = vi.fn();
const mockGetOrderBook = vi.fn();
vi.mock('../market/market.service.js', () => ({
  getTicker: (...args: unknown[]) => mockGetTicker(...args),
  getOrderBook: (...args: unknown[]) => mockGetOrderBook(...args),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('AI Controller', () => {
  let app: FastifyInstance;
  let validToken: string;
  let freeToken: string;

  const mockTicker: AggregatedTicker = {
    symbol: 'BTCUSDT',
    price: 50000,
    volume24h: 1000000000,
    change24h: 2.5,
    high24h: 51000,
    low24h: 49000,
    timestamp: Date.now(),
    exchanges: ['binance', 'bybit'],
  };

  const mockOrderBook = {
    symbol: 'BTCUSDT',
    bids: [{ price: 49990, quantity: 10, total: 499900 }],
    asks: [{ price: 50010, quantity: 10, total: 500100 }],
    timestamp: Date.now(),
  };

  const mockAnalysisResult = {
    symbol: 'BTCUSDT',
    analysis: '## Market Analysis\nBTC is showing strong momentum...',
    tokensUsed: 500,
    generatedAt: Date.now(),
    rateLimit: { remaining: 9, limit: 10, resetAt: Date.now() + 3600000 },
  };

  const mockChatResult = {
    message: 'RSI (Relative Strength Index) is a momentum indicator...',
    tokensUsed: 200,
    rateLimit: { remaining: 8, limit: 10, resetAt: Date.now() + 3600000 },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();

    // Register error handler
    await app.register(errorHandlerPlugin);

    // Register JWT
    await app.register(fastifyJwt, {
      secret: 'test-secret-key-for-jwt-signing-32-chars',
    });

    // Register AI routes
    await app.register(aiRoutes);

    await app.ready();

    // Create valid pro token
    validToken = app.jwt.sign({
      userId: 'user-123',
      email: 'test@example.com',
      subscription: 'pro',
      type: 'access',
    });

    // Create free tier token
    freeToken = app.jwt.sign({
      userId: 'user-456',
      email: 'free@example.com',
      subscription: 'free',
      type: 'access',
    });

    // Default mock implementations
    mockGetTicker.mockResolvedValue(mockTicker);
    mockGetOrderBook.mockResolvedValue(mockOrderBook);
    mockAnalyzeSymbol.mockResolvedValue(mockAnalysisResult);
    mockChat.mockResolvedValue(mockChatResult);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/ai/analyze/:symbol', () => {
    it('should analyze a symbol successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/BTCUSDT',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.symbol).toBe('BTCUSDT');
      expect(body.data.analysis).toBeDefined();
      expect(body.rateLimit).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/BTCUSDT',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should require pro tier or higher', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/BTCUSDT',
        headers: { Authorization: `Bearer ${freeToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 if symbol not found', async () => {
      mockGetTicker.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/INVALIDCOIN',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate symbol format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/BT',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should convert symbol to uppercase', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/btcusdt',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(mockGetTicker).toHaveBeenCalledWith('BTCUSDT');
    });

    it('should call analyzeSymbol with correct parameters', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/BTCUSDT',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(mockAnalyzeSymbol).toHaveBeenCalledWith(
        'BTCUSDT',
        mockTicker,
        'user-123',
        'pro',
        mockOrderBook
      );
    });

    it('should work without orderbook if not available', async () => {
      mockGetOrderBook.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/BTCUSDT',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockAnalyzeSymbol).toHaveBeenCalledWith(
        'BTCUSDT',
        mockTicker,
        'user-123',
        'pro',
        undefined
      );
    });

    it('should handle rate limit errors', async () => {
      const { RateLimitError } = await import('../../utils/errors.js');
      mockAnalyzeSymbol.mockRejectedValue(new RateLimitError('AI rate limit exceeded'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/analyze/BTCUSDT',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(429);
    });
  });

  describe('POST /api/v1/ai/chat', () => {
    const validChatBody = {
      messages: [
        { role: 'user', content: 'What is RSI?' },
      ],
    };

    it('should chat successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        payload: validChatBody,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBeDefined();
      expect(body.rateLimit).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: { 'Content-Type': 'application/json' },
        payload: validChatBody,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should require pro tier or higher', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${freeToken}`,
          'Content-Type': 'application/json',
        },
        payload: validChatBody,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should validate messages array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        payload: { messages: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate message content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          messages: [{ role: 'user', content: '' }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept context with symbol', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          messages: [{ role: 'user', content: 'Analyze this coin' }],
          context: { symbol: 'BTCUSDT' },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockChat).toHaveBeenCalledWith(
        'user-123',
        [{ role: 'user', content: 'Analyze this coin' }],
        'pro',
        expect.objectContaining({
          symbol: 'BTCUSDT',
          currentPrice: 50000,
          priceChange24h: 2.5,
        })
      );
    });

    it('should use provided context when ticker not found', async () => {
      mockGetTicker.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          messages: [{ role: 'user', content: 'What do you think?' }],
          context: {
            symbol: 'NEWCOIN',
            currentPrice: 1.5,
            priceChange24h: 10.5,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockChat).toHaveBeenCalledWith(
        'user-123',
        [{ role: 'user', content: 'What do you think?' }],
        'pro',
        expect.objectContaining({
          symbol: 'NEWCOIN',
          currentPrice: 1.5,
          priceChange24h: 10.5,
        })
      );
    });

    it('should handle conversation history', async () => {
      const conversationBody = {
        messages: [
          { role: 'user', content: 'What is RSI?' },
          { role: 'assistant', content: 'RSI stands for Relative Strength Index...' },
          { role: 'user', content: 'How do I use it?' },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        payload: conversationBody,
      });

      expect(response.statusCode).toBe(200);
      expect(mockChat).toHaveBeenCalledWith(
        'user-123',
        conversationBody.messages,
        'pro',
        undefined
      );
    });

    it('should handle rate limit errors', async () => {
      const { RateLimitError } = await import('../../utils/errors.js');
      mockChat.mockRejectedValue(new RateLimitError('AI rate limit exceeded'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        payload: validChatBody,
      });

      expect(response.statusCode).toBe(429);
    });
  });

  describe('GET /api/v1/ai/limits', () => {
    it('should return rate limits for pro user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/limits',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.tier).toBe('pro');
      expect(body.data.limit).toBe(10);
      expect(body.data.limits).toEqual({ pro: 10, premium: 50, vip: 100 });
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/limits',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should require pro tier or higher', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/limits',
        headers: { Authorization: `Bearer ${freeToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return correct limits for premium user', async () => {
      const premiumToken = app.jwt.sign({
        userId: 'user-premium',
        email: 'premium@example.com',
        subscription: 'premium',
        type: 'access',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/limits',
        headers: { Authorization: `Bearer ${premiumToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.tier).toBe('premium');
      expect(body.data.limit).toBe(50);
    });
  });
});
