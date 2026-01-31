import {
  getCachedTickers,
  getCachedTicker,
  getCachedOrderBook,
  getCachedCandles,
  setCachedOrderBook,
  setCachedCandles,
} from '../../services/cache.service.js';
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

/**
 * Reset exchange instances (for testing)
 */
export function resetExchangeInstances(): void {
  exchangeInstances = null;
}
