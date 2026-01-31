import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PortfolioDbRow } from './portfolio.schema.js';
import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';

// Create mock functions
const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockGetCachedTickers = vi.fn();

// Mock database queries
vi.mock('../../db/queries/index.js', () => ({
  query: <T>(sql: string, params?: unknown[]) => mockQuery(sql, params) as Promise<T[]>,
  queryOne: <T>(sql: string, params?: unknown[]) => mockQueryOne(sql, params) as Promise<T | null>,
  execute: (sql: string, params?: unknown[]) => mockExecute(sql, params) as Promise<number>,
}));

// Mock cache service
vi.mock('../../services/cache.service.js', () => ({
  getCachedTickers: () => mockGetCachedTickers() as Promise<AggregatedTicker[] | null>,
}));

// Import after mocks
import {
  getPortfolio,
  addAsset,
  updateAsset,
  deleteAsset,
  getAssetById,
} from './portfolio.service.js';

describe('Portfolio Service', () => {
  const userId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockDbRow = (overrides: Partial<PortfolioDbRow> = {}): PortfolioDbRow => ({
    id: 'asset-id-1',
    user_id: userId,
    symbol: 'BTCUSDT',
    quantity: '1.5',
    avg_buy_price: '50000.00',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides,
  });

  const createMockTicker = (symbol: string, price: number): AggregatedTicker => ({
    symbol,
    price,
    volume24h: 1000000,
    change24h: 2.5,
    high24h: price * 1.05,
    low24h: price * 0.95,
    timestamp: Date.now(),
    exchanges: ['binance', 'bybit'],
  });

  describe('getPortfolio', () => {
    it('should return empty portfolio when user has no assets', async () => {
      mockQuery.mockResolvedValue([]);
      mockGetCachedTickers.mockResolvedValue([]);

      const result = await getPortfolio(userId);

      expect(result.assets).toEqual([]);
      expect(result.totalValue).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalPnl).toBe(0);
      expect(result.totalPnlAbsolute).toBe(0);
    });

    it('should return portfolio with calculated values', async () => {
      const mockRows = [
        createMockDbRow({ symbol: 'BTCUSDT', quantity: '1', avg_buy_price: '50000.00' }),
        createMockDbRow({ id: 'asset-id-2', symbol: 'ETHUSDT', quantity: '10', avg_buy_price: '3000.00' }),
      ];
      const mockTickers = [
        createMockTicker('BTCUSDT', 55000),  // BTC up 10%
        createMockTicker('ETHUSDT', 2700),   // ETH down 10%
      ];

      mockQuery.mockResolvedValue(mockRows);
      mockGetCachedTickers.mockResolvedValue(mockTickers);

      const result = await getPortfolio(userId);

      expect(result.assets).toHaveLength(2);
      expect(result.assetsWithPrice).toBe(2);
      expect(result.assetsWithoutPrice).toBe(0);

      // BTC: 1 * 55000 = 55000
      const btcAsset = result.assets.find((a) => a.symbol === 'BTCUSDT');
      expect(btcAsset?.currentPrice).toBe(55000);
      expect(btcAsset?.currentValue).toBe(55000);
      expect(btcAsset?.pnl).toBe(10); // (55000-50000)/50000 * 100 = 10%
      expect(btcAsset?.pnlAbsolute).toBe(5000); // 55000 - 50000

      // ETH: 10 * 2700 = 27000
      const ethAsset = result.assets.find((a) => a.symbol === 'ETHUSDT');
      expect(ethAsset?.currentPrice).toBe(2700);
      expect(ethAsset?.currentValue).toBe(27000);
      expect(ethAsset?.pnl).toBe(-10); // (2700-3000)/3000 * 100 = -10%
      expect(ethAsset?.pnlAbsolute).toBe(-3000); // 27000 - 30000

      // Total: 55000 + 27000 = 82000
      // Cost: 50000 + 30000 = 80000
      expect(result.totalValue).toBe(82000);
      expect(result.totalCost).toBe(80000);
      expect(result.totalPnlAbsolute).toBe(2000); // 82000 - 80000
      expect(result.totalPnl).toBe(2.5); // (2000/80000) * 100 = 2.5%
    });

    it('should handle assets without price data', async () => {
      const mockRows = [
        createMockDbRow({ symbol: 'BTCUSDT', quantity: '1', avg_buy_price: '50000.00' }),
        createMockDbRow({ id: 'asset-id-2', symbol: 'UNKNOWNUSDT', quantity: '100', avg_buy_price: '10.00' }),
      ];
      const mockTickers = [
        createMockTicker('BTCUSDT', 55000),
        // No ticker for UNKNOWNUSDT
      ];

      mockQuery.mockResolvedValue(mockRows);
      mockGetCachedTickers.mockResolvedValue(mockTickers);

      const result = await getPortfolio(userId);

      expect(result.assets).toHaveLength(2);
      expect(result.assetsWithPrice).toBe(1);
      expect(result.assetsWithoutPrice).toBe(1);

      const unknownAsset = result.assets.find((a) => a.symbol === 'UNKNOWNUSDT');
      expect(unknownAsset?.currentPrice).toBeNull();
      expect(unknownAsset?.currentValue).toBeNull();
      expect(unknownAsset?.pnl).toBeNull();
      expect(unknownAsset?.pnlAbsolute).toBeNull();

      // Total value should only include assets with prices
      expect(result.totalValue).toBe(55000);
      // Total cost includes all assets
      expect(result.totalCost).toBe(51000); // 50000 + 1000
    });

    it('should handle no cached tickers', async () => {
      const mockRows = [
        createMockDbRow({ symbol: 'BTCUSDT', quantity: '1', avg_buy_price: '50000.00' }),
      ];

      mockQuery.mockResolvedValue(mockRows);
      mockGetCachedTickers.mockResolvedValue(null);

      const result = await getPortfolio(userId);

      expect(result.assets).toHaveLength(1);
      expect(result.assetsWithPrice).toBe(0);
      expect(result.assetsWithoutPrice).toBe(1);
      expect(result.assets[0]?.currentPrice).toBeNull();
    });
  });

  describe('addAsset', () => {
    it('should add a new asset to portfolio', async () => {
      const mockRow = createMockDbRow();
      mockQueryOne.mockResolvedValue(mockRow);

      const input = {
        symbol: 'BTCUSDT',
        amount: 1.5,
        avgBuyPrice: 50000,
      };

      const result = await addAsset(userId, input);

      expect(mockQueryOne).toHaveBeenCalled();
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.amount).toBe(1.5);
      expect(result.avgBuyPrice).toBe(50000);
    });

    it('should normalize symbol to uppercase', async () => {
      const mockRow = createMockDbRow({ symbol: 'BTCUSDT' });
      mockQueryOne.mockResolvedValue(mockRow);

      const input = {
        symbol: 'btcusdt',
        amount: 1.5,
        avgBuyPrice: 50000,
      };

      await addAsset(userId, input);

      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['BTCUSDT'])
      );
    });

    it('should throw error if creation fails', async () => {
      mockQueryOne.mockResolvedValue(null);

      const input = {
        symbol: 'BTCUSDT',
        amount: 1.5,
        avgBuyPrice: 50000,
      };

      await expect(addAsset(userId, input)).rejects.toThrow('Failed to add asset');
    });
  });

  describe('updateAsset', () => {
    it('should update asset amount', async () => {
      const mockRow = createMockDbRow({ quantity: '2.0' });
      mockQueryOne
        .mockResolvedValueOnce(createMockDbRow()) // Initial check
        .mockResolvedValueOnce(mockRow); // Updated result

      const result = await updateAsset(userId, 'asset-id-1', { amount: 2.0 });

      expect(result.amount).toBe(2.0);
    });

    it('should update asset avgBuyPrice', async () => {
      const mockRow = createMockDbRow({ avg_buy_price: '55000.00' });
      mockQueryOne
        .mockResolvedValueOnce(createMockDbRow()) // Initial check
        .mockResolvedValueOnce(mockRow); // Updated result

      const result = await updateAsset(userId, 'asset-id-1', { avgBuyPrice: 55000 });

      expect(result.avgBuyPrice).toBe(55000);
    });

    it('should update both amount and avgBuyPrice', async () => {
      const mockRow = createMockDbRow({ quantity: '3.0', avg_buy_price: '60000.00' });
      mockQueryOne
        .mockResolvedValueOnce(createMockDbRow()) // Initial check
        .mockResolvedValueOnce(mockRow); // Updated result

      const result = await updateAsset(userId, 'asset-id-1', { amount: 3.0, avgBuyPrice: 60000 });

      expect(result.amount).toBe(3.0);
      expect(result.avgBuyPrice).toBe(60000);
    });

    it('should throw NotFoundError if asset does not exist', async () => {
      mockQueryOne.mockResolvedValue(null);

      await expect(
        updateAsset(userId, 'non-existent-id', { amount: 2.0 })
      ).rejects.toThrow('Asset not found');
    });

    it('should throw NotFoundError if asset belongs to different user', async () => {
      const mockRow = createMockDbRow({ user_id: 'different-user-id' });
      mockQueryOne.mockResolvedValue(mockRow);

      await expect(
        updateAsset(userId, 'asset-id-1', { amount: 2.0 })
      ).rejects.toThrow('Asset not found');
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset from portfolio', async () => {
      mockQueryOne.mockResolvedValue(createMockDbRow());
      mockExecute.mockResolvedValue(1);

      await expect(deleteAsset(userId, 'asset-id-1')).resolves.not.toThrow();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should throw NotFoundError if asset does not exist', async () => {
      mockQueryOne.mockResolvedValue(null);

      await expect(deleteAsset(userId, 'non-existent-id')).rejects.toThrow('Asset not found');
    });

    it('should throw NotFoundError if asset belongs to different user', async () => {
      const mockRow = createMockDbRow({ user_id: 'different-user-id' });
      mockQueryOne.mockResolvedValue(mockRow);

      await expect(deleteAsset(userId, 'asset-id-1')).rejects.toThrow('Asset not found');
    });
  });

  describe('getAssetById', () => {
    it('should return asset when found', async () => {
      const mockRow = createMockDbRow();
      mockQueryOne.mockResolvedValue(mockRow);

      const result = await getAssetById(userId, 'asset-id-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('asset-id-1');
      expect(result!.symbol).toBe('BTCUSDT');
    });

    it('should return null when asset not found', async () => {
      mockQueryOne.mockResolvedValue(null);

      const result = await getAssetById(userId, 'non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null when asset belongs to different user', async () => {
      const mockRow = createMockDbRow({ user_id: 'different-user-id' });
      mockQueryOne.mockResolvedValue(mockRow);

      const result = await getAssetById(userId, 'asset-id-1');

      expect(result).toBeNull();
    });

    it('should convert DB row to PortfolioAsset type', async () => {
      const mockRow = createMockDbRow({
        quantity: '2.5',
        avg_buy_price: '45000.12345678',
      });
      mockQueryOne.mockResolvedValue(mockRow);

      const result = await getAssetById(userId, 'asset-id-1');

      expect(result!.amount).toBe(2.5);
      expect(result!.avgBuyPrice).toBe(45000.12345678);
    });
  });
});
