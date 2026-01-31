import type { AiTriggerType, AiTrigger, SignalDirection, Tier } from './signals.schema.js';

/**
 * Generated signal data before database storage
 */
export interface GeneratedSignal {
  symbol: string;
  exchange: string;
  direction: SignalDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  aiConfidence: number;
  aiTriggers: AiTrigger[];
  minTier: Tier;
}

/**
 * Ticker data for signal generation
 */
export interface TickerData {
  symbol: string;
  exchange: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
}

/**
 * Configuration for take profit and stop loss calculations
 */
export interface SignalConfig {
  /** TP1 percentage from entry (e.g., 2 = 2%) */
  tp1Pct: number;
  /** TP2 percentage from entry */
  tp2Pct: number;
  /** TP3 percentage from entry */
  tp3Pct: number;
  /** Stop loss percentage from entry */
  slPct: number;
}

/**
 * Default signal configuration
 */
export const DEFAULT_SIGNAL_CONFIG: SignalConfig = {
  tp1Pct: 2,
  tp2Pct: 4,
  tp3Pct: 6,
  slPct: 2,
};

/**
 * Trigger-specific configurations for fine-tuning
 */
const TRIGGER_CONFIGS: Record<AiTriggerType, Partial<SignalConfig> & { baseConfidence: number; defaultDirection: SignalDirection }> = {
  pump_detection: {
    tp1Pct: 3,
    tp2Pct: 5,
    tp3Pct: 8,
    slPct: 2.5,
    baseConfidence: 75,
    defaultDirection: 'buy',
  },
  volume_anomaly: {
    tp1Pct: 2.5,
    tp2Pct: 4.5,
    tp3Pct: 7,
    slPct: 2,
    baseConfidence: 70,
    defaultDirection: 'buy',
  },
  support_bounce: {
    tp1Pct: 2,
    tp2Pct: 4,
    tp3Pct: 6,
    slPct: 1.5,
    baseConfidence: 80,
    defaultDirection: 'buy',
  },
  resistance_break: {
    tp1Pct: 3,
    tp2Pct: 5,
    tp3Pct: 8,
    slPct: 2,
    baseConfidence: 78,
    defaultDirection: 'buy',
  },
  macd_cross: {
    tp1Pct: 2,
    tp2Pct: 3.5,
    tp3Pct: 5,
    slPct: 1.8,
    baseConfidence: 72,
    defaultDirection: 'buy',
  },
  rsi_oversold: {
    tp1Pct: 2.5,
    tp2Pct: 4,
    tp3Pct: 6,
    slPct: 2,
    baseConfidence: 76,
    defaultDirection: 'buy',
  },
};

/**
 * Calculate take profit levels based on entry price and direction
 * @param entryPrice - Entry price for the signal
 * @param direction - Signal direction (buy/sell)
 * @param config - Signal configuration with TP percentages
 * @returns Take profit levels
 */
export function calculateTakeProfits(
  entryPrice: number,
  direction: SignalDirection,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): { tp1: number; tp2: number; tp3: number } {
  if (direction === 'buy') {
    // For long positions, TP is above entry
    return {
      tp1: Number((entryPrice * (1 + config.tp1Pct / 100)).toFixed(8)),
      tp2: Number((entryPrice * (1 + config.tp2Pct / 100)).toFixed(8)),
      tp3: Number((entryPrice * (1 + config.tp3Pct / 100)).toFixed(8)),
    };
  } else {
    // For short positions, TP is below entry
    return {
      tp1: Number((entryPrice * (1 - config.tp1Pct / 100)).toFixed(8)),
      tp2: Number((entryPrice * (1 - config.tp2Pct / 100)).toFixed(8)),
      tp3: Number((entryPrice * (1 - config.tp3Pct / 100)).toFixed(8)),
    };
  }
}

/**
 * Calculate stop loss based on entry price and direction
 * @param entryPrice - Entry price for the signal
 * @param direction - Signal direction (buy/sell)
 * @param config - Signal configuration with SL percentage
 * @returns Stop loss price
 */
export function calculateStopLoss(
  entryPrice: number,
  direction: SignalDirection,
  config: SignalConfig = DEFAULT_SIGNAL_CONFIG
): number {
  if (direction === 'buy') {
    // For long positions, SL is below entry
    return Number((entryPrice * (1 - config.slPct / 100)).toFixed(8));
  } else {
    // For short positions, SL is above entry
    return Number((entryPrice * (1 + config.slPct / 100)).toFixed(8));
  }
}

/**
 * Calculate confidence based on trigger type and market data
 * @param trigger - AI trigger type
 * @param ticker - Current ticker data
 * @returns Confidence score (0-100)
 */
export function calculateConfidence(
  trigger: AiTriggerType,
  ticker: TickerData
): number {
  const triggerConfig = TRIGGER_CONFIGS[trigger];
  let confidence = triggerConfig.baseConfidence;

  // Adjust confidence based on volume (higher volume = higher confidence)
  if (ticker.volume24h > 10_000_000) {
    confidence += 5;
  } else if (ticker.volume24h > 1_000_000) {
    confidence += 2;
  }

  // Adjust based on price volatility (24h range)
  const volatility = ((ticker.high24h - ticker.low24h) / ticker.price) * 100;
  if (volatility > 10) {
    // High volatility - reduce confidence slightly
    confidence -= 3;
  } else if (volatility < 3) {
    // Low volatility - more predictable, increase confidence
    confidence += 3;
  }

  // Ensure confidence is within bounds
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Determine signal direction based on trigger and market data
 * @param trigger - AI trigger type
 * @param ticker - Current ticker data
 * @returns Signal direction
 */
export function determineDirection(
  trigger: AiTriggerType,
  ticker: TickerData
): SignalDirection {
  const triggerConfig = TRIGGER_CONFIGS[trigger];

  // RSI oversold always triggers buy
  if (trigger === 'rsi_oversold') {
    return 'buy';
  }

  // MACD cross can go either way based on momentum
  if (trigger === 'macd_cross') {
    return ticker.priceChange24h >= 0 ? 'buy' : 'sell';
  }

  // Most triggers default to buy, but consider market conditions
  return triggerConfig.defaultDirection;
}

/**
 * Determine minimum tier required for signal based on confidence and trigger
 * @param confidence - Signal confidence
 * @param trigger - AI trigger type
 * @returns Minimum subscription tier
 */
export function determineMinTier(
  confidence: number,
  trigger: AiTriggerType
): Tier {
  // High confidence signals (>85) are premium only
  if (confidence >= 85) {
    return 'premium';
  }

  // Advanced triggers require pro tier
  if (['macd_cross', 'resistance_break', 'support_bounce'].includes(trigger)) {
    return 'pro';
  }

  // Good confidence signals require pro
  if (confidence >= 75) {
    return 'pro';
  }

  // Default signals available to free users
  return 'free';
}

/**
 * Generate a trading signal based on ticker data and AI trigger
 * @param ticker - Current ticker data
 * @param trigger - AI trigger type that initiated the signal
 * @param triggerData - Optional additional data from the trigger
 * @returns Generated signal ready for storage
 */
export function generateSignal(
  ticker: TickerData,
  trigger: AiTriggerType,
  triggerData?: Record<string, unknown>
): GeneratedSignal {
  const triggerConfig = TRIGGER_CONFIGS[trigger];

  // Build config from trigger-specific overrides
  const config: SignalConfig = {
    tp1Pct: triggerConfig.tp1Pct ?? DEFAULT_SIGNAL_CONFIG.tp1Pct,
    tp2Pct: triggerConfig.tp2Pct ?? DEFAULT_SIGNAL_CONFIG.tp2Pct,
    tp3Pct: triggerConfig.tp3Pct ?? DEFAULT_SIGNAL_CONFIG.tp3Pct,
    slPct: triggerConfig.slPct ?? DEFAULT_SIGNAL_CONFIG.slPct,
  };

  const direction = determineDirection(trigger, ticker);
  const takeProfits = calculateTakeProfits(ticker.price, direction, config);
  const stopLoss = calculateStopLoss(ticker.price, direction, config);
  const confidence = calculateConfidence(trigger, ticker);
  const minTier = determineMinTier(confidence, trigger);

  const aiTrigger: AiTrigger = {
    type: trigger,
    confidence,
    data: triggerData,
  };

  return {
    symbol: ticker.symbol,
    exchange: ticker.exchange,
    direction,
    entryPrice: ticker.price,
    stopLoss,
    takeProfit1: takeProfits.tp1,
    takeProfit2: takeProfits.tp2,
    takeProfit3: takeProfits.tp3,
    aiConfidence: confidence,
    aiTriggers: [aiTrigger],
    minTier,
  };
}

/**
 * Generate multiple signals from multiple triggers (for compound analysis)
 * @param ticker - Current ticker data
 * @param triggers - Array of AI triggers
 * @returns Generated signal with combined confidence
 */
export function generateCompoundSignal(
  ticker: TickerData,
  triggers: { type: AiTriggerType; data?: Record<string, unknown> }[]
): GeneratedSignal | null {
  if (triggers.length === 0) {
    return null;
  }

  // Generate individual signals
  const signals = triggers.map(t => generateSignal(ticker, t.type, t.data));

  // Use the first signal as base (we know length > 0)
  const baseSignal = signals[0]!;
  const firstTrigger = triggers[0]!;

  // Combine AI triggers
  const combinedTriggers: AiTrigger[] = triggers.map((t, i) => ({
    type: t.type,
    confidence: signals[i]!.aiConfidence,
    data: t.data,
  }));

  // Calculate combined confidence (average with bonus for multiple triggers)
  const avgConfidence = signals.reduce((sum, s) => sum + s.aiConfidence, 0) / signals.length;
  const multiTriggerBonus = Math.min(10, (triggers.length - 1) * 3);
  const combinedConfidence = Math.min(100, avgConfidence + multiTriggerBonus);

  return {
    symbol: baseSignal.symbol,
    exchange: baseSignal.exchange,
    direction: baseSignal.direction,
    entryPrice: baseSignal.entryPrice,
    stopLoss: baseSignal.stopLoss,
    takeProfit1: baseSignal.takeProfit1,
    takeProfit2: baseSignal.takeProfit2,
    takeProfit3: baseSignal.takeProfit3,
    aiConfidence: Math.round(combinedConfidence),
    aiTriggers: combinedTriggers,
    minTier: determineMinTier(combinedConfidence, firstTrigger.type),
  };
}
