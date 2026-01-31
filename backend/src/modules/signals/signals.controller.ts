import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as signalsService from './signals.service.js';
import {
  signalIdParamSchema,
  signalStatusSchema,
} from './signals.schema.js';
import { authenticate, requireTier } from '../../middleware/auth.middleware.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Signal limits per subscription tier
 */
const TIER_SIGNAL_LIMITS = {
  free: 5,
  pro: 50,
  premium: 200,
  vip: 1000,
} as const;

// =============================================================================
// Zod Schemas for validation
// =============================================================================

const listSignalsQuerySchema = z.object({
  status: signalStatusSchema.optional(),
  symbol: z.string().min(3).max(20).optional(),
  direction: z.enum(['buy', 'sell']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// =============================================================================
// Type definitions for route handlers
// =============================================================================

interface IdParams {
  id: string;
}

interface ListSignalsQuery {
  status?: string;
  symbol?: string;
  direction?: string;
  limit?: string;
  offset?: string;
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Get signal limit for user's subscription tier
 */
function getSignalLimitForTier(tier: string): number {
  switch (tier) {
    case 'free':
      return TIER_SIGNAL_LIMITS.free;
    case 'pro':
      return TIER_SIGNAL_LIMITS.pro;
    case 'premium':
      return TIER_SIGNAL_LIMITS.premium;
    case 'vip':
      return TIER_SIGNAL_LIMITS.vip;
    default:
      return TIER_SIGNAL_LIMITS.free;
  }
}

/**
 * Check if user can access a signal based on tier
 */
function canAccessSignal(
  userTier: string,
  signalMinTier: string
): boolean {
  const tierOrder: Record<string, number> = { free: 0, pro: 1, premium: 2, vip: 3 };
  const userTierLevel = tierOrder[userTier] ?? 0;
  const requiredTierLevel = tierOrder[signalMinTier] ?? 0;
  return userTierLevel >= requiredTierLevel;
}

// =============================================================================
// Route handlers
// =============================================================================

/**
 * GET /api/v1/signals
 * Get list of signals with pagination and filters
 * Tier-based access control limits the number of signals
 */
export async function listSignalsHandler(
  request: FastifyRequest<{ Querystring: ListSignalsQuery }>,
  reply: FastifyReply
) {
  // Validate query parameters
  const parseResult = listSignalsQuerySchema.safeParse(request.query);
  if (!parseResult.success) {
    throw new ValidationError('Invalid query parameters', parseResult.error.format());
  }

  const { status, symbol, direction } = parseResult.data;
  const userTier = request.user.subscription || 'free';
  const tierLimit = getSignalLimitForTier(userTier);

  // Use the lower of requested limit or tier limit
  const requestedLimit = parseResult.data.limit ?? tierLimit;
  const limit = Math.min(requestedLimit, tierLimit);
  const offset = parseResult.data.offset ?? 0;

  // Get signals with tier filter
  const signals = await signalsService.getSignals({
    status,
    symbol,
    direction,
    minTier: userTier as 'free' | 'pro' | 'premium' | 'vip',
    limit,
    offset,
  });

  return reply.send({
    signals,
    count: signals.length,
    limit,
    offset,
    tierLimit,
  });
}

/**
 * GET /api/v1/signals/:id
 * Get a specific signal by ID
 */
export async function getSignalHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  // Validate params
  const parseResult = signalIdParamSchema.safeParse(request.params);
  if (!parseResult.success) {
    throw new ValidationError('Invalid signal ID', parseResult.error.format());
  }

  const { id } = parseResult.data;
  const signal = await signalsService.getSignalById(id);

  if (!signal) {
    throw new NotFoundError(`Signal not found: ${id}`);
  }

  // Check tier access
  const userTier = request.user.subscription || 'free';
  if (!canAccessSignal(userTier, signal.minTier)) {
    throw new ForbiddenError(
      `This signal requires ${signal.minTier} subscription or higher`
    );
  }

  return reply.send({
    signal,
  });
}

/**
 * GET /api/v1/signals/stats
 * Get signal statistics (win rate, average profit, etc.)
 */
export async function getSignalStatsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const stats = await signalsService.getSignalStats();

  return reply.send({
    stats,
  });
}

// =============================================================================
// Routes registration
// =============================================================================

/**
 * Register all signal-related routes
 */
export async function signalsController(fastify: FastifyInstance) {
  // GET /api/v1/signals - List signals with tier-based limits
  fastify.get<{ Querystring: ListSignalsQuery }>(
    '/api/v1/signals',
    { preHandler: [authenticate, requireTier('free')] },
    listSignalsHandler
  );

  // GET /api/v1/signals/stats - Signal statistics (pro+ only)
  fastify.get(
    '/api/v1/signals/stats',
    { preHandler: [authenticate, requireTier('pro')] },
    getSignalStatsHandler
  );

  // GET /api/v1/signals/:id - Get specific signal
  fastify.get<{ Params: IdParams }>(
    '/api/v1/signals/:id',
    { preHandler: [authenticate, requireTier('free')] },
    getSignalHandler
  );
}
