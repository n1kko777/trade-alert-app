import { getRedis } from '../config/redis.js';
import type { AggregatedTicker } from '../jobs/priceAggregator.job.js';
import type { OrderBook, Candle } from '../modules/market/exchanges/base.exchange.js';

/**
 * Cache key prefixes for market data
 */
export const CACHE_KEYS = {
  TICKERS: 'market:tickers',
  TICKER: 'market:ticker:',
  ORDERBOOK: 'market:orderbook:',
  CANDLES: 'market:candles:',
  LIQUIDATIONS: 'market:liquidations:',
} as const;

/**
 * Cache TTL values in seconds for different data types
 */
export const CACHE_TTL = {
  TICKERS: 10,
  ORDERBOOK: 5,
  CANDLES: 60,
  LIQUIDATIONS: 60,
} as const;

/**
 * Generic cache getter - retrieves and parses JSON data from Redis
 * @param key Redis key to retrieve
 * @returns Parsed data or null if not found/invalid
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Generic cache setter - stores JSON stringified data in Redis with TTL
 * @param key Redis key to set
 * @param value Data to store (will be JSON stringified)
 * @param ttlSeconds Time to live in seconds
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

/**
 * Invalidate a specific cache key
 * @param key Redis key to delete
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}

/**
 * Invalidate all cache keys matching a pattern
 * @param pattern Redis key pattern with wildcards (e.g., "market:orderbook:*")
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(pattern);

  if (keys.length > 0) {
    await redis.del(keys);
  }
}

// ============================================================================
// Market Data Cache Functions
// ============================================================================

/**
 * Get all cached aggregated tickers
 * @returns Array of aggregated tickers or null if not cached
 */
export async function getCachedTickers(): Promise<AggregatedTicker[] | null> {
  const redis = getRedis();
  const data = await redis.hGetAll(CACHE_KEYS.TICKERS);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const tickers: AggregatedTicker[] = [];
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (value) {
      try {
        tickers.push(JSON.parse(value) as AggregatedTicker);
      } catch {
        // Skip invalid entries
      }
    }
  }

  return tickers.length > 0 ? tickers : null;
}

/**
 * Get a cached aggregated ticker for a specific symbol
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @returns Aggregated ticker or null if not cached
 */
export async function getCachedTicker(symbol: string): Promise<AggregatedTicker | null> {
  const redis = getRedis();
  const data = await redis.hGet(CACHE_KEYS.TICKERS, symbol);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as AggregatedTicker;
  } catch {
    return null;
  }
}

/**
 * Get cached order book for an exchange and symbol
 * @param exchange Exchange identifier (e.g., "binance")
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @returns Order book or null if not cached
 */
export async function getCachedOrderBook(exchange: string, symbol: string): Promise<OrderBook | null> {
  const key = `${CACHE_KEYS.ORDERBOOK}${exchange}:${symbol}`;
  return getCache<OrderBook>(key);
}

/**
 * Cache an order book for an exchange and symbol
 * @param exchange Exchange identifier
 * @param symbol Trading pair symbol
 * @param data Order book data to cache
 */
export async function setCachedOrderBook(exchange: string, symbol: string, data: OrderBook): Promise<void> {
  const key = `${CACHE_KEYS.ORDERBOOK}${exchange}:${symbol}`;
  await setCache(key, data, CACHE_TTL.ORDERBOOK);
}

/**
 * Get cached candles for an exchange, symbol, and interval
 * @param exchange Exchange identifier
 * @param symbol Trading pair symbol
 * @param interval Time interval (e.g., "1m", "5m", "1h")
 * @returns Array of candles or null if not cached
 */
export async function getCachedCandles(exchange: string, symbol: string, interval: string): Promise<Candle[] | null> {
  const key = `${CACHE_KEYS.CANDLES}${exchange}:${symbol}:${interval}`;
  return getCache<Candle[]>(key);
}

/**
 * Cache candles for an exchange, symbol, and interval
 * @param exchange Exchange identifier
 * @param symbol Trading pair symbol
 * @param interval Time interval
 * @param data Array of candles to cache
 */
export async function setCachedCandles(exchange: string, symbol: string, interval: string, data: Candle[]): Promise<void> {
  const key = `${CACHE_KEYS.CANDLES}${exchange}:${symbol}:${interval}`;
  await setCache(key, data, CACHE_TTL.CANDLES);
}

// ============================================================================
// Liquidation Cache Functions
// ============================================================================

/**
 * Liquidation level data for a specific leverage
 */
export interface LiquidationLevel {
  leverage: number;
  longPrice: number;
  shortPrice: number;
  estimatedVolume: number;
}

/**
 * Full liquidation map for a symbol
 */
export interface LiquidationMap {
  symbol: string;
  currentPrice: number;
  levels: LiquidationLevel[];
  updatedAt: number;
}

/**
 * Get cached liquidation map for a symbol
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @returns Liquidation map or null if not cached
 */
export async function getCachedLiquidations(symbol: string): Promise<LiquidationMap | null> {
  const key = `${CACHE_KEYS.LIQUIDATIONS}${symbol}`;
  return getCache<LiquidationMap>(key);
}

/**
 * Cache a liquidation map for a symbol
 * @param symbol Trading pair symbol
 * @param data Liquidation map to cache
 */
export async function setCachedLiquidations(symbol: string, data: LiquidationMap): Promise<void> {
  const key = `${CACHE_KEYS.LIQUIDATIONS}${symbol}`;
  await setCache(key, data, CACHE_TTL.LIQUIDATIONS);
}
