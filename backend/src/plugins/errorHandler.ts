import { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { AppError, ValidationError } from '../utils/errors.js';
import { ZodError } from 'zod';

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | AppError | ZodError, request, reply) => {
    const logger = request.log;

    // Zod validation errors
    if (error instanceof ZodError) {
      logger.warn({ err: error }, 'Validation error');
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors,
      });
    }

    // Custom app errors
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error({ err: error }, error.message);
      } else {
        logger.warn({ err: error }, error.message);
      }
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error instanceof ValidationError && error.details ? { details: error.details } : {}),
      });
    }

    // Fastify validation errors
    if ((error as FastifyError).validation) {
      logger.warn({ err: error }, 'Request validation error');
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: error.message,
        details: (error as FastifyError).validation,
      });
    }

    // Unknown errors
    logger.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
    });
  });

  // Handle not found
  fastify.setNotFoundHandler((request, reply) => {
    request.log.warn({ url: request.url }, 'Route not found');
    return reply.status(404).send({
      error: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
