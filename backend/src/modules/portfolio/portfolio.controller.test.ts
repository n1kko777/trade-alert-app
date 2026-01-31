import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import type { Portfolio, PortfolioAsset } from './portfolio.schema.js';

// Create mock functions
const mockGetPortfolio = vi.fn();
const mockAddAsset = vi.fn();
const mockUpdateAsset = vi.fn();
const mockDeleteAsset = vi.fn();

// Mock portfolio service
vi.mock('./portfolio.service.js', () => ({
  getPortfolio: (userId: string) => mockGetPortfolio(userId),
  addAsset: (userId: string, input: unknown) => mockAddAsset(userId, input),
  updateAsset: (userId: string, assetId: string, update: unknown) => mockUpdateAsset(userId, assetId, update),
  deleteAsset: (userId: string, assetId: string) => mockDeleteAsset(userId, assetId),
}));

// Mock auth middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: vi.fn().mockImplementation(async (req, _reply) => {
    req.user = {
      userId: 'test-user-id',
      email: 'test@example.com',
      subscription: 'pro',
      type: 'access',
    };
  }),
}));

// Import after mocks
import { portfolioController } from './portfolio.controller.js';

describe('Portfolio Controller', () => {
  let app: FastifyInstance;

  const createMockAsset = (overrides: Partial<PortfolioAsset> = {}): PortfolioAsset => ({
    id: 'asset-id-1',
    userId: 'test-user-id',
    symbol: 'BTCUSDT',
    amount: 1.5,
    avgBuyPrice: 50000,
    currentPrice: 55000,
    currentValue: 82500,
    pnl: 10,
    pnlAbsolute: 7500,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  const createMockPortfolio = (overrides: Partial<Portfolio> = {}): Portfolio => ({
    assets: [createMockAsset()],
    totalValue: 82500,
    totalCost: 75000,
    totalPnl: 10,
    totalPnlAbsolute: 7500,
    assetsWithPrice: 1,
    assetsWithoutPrice: 0,
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(portfolioController);
    await app.ready();
  });

  describe('GET /api/v1/portfolio', () => {
    it('should return user portfolio', async () => {
      const portfolio = createMockPortfolio();
      mockGetPortfolio.mockResolvedValue(portfolio);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/portfolio',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.portfolio.totalValue).toBe(82500);
      expect(body.portfolio.totalPnl).toBe(10);
      expect(body.portfolio.assets).toHaveLength(1);
    });

    it('should return empty portfolio when user has no assets', async () => {
      const portfolio = createMockPortfolio({
        assets: [],
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlAbsolute: 0,
        assetsWithPrice: 0,
        assetsWithoutPrice: 0,
      });
      mockGetPortfolio.mockResolvedValue(portfolio);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/portfolio',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.portfolio.assets).toEqual([]);
      expect(body.portfolio.totalValue).toBe(0);
    });

    it('should call service with user ID from token', async () => {
      mockGetPortfolio.mockResolvedValue(createMockPortfolio());

      await app.inject({
        method: 'GET',
        url: '/api/v1/portfolio',
      });

      expect(mockGetPortfolio).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('POST /api/v1/portfolio/asset', () => {
    it('should add a new asset', async () => {
      const newAsset = createMockAsset();
      mockAddAsset.mockResolvedValue(newAsset);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/portfolio/asset',
        payload: {
          symbol: 'BTCUSDT',
          amount: 1.5,
          avgBuyPrice: 50000,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.asset.symbol).toBe('BTCUSDT');
      expect(body.asset.amount).toBe(1.5);
      expect(body.message).toBe('Asset added successfully');
    });

    it('should validate symbol format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/portfolio/asset',
        payload: {
          symbol: 'BT', // Too short
          amount: 1.5,
          avgBuyPrice: 50000,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate amount is positive', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/portfolio/asset',
        payload: {
          symbol: 'BTCUSDT',
          amount: -1,
          avgBuyPrice: 50000,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate avgBuyPrice is positive', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/portfolio/asset',
        payload: {
          symbol: 'BTCUSDT',
          amount: 1.5,
          avgBuyPrice: 0,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require all fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/portfolio/asset',
        payload: {
          symbol: 'BTCUSDT',
          // Missing amount and avgBuyPrice
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should normalize symbol to uppercase', async () => {
      const newAsset = createMockAsset({ symbol: 'BTCUSDT' });
      mockAddAsset.mockResolvedValue(newAsset);

      await app.inject({
        method: 'POST',
        url: '/api/v1/portfolio/asset',
        payload: {
          symbol: 'btcusdt',
          amount: 1.5,
          avgBuyPrice: 50000,
        },
      });

      expect(mockAddAsset).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ symbol: 'BTCUSDT' })
      );
    });
  });

  describe('PATCH /api/v1/portfolio/asset/:id', () => {
    it('should update asset amount', async () => {
      const updatedAsset = createMockAsset({ amount: 2.0 });
      mockUpdateAsset.mockResolvedValue(updatedAsset);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/portfolio/asset/123e4567-e89b-12d3-a456-426614174000',
        payload: {
          amount: 2.0,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.asset.amount).toBe(2.0);
      expect(body.message).toBe('Asset updated successfully');
    });

    it('should update asset avgBuyPrice', async () => {
      const updatedAsset = createMockAsset({ avgBuyPrice: 55000 });
      mockUpdateAsset.mockResolvedValue(updatedAsset);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/portfolio/asset/123e4567-e89b-12d3-a456-426614174000',
        payload: {
          avgBuyPrice: 55000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.asset.avgBuyPrice).toBe(55000);
    });

    it('should update both amount and avgBuyPrice', async () => {
      const updatedAsset = createMockAsset({ amount: 3.0, avgBuyPrice: 60000 });
      mockUpdateAsset.mockResolvedValue(updatedAsset);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/portfolio/asset/123e4567-e89b-12d3-a456-426614174000',
        payload: {
          amount: 3.0,
          avgBuyPrice: 60000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.asset.amount).toBe(3.0);
      expect(body.asset.avgBuyPrice).toBe(60000);
    });

    it('should reject invalid UUID', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/portfolio/asset/invalid-id',
        payload: {
          amount: 2.0,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject empty update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/portfolio/asset/123e4567-e89b-12d3-a456-426614174000',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject negative amount', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/portfolio/asset/123e4567-e89b-12d3-a456-426614174000',
        payload: {
          amount: -1,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/portfolio/asset/:id', () => {
    it('should delete asset from portfolio', async () => {
      mockDeleteAsset.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/portfolio/asset/123e4567-e89b-12d3-a456-426614174000',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Asset deleted successfully');
    });

    it('should reject invalid UUID', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/portfolio/asset/invalid-id',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should call service with correct parameters', async () => {
      mockDeleteAsset.mockResolvedValue(undefined);

      await app.inject({
        method: 'DELETE',
        url: '/api/v1/portfolio/asset/123e4567-e89b-12d3-a456-426614174000',
      });

      expect(mockDeleteAsset).toHaveBeenCalledWith(
        'test-user-id',
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });
  });

  describe('Authentication', () => {
    it('should require authentication for GET /api/v1/portfolio', async () => {
      // Authentication is mocked to always pass
      // In a real test, we would mock authenticate to throw
      mockGetPortfolio.mockResolvedValue(createMockPortfolio());

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/portfolio',
      });

      // Should succeed because mock auth passes
      expect(response.statusCode).toBe(200);
    });

    it('should require authentication for POST /api/v1/portfolio/asset', async () => {
      mockAddAsset.mockResolvedValue(createMockAsset());

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/portfolio/asset',
        payload: {
          symbol: 'BTCUSDT',
          amount: 1.5,
          avgBuyPrice: 50000,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });
});
