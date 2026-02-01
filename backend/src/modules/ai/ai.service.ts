import OpenAI from 'openai';
import { getConfig } from '../../config/index.js';
import { getRedis } from '../../config/redis.js';
import { getLogger } from '../../utils/logger.js';
import { RateLimitError, AppError } from '../../utils/errors.js';
import {
  ANALYZER_SYSTEM_PROMPT,
  buildAnalyzerUserPrompt,
  CHAT_SYSTEM_PROMPT,
  buildChatContextMessage,
  type ChatMessage,
  type ChatContext,
} from './prompts/index.js';
import type { AggregatedTicker } from '../../jobs/priceAggregator.job.js';
import type { OrderBook } from '../market/exchanges/base.exchange.js';

// =============================================================================
// Types
// =============================================================================

export interface AnalysisResult {
  symbol: string;
  analysis: string;
  tokensUsed: number;
  generatedAt: number;
  rateLimit: RateLimitInfo;
}

export interface ChatResponse {
  message: string;
  tokensUsed: number;
  rateLimit: RateLimitInfo;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * AI rate limits per hour by subscription tier
 */
export const AI_RATE_LIMITS = {
  pro: 50,
  premium: 100,
  vip: 200,
} as const;

/**
 * Rate limit window in seconds (1 hour)
 */
const RATE_LIMIT_WINDOW = 3600;

/**
 * Maximum messages to include in chat history
 */
const MAX_CHAT_HISTORY = 20;

/**
 * OpenAI model to use (gpt-4o-mini for cost efficiency)
 */
const OPENAI_MODEL = 'gpt-4o-mini';

/**
 * Cache key prefix for AI rate limiting
 */
const RATE_LIMIT_KEY_PREFIX = 'ai:ratelimit:';

// =============================================================================
// OpenAI Client
// =============================================================================

let openaiClient: OpenAI | null = null;

/**
 * Check if AI service is available (API key is configured)
 * Use this for graceful degradation when AI is optional
 */
export function isAIAvailable(): boolean {
  const config = getConfig();
  return Boolean(config.OPENAI_API_KEY);
}

/**
 * Get or create OpenAI client instance
 */
function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const config = getConfig();

  if (!config.OPENAI_API_KEY) {
    throw new AppError(
      'AI analysis is not available. Please contact support if this issue persists.',
      503,
      'AI_NOT_CONFIGURED'
    );
  }

  openaiClient = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  });

  return openaiClient;
}

/**
 * Parse OpenAI error and return appropriate AppError
 */
function handleOpenAIError(error: unknown, context: string): never {
  const logger = getLogger();

  // Check for OpenAI-specific errors
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    const message = error.message;

    logger.error({ status, message, context }, 'OpenAI API error');

    // Rate limit from OpenAI (different from our app rate limit)
    if (status === 429) {
      throw new AppError(
        'AI service is temporarily busy. Please try again in a few moments.',
        429,
        'AI_PROVIDER_RATE_LIMIT'
      );
    }

    // Invalid API key
    if (status === 401) {
      throw new AppError(
        'AI service configuration error. Please contact support.',
        503,
        'AI_AUTH_ERROR'
      );
    }

    // Insufficient quota
    if (status === 402 || message.includes('quota')) {
      throw new AppError(
        'AI service quota exceeded. Please try again later.',
        503,
        'AI_QUOTA_EXCEEDED'
      );
    }

    // Server errors
    if (status && status >= 500) {
      throw new AppError(
        'AI service is temporarily unavailable. Please try again later.',
        503,
        'AI_PROVIDER_ERROR'
      );
    }
  }

  // Network errors
  if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
    throw new AppError(
      'Unable to connect to AI service. Please try again later.',
      503,
      'AI_NETWORK_ERROR'
    );
  }

  // Timeout errors
  if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
    throw new AppError(
      'AI service timed out. Please try again.',
      504,
      'AI_TIMEOUT'
    );
  }

  // Generic fallback
  logger.error(
    { error: error instanceof Error ? error.message : String(error), context },
    'Unknown AI error'
  );

  throw new AppError(
    'AI analysis failed. Please try again later.',
    500,
    'AI_ERROR'
  );
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Check if user has remaining AI API calls for this hour
 * @param userId User ID to check
 * @param tier User's subscription tier
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  userId: string,
  tier: string
): Promise<RateLimitCheck> {
  const redis = getRedis();
  const key = `${RATE_LIMIT_KEY_PREFIX}${userId}`;
  const limit = AI_RATE_LIMITS[tier as keyof typeof AI_RATE_LIMITS] ?? AI_RATE_LIMITS.pro;

  // Get current count
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  // Calculate reset time (next hour boundary)
  const now = Date.now();
  const resetAt = now + RATE_LIMIT_WINDOW * 1000;

  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt,
    };
  }

  // Increment counter
  const newCount = await redis.incr(key);

  // Set expiry on first request (when count was 0 or key didn't exist)
  if (newCount === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - newCount),
    limit,
    resetAt,
  };
}

// =============================================================================
// Analysis Service
// =============================================================================

/**
 * Analyze a cryptocurrency symbol using AI
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @param ticker Current ticker data
 * @param userId User ID for rate limiting
 * @param tier User's subscription tier
 * @param orderbook Optional orderbook data for deeper analysis
 * @returns Analysis result with markdown content
 */
export async function analyzeSymbol(
  symbol: string,
  ticker: AggregatedTicker,
  userId: string,
  tier: string,
  orderbook?: OrderBook
): Promise<AnalysisResult> {
  const logger = getLogger();

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(userId, tier);
  if (!rateLimitCheck.allowed) {
    throw new RateLimitError('AI rate limit exceeded. Please try again later.');
  }

  try {
    const client = getOpenAIClient();

    // Build orderbook context if available
    let orderbookContext: Parameters<typeof buildAnalyzerUserPrompt>[0]['orderbook'];
    if (orderbook && orderbook.bids.length > 0 && orderbook.asks.length > 0) {
      const bestBidEntry = orderbook.bids[0]!;
      const bestAskEntry = orderbook.asks[0]!;
      const bestBid = bestBidEntry.price;
      const bestAsk = bestAskEntry.price;
      const bidDepth = orderbook.bids.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
      const askDepth = orderbook.asks.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);

      orderbookContext = {
        bestBid,
        bestAsk,
        spread: ((bestAsk - bestBid) / bestBid) * 100,
        bidDepth,
        askDepth,
      };
    }

    // Build prompt parameters
    const promptParams: Parameters<typeof buildAnalyzerUserPrompt>[0] = {
      symbol: ticker.symbol,
      price: ticker.price,
      priceChange24h: ticker.change24h,
      volume24h: ticker.volume24h,
      high24h: ticker.high24h,
      low24h: ticker.low24h,
      exchangeCount: ticker.exchanges.length,
    };
    if (orderbookContext) {
      promptParams.orderbook = orderbookContext;
    }
    const userPrompt = buildAnalyzerUserPrompt(promptParams);

    // Call OpenAI
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: ANALYZER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    logger.info(
      { symbol, userId, tokensUsed: response.usage?.total_tokens },
      'AI analysis completed'
    );

    return {
      symbol,
      analysis: content,
      tokensUsed: response.usage?.total_tokens ?? 0,
      generatedAt: Date.now(),
      rateLimit: {
        remaining: rateLimitCheck.remaining,
        limit: rateLimitCheck.limit,
        resetAt: rateLimitCheck.resetAt,
      },
    };
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof AppError) {
      throw error;
    }

    handleOpenAIError(error, `analysis for ${symbol}`);
  }
}

// =============================================================================
// Chat Service
// =============================================================================

/**
 * Chat with the AI trading assistant
 * @param userId User ID for rate limiting
 * @param messages Conversation history
 * @param tier User's subscription tier
 * @param context Optional context (current symbol, price, etc.)
 * @returns Chat response
 */
export async function chat(
  userId: string,
  messages: ChatMessage[],
  tier: string,
  context?: ChatContext
): Promise<ChatResponse> {
  const logger = getLogger();

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(userId, tier);
  if (!rateLimitCheck.allowed) {
    throw new RateLimitError('AI rate limit exceeded. Please try again later.');
  }

  try {
    const client = getOpenAIClient();

    // Build system message with optional context
    let systemContent = CHAT_SYSTEM_PROMPT;
    if (context) {
      const contextMessage = buildChatContextMessage(context);
      if (contextMessage) {
        systemContent += `\n\n${contextMessage}`;
      }
    }

    // Limit message history to prevent token overflow
    const limitedMessages = messages.slice(-MAX_CHAT_HISTORY);

    // Build messages array
    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemContent },
      ...limitedMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Call OpenAI
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    logger.info(
      { userId, messageCount: messages.length, tokensUsed: response.usage?.total_tokens },
      'AI chat completed'
    );

    return {
      message: content,
      tokensUsed: response.usage?.total_tokens ?? 0,
      rateLimit: {
        remaining: rateLimitCheck.remaining,
        limit: rateLimitCheck.limit,
        resetAt: rateLimitCheck.resetAt,
      },
    };
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof AppError) {
      throw error;
    }

    handleOpenAIError(error, 'chat');
  }
}

/**
 * Reset OpenAI client (for testing)
 */
export function resetOpenAIClient(): void {
  openaiClient = null;
}
