import 'fastify';
import '@fastify/jwt';

export interface TokenPayload {
  userId: string;
  email: string;
  subscription: string;
  type: 'access' | 'refresh';
}

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}
