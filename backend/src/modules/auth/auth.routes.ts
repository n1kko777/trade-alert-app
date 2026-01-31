import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.controller.js';

export default async function (fastify: FastifyInstance) {
  await fastify.register(authRoutes);
}
