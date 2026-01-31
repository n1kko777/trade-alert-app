import { describe, it, expect } from 'vitest';
import {
  calculateTakeProfits,
  calculateStopLoss,
  calculateConfidence,
  determineDirection,
  determineMinTier,
  generateSignal,
  generateCompoundSignal,
  DEFAULT_SIGNAL_CONFIG,
  type TickerData,
} from './signals.generator.js';

describe('Signal Generator', () => {
  const createTickerData = (overrides: Partial<TickerData> = {}): TickerData => ({
    symbol: 'BTCUSDT',
    exchange: 'binance',
    price: 50000,
    volume24h: 5000000,
    priceChange24h: 2.5,
    high24h: 51000,
    low24h: 49000,
    ...overrides,
  });

  describe('calculateTakeProfits', () => {
    it('should calculate correct TPs for buy direction', () => {
      const result = calculateTakeProfits(100, 'buy', DEFAULT_SIGNAL_CONFIG);

      expect(result.tp1).toBe(102); // 2% up
      expect(result.tp2).toBe(104); // 4% up
      expect(result.tp3).toBe(106); // 6% up
    });

    it('should calculate correct TPs for sell direction', () => {
      const result = calculateTakeProfits(100, 'sell', DEFAULT_SIGNAL_CONFIG);

      expect(result.tp1).toBe(98); // 2% down
      expect(result.tp2).toBe(96); // 4% down
      expect(result.tp3).toBe(94); // 6% down
    });

    it('should handle custom config', () => {
      const customConfig = {
        tp1Pct: 1,
        tp2Pct: 2,
        tp3Pct: 3,
        slPct: 1,
      };
      const result = calculateTakeProfits(1000, 'buy', customConfig);

      expect(result.tp1).toBe(1010); // 1% up
      expect(result.tp2).toBe(1020); // 2% up
      expect(result.tp3).toBe(1030); // 3% up
    });

    it('should handle decimal prices correctly', () => {
      const result = calculateTakeProfits(0.0001234, 'buy', DEFAULT_SIGNAL_CONFIG);

      expect(result.tp1).toBeCloseTo(0.00012587, 8);
      expect(result.tp2).toBeCloseTo(0.00012834, 8);
      expect(result.tp3).toBeCloseTo(0.00013080, 8);
    });
  });

  describe('calculateStopLoss', () => {
    it('should calculate correct SL for buy direction', () => {
      const result = calculateStopLoss(100, 'buy', DEFAULT_SIGNAL_CONFIG);

      expect(result).toBe(98); // 2% below entry
    });

    it('should calculate correct SL for sell direction', () => {
      const result = calculateStopLoss(100, 'sell', DEFAULT_SIGNAL_CONFIG);

      expect(result).toBe(102); // 2% above entry
    });

    it('should handle custom SL percentage', () => {
      const customConfig = {
        ...DEFAULT_SIGNAL_CONFIG,
        slPct: 5,
      };
      const result = calculateStopLoss(100, 'buy', customConfig);

      expect(result).toBe(95); // 5% below entry
    });
  });

  describe('calculateConfidence', () => {
    it('should return base confidence for trigger type', () => {
      const ticker = createTickerData({ volume24h: 500000 }); // Low volume
      const confidence = calculateConfidence('support_bounce', ticker);

      // Base for support_bounce is 80
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThanOrEqual(85);
    });

    it('should increase confidence for high volume', () => {
      const lowVolumeTicker = createTickerData({ volume24h: 500000 });
      const highVolumeTicker = createTickerData({ volume24h: 15000000 });

      const lowConfidence = calculateConfidence('pump_detection', lowVolumeTicker);
      const highConfidence = calculateConfidence('pump_detection', highVolumeTicker);

      expect(highConfidence).toBeGreaterThan(lowConfidence);
    });

    it('should decrease confidence for high volatility', () => {
      const lowVolatilityTicker = createTickerData({
        price: 100,
        high24h: 101,
        low24h: 99,
      });
      const highVolatilityTicker = createTickerData({
        price: 100,
        high24h: 115,
        low24h: 85,
      });

      const lowVolConfidence = calculateConfidence('macd_cross', lowVolatilityTicker);
      const highVolConfidence = calculateConfidence('macd_cross', highVolatilityTicker);

      expect(lowVolConfidence).toBeGreaterThan(highVolConfidence);
    });

    it('should keep confidence within 0-100 bounds', () => {
      const extremeTicker = createTickerData({
        volume24h: 100000000,
        price: 100,
        high24h: 100,
        low24h: 100,
      });

      const confidence = calculateConfidence('support_bounce', extremeTicker);

      expect(confidence).toBeLessThanOrEqual(100);
      expect(confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('determineDirection', () => {
    it('should return buy for rsi_oversold trigger', () => {
      const ticker = createTickerData({ priceChange24h: -5 });
      const direction = determineDirection('rsi_oversold', ticker);

      expect(direction).toBe('buy');
    });

    it('should return buy for macd_cross with positive momentum', () => {
      const ticker = createTickerData({ priceChange24h: 3 });
      const direction = determineDirection('macd_cross', ticker);

      expect(direction).toBe('buy');
    });

    it('should return sell for macd_cross with negative momentum', () => {
      const ticker = createTickerData({ priceChange24h: -3 });
      const direction = determineDirection('macd_cross', ticker);

      expect(direction).toBe('sell');
    });

    it('should return default direction for other triggers', () => {
      const ticker = createTickerData();

      expect(determineDirection('pump_detection', ticker)).toBe('buy');
      expect(determineDirection('volume_anomaly', ticker)).toBe('buy');
      expect(determineDirection('support_bounce', ticker)).toBe('buy');
      expect(determineDirection('resistance_break', ticker)).toBe('buy');
    });
  });

  describe('determineMinTier', () => {
    it('should return premium for high confidence signals', () => {
      const tier = determineMinTier(90, 'pump_detection');

      expect(tier).toBe('premium');
    });

    it('should return pro for advanced triggers', () => {
      const tier = determineMinTier(70, 'macd_cross');

      expect(tier).toBe('pro');
    });

    it('should return pro for good confidence signals', () => {
      const tier = determineMinTier(78, 'pump_detection');

      expect(tier).toBe('pro');
    });

    it('should return free for lower confidence basic triggers', () => {
      const tier = determineMinTier(65, 'pump_detection');

      expect(tier).toBe('free');
    });
  });

  describe('generateSignal', () => {
    it('should generate a complete signal with all fields', () => {
      const ticker = createTickerData();
      const signal = generateSignal(ticker, 'pump_detection');

      expect(signal.symbol).toBe('BTCUSDT');
      expect(signal.exchange).toBe('binance');
      expect(signal.direction).toBe('buy');
      expect(signal.entryPrice).toBe(50000);
      expect(signal.stopLoss).toBeLessThan(50000);
      expect(signal.takeProfit1).toBeGreaterThan(50000);
      expect(signal.takeProfit2).toBeGreaterThan(signal.takeProfit1);
      expect(signal.takeProfit3).toBeGreaterThan(signal.takeProfit2);
      expect(signal.aiConfidence).toBeGreaterThanOrEqual(0);
      expect(signal.aiConfidence).toBeLessThanOrEqual(100);
      expect(signal.aiTriggers).toHaveLength(1);
      expect(signal.aiTriggers[0]!.type).toBe('pump_detection');
    });

    it('should include trigger data when provided', () => {
      const ticker = createTickerData();
      const triggerData = { changePct: 5.5, volumeMultiplier: 2.1 };
      const signal = generateSignal(ticker, 'pump_detection', triggerData);

      expect(signal.aiTriggers[0]!.data).toEqual(triggerData);
    });

    it('should use trigger-specific config for TPs and SL', () => {
      const ticker = createTickerData({ price: 100 });

      // pump_detection has tp1Pct: 3, slPct: 2.5
      const pumpSignal = generateSignal(ticker, 'pump_detection');
      expect(pumpSignal.takeProfit1).toBe(103); // 3% up
      expect(pumpSignal.stopLoss).toBe(97.5); // 2.5% down

      // macd_cross has tp1Pct: 2, slPct: 1.8
      const macdSignal = generateSignal(ticker, 'macd_cross');
      expect(macdSignal.takeProfit1).toBe(102); // 2% up
      expect(macdSignal.stopLoss).toBe(98.2); // 1.8% down
    });
  });

  describe('generateCompoundSignal', () => {
    it('should return null for empty triggers array', () => {
      const ticker = createTickerData();
      const signal = generateCompoundSignal(ticker, []);

      expect(signal).toBeNull();
    });

    it('should combine multiple triggers into one signal', () => {
      const ticker = createTickerData();
      const triggers = [
        { type: 'pump_detection' as const, data: { changePct: 5 } },
        { type: 'volume_anomaly' as const, data: { multiplier: 2 } },
      ];

      const signal = generateCompoundSignal(ticker, triggers);

      expect(signal).not.toBeNull();
      expect(signal!.aiTriggers).toHaveLength(2);
      expect(signal!.aiTriggers[0]!.type).toBe('pump_detection');
      expect(signal!.aiTriggers[1]!.type).toBe('volume_anomaly');
    });

    it('should boost confidence for multiple triggers', () => {
      const ticker = createTickerData();

      const singleSignal = generateSignal(ticker, 'pump_detection');
      const compoundSignal = generateCompoundSignal(ticker, [
        { type: 'pump_detection' },
        { type: 'volume_anomaly' },
      ]);

      // Compound signal should have higher confidence due to multi-trigger bonus
      expect(compoundSignal!.aiConfidence).toBeGreaterThanOrEqual(singleSignal.aiConfidence);
    });

    it('should cap combined confidence at 100', () => {
      const ticker = createTickerData({ volume24h: 100000000 });
      const triggers = [
        { type: 'support_bounce' as const },
        { type: 'resistance_break' as const },
        { type: 'pump_detection' as const },
        { type: 'volume_anomaly' as const },
      ];

      const signal = generateCompoundSignal(ticker, triggers);

      expect(signal!.aiConfidence).toBeLessThanOrEqual(100);
    });
  });
});
