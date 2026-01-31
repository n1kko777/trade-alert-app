import { query, queryOne, execute } from '../../db/queries/index.js';
import type {
  Signal,
  SignalFilter,
  SignalStats,
  SignalStatus,
  CreateSignalInput,
  AiTrigger,
} from './signals.schema.js';
import type { GeneratedSignal } from './signals.generator.js';

/**
 * Database row type for signals table
 */
interface SignalRow {
  id: string;
  symbol: string;
  exchange: string;
  direction: 'buy' | 'sell';
  entry_price: string;
  stop_loss: string;
  take_profit_1: string | null;
  take_profit_2: string | null;
  take_profit_3: string | null;
  ai_confidence: number | null;
  ai_triggers: AiTrigger[] | null;
  status: string;
  result_pnl: string | null;
  closed_at: Date | null;
  created_at: Date;
  min_tier: string;
}

/**
 * Convert database row to Signal type
 */
function rowToSignal(row: SignalRow): Signal {
  return {
    id: row.id,
    symbol: row.symbol,
    exchange: row.exchange,
    direction: row.direction,
    entryPrice: parseFloat(row.entry_price),
    stopLoss: parseFloat(row.stop_loss),
    takeProfit1: row.take_profit_1 ? parseFloat(row.take_profit_1) : null,
    takeProfit2: row.take_profit_2 ? parseFloat(row.take_profit_2) : null,
    takeProfit3: row.take_profit_3 ? parseFloat(row.take_profit_3) : null,
    aiConfidence: row.ai_confidence,
    aiTriggers: row.ai_triggers,
    status: row.status as SignalStatus,
    resultPnl: row.result_pnl ? parseFloat(row.result_pnl) : null,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    minTier: row.min_tier as Signal['minTier'],
  };
}

/**
 * Create a new signal in the database
 * @param signal - Signal data from generator or API input
 * @returns Created signal with ID
 */
export async function createSignal(
  signal: GeneratedSignal | CreateSignalInput
): Promise<Signal> {
  const result = await queryOne<SignalRow>(
    `INSERT INTO signals (
      symbol, exchange, direction, entry_price, stop_loss,
      take_profit_1, take_profit_2, take_profit_3,
      ai_confidence, ai_triggers, status, min_tier
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
    RETURNING *`,
    [
      signal.symbol.toUpperCase(),
      signal.exchange.toLowerCase(),
      signal.direction,
      signal.entryPrice,
      signal.stopLoss,
      'takeProfit1' in signal ? signal.takeProfit1 : null,
      'takeProfit2' in signal ? signal.takeProfit2 : null,
      'takeProfit3' in signal ? signal.takeProfit3 : null,
      'aiConfidence' in signal ? signal.aiConfidence : null,
      'aiTriggers' in signal && signal.aiTriggers ? JSON.stringify(signal.aiTriggers) : null,
      signal.minTier || 'free',
    ]
  );

  if (!result) {
    throw new Error('Failed to create signal');
  }

  return rowToSignal(result);
}

/**
 * Get signals from the database with optional filters
 * @param filters - Filter parameters
 * @returns Array of signals
 */
export async function getSignals(filters: SignalFilter = {}): Promise<Signal[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.symbol) {
    conditions.push(`symbol = $${paramIndex++}`);
    params.push(filters.symbol.toUpperCase());
  }

  if (filters.direction) {
    conditions.push(`direction = $${paramIndex++}`);
    params.push(filters.direction);
  }

  if (filters.minTier) {
    // Filter to signals accessible by this tier or lower
    const tierOrder = { free: 1, pro: 2, premium: 3, vip: 4 };
    const tierValue = tierOrder[filters.minTier];
    const accessibleTiers = Object.entries(tierOrder)
      .filter(([, v]) => v <= tierValue)
      .map(([k]) => k);
    conditions.push(`min_tier = ANY($${paramIndex++})`);
    params.push(accessibleTiers);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const rows = await query<SignalRow>(
    `SELECT * FROM signals ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return rows.map(rowToSignal);
}

/**
 * Get a single signal by ID
 * @param id - Signal UUID
 * @returns Signal or null if not found
 */
export async function getSignalById(id: string): Promise<Signal | null> {
  const row = await queryOne<SignalRow>(
    'SELECT * FROM signals WHERE id = $1',
    [id]
  );

  return row ? rowToSignal(row) : null;
}

/**
 * Update signal status
 * @param id - Signal UUID
 * @param status - New status
 * @param resultPnl - Optional PnL result when closing
 */
export async function updateSignalStatus(
  id: string,
  status: SignalStatus,
  resultPnl?: number
): Promise<void> {
  const isClosed = ['closed', 'cancelled'].includes(status);

  await execute(
    `UPDATE signals
     SET status = $1,
         result_pnl = COALESCE($2, result_pnl),
         closed_at = CASE WHEN $3 THEN NOW() ELSE closed_at END
     WHERE id = $4`,
    [status, resultPnl ?? null, isClosed, id]
  );
}

/**
 * Get signal statistics
 * @returns Aggregated signal statistics
 */
export async function getSignalStats(): Promise<SignalStats> {
  // Get basic counts
  const countsResult = await queryOne<{
    total: string;
    active: string;
    closed: string;
  }>(
    `SELECT
      COUNT(*)::text as total,
      COUNT(*) FILTER (WHERE status = 'active')::text as active,
      COUNT(*) FILTER (WHERE status IN ('closed', 'tp1_hit', 'tp2_hit', 'tp3_hit'))::text as closed
     FROM signals`
  );

  const total = parseInt(countsResult?.total ?? '0', 10);
  const active = parseInt(countsResult?.active ?? '0', 10);
  const closed = parseInt(countsResult?.closed ?? '0', 10);

  // Get PnL statistics for closed signals
  const pnlResult = await queryOne<{
    avg_pnl: string | null;
    total_pnl: string | null;
    win_count: string;
    total_with_pnl: string;
  }>(
    `SELECT
      AVG(result_pnl)::text as avg_pnl,
      SUM(result_pnl)::text as total_pnl,
      COUNT(*) FILTER (WHERE result_pnl > 0)::text as win_count,
      COUNT(*) FILTER (WHERE result_pnl IS NOT NULL)::text as total_with_pnl
     FROM signals
     WHERE status IN ('closed', 'tp1_hit', 'tp2_hit', 'tp3_hit')`
  );

  const totalWithPnl = parseInt(pnlResult?.total_with_pnl ?? '0', 10);
  const winCount = parseInt(pnlResult?.win_count ?? '0', 10);
  const winRate = totalWithPnl > 0 ? (winCount / totalWithPnl) * 100 : 0;

  // Get signals by trigger type
  const triggerRows = await query<{ trigger_type: string; count: string }>(
    `SELECT
      jsonb_array_elements(ai_triggers)->>'type' as trigger_type,
      COUNT(*)::text as count
     FROM signals
     WHERE ai_triggers IS NOT NULL
     GROUP BY trigger_type`
  );

  const signalsByTrigger: Record<string, number> = {};
  for (const row of triggerRows) {
    signalsByTrigger[row.trigger_type] = parseInt(row.count, 10);
  }

  return {
    totalSignals: total,
    activeSignals: active,
    closedSignals: closed,
    winRate: Number(winRate.toFixed(2)),
    averagePnl: parseFloat(pnlResult?.avg_pnl ?? '0') || 0,
    totalPnl: parseFloat(pnlResult?.total_pnl ?? '0') || 0,
    signalsByTrigger,
  };
}

/**
 * Get active signals for price checking
 * @returns Array of active signals
 */
export async function getActiveSignals(): Promise<Signal[]> {
  const rows = await query<SignalRow>(
    `SELECT * FROM signals WHERE status = 'active' ORDER BY created_at DESC`
  );

  return rows.map(rowToSignal);
}

/**
 * Close a signal with result
 * @param id - Signal UUID
 * @param status - Final status (tp1_hit, tp2_hit, tp3_hit, or closed for SL)
 * @param exitPrice - Price at which the signal was closed
 */
export async function closeSignal(
  id: string,
  status: SignalStatus,
  exitPrice: number
): Promise<void> {
  // First get the signal to calculate PnL
  const signal = await getSignalById(id);
  if (!signal) {
    return;
  }

  // Calculate PnL percentage
  let pnlPct: number;
  if (signal.direction === 'buy') {
    pnlPct = ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
  } else {
    pnlPct = ((signal.entryPrice - exitPrice) / signal.entryPrice) * 100;
  }

  await updateSignalStatus(id, status, Number(pnlPct.toFixed(2)));
}

/**
 * Get signals accessible by a specific tier
 * @param tier - User's subscription tier
 * @param limit - Maximum number of signals to return
 * @returns Array of accessible signals
 */
export async function getSignalsForTier(
  tier: 'free' | 'pro' | 'premium' | 'vip',
  limit: number
): Promise<Signal[]> {
  const tierOrder = { free: 1, pro: 2, premium: 3, vip: 4 };
  const userTierValue = tierOrder[tier];

  // Get accessible tiers
  const accessibleTiers = Object.entries(tierOrder)
    .filter(([, v]) => v <= userTierValue)
    .map(([k]) => k);

  const rows = await query<SignalRow>(
    `SELECT * FROM signals
     WHERE min_tier = ANY($1)
     ORDER BY created_at DESC
     LIMIT $2`,
    [accessibleTiers, limit]
  );

  return rows.map(rowToSignal);
}
