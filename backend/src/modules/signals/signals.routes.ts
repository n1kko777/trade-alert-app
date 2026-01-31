import { FastifyInstance } from 'fastify';
import { signalsController } from './signals.controller.js';

/**
 * Signals routes module
 * Registers all signal-related endpoints with authentication
 */
export async function signalsRoutes(fastify: FastifyInstance) {
  await fastify.register(signalsController);
}

export default signalsRoutes;
