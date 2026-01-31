import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as pumpsService from './pumps.service.js';
import { authenticate, requireTier } from '../../middleware/auth.middleware.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

// =============================================================================
// Zod Schemas for validation
// =============================================================================

const symbolParamSchema = z.object({
  symbol: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/i, 'Symbol must be alphanumeric'),
});

// =============================================================================
// Type definitions for route handlers
// =============================================================================

interface SymbolParams {
  symbol: string;
}

// =============================================================================
// Route handlers
// =============================================================================

/**
 * GET /api/v1/pumps
 * Get all active pump events
 */
export async function getActivePumpsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const pumps = await pumpsService.getActivePumps();

  return reply.send({
    pumps,
    count: pumps.length,
  });
}

/**
 * GET /api/v1/pumps/:symbol
 * Get a specific pump event by symbol
 */
export async function getPumpHandler(
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

  const pump = await pumpsService.getPump(normalizedSymbol);

  if (!pump) {
    throw new NotFoundError(`No active pump for symbol: ${normalizedSymbol}`);
  }

  return reply.send({
    pump,
  });
}

// =============================================================================
// Routes registration
// =============================================================================

/**
 * Register all pump-related routes
 */
export async function pumpsController(fastify: FastifyInstance) {
  // GET /api/v1/pumps - All active pumps
  fastify.get(
    '/api/v1/pumps',
    { preHandler: [authenticate, requireTier('free')] },
    getActivePumpsHandler
  );

  // GET /api/v1/pumps/:symbol - Specific pump
  fastify.get<{ Params: SymbolParams }>(
    '/api/v1/pumps/:symbol',
    { preHandler: [authenticate, requireTier('free')] },
    getPumpHandler
  );
}
