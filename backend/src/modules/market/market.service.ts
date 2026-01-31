import {
  getCachedTickers,
  getCachedTicker,
  getCachedOrderBook,
  getCachedCandles,
  setCachedOrderBook,
  setCachedCandles,
  getCachedLiquidations,
  setCachedLiquidations,
  type LiquidationLevel,
  type LiquidationMap,
} from '../../services/cache.service.js';

// Re-export types for external use
export type { LiquidationLevel, LiquidationMap };
import {
  BinanceExchange,
  BybitExchange,
  OkxExchange,
  MexcExchange,
  type OrderBook,
  type Candle,
  type ExchangeId,
  type BaseExchange,
} from './exchanges/index.js';
import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Liquidation data (placeholder interface)
 */
export interface Liquidation {
  symbol: string;
  side: 'long' | 'short';
  price: number;
  quantity: number;
  timestamp: number;
}

// ============================================================================
// Liquidation Calculator Constants
// ============================================================================

/**
 * Standard leverage levels for liquidation calculations
 */
export const LEVERAGE_LEVELS = [2, 3, 5, 10, 25, 50, 100] as const;

/**
 * Volume decay factor for realistic volume estimation at higher leverage
 * 0.8 means volume decreases by 20% for each 10x increase in leverage
 */
export const VOLUME_DECAY_FACTOR = 0.8;

/**
 * Base volume for liquidation estimation (in USD)
 */
export const BASE_VOLUME = 1_000_000;

// Exchange instances cache
let exchangeInstances: Map<ExchangeId, BaseExchange> | null = null;

/**
 * Get or create exchange instances
 */
function getExchangeInstances(): Map<ExchangeId, BaseExchange> {
  if (exchangeInstances) {
    return exchangeInstances;
  }

  const logger = getLogger();
  exchangeInstances = new Map<ExchangeId, BaseExchange>([
    ['binance', new BinanceExchange(logger)],
    ['bybit', new BybitExchange(logger)],
    ['okx', new OkxExchange(logger)],
    ['mexc', new MexcExchange(logger)],
  ]);

  return exchangeInstances;
}

/**
 * Get exchange instance by ID
 */
function getExchange(exchangeId: ExchangeId): BaseExchange {
  const exchanges = getExchangeInstances();
  const exchange = exchanges.get(exchangeId);

  if (!exchange) {
    throw new Error(`Unknown exchange: ${exchangeId}`);
  }

  return exchange;
}

/**
 * Get all tickers from cache
 * @returns Array of aggregated tickers or empty array if not cached
 */
export async function getTickers(): Promise<AggregatedTicker[]> {
  const tickers = await getCachedTickers();
  return tickers ?? [];
}

/**
 * Get a single ticker by symbol from cache
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @returns Aggregated ticker or null if not found
 */
export async function getTicker(symbol: string): Promise<AggregatedTicker | null> {
  return getCachedTicker(symbol);
}

/**
 * Get order book for an exchange and symbol
 * First checks cache, then fetches from exchange if not cached
 * @param exchange Exchange identifier
 * @param symbol Trading pair symbol
 * @param depth Number of price levels (default: 20)
 * @returns Order book data
 */
export async function getOrderBook(
  exchange: ExchangeId,
  symbol: string,
  depth: number = 20
): Promise<OrderBook | null> {
  // Try to get from cache first
  const cached = await getCachedOrderBook(exchange, symbol);
  if (cached) {
    return cached;
  }

  // Fetch from exchange
  try {
    const exchangeInstance = getExchange(exchange);
    const orderBook = await exchangeInstance.getOrderBook(symbol, depth);

    // Cache the result
    await setCachedOrderBook(exchange, symbol, orderBook);

    return orderBook;
  } catch (error) {
    const logger = getLogger();
    logger.warn(
      { exchange, symbol, error: error instanceof Error ? error.message : String(error) },
      'Failed to fetch orderbook from exchange'
    );
    return null;
  }
}

/**
 * Get candles for an exchange, symbol, and interval
 * First checks cache, then fetches from exchange if not cached
 * @param exchange Exchange identifier
 * @param symbol Trading pair symbol
 * @param interval Time interval (e.g., "1m", "5m", "1h")
 * @param limit Number of candles to return (default: 100)
 * @returns Array of candles
 */
export async function getCandles(
  exchange: ExchangeId,
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[] | null> {
  // Try to get from cache first
  const cached = await getCachedCandles(exchange, symbol, interval);
  if (cached) {
    return cached;
  }

  // Fetch from exchange
  try {
    const exchangeInstance = getExchange(exchange);
    const candles = await exchangeInstance.getCandles(symbol, interval, limit);

    // Cache the result
    await setCachedCandles(exchange, symbol, interval, candles);

    return candles;
  } catch (error) {
    const logger = getLogger();
    logger.warn(
      { exchange, symbol, interval, error: error instanceof Error ? error.message : String(error) },
      'Failed to fetch candles from exchange'
    );
    return null;
  }
}

/**
 * Get liquidations for a symbol
 * @param _symbol Trading pair symbol
 * @returns Array of liquidations (placeholder - returns empty array)
 */
export async function getLiquidations(_symbol: string): Promise<Liquidation[]> {
  // Placeholder implementation
  // Will be implemented in Phase 4.3: Liquidation calculator
  return [];
}

// ============================================================================
// Liquidation Calculator Functions
// ============================================================================

/**
 * Calculate liquidation levels for a given symbol and price
 *
 * Formulas:
 * - Long liquidation price = price * (1 - 1/leverage)
 * - Short liquidation price = price * (1 + 1/leverage)
 * - Estimated volume = baseVolume * decayFactor^(leverage/10)
 *
 * @param _symbol Trading pair symbol (used for context/logging)
 * @param currentPrice Current price of the asset
 * @returns Array of liquidation levels for each standard leverage level
 */
export function calculateLiquidationLevels(_symbol: string, currentPrice: number): LiquidationLevel[] {
  return LEVERAGE_LEVELS.map((leverage) => {
    // Long liquidation: position gets liquidated when price drops
    // Formula: price * (1 - 1/leverage)
    const longPrice = currentPrice * (1 - 1 / leverage);

    // Short liquidation: position gets liquidated when price rises
    // Formula: price * (1 + 1/leverage)
    const shortPrice = currentPrice * (1 + 1 / leverage);

    // Estimated volume with decay: higher leverage = less volume (more risk averse)
    // Formula: baseVolume * decayFactor^(leverage/10)
    const estimatedVolume = BASE_VOLUME * Math.pow(VOLUME_DECAY_FACTOR, leverage / 10);

    return {
      leverage,
      longPrice,
      shortPrice,
      estimatedVolume,
    };
  });
}

/**
 * Get the full liquidation map for a symbol
 * First checks cache, then calculates if not cached
 *
 * @param symbol Trading pair symbol
 * @returns Liquidation map or null if ticker not found
 */
export async function getLiquidationMap(symbol: string): Promise<LiquidationMap | null> {
  // Try to get from cache first
  const cached = await getCachedLiquidations(symbol);
  if (cached) {
    return cached;
  }

  // Get current price from ticker
  const ticker = await getCachedTicker(symbol);
  if (!ticker) {
    return null;
  }

  // Calculate liquidation levels
  const levels = calculateLiquidationLevels(symbol, ticker.price);

  // Build the liquidation map
  const liquidationMap: LiquidationMap = {
    symbol,
    currentPrice: ticker.price,
    levels,
    updatedAt: Date.now(),
  };

  // Cache the result
  await setCachedLiquidations(symbol, liquidationMap);

  return liquidationMap;
}

/**
 * Reset exchange instances (for testing)
 */
export function resetExchangeInstances(): void {
  exchangeInstances = null;
}
