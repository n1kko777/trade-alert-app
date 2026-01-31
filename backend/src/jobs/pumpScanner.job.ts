import cron, { ScheduledTask } from 'node-cron';
import { getLogger } from '../utils/logger.js';
import { getCachedTickers } from '../services/cache.service.js';
import { detectPump, type PumpEvent, DEFAULT_PUMP_CONFIG } from '../modules/pumps/pumps.detector.js';
import { storePump } from '../modules/pumps/pumps.service.js';
import { broadcastPump } from '../websocket/index.js';
import type { AggregatedTicker } from './priceAggregator.job.js';

// Module-level state
let cronTask: ScheduledTask | null = null;
let previousSnapshot: Map<string, AggregatedTicker> = new Map();

/**
 * Generate a unique ID for pump events
 */
function generatePumpId(): string {
  return `pump-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert PumpEvent to WebSocket broadcast format
 */
function toWsBroadcastFormat(pump: PumpEvent): {
  id: string;
  symbol: string;
  change: number;
  volume: number;
  timestamp: number;
} {
  return {
    id: generatePumpId(),
    symbol: pump.symbol,
    change: pump.changePct,
    volume: pump.volume24h,
    timestamp: pump.detectedAt,
  };
}

/**
 * Scan current tickers for pumps by comparing with previous snapshot
 * Detects, stores, and broadcasts any pump events found
 */
export async function scanForPumps(): Promise<void> {
  const logger = getLogger();

  // Get current tickers from cache
  const currentTickers = await getCachedTickers();

  if (!currentTickers || currentTickers.length === 0) {
    logger.debug('No tickers available for pump scanning');
    return;
  }

  // Build current ticker map for easy lookup
  const currentTickerMap = new Map<string, AggregatedTicker>();
  for (const ticker of currentTickers) {
    currentTickerMap.set(ticker.symbol, ticker);
  }

  // If this is the first run, just store the snapshot
  if (previousSnapshot.size === 0) {
    previousSnapshot = currentTickerMap;
    logger.debug({ symbols: currentTickerMap.size }, 'Initial pump scanner snapshot stored');
    return;
  }

  // Scan for pumps by comparing current with previous
  const detectedPumps: PumpEvent[] = [];

  for (const [symbol, currentTicker] of currentTickerMap) {
    const previousTicker = previousSnapshot.get(symbol);

    // Skip if no previous data for this symbol
    if (!previousTicker) {
      continue;
    }

    // Check if this symbol is pumping
    const pumpEvent = detectPump(currentTicker, previousTicker, DEFAULT_PUMP_CONFIG);

    if (pumpEvent) {
      detectedPumps.push(pumpEvent);
    }
  }

  // Process detected pumps
  if (detectedPumps.length > 0) {
    logger.info({ count: detectedPumps.length }, 'Pumps detected');

    for (const pump of detectedPumps) {
      // Store in Redis
      await storePump(pump);

      // Broadcast via WebSocket
      const broadcastData = toWsBroadcastFormat(pump);
      broadcastPump(broadcastData);

      logger.info(
        {
          symbol: pump.symbol,
          changePct: pump.changePct.toFixed(2),
          volumeMultiplier: pump.volumeMultiplier.toFixed(2),
          exchanges: pump.exchanges,
        },
        'Pump detected and broadcasted'
      );
    }
  }

  // Update snapshot for next scan
  previousSnapshot = currentTickerMap;
}

/**
 * Main job execution wrapper with error handling
 */
async function runPumpScanner(): Promise<void> {
  const logger = getLogger();
  const startTime = Date.now();

  try {
    await scanForPumps();

    const duration = Date.now() - startTime;
    logger.debug({ duration: `${duration}ms` }, 'Pump scanner job completed');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      },
      'Pump scanner job failed'
    );
  }
}

/**
 * Start the pump scanner background job
 * Runs every 10 seconds using node-cron
 */
export function startPumpScannerJob(): void {
  const logger = getLogger();

  if (cronTask) {
    logger.warn('Pump scanner job is already running');
    return;
  }

  // Schedule: every 10 seconds
  cronTask = cron.schedule('*/10 * * * * *', runPumpScanner, {
    scheduled: true,
    name: 'pumpScanner',
  });

  logger.info('Pump scanner job started (every 10 seconds)');
}

/**
 * Stop the pump scanner background job
 */
export function stopPumpScannerJob(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    const logger = getLogger();
    logger.info('Pump scanner job stopped');
  }
}

/**
 * Check if the pump scanner job is running
 */
export function isPumpScannerJobRunning(): boolean {
  return cronTask !== null;
}

/**
 * Get the current snapshot (for testing only)
 */
export function getSnapshotForTesting(): Map<string, AggregatedTicker> {
  return previousSnapshot;
}

/**
 * Clear the snapshot (for testing only)
 */
export function clearSnapshotForTesting(): void {
  previousSnapshot = new Map();
}
