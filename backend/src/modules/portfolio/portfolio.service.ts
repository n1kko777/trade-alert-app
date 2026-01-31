import { query, queryOne, execute } from '../../db/queries/index.js';
import { getCachedTickers } from '../../services/cache.service.js';
import { NotFoundError, AppError } from '../../utils/errors.js';
import type {
  AddAssetInput,
  UpdateAssetInput,
  PortfolioAsset,
  Portfolio,
  PortfolioDbRow,
} from './portfolio.schema.js';
import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';

/**
 * Convert database row to PortfolioAsset (without price data)
 */
function dbRowToAsset(row: PortfolioDbRow): Omit<PortfolioAsset, 'currentPrice' | 'currentValue' | 'pnl' | 'pnlAbsolute'> {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    amount: parseFloat(row.amount),
    avgBuyPrice: parseFloat(row.avg_buy_price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Calculate P&L and current values for an asset given its ticker price
 */
function calculateAssetValues(
  asset: Omit<PortfolioAsset, 'currentPrice' | 'currentValue' | 'pnl' | 'pnlAbsolute'>,
  ticker: AggregatedTicker | undefined
): PortfolioAsset {
  if (!ticker) {
    return {
      ...asset,
      currentPrice: null,
      currentValue: null,
      pnl: null,
      pnlAbsolute: null,
    };
  }

  const currentPrice = ticker.price;
  const currentValue = asset.amount * currentPrice;
  const cost = asset.amount * asset.avgBuyPrice;
  const pnlAbsolute = currentValue - cost;
  const pnl = cost > 0 ? (pnlAbsolute / cost) * 100 : 0;

  return {
    ...asset,
    currentPrice,
    currentValue,
    pnl,
    pnlAbsolute,
  };
}

/**
 * Get user's portfolio with calculated P&L values
 */
export async function getPortfolio(userId: string): Promise<Portfolio> {
  // Fetch user's assets from database
  const rows = await query<PortfolioDbRow>(
    `SELECT id, user_id, symbol, amount, avg_buy_price, created_at, updated_at
     FROM portfolios
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  // Get cached tickers for price data
  const tickers = await getCachedTickers();
  const tickerMap = new Map<string, AggregatedTicker>();
  if (tickers) {
    for (const ticker of tickers) {
      tickerMap.set(ticker.symbol, ticker);
    }
  }

  // Calculate values for each asset
  const assets: PortfolioAsset[] = [];
  let totalValue = 0;
  let totalCost = 0;
  let assetsWithPrice = 0;
  let assetsWithoutPrice = 0;

  for (const row of rows) {
    const baseAsset = dbRowToAsset(row);
    const ticker = tickerMap.get(row.symbol);
    const asset = calculateAssetValues(baseAsset, ticker);
    assets.push(asset);

    // Calculate cost for this asset
    const assetCost = asset.amount * asset.avgBuyPrice;
    totalCost += assetCost;

    if (asset.currentValue !== null) {
      totalValue += asset.currentValue;
      assetsWithPrice++;
    } else {
      assetsWithoutPrice++;
    }
  }

  // Calculate total P&L (only using assets with prices)
  const costOfPricedAssets = rows
    .filter((row) => tickerMap.has(row.symbol))
    .reduce((sum, row) => sum + parseFloat(row.amount) * parseFloat(row.avg_buy_price), 0);

  const totalPnlAbsolute = totalValue - costOfPricedAssets;
  const totalPnl = totalCost > 0 ? (totalPnlAbsolute / totalCost) * 100 : 0;

  return {
    assets,
    totalValue,
    totalCost,
    totalPnl,
    totalPnlAbsolute,
    assetsWithPrice,
    assetsWithoutPrice,
  };
}

/**
 * Add a new asset to user's portfolio
 */
export async function addAsset(userId: string, input: AddAssetInput): Promise<PortfolioAsset> {
  const symbol = input.symbol.toUpperCase();

  const row = await queryOne<PortfolioDbRow>(
    `INSERT INTO portfolios (user_id, symbol, amount, avg_buy_price)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, symbol, amount, avg_buy_price, created_at, updated_at`,
    [userId, symbol, input.amount, input.avgBuyPrice]
  );

  if (!row) {
    throw new AppError('Failed to add asset', 500, 'CREATE_FAILED');
  }

  const baseAsset = dbRowToAsset(row);

  // Try to get current price
  const tickers = await getCachedTickers();
  const ticker = tickers?.find((t) => t.symbol === symbol);

  return calculateAssetValues(baseAsset, ticker);
}

/**
 * Update an existing asset in user's portfolio
 */
export async function updateAsset(
  userId: string,
  assetId: string,
  update: UpdateAssetInput
): Promise<PortfolioAsset> {
  // First check if asset exists and belongs to user
  const existing = await queryOne<PortfolioDbRow>(
    'SELECT * FROM portfolios WHERE id = $1',
    [assetId]
  );

  if (!existing || existing.user_id !== userId) {
    throw new NotFoundError('Asset not found');
  }

  // Build dynamic update query
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (update.amount !== undefined) {
    updates.push(`amount = $${paramIndex}`);
    params.push(update.amount);
    paramIndex++;
  }

  if (update.avgBuyPrice !== undefined) {
    updates.push(`avg_buy_price = $${paramIndex}`);
    params.push(update.avgBuyPrice);
    paramIndex++;
  }

  updates.push('updated_at = NOW()');
  params.push(assetId);

  const row = await queryOne<PortfolioDbRow>(
    `UPDATE portfolios
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, user_id, symbol, amount, avg_buy_price, created_at, updated_at`,
    params
  );

  if (!row) {
    throw new AppError('Failed to update asset', 500, 'UPDATE_FAILED');
  }

  const baseAsset = dbRowToAsset(row);

  // Try to get current price
  const tickers = await getCachedTickers();
  const ticker = tickers?.find((t) => t.symbol === row.symbol);

  return calculateAssetValues(baseAsset, ticker);
}

/**
 * Delete an asset from user's portfolio
 */
export async function deleteAsset(userId: string, assetId: string): Promise<void> {
  // First check if asset exists and belongs to user
  const existing = await queryOne<PortfolioDbRow>(
    'SELECT * FROM portfolios WHERE id = $1',
    [assetId]
  );

  if (!existing || existing.user_id !== userId) {
    throw new NotFoundError('Asset not found');
  }

  await execute('DELETE FROM portfolios WHERE id = $1', [assetId]);
}

/**
 * Get a specific asset by ID (with ownership check)
 */
export async function getAssetById(userId: string, assetId: string): Promise<PortfolioAsset | null> {
  const row = await queryOne<PortfolioDbRow>(
    'SELECT * FROM portfolios WHERE id = $1',
    [assetId]
  );

  if (!row || row.user_id !== userId) {
    return null;
  }

  const baseAsset = dbRowToAsset(row);

  // Try to get current price
  const tickers = await getCachedTickers();
  const ticker = tickers?.find((t) => t.symbol === row.symbol);

  return calculateAssetValues(baseAsset, ticker);
}
