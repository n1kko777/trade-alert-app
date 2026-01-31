import { FastifyInstance } from 'fastify';
import { pumpsController } from './pumps.controller.js';

/**
 * Pumps routes module
 * Registers all pump-related endpoints with authentication
 */
export async function pumpsRoutes(fastify: FastifyInstance) {
  await fastify.register(pumpsController);
}

export default pumpsRoutes;
