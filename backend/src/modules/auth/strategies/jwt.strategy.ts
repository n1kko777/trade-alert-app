import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { query, queryOne, execute } from '../../../db/queries/index.js';
import { AuthError } from '../../../utils/errors.js';
import type { TokenPayload } from '../../../types/fastify.js';

export type { TokenPayload };

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  device_info: { ip: string; userAgent: string } | null;
  expires_at: Date;
  created_at: Date;
}

export function generateAccessToken(fastify: FastifyInstance, payload: Omit<TokenPayload, 'type'>): string {
  return fastify.jwt.sign(
    { ...payload, type: 'access' },
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function saveRefreshToken(
  userId: string,
  token: string,
  deviceInfo: { ip: string; userAgent: string }
): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, JSON.stringify(deviceInfo), expiresAt]
  );
}

export async function validateRefreshToken(token: string): Promise<RefreshTokenRecord> {
  const tokenHash = hashToken(token);

  const record = await queryOne<RefreshTokenRecord>(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash]
  );

  if (!record) {
    throw new AuthError('Invalid or expired refresh token');
  }

  return record;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await execute('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await execute('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function getUserSessions(userId: string): Promise<RefreshTokenRecord[]> {
  return query<RefreshTokenRecord>(
    `SELECT id, user_id, device_info, expires_at, created_at
     FROM refresh_tokens
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );
}

export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const count = await execute(
    'DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  return count > 0;
}
