import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiTrigger } from './signals.schema.js';

// Create mock functions
const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

// Mock database queries
vi.mock('../../db/queries/index.js', () => ({
  query: <T>(sql: string, params?: unknown[]) => mockQuery(sql, params) as Promise<T[]>,
  queryOne: <T>(sql: string, params?: unknown[]) => mockQueryOne(sql, params) as Promise<T | null>,
  execute: (sql: string, params?: unknown[]) => mockExecute(sql, params) as Promise<number>,
}));

// Import after mocks
import {
  createSignal,
  getSignals,
  getSignalById,
  updateSignalStatus,
  getSignalStats,
  getActiveSignals,
  closeSignal,
  getSignalsForTier,
} from './signals.service.js';

describe('Signals Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSignalRow = (overrides = {}) => ({
    id: 'test-id',
    symbol: 'BTCUSDT',
    exchange: 'binance',
    direction: 'buy' as const,
    entry_price: '50000.00000000',
    stop_loss: '49000.00000000',
    take_profit_1: '51000.00000000',
    take_profit_2: '52000.00000000',
    take_profit_3: '53000.00000000',
    ai_confidence: 75,
    ai_triggers: [{ type: 'pump_detection', confidence: 75 }] as AiTrigger[],
    status: 'active',
    result_pnl: null,
    closed_at: null,
    created_at: new Date('2024-01-01'),
    min_tier: 'free',
    ...overrides,
  });

  describe('createSignal', () => {
    it('should create a signal and return it', async () => {
      const mockRow = createMockSignalRow();
      mockQueryOne.mockResolvedValue(mockRow);

      const input = {
        symbol: 'BTCUSDT',
        exchange: 'binance',
        direction: 'buy' as const,
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit1: 51000,
        takeProfit2: 52000,
        takeProfit3: 53000,
        aiConfidence: 75,
        aiTriggers: [{ type: 'pump_detection' as const, confidence: 75 }],
        minTier: 'free' as const,
      };

      const result = await createSignal(input);

      expect(mockQueryOne).toHaveBeenCalled();
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.entryPrice).toBe(50000);
      expect(result.status).toBe('active');
    });

    it('should normalize symbol to uppercase', async () => {
      const mockRow = createMockSignalRow({ symbol: 'BTCUSDT' });
      mockQueryOne.mockResolvedValue(mockRow);

      const input = {
        symbol: 'btcusdt',
        exchange: 'binance',
        direction: 'buy' as const,
        entryPrice: 50000,
        stopLoss: 49000,
        minTier: 'free' as const,
      };

      await createSignal(input);

      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['BTCUSDT'])
      );
    });

    it('should throw error if creation fails', async () => {
      mockQueryOne.mockResolvedValue(null);

      const input = {
        symbol: 'BTCUSDT',
        exchange: 'binance',
        direction: 'buy' as const,
        entryPrice: 50000,
        stopLoss: 49000,
        minTier: 'free' as const,
      };

      await expect(createSignal(input)).rejects.toThrow('Failed to create signal');
    });
  });

  describe('getSignals', () => {
    it('should return all signals when no filters', async () => {
      const mockRows = [
        createMockSignalRow({ id: '1', symbol: 'BTCUSDT' }),
        createMockSignalRow({ id: '2', symbol: 'ETHUSDT' }),
      ];
      mockQuery.mockResolvedValue(mockRows);

      const result = await getSignals();

      expect(result).toHaveLength(2);
      expect(result[0]!.symbol).toBe('BTCUSDT');
      expect(result[1]!.symbol).toBe('ETHUSDT');
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValue([]);

      await getSignals({ status: 'active' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.arrayContaining(['active'])
      );
    });

    it('should filter by symbol', async () => {
      mockQuery.mockResolvedValue([]);

      await getSignals({ symbol: 'btcusdt' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('symbol = $'),
        expect.arrayContaining(['BTCUSDT']) // Normalized
      );
    });

    it('should apply pagination', async () => {
      mockQuery.mockResolvedValue([]);

      await getSignals({ limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 20])
      );
    });

    it('should use default pagination values', async () => {
      mockQuery.mockResolvedValue([]);

      await getSignals();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([20, 0]) // Default limit and offset
      );
    });
  });

  describe('getSignalById', () => {
    it('should return signal when found', async () => {
      const mockRow = createMockSignalRow();
      mockQueryOne.mockResolvedValue(mockRow);

      const result = await getSignalById('test-id');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('test-id');
    });

    it('should return null when not found', async () => {
      mockQueryOne.mockResolvedValue(null);

      const result = await getSignalById('non-existent');

      expect(result).toBeNull();
    });

    it('should convert DB row to Signal type', async () => {
      const mockRow = createMockSignalRow({
        entry_price: '12345.67890000',
        take_profit_1: '12500.00000000',
        result_pnl: '2.50',
      });
      mockQueryOne.mockResolvedValue(mockRow);

      const result = await getSignalById('test-id');

      expect(result!.entryPrice).toBe(12345.6789);
      expect(result!.takeProfit1).toBe(12500);
      expect(result!.resultPnl).toBe(2.5);
    });
  });

  describe('updateSignalStatus', () => {
    it('should update status without PnL', async () => {
      mockExecute.mockResolvedValue(1);

      await updateSignalStatus('test-id', 'tp1_hit');

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['tp1_hit', null, false, 'test-id'])
      );
    });

    it('should update status with PnL', async () => {
      mockExecute.mockResolvedValue(1);

      await updateSignalStatus('test-id', 'closed', 2.5);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['closed', 2.5, true, 'test-id'])
      );
    });

    it('should set closed_at for closed status', async () => {
      mockExecute.mockResolvedValue(1);

      await updateSignalStatus('test-id', 'closed');

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('closed_at'),
        expect.arrayContaining([true]) // isClosed
      );
    });
  });

  describe('getSignalStats', () => {
    it('should return aggregated statistics', async () => {
      mockQueryOne
        .mockResolvedValueOnce({
          total: '100',
          active: '10',
          closed: '90',
        })
        .mockResolvedValueOnce({
          avg_pnl: '2.50',
          total_pnl: '225.00',
          win_count: '60',
          total_with_pnl: '90',
        });
      mockQuery.mockResolvedValue([
        { trigger_type: 'pump_detection', count: '40' },
        { trigger_type: 'volume_anomaly', count: '30' },
      ]);

      const result = await getSignalStats();

      expect(result.totalSignals).toBe(100);
      expect(result.activeSignals).toBe(10);
      expect(result.closedSignals).toBe(90);
      expect(result.winRate).toBeCloseTo(66.67, 1);
      expect(result.averagePnl).toBe(2.5);
      expect(result.totalPnl).toBe(225);
      expect(result.signalsByTrigger).toEqual({
        pump_detection: 40,
        volume_anomaly: 30,
      });
    });

    it('should handle zero values correctly', async () => {
      mockQueryOne
        .mockResolvedValueOnce({
          total: '0',
          active: '0',
          closed: '0',
        })
        .mockResolvedValueOnce({
          avg_pnl: null,
          total_pnl: null,
          win_count: '0',
          total_with_pnl: '0',
        });
      mockQuery.mockResolvedValue([]);

      const result = await getSignalStats();

      expect(result.totalSignals).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.averagePnl).toBe(0);
      expect(result.totalPnl).toBe(0);
      expect(result.signalsByTrigger).toEqual({});
    });
  });

  describe('getActiveSignals', () => {
    it('should return only active signals', async () => {
      const mockRows = [
        createMockSignalRow({ id: '1', status: 'active' }),
        createMockSignalRow({ id: '2', status: 'active' }),
      ];
      mockQuery.mockResolvedValue(mockRows);

      const result = await getActiveSignals();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        undefined
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('closeSignal', () => {
    it('should close signal with calculated PnL for buy', async () => {
      mockQueryOne.mockResolvedValue(
        createMockSignalRow({
          direction: 'buy',
          entry_price: '50000.00000000',
        })
      );
      mockExecute.mockResolvedValue(1);

      await closeSignal('test-id', 'tp1_hit', 51000);

      // PnL = (51000 - 50000) / 50000 * 100 = 2%
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['tp1_hit', 2])
      );
    });

    it('should close signal with calculated PnL for sell', async () => {
      mockQueryOne.mockResolvedValue(
        createMockSignalRow({
          direction: 'sell',
          entry_price: '50000.00000000',
        })
      );
      mockExecute.mockResolvedValue(1);

      await closeSignal('test-id', 'tp1_hit', 49000);

      // PnL for sell = (50000 - 49000) / 50000 * 100 = 2%
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['tp1_hit', 2])
      );
    });

    it('should handle non-existent signal', async () => {
      mockQueryOne.mockResolvedValue(null);

      await closeSignal('non-existent', 'tp1_hit', 51000);

      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('getSignalsForTier', () => {
    it('should return signals accessible by free tier', async () => {
      const mockRows = [createMockSignalRow({ min_tier: 'free' })];
      mockQuery.mockResolvedValue(mockRows);

      await getSignalsForTier('free', 10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([['free'], 10])
      );
    });

    it('should return signals accessible by pro tier', async () => {
      mockQuery.mockResolvedValue([]);

      await getSignalsForTier('pro', 10);

      // Pro can access free and pro
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.arrayContaining(['free', 'pro']), 10])
      );
    });

    it('should return signals accessible by premium tier', async () => {
      mockQuery.mockResolvedValue([]);

      await getSignalsForTier('premium', 10);

      // Premium can access free, pro, and premium
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.arrayContaining(['free', 'pro', 'premium']),
          10,
        ])
      );
    });
  });
});
