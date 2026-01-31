import { FastifyInstance } from 'fastify';
import { portfolioController } from './portfolio.controller.js';

/**
 * Portfolio routes module
 * Registers all portfolio-related endpoints with authentication
 */
export async function portfolioRoutes(fastify: FastifyInstance) {
  await fastify.register(portfolioController);
}

export default portfolioRoutes;
