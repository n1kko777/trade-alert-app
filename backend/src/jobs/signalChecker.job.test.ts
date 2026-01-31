import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Signal } from '../modules/signals/signals.schema.js';

// Create mock functions
const mockGetActiveSignals = vi.fn();
const mockCloseSignal = vi.fn();
const mockGetCachedTicker = vi.fn();
const mockBroadcastSignal = vi.fn();

// Mock dependencies
vi.mock('../modules/signals/signals.service.js', () => ({
  getActiveSignals: () => mockGetActiveSignals(),
  closeSignal: (id: string, status: string, exitPrice: number) =>
    mockCloseSignal(id, status, exitPrice),
}));

vi.mock('../services/cache.service.js', () => ({
  getCachedTicker: (symbol: string) => mockGetCachedTicker(symbol),
}));

vi.mock('../websocket/index.js', () => ({
  broadcastSignal: (signal: unknown) => mockBroadcastSignal(signal),
}));

vi.mock('../utils/logger.js', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import after mocks
import {
  checkSignal,
  scanActiveSignals,
  startSignalCheckerJob,
  stopSignalCheckerJob,
  isSignalCheckerJobRunning,
} from './signalChecker.job.js';

describe('Signal Checker Job', () => {
  const createSignal = (overrides: Partial<Signal> = {}): Signal => ({
    id: 'test-signal-id',
    symbol: 'BTCUSDT',
    exchange: 'binance',
    direction: 'buy',
    entryPrice: 50000,
    stopLoss: 49000,
    takeProfit1: 51000,
    takeProfit2: 52000,
    takeProfit3: 53000,
    aiConfidence: 75,
    aiTriggers: [{ type: 'pump_detection', confidence: 75 }],
    status: 'active',
    resultPnl: null,
    closedAt: null,
    createdAt: new Date(),
    minTier: 'free',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopSignalCheckerJob();
  });

  describe('checkSignal', () => {
    it('should return null when no cached price', async () => {
      mockGetCachedTicker.mockResolvedValue(null);
      const signal = createSignal();

      const result = await checkSignal(signal);

      expect(result).toBeNull();
    });

    it('should detect stop loss hit for buy signal', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 48500 }); // Below SL of 49000
      const signal = createSignal({ direction: 'buy', stopLoss: 49000 });

      const result = await checkSignal(signal);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('closed');
      expect(result!.exitPrice).toBe(49000);
      expect(result!.pnlPct).toBeLessThan(0); // Negative PnL for SL hit
    });

    it('should detect stop loss hit for sell signal', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 51500 }); // Above SL of 51000
      const signal = createSignal({
        direction: 'sell',
        entryPrice: 50000,
        stopLoss: 51000,
        takeProfit1: 49000,
        takeProfit2: 48000,
        takeProfit3: 47000,
      });

      const result = await checkSignal(signal);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('closed');
    });

    it('should detect TP1 hit for buy signal', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 51500 }); // Above TP1 of 51000
      const signal = createSignal({
        direction: 'buy',
        takeProfit1: 51000,
        takeProfit2: 52000,
        takeProfit3: 53000,
      });

      const result = await checkSignal(signal);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('tp1_hit');
      expect(result!.pnlPct).toBeGreaterThan(0);
    });

    it('should detect highest TP hit', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 54000 }); // Above all TPs
      const signal = createSignal({
        direction: 'buy',
        takeProfit1: 51000,
        takeProfit2: 52000,
        takeProfit3: 53000,
      });

      const result = await checkSignal(signal);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('tp3_hit'); // Highest hit
    });

    it('should detect TP1 hit for sell signal', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 48500 }); // Below TP1 of 49000
      const signal = createSignal({
        direction: 'sell',
        entryPrice: 50000,
        stopLoss: 51000,
        takeProfit1: 49000,
        takeProfit2: 48000,
        takeProfit3: 47000,
      });

      const result = await checkSignal(signal);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('tp1_hit');
      expect(result!.pnlPct).toBeGreaterThan(0);
    });

    it('should return null when price is between entry and targets', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 50500 }); // Between entry and TP1
      const signal = createSignal();

      const result = await checkSignal(signal);

      expect(result).toBeNull();
    });

    it('should prioritize SL over TP', async () => {
      // Edge case: price somehow triggers both SL and TP
      // This shouldn't happen in reality, but SL should take priority
      mockGetCachedTicker.mockResolvedValue({ price: 48000 });
      const signal = createSignal({
        direction: 'buy',
        stopLoss: 49000,
        takeProfit1: 47000, // Inverted TP (would be a bug in signal generation)
      });

      const result = await checkSignal(signal);

      expect(result!.status).toBe('closed'); // SL status
    });

    it('should handle null TP values', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 52000 });
      const signal = createSignal({
        direction: 'buy',
        takeProfit1: 51000,
        takeProfit2: null,
        takeProfit3: null,
      });

      const result = await checkSignal(signal);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('tp1_hit');
    });
  });

  describe('scanActiveSignals', () => {
    it('should do nothing when no active signals', async () => {
      mockGetActiveSignals.mockResolvedValue([]);

      await scanActiveSignals();

      expect(mockCloseSignal).not.toHaveBeenCalled();
      expect(mockBroadcastSignal).not.toHaveBeenCalled();
    });

    it('should check all active signals', async () => {
      const signals = [
        createSignal({ id: 'signal-1', symbol: 'BTCUSDT' }),
        createSignal({ id: 'signal-2', symbol: 'ETHUSDT' }),
      ];
      mockGetActiveSignals.mockResolvedValue(signals);
      mockGetCachedTicker.mockResolvedValue({ price: 50000 }); // No TP/SL hit

      await scanActiveSignals();

      expect(mockGetCachedTicker).toHaveBeenCalledTimes(2);
      expect(mockGetCachedTicker).toHaveBeenCalledWith('BTCUSDT');
      expect(mockGetCachedTicker).toHaveBeenCalledWith('ETHUSDT');
    });

    it('should close signals that hit TP/SL', async () => {
      const signals = [
        createSignal({ id: 'signal-1', symbol: 'BTCUSDT', stopLoss: 49000 }),
      ];
      mockGetActiveSignals.mockResolvedValue(signals);
      mockGetCachedTicker.mockResolvedValue({ price: 48000 }); // Below SL

      await scanActiveSignals();

      expect(mockCloseSignal).toHaveBeenCalledWith('signal-1', 'closed', 49000);
      expect(mockBroadcastSignal).toHaveBeenCalled();
    });

    it('should broadcast updates for closed signals', async () => {
      const signals = [createSignal({ id: 'signal-1', takeProfit1: 51000 })];
      mockGetActiveSignals.mockResolvedValue(signals);
      mockGetCachedTicker.mockResolvedValue({ price: 52000 }); // Above TP1

      await scanActiveSignals();

      expect(mockBroadcastSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'signal-1',
          symbol: 'BTCUSDT',
        })
      );
    });

    it('should continue processing after errors', async () => {
      const signals = [
        createSignal({ id: 'signal-1', symbol: 'BTCUSDT' }),
        createSignal({ id: 'signal-2', symbol: 'ETHUSDT' }),
      ];
      mockGetActiveSignals.mockResolvedValue(signals);
      mockGetCachedTicker
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockResolvedValueOnce({ price: 55000 }); // TP3 hit

      await scanActiveSignals();

      // Should still process second signal despite first error
      expect(mockGetCachedTicker).toHaveBeenCalledTimes(2);
    });
  });

  describe('Job lifecycle', () => {
    it('should start and stop the job', () => {
      expect(isSignalCheckerJobRunning()).toBe(false);

      startSignalCheckerJob();
      expect(isSignalCheckerJobRunning()).toBe(true);

      stopSignalCheckerJob();
      expect(isSignalCheckerJobRunning()).toBe(false);
    });

    it('should not start job if already running', () => {
      startSignalCheckerJob();
      const firstStart = isSignalCheckerJobRunning();

      startSignalCheckerJob(); // Try to start again
      const secondStart = isSignalCheckerJobRunning();

      expect(firstStart).toBe(true);
      expect(secondStart).toBe(true);
    });

    it('should handle stop when not running', () => {
      expect(isSignalCheckerJobRunning()).toBe(false);

      // Should not throw
      stopSignalCheckerJob();

      expect(isSignalCheckerJobRunning()).toBe(false);
    });
  });

  describe('PnL calculation', () => {
    it('should calculate positive PnL for buy TP hit', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 51500 });
      const signal = createSignal({
        direction: 'buy',
        entryPrice: 50000,
        takeProfit1: 51000,
      });

      const result = await checkSignal(signal);

      expect(result!.pnlPct).toBe(2); // (51000 - 50000) / 50000 * 100 = 2%
    });

    it('should calculate negative PnL for buy SL hit', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 48000 });
      const signal = createSignal({
        direction: 'buy',
        entryPrice: 50000,
        stopLoss: 49000,
      });

      const result = await checkSignal(signal);

      expect(result!.pnlPct).toBe(-2); // (49000 - 50000) / 50000 * 100 = -2%
    });

    it('should calculate positive PnL for sell TP hit', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 48500 }); // Below TP1 of 49000
      const signal = createSignal({
        direction: 'sell',
        entryPrice: 50000,
        stopLoss: 51000,
        takeProfit1: 49000,
        takeProfit2: 48000,
        takeProfit3: 47000,
      });

      const result = await checkSignal(signal);

      // For sell: (entry - exit) / entry * 100
      expect(result!.pnlPct).toBe(2); // (50000 - 49000) / 50000 * 100 = 2%
    });

    it('should calculate negative PnL for sell SL hit', async () => {
      mockGetCachedTicker.mockResolvedValue({ price: 52000 });
      const signal = createSignal({
        direction: 'sell',
        entryPrice: 50000,
        stopLoss: 51000,
        takeProfit1: 49000,
        takeProfit2: 48000,
        takeProfit3: 47000,
      });

      const result = await checkSignal(signal);

      // For sell SL: (entry - SL) / entry * 100
      expect(result!.pnlPct).toBe(-2); // (50000 - 51000) / 50000 * 100 = -2%
    });
  });
});
