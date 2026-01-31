import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pino } from 'pino';
import type { AggregatedTicker } from './priceAggregator.job.js';

// Create mock functions
const mockCronSchedule = vi.fn();
const mockGetCachedTickers = vi.fn();
const mockStorePump = vi.fn();
const mockBroadcastPump = vi.fn();

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: (expression: string, fn: () => void, options: object) =>
      mockCronSchedule(expression, fn, options),
  },
  schedule: (expression: string, fn: () => void, options: object) =>
    mockCronSchedule(expression, fn, options),
}));

// Mock cache service
vi.mock('../services/cache.service.js', () => ({
  getCachedTickers: () => mockGetCachedTickers(),
}));

// Mock pumps service
vi.mock('../modules/pumps/pumps.service.js', () => ({
  storePump: (pump: unknown) => mockStorePump(pump),
}));

// Mock WebSocket broadcast
vi.mock('../websocket/index.js', () => ({
  broadcastPump: (pump: unknown) => mockBroadcastPump(pump),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  getLogger: () => pino({ level: 'silent' }),
}));

// Import after mocks
import {
  startPumpScannerJob,
  stopPumpScannerJob,
  isPumpScannerJobRunning,
  scanForPumps,
  getSnapshotForTesting,
  clearSnapshotForTesting,
} from './pumpScanner.job.js';

describe('Pump Scanner Job', () => {
  const createTicker = (overrides: Partial<AggregatedTicker> = {}): AggregatedTicker => ({
    symbol: 'TESTUSDT',
    price: 100,
    volume24h: 1000000,
    change24h: 0,
    high24h: 105,
    low24h: 95,
    timestamp: Date.now(),
    exchanges: ['binance', 'bybit'],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    clearSnapshotForTesting();
  });

  afterEach(() => {
    stopPumpScannerJob();
    clearSnapshotForTesting();
  });

  describe('startPumpScannerJob', () => {
    it('should schedule job to run every 10 seconds', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPumpScannerJob();

      expect(mockCronSchedule).toHaveBeenCalledWith(
        '*/10 * * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true, name: 'pumpScanner' })
      );
    });

    it('should not start multiple jobs if already running', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPumpScannerJob();
      startPumpScannerJob();

      expect(mockCronSchedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopPumpScannerJob', () => {
    it('should stop the running job', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPumpScannerJob();
      stopPumpScannerJob();

      expect(mockTask.stop).toHaveBeenCalled();
    });

    it('should handle stopping when no job is running', () => {
      expect(() => stopPumpScannerJob()).not.toThrow();
    });
  });

  describe('isPumpScannerJobRunning', () => {
    it('should return true when job is running', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPumpScannerJob();

      expect(isPumpScannerJobRunning()).toBe(true);
    });

    it('should return false when job is not running', () => {
      expect(isPumpScannerJobRunning()).toBe(false);
    });

    it('should return false after job is stopped', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValue(mockTask);

      startPumpScannerJob();
      stopPumpScannerJob();

      expect(isPumpScannerJobRunning()).toBe(false);
    });
  });

  describe('scanForPumps', () => {
    it('should do nothing when no tickers are cached', async () => {
      mockGetCachedTickers.mockResolvedValue(null);

      await scanForPumps();

      expect(mockStorePump).not.toHaveBeenCalled();
      expect(mockBroadcastPump).not.toHaveBeenCalled();
    });

    it('should store snapshot on first run', async () => {
      const tickers = [createTicker({ symbol: 'BTCUSDT', price: 100 })];
      mockGetCachedTickers.mockResolvedValue(tickers);

      await scanForPumps();

      // First run should just store snapshot, no pumps detected
      expect(mockStorePump).not.toHaveBeenCalled();
      expect(mockBroadcastPump).not.toHaveBeenCalled();

      // Verify snapshot was stored
      const snapshot = getSnapshotForTesting();
      expect(snapshot.has('BTCUSDT')).toBe(true);
    });

    it('should detect pump on second run when thresholds are exceeded', async () => {
      // First run - establish baseline
      const initialTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 100, volume24h: 1000000 }),
      ];
      mockGetCachedTickers.mockResolvedValue(initialTickers);

      await scanForPumps();

      // Second run - pump detected
      const pumpTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 110, volume24h: 2000000 }), // 10% price, 2x volume
      ];
      mockGetCachedTickers.mockResolvedValue(pumpTickers);

      await scanForPumps();

      expect(mockStorePump).toHaveBeenCalled();
      expect(mockBroadcastPump).toHaveBeenCalled();

      // Verify pump data
      const storedPump = mockStorePump.mock.calls[0]?.[0] as { symbol: string; changePct: number; volumeMultiplier: number };
      expect(storedPump.symbol).toBe('BTCUSDT');
      expect(storedPump.changePct).toBeCloseTo(10, 1);
      expect(storedPump.volumeMultiplier).toBeCloseTo(2, 1);
    });

    it('should not detect pump when change is below threshold', async () => {
      // First run
      const initialTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 100, volume24h: 1000000 }),
      ];
      mockGetCachedTickers.mockResolvedValue(initialTickers);

      await scanForPumps();

      // Second run - small change
      const smallChangeTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 103, volume24h: 2000000 }), // Only 3% change
      ];
      mockGetCachedTickers.mockResolvedValue(smallChangeTickers);

      await scanForPumps();

      expect(mockStorePump).not.toHaveBeenCalled();
      expect(mockBroadcastPump).not.toHaveBeenCalled();
    });

    it('should not detect pump when volume is below threshold', async () => {
      // First run
      const initialTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 100, volume24h: 1000000 }),
      ];
      mockGetCachedTickers.mockResolvedValue(initialTickers);

      await scanForPumps();

      // Second run - low volume
      const lowVolumeTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 110, volume24h: 1200000 }), // 10% price, only 1.2x volume
      ];
      mockGetCachedTickers.mockResolvedValue(lowVolumeTickers);

      await scanForPumps();

      expect(mockStorePump).not.toHaveBeenCalled();
      expect(mockBroadcastPump).not.toHaveBeenCalled();
    });

    it('should detect multiple pumps in same scan', async () => {
      // First run
      const initialTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 100, volume24h: 1000000 }),
        createTicker({ symbol: 'ETHUSDT', price: 50, volume24h: 500000 }),
      ];
      mockGetCachedTickers.mockResolvedValue(initialTickers);

      await scanForPumps();

      // Second run - both pumping
      const pumpTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 110, volume24h: 2000000 }),
        createTicker({ symbol: 'ETHUSDT', price: 55, volume24h: 1000000 }),
      ];
      mockGetCachedTickers.mockResolvedValue(pumpTickers);

      await scanForPumps();

      expect(mockStorePump).toHaveBeenCalledTimes(2);
      expect(mockBroadcastPump).toHaveBeenCalledTimes(2);
    });

    it('should handle new symbols that appear in later scans', async () => {
      // First run - only BTC
      const initialTickers = [
        createTicker({ symbol: 'BTCUSDT', price: 100, volume24h: 1000000 }),
      ];
      mockGetCachedTickers.mockResolvedValue(initialTickers);

      await scanForPumps();

      // Second run - ETH appears (no pump since no previous data)
      const withNewSymbol = [
        createTicker({ symbol: 'BTCUSDT', price: 100, volume24h: 1000000 }),
        createTicker({ symbol: 'ETHUSDT', price: 50, volume24h: 500000 }),
      ];
      mockGetCachedTickers.mockResolvedValue(withNewSymbol);

      await scanForPumps();

      // No pump for ETH since it's new
      expect(mockStorePump).not.toHaveBeenCalled();

      // Third run - ETH pumps
      const ethPumping = [
        createTicker({ symbol: 'BTCUSDT', price: 100, volume24h: 1000000 }),
        createTicker({ symbol: 'ETHUSDT', price: 55, volume24h: 1000000 }), // 10% price, 2x volume
      ];
      mockGetCachedTickers.mockResolvedValue(ethPumping);

      await scanForPumps();

      expect(mockStorePump).toHaveBeenCalledTimes(1);
      const storedPump = mockStorePump.mock.calls[0]?.[0] as { symbol: string };
      expect(storedPump.symbol).toBe('ETHUSDT');
    });

    it('should update snapshot after each scan', async () => {
      // First run
      const tickers1 = [createTicker({ symbol: 'BTCUSDT', price: 100 })];
      mockGetCachedTickers.mockResolvedValue(tickers1);

      await scanForPumps();

      let snapshot = getSnapshotForTesting();
      expect(snapshot.get('BTCUSDT')?.price).toBe(100);

      // Second run - price changed
      const tickers2 = [createTicker({ symbol: 'BTCUSDT', price: 110 })];
      mockGetCachedTickers.mockResolvedValue(tickers2);

      await scanForPumps();

      // Snapshot should be updated to new values
      snapshot = getSnapshotForTesting();
      expect(snapshot.get('BTCUSDT')?.price).toBe(110);
    });

    it('should broadcast pump with correct format for WebSocket', async () => {
      // First run
      const initialTickers = [
        createTicker({
          symbol: 'PUMPUSDT',
          price: 100,
          volume24h: 1000000,
          exchanges: ['binance', 'okx'],
        }),
      ];
      mockGetCachedTickers.mockResolvedValue(initialTickers);

      await scanForPumps();

      // Second run - pump
      const pumpTickers = [
        createTicker({
          symbol: 'PUMPUSDT',
          price: 110,
          volume24h: 2000000,
          exchanges: ['binance', 'okx', 'bybit'],
        }),
      ];
      mockGetCachedTickers.mockResolvedValue(pumpTickers);

      await scanForPumps();

      expect(mockBroadcastPump).toHaveBeenCalled();
      const broadcastData = mockBroadcastPump.mock.calls[0]?.[0] as {
        id: string;
        symbol: string;
        change: number;
        volume: number;
        timestamp: number;
      };

      // Verify WebSocket broadcast format
      expect(broadcastData.id).toBeDefined();
      expect(broadcastData.symbol).toBe('PUMPUSDT');
      expect(broadcastData.change).toBeCloseTo(10, 1);
      expect(broadcastData.volume).toBe(2000000);
      expect(broadcastData.timestamp).toBeDefined();
    });
  });
});
