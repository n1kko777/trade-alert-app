import cron, { ScheduledTask } from 'node-cron';
import { getRedis } from '../config/redis.js';
import { getLogger } from '../utils/logger.js';
import {
  BinanceExchange,
  BybitExchange,
  OkxExchange,
  MexcExchange,
  type Ticker,
  type BaseExchange,
} from '../modules/market/exchanges/index.js';
import { broadcastTickers } from '../websocket/index.js';

/**
 * Redis key constants for market data storage
 */
export const REDIS_KEYS = {
  TICKERS_HASH: 'market:tickers',
  TICKER_PREFIX: 'market:ticker:',
} as const;

/**
 * TTL for ticker data in Redis (30 seconds)
 */
export const REDIS_TTL = 30;

/**
 * Aggregated ticker with exchange sources
 */
export interface AggregatedTicker extends Ticker {
  exchanges: string[];
}

// Module-level state
let cronTask: ScheduledTask | null = null;
let exchanges: BaseExchange[] | null = null;

/**
 * Initialize exchange instances
 */
function initializeExchanges(): BaseExchange[] {
  if (exchanges) return exchanges;

  const logger = getLogger();
  exchanges = [
    new BinanceExchange(logger),
    new BybitExchange(logger),
    new OkxExchange(logger),
    new MexcExchange(logger),
  ];

  return exchanges;
}

/**
 * Fetch tickers from all exchanges concurrently
 * Handles individual exchange failures gracefully
 */
export async function fetchAllTickers(): Promise<Map<string, Ticker[]>> {
  const logger = getLogger();
  const exchangeList = initializeExchanges();
  const results = new Map<string, Ticker[]>();

  const fetchPromises = exchangeList.map(async (exchange) => {
    try {
      const tickers = await exchange.getAllTickers();
      return { exchangeId: exchange.id, tickers };
    } catch (error) {
      logger.warn(
        { exchange: exchange.id, error: error instanceof Error ? error.message : String(error) },
        'Failed to fetch tickers from exchange'
      );
      return null;
    }
  });

  const fetchResults = await Promise.all(fetchPromises);

  for (const result of fetchResults) {
    if (result) {
      results.set(result.exchangeId, result.tickers);
    }
  }

  return results;
}

/**
 * Aggregate tickers from multiple exchanges by symbol
 * Calculates average price, total volume, average change, max high, min low
 */
export function aggregateTickers(
  exchangeTickers: Map<string, Ticker[]>
): Map<string, AggregatedTicker> {
  const aggregated = new Map<string, AggregatedTicker>();
  const symbolData = new Map<
    string,
    { tickers: Ticker[]; exchanges: string[] }
  >();

  // Group tickers by symbol
  for (const [exchangeId, tickers] of exchangeTickers) {
    for (const ticker of tickers) {
      const existing = symbolData.get(ticker.symbol);
      if (existing) {
        existing.tickers.push(ticker);
        existing.exchanges.push(exchangeId);
      } else {
        symbolData.set(ticker.symbol, {
          tickers: [ticker],
          exchanges: [exchangeId],
        });
      }
    }
  }

  // Calculate aggregated values for each symbol
  for (const [symbol, data] of symbolData) {
    const { tickers, exchanges: exchangeIds } = data;
    const count = tickers.length;

    const avgPrice =
      tickers.reduce((sum, t) => sum + t.price, 0) / count;
    const totalVolume = tickers.reduce((sum, t) => sum + t.volume24h, 0);
    const avgChange =
      tickers.reduce((sum, t) => sum + t.change24h, 0) / count;
    const maxHigh = Math.max(...tickers.map((t) => t.high24h));
    const minLow = Math.min(...tickers.map((t) => t.low24h));

    aggregated.set(symbol, {
      symbol,
      price: avgPrice,
      volume24h: totalVolume,
      change24h: avgChange,
      high24h: maxHigh,
      low24h: minLow,
      timestamp: Date.now(),
      exchanges: exchangeIds,
    });
  }

  return aggregated;
}

/**
 * Store aggregated tickers in Redis
 * - Hash at market:tickers for all tickers
 * - Individual keys at market:ticker:{symbol} for quick access
 */
export async function storeTickers(
  aggregatedTickers: Map<string, AggregatedTicker>
): Promise<void> {
  if (aggregatedTickers.size === 0) {
    return;
  }

  const redis = getRedis();
  const hashData: Record<string, string> = {};

  // Prepare hash data and store individual keys
  const storePromises: Promise<unknown>[] = [];

  for (const [symbol, ticker] of aggregatedTickers) {
    const tickerJson = JSON.stringify(ticker);
    hashData[symbol] = tickerJson;

    // Store individual ticker with TTL
    storePromises.push(
      redis.set(`${REDIS_KEYS.TICKER_PREFIX}${symbol}`, tickerJson, {
        EX: REDIS_TTL,
      })
    );
  }

  // Store hash with all tickers
  storePromises.push(redis.hSet(REDIS_KEYS.TICKERS_HASH, hashData));
  storePromises.push(redis.expire(REDIS_KEYS.TICKERS_HASH, REDIS_TTL));

  await Promise.all(storePromises);
}

/**
 * Main job execution function
 * Fetches, aggregates, stores tickers and broadcasts via WebSocket
 */
async function runPriceAggregator(): Promise<void> {
  const logger = getLogger();
  const startTime = Date.now();

  try {
    // Fetch tickers from all exchanges
    const exchangeTickers = await fetchAllTickers();

    // Aggregate by symbol
    const aggregatedTickers = aggregateTickers(exchangeTickers);

    // Store in Redis
    await storeTickers(aggregatedTickers);

    // Broadcast to WebSocket subscribers
    const tickersArray = Array.from(aggregatedTickers.values());
    broadcastTickers(tickersArray);

    const duration = Date.now() - startTime;
    logger.info(
      {
        duration: `${duration}ms`,
        symbols: aggregatedTickers.size,
        exchanges: exchangeTickers.size,
      },
      'Price aggregator job completed'
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      },
      'Price aggregator job failed'
    );
  }
}

/**
 * Start the price aggregator background job
 * Runs every 5 seconds using node-cron
 */
export function startPriceAggregatorJob(): void {
  const logger = getLogger();

  if (cronTask) {
    logger.warn('Price aggregator job is already running');
    return;
  }

  // Schedule: every 5 seconds
  // Cron format: second minute hour day month weekday
  cronTask = cron.schedule('*/5 * * * * *', runPriceAggregator, {
    scheduled: true,
    name: 'priceAggregator',
  });

  logger.info('Price aggregator job started (every 5 seconds)');
}

/**
 * Stop the price aggregator background job
 */
export function stopPriceAggregatorJob(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    const logger = getLogger();
    logger.info('Price aggregator job stopped');
  }
}

/**
 * Check if the price aggregator job is running
 */
export function isPriceAggregatorJobRunning(): boolean {
  return cronTask !== null;
}
