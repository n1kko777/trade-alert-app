/**
 * Liquidation Types
 * Type definitions for liquidation heatmap data from the backend
 */

export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'mexc';

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

export const SUPPORTED_EXCHANGES: ExchangeId[] = ['binance', 'bybit'];
