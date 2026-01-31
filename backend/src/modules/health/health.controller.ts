import { FastifyInstance } from 'fastify';
import { getPool } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: { status: 'ok' | 'error'; latency?: number; error?: string };
    redis: { status: 'ok' | 'error'; latency?: number; error?: string };
  };
}

async function checkDatabase(): Promise<{ status: 'ok' | 'error'; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    const pool = getPool();
    await pool.query('SELECT 1');
    return { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function checkRedis(): Promise<{ status: 'ok' | 'error'; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    const redis = getRedis();
    await redis.ping();
    return { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function healthRoutes(fastify: FastifyInstance) {
  // Simple health check for load balancers
  fastify.get('/health', async (_request, reply) => {
    const [dbStatus, redisStatus] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    const allOk = dbStatus.status === 'ok' && redisStatus.status === 'ok';
    const anyError = dbStatus.status === 'error' || redisStatus.status === 'error';

    const health: HealthStatus = {
      status: allOk ? 'ok' : anyError ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };

    const statusCode = health.status === 'ok' ? 200 : 503;
    return reply.status(statusCode).send(health);
  });

  // Simple liveness probe (doesn't check dependencies)
  fastify.get('/health/live', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Readiness probe (checks all dependencies)
  fastify.get('/health/ready', async (_request, reply) => {
    const [dbStatus, redisStatus] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    if (dbStatus.status === 'error' || redisStatus.status === 'error') {
      return reply.status(503).send({
        status: 'not_ready',
        services: { database: dbStatus, redis: redisStatus },
      });
    }

    return { status: 'ready' };
  });
}
