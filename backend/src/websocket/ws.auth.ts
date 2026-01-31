import { FastifyInstance } from 'fastify';
import type { TokenPayload } from '../types/fastify.js';

/**
 * Custom error class for WebSocket authentication failures
 */
export class WsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WsAuthError';
  }
}

/**
 * Extract JWT token from URL query parameters or Authorization header
 * Priority: query param > Authorization header
 *
 * @param url - Request URL with potential query params
 * @param headers - Request headers object
 * @returns Token string or null if not found
 */
export function extractToken(
  url: string,
  headers: Record<string, string | string[] | undefined>
): string | null {
  // Try query parameter first
  try {
    const urlObj = new URL(url, 'http://localhost');
    const queryToken = urlObj.searchParams.get('token');
    if (queryToken) {
      return queryToken;
    }
  } catch {
    // URL parsing failed, continue to check headers
  }

  // Try Authorization header with Bearer prefix
  const authHeader = headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return token || null;
  }

  return null;
}

/**
 * Validate JWT token and return user payload
 * Only accepts access tokens (not refresh tokens)
 *
 * @param fastify - Fastify instance with JWT plugin
 * @param token - JWT token string
 * @returns Token payload with user info
 * @throws WsAuthError if token is invalid, expired, or wrong type
 */
export async function validateWsToken(
  fastify: FastifyInstance,
  token: string
): Promise<TokenPayload> {
  if (!token) {
    throw new WsAuthError('Token is required');
  }

  try {
    const payload = fastify.jwt.verify<TokenPayload>(token);

    // Only allow access tokens for WebSocket connections
    if (payload.type !== 'access') {
      throw new WsAuthError('Invalid token type');
    }

    return payload;
  } catch (error) {
    if (error instanceof WsAuthError) {
      throw error;
    }

    // JWT verification failed (invalid signature, expired, etc.)
    throw new WsAuthError(
      error instanceof Error ? error.message : 'Token verification failed'
    );
  }
}
