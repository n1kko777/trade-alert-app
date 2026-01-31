import { FastifyInstance } from 'fastify';
import { marketController } from './market.controller.js';

/**
 * Market data routes module
 * Registers all market-related endpoints with authentication
 */
export async function marketRoutes(fastify: FastifyInstance) {
  await fastify.register(marketController);
}

export default marketRoutes;
