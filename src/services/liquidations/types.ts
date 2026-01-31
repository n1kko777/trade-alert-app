import type { ExchangeId } from '../exchanges/types';

/**
 * Represents a single liquidation price level with volume estimates
 */
export interface LiquidationLevel {
  price: number;
  longVolume: number;      // Estimated volume of long positions liquidated at this level
  shortVolume: number;     // Estimated volume of short positions liquidated at this level
  totalVolume: number;     // Combined volume
  leverage: number;        // The leverage level this price corresponds to
  type: 'long' | 'short';  // Whether this is a long or short liquidation level
  distancePercent: number; // Percentage distance from current price
}

/**
 * Complete liquidation data for a symbol
 */
export interface LiquidationData {
  symbol: string;
  exchange: ExchangeId;
  currentPrice: number;
  levels: LiquidationLevel[];
  totalLongVolume: number;
  totalShortVolume: number;
  lastUpdated: number;
}

/**
 * Configuration for liquidation calculations
 */
export interface LiquidationConfig {
  leverageLevels: number[];           // Leverage levels to calculate (e.g., [2, 3, 5, 10, 25, 50, 100])
  volumeEstimateBase: number;         // Base volume for estimates (in USD)
  volumeDecayFactor: number;          // How much volume decreases at higher leverages
  refreshIntervalMs: number;          // How often to refresh data
  significantVolumeThreshold: number; // Minimum volume to display
}

/**
 * Summary statistics for liquidation risk
 */
export interface LiquidationSummary {
  totalVolumeAtRisk: number;
  longVolumeAtRisk: number;
  shortVolumeAtRisk: number;
  nearestLongLevel: LiquidationLevel | null;
  nearestShortLevel: LiquidationLevel | null;
  highestVolumeLevel: LiquidationLevel | null;
}

export const DEFAULT_LIQUIDATION_CONFIG: LiquidationConfig = {
  leverageLevels: [2, 3, 5, 10, 25, 50, 100],
  volumeEstimateBase: 10000000,    // $10M base
  volumeDecayFactor: 0.7,          // 30% less volume at each higher leverage
  refreshIntervalMs: 30000,        // 30 seconds
  significantVolumeThreshold: 100000, // $100K minimum
};

export const SUPPORTED_EXCHANGES: ExchangeId[] = ['binance', 'bybit'];
