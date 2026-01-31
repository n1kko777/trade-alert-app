import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as portfolioService from './portfolio.service.js';
import {
  addAssetSchema,
  updateAssetSchema,
  assetIdParamSchema,
  type AddAssetInput,
  type UpdateAssetInput,
} from './portfolio.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { ValidationError } from '../../utils/errors.js';

// =============================================================================
// Type definitions for route handlers
// =============================================================================

interface IdParams {
  id: string;
}

// =============================================================================
// Route handlers
// =============================================================================

/**
 * GET /api/v1/portfolio
 * Get user's portfolio with current values and P&L
 */
export async function getPortfolioHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const portfolio = await portfolioService.getPortfolio(request.user.userId);

  return reply.send({
    portfolio,
  });
}

/**
 * POST /api/v1/portfolio/asset
 * Add a new asset to user's portfolio
 */
export async function addAssetHandler(
  request: FastifyRequest<{ Body: AddAssetInput }>,
  reply: FastifyReply
) {
  const parseResult = addAssetSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid asset data', parseResult.error.format());
  }

  const asset = await portfolioService.addAsset(request.user.userId, parseResult.data);

  request.log.info(
    { assetId: asset.id, symbol: asset.symbol },
    'Asset added to portfolio'
  );

  return reply.status(201).send({
    message: 'Asset added successfully',
    asset,
  });
}

/**
 * PATCH /api/v1/portfolio/asset/:id
 * Update an existing asset in user's portfolio
 */
export async function updateAssetHandler(
  request: FastifyRequest<{ Params: IdParams; Body: UpdateAssetInput }>,
  reply: FastifyReply
) {
  // Validate params
  const paramsResult = assetIdParamSchema.safeParse(request.params);
  if (!paramsResult.success) {
    throw new ValidationError('Invalid asset ID', paramsResult.error.format());
  }

  // Validate body
  const bodyResult = updateAssetSchema.safeParse(request.body);
  if (!bodyResult.success) {
    throw new ValidationError('Invalid update data', bodyResult.error.format());
  }

  const { id } = paramsResult.data;
  const asset = await portfolioService.updateAsset(
    request.user.userId,
    id,
    bodyResult.data
  );

  request.log.info({ assetId: id }, 'Asset updated');

  return reply.send({
    message: 'Asset updated successfully',
    asset,
  });
}

/**
 * DELETE /api/v1/portfolio/asset/:id
 * Remove an asset from user's portfolio
 */
export async function deleteAssetHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  // Validate params
  const parseResult = assetIdParamSchema.safeParse(request.params);
  if (!parseResult.success) {
    throw new ValidationError('Invalid asset ID', parseResult.error.format());
  }

  const { id } = parseResult.data;
  await portfolioService.deleteAsset(request.user.userId, id);

  request.log.info({ assetId: id }, 'Asset deleted from portfolio');

  return reply.send({
    message: 'Asset deleted successfully',
  });
}

// =============================================================================
// Routes registration
// =============================================================================

/**
 * Register all portfolio-related routes
 */
export async function portfolioController(fastify: FastifyInstance) {
  // GET /api/v1/portfolio - Get user's portfolio
  fastify.get(
    '/api/v1/portfolio',
    { preHandler: [authenticate] },
    getPortfolioHandler
  );

  // POST /api/v1/portfolio/asset - Add new asset
  fastify.post<{ Body: AddAssetInput }>(
    '/api/v1/portfolio/asset',
    { preHandler: [authenticate] },
    addAssetHandler
  );

  // PATCH /api/v1/portfolio/asset/:id - Update asset
  fastify.patch<{ Params: IdParams; Body: UpdateAssetInput }>(
    '/api/v1/portfolio/asset/:id',
    { preHandler: [authenticate] },
    updateAssetHandler
  );

  // DELETE /api/v1/portfolio/asset/:id - Delete asset
  fastify.delete<{ Params: IdParams }>(
    '/api/v1/portfolio/asset/:id',
    { preHandler: [authenticate] },
    deleteAssetHandler
  );
}
