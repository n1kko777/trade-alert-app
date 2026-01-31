import cron, { ScheduledTask } from 'node-cron';
import { getLogger } from '../utils/logger.js';
import { getCachedTicker } from '../services/cache.service.js';
import { getActiveSignals, closeSignal } from '../modules/signals/signals.service.js';
import { broadcastSignal } from '../websocket/index.js';
import type { Signal, SignalStatus } from '../modules/signals/signals.schema.js';

// Module-level state
let cronTask: ScheduledTask | null = null;

/**
 * Signal check result
 */
interface SignalCheckResult {
  signalId: string;
  symbol: string;
  direction: 'buy' | 'sell';
  status: SignalStatus;
  exitPrice: number;
  pnlPct: number;
}

/**
 * Check if a take profit level has been hit
 * @param currentPrice - Current market price
 * @param signal - Signal to check
 * @returns The highest TP level hit, or null
 */
function checkTakeProfitHit(
  currentPrice: number,
  signal: Signal
): { level: SignalStatus; price: number } | null {
  const { direction, takeProfit1, takeProfit2, takeProfit3 } = signal;

  // Check TPs in reverse order (highest first)
  const tpLevels: { level: SignalStatus; price: number | null }[] = [
    { level: 'tp3_hit', price: takeProfit3 },
    { level: 'tp2_hit', price: takeProfit2 },
    { level: 'tp1_hit', price: takeProfit1 },
  ];

  for (const tp of tpLevels) {
    if (tp.price === null) continue;

    if (direction === 'buy') {
      // For long positions, price must be >= TP
      if (currentPrice >= tp.price) {
        return { level: tp.level, price: tp.price };
      }
    } else {
      // For short positions, price must be <= TP
      if (currentPrice <= tp.price) {
        return { level: tp.level, price: tp.price };
      }
    }
  }

  return null;
}

/**
 * Check if stop loss has been hit
 * @param currentPrice - Current market price
 * @param signal - Signal to check
 * @returns True if SL was hit
 */
function checkStopLossHit(currentPrice: number, signal: Signal): boolean {
  const { direction, stopLoss } = signal;

  if (direction === 'buy') {
    // For long positions, SL triggers when price drops below
    return currentPrice <= stopLoss;
  } else {
    // For short positions, SL triggers when price rises above
    return currentPrice >= stopLoss;
  }
}

/**
 * Calculate PnL percentage for a signal
 */
function calculatePnlPct(
  entryPrice: number,
  exitPrice: number,
  direction: 'buy' | 'sell'
): number {
  if (direction === 'buy') {
    return ((exitPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - exitPrice) / entryPrice) * 100;
  }
}

/**
 * Check a single signal against current price
 * @param signal - Signal to check
 * @returns Check result if signal should be closed, null otherwise
 */
export async function checkSignal(signal: Signal): Promise<SignalCheckResult | null> {
  const logger = getLogger();

  // Get current price from cache
  const ticker = await getCachedTicker(signal.symbol);

  if (!ticker) {
    logger.debug({ symbol: signal.symbol }, 'No cached price for signal check');
    return null;
  }

  const currentPrice = ticker.price;

  // Check stop loss first (higher priority)
  if (checkStopLossHit(currentPrice, signal)) {
    const pnlPct = calculatePnlPct(signal.entryPrice, signal.stopLoss, signal.direction);
    return {
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      status: 'closed',
      exitPrice: signal.stopLoss,
      pnlPct: Number(pnlPct.toFixed(2)),
    };
  }

  // Check take profits
  const tpHit = checkTakeProfitHit(currentPrice, signal);
  if (tpHit) {
    const pnlPct = calculatePnlPct(signal.entryPrice, tpHit.price, signal.direction);
    return {
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      status: tpHit.level,
      exitPrice: tpHit.price,
      pnlPct: Number(pnlPct.toFixed(2)),
    };
  }

  return null;
}

/**
 * Scan all active signals and check for TP/SL hits
 */
export async function scanActiveSignals(): Promise<void> {
  const logger = getLogger();

  // Get all active signals
  const activeSignals = await getActiveSignals();

  if (activeSignals.length === 0) {
    logger.debug('No active signals to check');
    return;
  }

  logger.debug({ count: activeSignals.length }, 'Checking active signals');

  const results: SignalCheckResult[] = [];

  // Check each signal
  for (const signal of activeSignals) {
    try {
      const result = await checkSignal(signal);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      logger.error(
        {
          signalId: signal.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Error checking signal'
      );
    }
  }

  // Process results
  if (results.length > 0) {
    logger.info({ count: results.length }, 'Signals hit TP/SL');

    for (const result of results) {
      try {
        // Update signal in database
        await closeSignal(result.signalId, result.status, result.exitPrice);

        // Broadcast update via WebSocket
        broadcastSignal({
          id: result.signalId,
          symbol: result.symbol,
          direction: result.direction,
          confidence: 0,
          timestamp: Date.now(),
        });

        logger.info(
          {
            signalId: result.signalId,
            symbol: result.symbol,
            status: result.status,
            pnlPct: result.pnlPct,
          },
          'Signal closed'
        );
      } catch (error) {
        logger.error(
          {
            signalId: result.signalId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Error closing signal'
        );
      }
    }
  }
}

/**
 * Main job execution wrapper with error handling
 */
async function runSignalChecker(): Promise<void> {
  const logger = getLogger();
  const startTime = Date.now();

  try {
    await scanActiveSignals();

    const duration = Date.now() - startTime;
    logger.debug({ duration: `${duration}ms` }, 'Signal checker job completed');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      },
      'Signal checker job failed'
    );
  }
}

/**
 * Start the signal checker background job
 * Runs every 30 seconds using node-cron
 */
export function startSignalCheckerJob(): void {
  const logger = getLogger();

  if (cronTask) {
    logger.warn('Signal checker job is already running');
    return;
  }

  // Schedule: every 30 seconds
  cronTask = cron.schedule('*/30 * * * * *', runSignalChecker, {
    scheduled: true,
    name: 'signalChecker',
  });

  logger.info('Signal checker job started (every 30 seconds)');
}

/**
 * Stop the signal checker background job
 */
export function stopSignalCheckerJob(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    const logger = getLogger();
    logger.info('Signal checker job stopped');
  }
}

/**
 * Check if the signal checker job is running
 */
export function isSignalCheckerJobRunning(): boolean {
  return cronTask !== null;
}

/**
 * Manually trigger a signal check (for testing)
 */
export async function triggerSignalCheck(): Promise<void> {
  await runSignalChecker();
}
