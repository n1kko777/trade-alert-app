import { createClient, RedisClientType } from 'redis';
import { getConfig } from './index.js';
import { getLogger } from '../utils/logger.js';

let client: RedisClientType | null = null;

export async function connectRedis(): Promise<RedisClientType> {
  const config = getConfig();
  const logger = getLogger();

  client = createClient({
    url: config.REDIS_URL,
  });

  client.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  await client.connect();
  return client;
}

export function getRedis(): RedisClientType {
  if (!client) throw new Error('Redis not connected');
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
