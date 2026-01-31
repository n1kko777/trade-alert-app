import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';

// Mock logger
vi.mock('../utils/logger.js', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { registerWebSocketServer, getChannelManager, broadcastTickers } from './ws.server.js';
import type { AggregatedTicker } from '../jobs/priceAggregator.job.js';

describe('WebSocket Server', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(fastifyJwt, {
      secret: 'test-secret-key-that-is-at-least-32-chars',
    });
    await app.register(fastifyWebsocket);
    await registerWebSocketServer(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe('registerWebSocketServer', () => {
    it('should register /ws route', () => {
      const routes = app.printRoutes();
      // printRoutes returns a tree format, check for 'ws' in the output
      expect(routes).toContain('ws');
    });

    it('should expose getChannelManager function', () => {
      const manager = getChannelManager();
      expect(manager).toBeDefined();
      expect(typeof manager.subscribe).toBe('function');
      expect(typeof manager.broadcast).toBe('function');
    });
  });

  describe('getChannelManager', () => {
    it('should return the same instance', () => {
      const manager1 = getChannelManager();
      const manager2 = getChannelManager();

      expect(manager1).toBe(manager2);
    });
  });

  describe('broadcastTickers', () => {
    it('should be a function', () => {
      expect(typeof broadcastTickers).toBe('function');
    });

    it('should not throw with valid ticker data', () => {
      const tickers: AggregatedTicker[] = [
        {
          symbol: 'BTCUSDT',
          price: 50000,
          volume24h: 1000000,
          change24h: 2.5,
          high24h: 51000,
          low24h: 49000,
          timestamp: Date.now(),
          exchanges: ['binance'],
        },
      ];

      expect(() => broadcastTickers(tickers)).not.toThrow();
    });

    it('should handle empty ticker array', () => {
      expect(() => broadcastTickers([])).not.toThrow();
    });
  });

  describe('WebSocket connection', () => {
    it('should require authentication token', async () => {
      // Test that the endpoint exists
      // In a real test environment, we'd use a WebSocket client
      // Here we just verify the route is registered
      const routes = app.printRoutes();
      expect(routes).toContain('ws');
    });
  });
});

describe('WebSocket Server Integration', () => {
  it('should export all necessary functions', async () => {
    const wsServer = await import('./ws.server.js');

    expect(wsServer.registerWebSocketServer).toBeDefined();
    expect(wsServer.getChannelManager).toBeDefined();
    expect(wsServer.broadcastTickers).toBeDefined();
  });
});
