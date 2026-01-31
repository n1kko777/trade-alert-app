import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthError, ForbiddenError } from '../utils/errors.js';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();

    if (request.user.type !== 'access') {
      throw new AuthError('Invalid token type');
    }
  } catch (err) {
    throw new AuthError('Invalid or expired token');
  }
}

export function requireTier(minTier: 'free' | 'pro' | 'premium' | 'vip') {
  const tierOrder = { free: 0, pro: 1, premium: 2, vip: 3 };

  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new AuthError('Not authenticated');
    }

    const userTierLevel = tierOrder[request.user.subscription as keyof typeof tierOrder] ?? 0;
    const requiredTierLevel = tierOrder[minTier];

    if (userTierLevel < requiredTierLevel) {
      throw new ForbiddenError(`This feature requires ${minTier} subscription or higher`);
    }
  };
}
