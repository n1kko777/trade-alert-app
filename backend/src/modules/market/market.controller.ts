import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as marketService from './market.service.js';
// Market endpoints are public - no authentication required
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import type { ExchangeId } from './exchanges/base.exchange.js';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

const symbolParamSchema = z.object({
  symbol: z.string().min(3).max(20).regex(/^[A-Z0-9]+$/i, 'Symbol must be alphanumeric'),
});

const exchangeQuerySchema = z.object({
  exchange: z.enum(['binance', 'bybit', 'okx', 'mexc']).optional().default('binance'),
});

const orderBookQuerySchema = exchangeQuerySchema.extend({
  depth: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const candlesQuerySchema = exchangeQuerySchema.extend({
  interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w']).optional().default('1h'),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

// =============================================================================
// Type definitions for route handlers
// =============================================================================

interface SymbolParams {
  symbol: string;
}

interface OrderBookQuery {
  exchange?: ExchangeId;
  depth?: number;
}

interface CandlesQuery {
  exchange?: ExchangeId;
  interval?: string;
  limit?: number;
}

// =============================================================================
// Route handlers
// =============================================================================

/**
 * GET /api/v1/market/tickers
 * Get all aggregated tickers from cache
 */
export async function getTickersHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const tickers = await marketService.getTickers();

  return reply.send({
    tickers,
  });
}

/**
 * GET /api/v1/market/ticker/:symbol
 * Get single ticker by symbol
 */
export async function getTickerHandler(
  request: FastifyRequest<{ Params: SymbolParams }>,
  reply: FastifyReply
) {
  // Validate params
  const parseResult = symbolParamSchema.safeParse(request.params);
  if (!parseResult.success) {
    throw new ValidationError('Invalid symbol format', parseResult.error.format());
  }

  const { symbol } = parseResult.data;
  const normalizedSymbol = symbol.toUpperCase();

  const ticker = await marketService.getTicker(normalizedSymbol);

  if (!ticker) {
    throw new NotFoundError(`Ticker not found for symbol: ${normalizedSymbol}`);
  }

  return reply.send({
    ticker,
  });
}

/**
 * GET /api/v1/market/orderbook/:symbol
 * Get order book for a symbol
 */
export async function getOrderBookHandler(
  request: FastifyRequest<{ Params: SymbolParams; Querystring: OrderBookQuery }>,
  reply: FastifyReply
) {
  // Validate params
  const paramsResult = symbolParamSchema.safeParse(request.params);
  if (!paramsResult.success) {
    throw new ValidationError('Invalid symbol format', paramsResult.error.format());
  }

  // Validate query
  const queryResult = orderBookQuerySchema.safeParse(request.query);
  if (!queryResult.success) {
    throw new ValidationError('Invalid query parameters', queryResult.error.format());
  }

  const { symbol } = paramsResult.data;
  const { exchange, depth } = queryResult.data;
  const normalizedSymbol = symbol.toUpperCase();

  const orderbook = await marketService.getOrderBook(exchange, normalizedSymbol, depth);

  if (!orderbook) {
    throw new NotFoundError(`Order book not found for ${exchange}:${normalizedSymbol}`);
  }

  return reply.send({
    orderbook,
  });
}

/**
 * GET /api/v1/market/candles/:symbol
 * Get candles/klines for a symbol
 */
export async function getCandlesHandler(
  request: FastifyRequest<{ Params: SymbolParams; Querystring: CandlesQuery }>,
  reply: FastifyReply
) {
  // Validate params
  const paramsResult = symbolParamSchema.safeParse(request.params);
  if (!paramsResult.success) {
    throw new ValidationError('Invalid symbol format', paramsResult.error.format());
  }

  // Validate query
  const queryResult = candlesQuerySchema.safeParse(request.query);
  if (!queryResult.success) {
    throw new ValidationError('Invalid query parameters', queryResult.error.format());
  }

  const { symbol } = paramsResult.data;
  const { exchange, interval, limit } = queryResult.data;
  const normalizedSymbol = symbol.toUpperCase();

  const candles = await marketService.getCandles(exchange, normalizedSymbol, interval, limit);

  if (!candles) {
    throw new NotFoundError(`Candles not found for ${exchange}:${normalizedSymbol}`);
  }

  return reply.send({
    candles,
  });
}

/**
 * GET /api/v1/market/liquidations/:symbol
 * Get liquidation levels for a symbol
 * Returns calculated liquidation prices for various leverage levels (2x, 3x, 5x, 10x, 25x, 50x, 100x)
 */
export async function getLiquidationsHandler(
  request: FastifyRequest<{ Params: SymbolParams }>,
  reply: FastifyReply
) {
  // Validate params
  const parseResult = symbolParamSchema.safeParse(request.params);
  if (!parseResult.success) {
    throw new ValidationError('Invalid symbol format', parseResult.error.format());
  }

  const { symbol } = parseResult.data;
  const normalizedSymbol = symbol.toUpperCase();

  const liquidationMap = await marketService.getLiquidationMap(normalizedSymbol);

  if (!liquidationMap) {
    throw new NotFoundError(`Liquidation data not found for symbol: ${normalizedSymbol}`);
  }

  return reply.send(liquidationMap);
}

// =============================================================================
// Routes registration
// =============================================================================

/**
 * Register all market data routes
 */
export async function marketController(fastify: FastifyInstance) {
  // GET /api/v1/market/tickers - All tickers (public)
  fastify.get(
    '/api/v1/market/tickers',
    getTickersHandler
  );

  // GET /api/v1/market/ticker/:symbol - Single ticker (public)
  fastify.get<{ Params: SymbolParams }>(
    '/api/v1/market/ticker/:symbol',
    getTickerHandler
  );

  // GET /api/v1/market/orderbook/:symbol - Order book (public)
  fastify.get<{ Params: SymbolParams; Querystring: OrderBookQuery }>(
    '/api/v1/market/orderbook/:symbol',
    getOrderBookHandler
  );

  // GET /api/v1/market/candles/:symbol - Candles/klines (public)
  fastify.get<{ Params: SymbolParams; Querystring: CandlesQuery }>(
    '/api/v1/market/candles/:symbol',
    getCandlesHandler
  );

  // GET /api/v1/market/liquidations/:symbol - Liquidations (public)
  fastify.get<{ Params: SymbolParams }>(
    '/api/v1/market/liquidations/:symbol',
    getLiquidationsHandler
  );
}
