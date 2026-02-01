/**
 * Liquidation Types and Utilities
 * Type definitions and formatting helpers for liquidation data
 * Business logic is on the backend
 */

export * from './types';

/**
 * Format volume for display (e.g., 1.5M, 250K)
 */
export function formatVolume(volume: number | undefined | null): string {
  if (volume == null || !Number.isFinite(volume)) {
    return '$—';
  }
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
export function formatPrice(price: number | undefined | null): string {
  if (price == null || !Number.isFinite(price)) {
    return '$—';
  }
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toPrecision(4)}`;
  }
}
