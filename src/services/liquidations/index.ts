import type { ExchangeId } from '../exchanges/types';
import type {
  LiquidationConfig,
  LiquidationData,
  LiquidationLevel,
  LiquidationSummary,
} from './types';
import { DEFAULT_LIQUIDATION_CONFIG, SUPPORTED_EXCHANGES } from './types';

export * from './types';

/**
 * Calculate liquidation price for a position
 * For longs: liquidation happens when price drops
 * For shorts: liquidation happens when price rises
 *
 * Formula:
 * Long liquidation = entryPrice * (1 - 1/leverage)
 * Short liquidation = entryPrice * (1 + 1/leverage)
 */
function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  type: 'long' | 'short'
): number {
  if (type === 'long') {
    // Long positions get liquidated when price drops
    return entryPrice * (1 - 1 / leverage);
  } else {
    // Short positions get liquidated when price rises
    return entryPrice * (1 + 1 / leverage);
  }
}

/**
 * Estimate volume at a given leverage level
 * Higher leverage = less volume (riskier)
 */
function estimateVolumeAtLeverage(
  baseVolume: number,
  leverage: number,
  decayFactor: number
): number {
  // Use exponential decay based on leverage
  const leverageIndex = Math.log2(leverage);
  return baseVolume * Math.pow(decayFactor, leverageIndex);
}

/**
 * Calculate all liquidation levels for a given price
 */
export function calculateLiquidationLevels(
  currentPrice: number,
  config: LiquidationConfig = DEFAULT_LIQUIDATION_CONFIG
): LiquidationLevel[] {
  const levels: LiquidationLevel[] = [];

  for (const leverage of config.leverageLevels) {
    const volume = estimateVolumeAtLeverage(
      config.volumeEstimateBase,
      leverage,
      config.volumeDecayFactor
    );

    // Long liquidation level (below current price)
    const longLiqPrice = calculateLiquidationPrice(currentPrice, leverage, 'long');
    const longDistancePercent = ((currentPrice - longLiqPrice) / currentPrice) * 100;

    levels.push({
      price: longLiqPrice,
      longVolume: volume,
      shortVolume: 0,
      totalVolume: volume,
      leverage,
      type: 'long',
      distancePercent: longDistancePercent,
    });

    // Short liquidation level (above current price)
    const shortLiqPrice = calculateLiquidationPrice(currentPrice, leverage, 'short');
    const shortDistancePercent = ((shortLiqPrice - currentPrice) / currentPrice) * 100;

    levels.push({
      price: shortLiqPrice,
      longVolume: 0,
      shortVolume: volume,
      totalVolume: volume,
      leverage,
      type: 'short',
      distancePercent: shortDistancePercent,
    });
  }

  // Sort by price (descending for display)
  return levels.sort((a, b) => b.price - a.price);
}

/**
 * Calculate liquidation summary statistics
 */
export function calculateLiquidationSummary(
  levels: LiquidationLevel[]
): LiquidationSummary {
  const longLevels = levels.filter(l => l.type === 'long');
  const shortLevels = levels.filter(l => l.type === 'short');

  const totalLongVolume = longLevels.reduce((sum, l) => sum + l.longVolume, 0);
  const totalShortVolume = shortLevels.reduce((sum, l) => sum + l.shortVolume, 0);

  // Find nearest levels (smallest distance from current price)
  const nearestLong = longLevels.length > 0
    ? longLevels.reduce((min, l) => l.distancePercent < min.distancePercent ? l : min)
    : null;
  const nearestShort = shortLevels.length > 0
    ? shortLevels.reduce((min, l) => l.distancePercent < min.distancePercent ? l : min)
    : null;

  // Find highest volume level
  const highestVolume = levels.length > 0
    ? levels.reduce((max, l) => l.totalVolume > max.totalVolume ? l : max)
    : null;

  return {
    totalVolumeAtRisk: totalLongVolume + totalShortVolume,
    longVolumeAtRisk: totalLongVolume,
    shortVolumeAtRisk: totalShortVolume,
    nearestLongLevel: nearestLong,
    nearestShortLevel: nearestShort,
    highestVolumeLevel: highestVolume,
  };
}

/**
 * Format volume for display (e.g., 1.5M, 250K)
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000000000) {
    return `$${(volume / 1000000000).toFixed(1)}B`;
  } else if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(0)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Format price for display with appropriate precision
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toPrecision(4)}`;
  }
}

/**
 * Get full liquidation data for a symbol
 */
export function getLiquidationData(
  symbol: string,
  exchange: ExchangeId,
  currentPrice: number,
  config: LiquidationConfig = DEFAULT_LIQUIDATION_CONFIG
): LiquidationData {
  const levels = calculateLiquidationLevels(currentPrice, config);

  const totalLongVolume = levels
    .filter(l => l.type === 'long')
    .reduce((sum, l) => sum + l.longVolume, 0);

  const totalShortVolume = levels
    .filter(l => l.type === 'short')
    .reduce((sum, l) => sum + l.shortVolume, 0);

  return {
    symbol,
    exchange,
    currentPrice,
    levels,
    totalLongVolume,
    totalShortVolume,
    lastUpdated: Date.now(),
  };
}

/**
 * LiquidationService class for managing liquidation data
 */
export class LiquidationService {
  private config: LiquidationConfig;
  private cache: Map<string, LiquidationData> = new Map();
  private callbacks: ((data: LiquidationData) => void)[] = [];

  constructor(config: Partial<LiquidationConfig> = {}) {
    this.config = { ...DEFAULT_LIQUIDATION_CONFIG, ...config };
  }

  /**
   * Subscribe to liquidation data updates
   */
  onUpdate(callback: (data: LiquidationData) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Update liquidation data for a symbol
   */
  updatePrice(
    symbol: string,
    exchange: ExchangeId,
    currentPrice: number
  ): LiquidationData {
    const key = `${exchange}:${symbol}`;
    const data = getLiquidationData(symbol, exchange, currentPrice, this.config);
    this.cache.set(key, data);
    this.notifyCallbacks(data);
    return data;
  }

  /**
   * Get cached liquidation data
   */
  getData(symbol: string, exchange: ExchangeId): LiquidationData | null {
    const key = `${exchange}:${symbol}`;
    return this.cache.get(key) || null;
  }

  /**
   * Get all cached data
   */
  getAllData(): LiquidationData[] {
    return Array.from(this.cache.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LiquidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get supported exchanges
   */
  getSupportedExchanges(): ExchangeId[] {
    return [...SUPPORTED_EXCHANGES];
  }

  /**
   * Clear all cached data
   */
  reset(): void {
    this.cache.clear();
  }

  private notifyCallbacks(data: LiquidationData): void {
    this.callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error('Liquidation callback error:', error);
      }
    });
  }
}

// Factory function
export function createLiquidationService(
  config?: Partial<LiquidationConfig>
): LiquidationService {
  return new LiquidationService(config);
}

// Singleton instance for app-wide usage
export const liquidationService = new LiquidationService();
