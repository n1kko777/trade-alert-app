import { FastifyInstance } from 'fastify';
import { aiController } from './ai.controller.js';

/**
 * AI routes module
 * Registers all AI-related endpoints with authentication
 */
export async function aiRoutes(fastify: FastifyInstance) {
  await fastify.register(aiController);
}

export default aiRoutes;
