import pg from 'pg';
import { getConfig } from './index.js';

let pool: pg.Pool | null = null;

export async function connectDatabase(): Promise<pg.Pool> {
  const config = getConfig();
  pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  await pool.query('SELECT NOW()');
  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) throw new Error('Database not connected');
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) await pool.end();
}
