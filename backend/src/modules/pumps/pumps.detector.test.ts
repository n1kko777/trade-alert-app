import { describe, it, expect } from 'vitest';
import {
  detectPump,
  isPumping,
  DEFAULT_PUMP_CONFIG,
  type PumpConfig,
} from './pumps.detector.js';
import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';

describe('Pump Detector', () => {
  describe('DEFAULT_PUMP_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PUMP_CONFIG.thresholdPct).toBe(5);
      expect(DEFAULT_PUMP_CONFIG.windowMinutes).toBe(15);
      expect(DEFAULT_PUMP_CONFIG.volumeMultiplier).toBe(1.5);
    });
  });

  describe('isPumping', () => {
    it('should return true when change exceeds threshold and volume exceeds multiplier', () => {
      const config: PumpConfig = {
        thresholdPct: 5,
        windowMinutes: 15,
        volumeMultiplier: 1.5,
      };

      expect(isPumping(6, 2, config)).toBe(true);
      expect(isPumping(5.1, 1.6, config)).toBe(true);
    });

    it('should return false when change is below threshold', () => {
      const config: PumpConfig = {
        thresholdPct: 5,
        windowMinutes: 15,
        volumeMultiplier: 1.5,
      };

      expect(isPumping(4.9, 2, config)).toBe(false);
      expect(isPumping(3, 3, config)).toBe(false);
    });

    it('should return false when volume multiplier is below threshold', () => {
      const config: PumpConfig = {
        thresholdPct: 5,
        windowMinutes: 15,
        volumeMultiplier: 1.5,
      };

      expect(isPumping(6, 1.4, config)).toBe(false);
      expect(isPumping(10, 1, config)).toBe(false);
    });

    it('should return true at exact threshold values', () => {
      const config: PumpConfig = {
        thresholdPct: 5,
        windowMinutes: 15,
        volumeMultiplier: 1.5,
      };

      expect(isPumping(5, 1.5, config)).toBe(true);
    });

    it('should handle negative change (dumps)', () => {
      const config: PumpConfig = {
        thresholdPct: 5,
        windowMinutes: 15,
        volumeMultiplier: 1.5,
      };

      // Negative changes should not be considered pumps
      expect(isPumping(-6, 2, config)).toBe(false);
      expect(isPumping(-10, 3, config)).toBe(false);
    });
  });

  describe('detectPump', () => {
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

    it('should return null when no previous ticker is provided', () => {
      const current = createTicker({ price: 100 });

      const result = detectPump(current, null);

      expect(result).toBeNull();
    });

    it('should return null when price change is below threshold', () => {
      const previous = createTicker({ price: 100, volume24h: 1000000 });
      const current = createTicker({ price: 104, volume24h: 2000000 }); // 4% change

      const result = detectPump(current, previous);

      expect(result).toBeNull();
    });

    it('should return null when volume multiplier is below threshold', () => {
      const previous = createTicker({ price: 100, volume24h: 1000000 });
      const current = createTicker({ price: 110, volume24h: 1200000 }); // 10% price, 1.2x volume

      const result = detectPump(current, previous);

      expect(result).toBeNull();
    });

    it('should detect a pump when thresholds are exceeded', () => {
      const now = Date.now();
      const previous = createTicker({ price: 100, volume24h: 1000000, timestamp: now - 60000 });
      const current = createTicker({
        symbol: 'PUMPUSDT',
        price: 106, // 6% increase
        volume24h: 2000000, // 2x volume
        timestamp: now,
        exchanges: ['binance', 'okx'],
      });

      const result = detectPump(current, previous);

      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('PUMPUSDT');
      expect(result!.startPrice).toBe(100);
      expect(result!.currentPrice).toBe(106);
      expect(result!.changePct).toBeCloseTo(6, 2);
      expect(result!.volume24h).toBe(2000000);
      expect(result!.volumeMultiplier).toBeCloseTo(2, 2);
      expect(result!.exchanges).toEqual(['binance', 'okx']);
      expect(result!.detectedAt).toBeGreaterThanOrEqual(now);
    });

    it('should detect pump at exact threshold values', () => {
      const previous = createTicker({ price: 100, volume24h: 1000000 });
      const current = createTicker({ price: 105, volume24h: 1500000 }); // Exactly 5%, 1.5x

      const result = detectPump(current, previous);

      expect(result).not.toBeNull();
      expect(result!.changePct).toBeCloseTo(5, 2);
      expect(result!.volumeMultiplier).toBeCloseTo(1.5, 2);
    });

    it('should use custom config when provided', () => {
      const customConfig: PumpConfig = {
        thresholdPct: 10,
        windowMinutes: 30,
        volumeMultiplier: 2,
      };

      const previous = createTicker({ price: 100, volume24h: 1000000 });
      const current = createTicker({ price: 106, volume24h: 2000000 }); // Would be pump with default config

      const result = detectPump(current, previous, customConfig);

      expect(result).toBeNull(); // 6% is below 10% threshold
    });

    it('should detect pump with custom config when thresholds are met', () => {
      const customConfig: PumpConfig = {
        thresholdPct: 10,
        windowMinutes: 30,
        volumeMultiplier: 2,
      };

      const previous = createTicker({ price: 100, volume24h: 1000000 });
      const current = createTicker({ price: 115, volume24h: 2500000 }); // 15%, 2.5x

      const result = detectPump(current, previous, customConfig);

      expect(result).not.toBeNull();
      expect(result!.changePct).toBeCloseTo(15, 2);
    });

    it('should handle zero previous volume gracefully', () => {
      const previous = createTicker({ price: 100, volume24h: 0 });
      const current = createTicker({ price: 110, volume24h: 1000000 });

      // Should not crash, but volume multiplier would be Infinity
      // which should still trigger if price threshold is met
      const result = detectPump(current, previous);

      // Since volume multiplier is Infinity (> 1.5), and price is 10% (> 5%), this should detect
      expect(result).not.toBeNull();
    });

    it('should handle zero previous price gracefully', () => {
      const previous = createTicker({ price: 0, volume24h: 1000000 });
      const current = createTicker({ price: 100, volume24h: 2000000 });

      const result = detectPump(current, previous);

      // Should not crash, returns null due to invalid change calculation
      expect(result).toBeNull();
    });

    it('should not detect pump for negative price change (dump)', () => {
      const previous = createTicker({ price: 100, volume24h: 1000000 });
      const current = createTicker({ price: 90, volume24h: 2000000 }); // -10%, 2x volume

      const result = detectPump(current, previous);

      expect(result).toBeNull();
    });

    it('should include correct exchange information in pump event', () => {
      const previous = createTicker({
        price: 100,
        volume24h: 1000000,
        exchanges: ['binance'],
      });
      const current = createTicker({
        price: 110,
        volume24h: 2000000,
        exchanges: ['binance', 'bybit', 'okx'],
      });

      const result = detectPump(current, previous);

      expect(result).not.toBeNull();
      expect(result!.exchanges).toEqual(['binance', 'bybit', 'okx']);
    });
  });
});
