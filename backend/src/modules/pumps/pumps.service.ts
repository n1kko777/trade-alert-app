import { getRedis } from '../../config/redis.js';
import type { PumpEvent } from './pumps.detector.js';

/**
 * TTL for active pump events in seconds (15 minutes)
 */
export const PUMP_TTL = 900;

/**
 * Redis key prefix for active pump storage
 */
export const PUMP_KEY_PREFIX = 'pumps:active:';

/**
 * Get all active pump events from Redis
 * @returns Array of active pump events
 */
export async function getActivePumps(): Promise<PumpEvent[]> {
  const redis = getRedis();

  // Get all keys matching the pump prefix
  const keys = await redis.keys(`${PUMP_KEY_PREFIX}*`);

  if (keys.length === 0) {
    return [];
  }

  // Fetch all pump data in one operation
  const values = await redis.mGet(keys);

  // Parse and filter valid pump events
  const pumps: PumpEvent[] = [];
  for (const value of values) {
    if (value) {
      try {
        const pump = JSON.parse(value) as PumpEvent;
        pumps.push(pump);
      } catch {
        // Skip invalid JSON entries
      }
    }
  }

  return pumps;
}

/**
 * Store a pump event in Redis with TTL
 * @param pump - Pump event to store
 */
export async function storePump(pump: PumpEvent): Promise<void> {
  const redis = getRedis();
  const key = `${PUMP_KEY_PREFIX}${pump.symbol}`;

  await redis.set(key, JSON.stringify(pump), { EX: PUMP_TTL });
}

/**
 * Get a specific pump event by symbol
 * @param symbol - Trading pair symbol
 * @returns Pump event or null if not found
 */
export async function getPump(symbol: string): Promise<PumpEvent | null> {
  const redis = getRedis();
  const key = `${PUMP_KEY_PREFIX}${symbol}`;

  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as PumpEvent;
  } catch {
    return null;
  }
}

/**
 * Clear a pump event from Redis
 * @param symbol - Trading pair symbol to clear
 */
export async function clearPump(symbol: string): Promise<void> {
  const redis = getRedis();
  const key = `${PUMP_KEY_PREFIX}${symbol}`;

  await redis.del(key);
}
