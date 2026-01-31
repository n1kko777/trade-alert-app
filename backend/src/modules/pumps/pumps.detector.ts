import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';

/**
 * Configuration for pump detection thresholds
 */
export interface PumpConfig {
  /** Minimum price change percentage to consider as a pump */
  thresholdPct: number;
  /** Time window in minutes for pump detection */
  windowMinutes: number;
  /** Minimum volume multiplier compared to previous snapshot */
  volumeMultiplier: number;
}

/**
 * Pump event data structure
 */
export interface PumpEvent {
  /** Trading pair symbol (e.g., "BTCUSDT") */
  symbol: string;
  /** Exchanges where the pump was detected */
  exchanges: string[];
  /** Price at the start of the pump detection window */
  startPrice: number;
  /** Current price when pump was detected */
  currentPrice: number;
  /** Price change percentage */
  changePct: number;
  /** 24-hour trading volume */
  volume24h: number;
  /** Volume multiplier compared to previous snapshot */
  volumeMultiplier: number;
  /** Timestamp when the pump was detected */
  detectedAt: number;
}

/**
 * Default pump detection configuration
 * - 5% price increase threshold
 * - 15 minute detection window
 * - 1.5x volume multiplier
 */
export const DEFAULT_PUMP_CONFIG: PumpConfig = {
  thresholdPct: 5,
  windowMinutes: 15,
  volumeMultiplier: 1.5,
};

/**
 * Check if the given price change and volume multiplier indicate a pump
 * @param changePct - Price change percentage
 * @param volumeMult - Volume multiplier
 * @param config - Pump detection configuration
 * @returns true if conditions meet pump criteria
 */
export function isPumping(
  changePct: number,
  volumeMult: number,
  config: PumpConfig
): boolean {
  // Only detect positive price movements (pumps, not dumps)
  if (changePct < 0) {
    return false;
  }

  return changePct >= config.thresholdPct && volumeMult >= config.volumeMultiplier;
}

/**
 * Detect if a pump is occurring based on current and previous ticker data
 * @param ticker - Current ticker data
 * @param previousTicker - Previous ticker data (can be null)
 * @param config - Optional pump configuration (uses defaults if not provided)
 * @returns PumpEvent if a pump is detected, null otherwise
 */
export function detectPump(
  ticker: AggregatedTicker,
  previousTicker: AggregatedTicker | null,
  config: PumpConfig = DEFAULT_PUMP_CONFIG
): PumpEvent | null {
  // Cannot detect pump without previous data
  if (!previousTicker) {
    return null;
  }

  // Handle edge case of zero previous price
  if (previousTicker.price === 0) {
    return null;
  }

  // Calculate price change percentage
  const changePct = ((ticker.price - previousTicker.price) / previousTicker.price) * 100;

  // Calculate volume multiplier (handle zero previous volume)
  const volumeMult =
    previousTicker.volume24h === 0
      ? Infinity
      : ticker.volume24h / previousTicker.volume24h;

  // Check if pump conditions are met
  if (!isPumping(changePct, volumeMult, config)) {
    return null;
  }

  // Create and return pump event
  const pumpEvent: PumpEvent = {
    symbol: ticker.symbol,
    exchanges: ticker.exchanges,
    startPrice: previousTicker.price,
    currentPrice: ticker.price,
    changePct,
    volume24h: ticker.volume24h,
    volumeMultiplier: volumeMult,
    detectedAt: Date.now(),
  };

  return pumpEvent;
}
