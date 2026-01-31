import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as aiService from './ai.service.js';
import * as marketService from '../market/market.service.js';
import { analyzeParamsSchema, chatBodySchema, type ChatBody } from './ai.schema.js';
import { authenticate, requireTier } from '../../middleware/auth.middleware.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';

// =============================================================================
// Type definitions for route handlers
// =============================================================================

interface AnalyzeParamsRequest {
  symbol: string;
}

// =============================================================================
// Route handlers
// =============================================================================

/**
 * POST /api/v1/ai/analyze/:symbol
 * Analyze a cryptocurrency symbol using AI
 * Requires pro tier or higher
 */
export async function analyzeSymbolHandler(
  request: FastifyRequest<{ Params: AnalyzeParamsRequest }>,
  reply: FastifyReply
) {
  // Validate params
  const parseResult = analyzeParamsSchema.safeParse(request.params);
  if (!parseResult.success) {
    throw new ValidationError('Invalid symbol', parseResult.error.format());
  }

  const { symbol } = parseResult.data;
  const userId = request.user.userId;
  const tier = request.user.subscription || 'pro';

  // Get ticker data from cache
  const ticker = await marketService.getTicker(symbol);
  if (!ticker) {
    throw new NotFoundError(`Symbol not found: ${symbol}. Make sure the ticker data is available.`);
  }

  // Optionally get orderbook for deeper analysis (from first available exchange)
  let orderbook = null;
  if (ticker.exchanges.length > 0) {
    const exchangeId = ticker.exchanges[0] as 'binance' | 'bybit' | 'okx' | 'mexc';
    orderbook = await marketService.getOrderBook(exchangeId, symbol);
  }

  // Call AI service
  const result = await aiService.analyzeSymbol(
    symbol,
    ticker,
    userId,
    tier,
    orderbook ?? undefined
  );

  return reply.send({
    success: true,
    data: {
      symbol: result.symbol,
      analysis: result.analysis,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    },
    rateLimit: result.rateLimit,
  });
}

/**
 * POST /api/v1/ai/chat
 * Chat with the AI trading assistant
 * Requires pro tier or higher
 */
export async function chatHandler(
  request: FastifyRequest<{ Body: ChatBody }>,
  reply: FastifyReply
) {
  // Validate body
  const parseResult = chatBodySchema.safeParse(request.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid request body', parseResult.error.format());
  }

  const { messages, context } = parseResult.data;
  const userId = request.user.userId;
  const tier = request.user.subscription || 'pro';

  // Convert validated messages to service format
  const chatMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  // Build context if symbol is provided
  let chatContext: { symbol: string; currentPrice?: number; priceChange24h?: number; userTier: string } | undefined;
  if (context?.symbol) {
    const ticker = await marketService.getTicker(context.symbol);
    if (ticker) {
      chatContext = {
        symbol: context.symbol,
        currentPrice: ticker.price,
        priceChange24h: ticker.change24h,
        userTier: tier,
      };
    } else {
      // Use provided context values if ticker not found
      chatContext = {
        symbol: context.symbol,
        userTier: tier,
      };
      if (context.currentPrice !== undefined) {
        chatContext.currentPrice = context.currentPrice;
      }
      if (context.priceChange24h !== undefined) {
        chatContext.priceChange24h = context.priceChange24h;
      }
    }
  }

  // Call AI service
  const result = await aiService.chat(userId, chatMessages, tier, chatContext);

  return reply.send({
    success: true,
    data: {
      message: result.message,
      tokensUsed: result.tokensUsed,
    },
    rateLimit: result.rateLimit,
  });
}

/**
 * GET /api/v1/ai/limits
 * Get current AI usage limits for the authenticated user
 * Requires pro tier or higher
 */
export async function getLimitsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const tier = request.user.subscription || 'pro';

  // Check current rate limit status without incrementing
  const limit = aiService.AI_RATE_LIMITS[tier as keyof typeof aiService.AI_RATE_LIMITS] ?? aiService.AI_RATE_LIMITS.pro;

  return reply.send({
    success: true,
    data: {
      tier,
      limit,
      limits: aiService.AI_RATE_LIMITS,
    },
  });
}

// =============================================================================
// Routes registration
// =============================================================================

/**
 * Register all AI-related routes
 */
export async function aiController(fastify: FastifyInstance) {
  // POST /api/v1/ai/analyze/:symbol - Analyze a symbol (pro+ only)
  fastify.post<{ Params: AnalyzeParamsRequest }>(
    '/api/v1/ai/analyze/:symbol',
    { preHandler: [authenticate, requireTier('pro')] },
    analyzeSymbolHandler
  );

  // POST /api/v1/ai/chat - Chat with AI (pro+ only)
  fastify.post<{ Body: ChatBody }>(
    '/api/v1/ai/chat',
    { preHandler: [authenticate, requireTier('pro')] },
    chatHandler
  );

  // GET /api/v1/ai/limits - Get rate limits (pro+ only)
  fastify.get(
    '/api/v1/ai/limits',
    { preHandler: [authenticate, requireTier('pro')] },
    getLimitsHandler
  );
}
