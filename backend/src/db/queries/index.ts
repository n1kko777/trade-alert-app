import { getPool } from '../../config/database.js';

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: unknown[]): Promise<number> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rowCount ?? 0;
}
