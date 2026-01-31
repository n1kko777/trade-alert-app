import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { getLogger } from '../utils/logger.js';
import { ChannelManager } from './ws.channels.js';
import { extractToken, validateWsToken, WsAuthError } from './ws.auth.js';
import { parseMessage, handleMessage, WsMessageType } from './ws.handlers.js';
import type { TokenPayload } from '../types/fastify.js';
import type { AggregatedTicker } from '../jobs/priceAggregator.job.js';

// Extend WebSocket with user data
interface AuthenticatedWebSocket extends WebSocket {
  user?: TokenPayload;
  clientId?: string;
}

// Module-level channel manager (singleton)
let channelManager: ChannelManager | null = null;

/**
 * Get the global channel manager instance
 */
export function getChannelManager(): ChannelManager {
  if (!channelManager) {
    channelManager = new ChannelManager();
  }
  return channelManager;
}

/**
 * Generate a unique client ID
 */
function generateClientId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Register WebSocket server with Fastify
 */
export async function registerWebSocketServer(
  fastify: FastifyInstance
): Promise<void> {
  const logger = getLogger();
  const manager = getChannelManager();

  // Register WebSocket route
  fastify.get('/ws', { websocket: true }, async (socket, request) => {
    const client = socket as AuthenticatedWebSocket;
    client.clientId = generateClientId();

    logger.debug({ clientId: client.clientId }, 'WebSocket connection attempt');

    // Extract and validate token
    const token = extractToken(
      request.url,
      request.headers as Record<string, string | string[] | undefined>
    );

    if (!token) {
      logger.warn({ clientId: client.clientId }, 'WebSocket connection rejected: no token');
      client.close(4001, 'Authentication required');
      return;
    }

    try {
      const user = await validateWsToken(fastify, token);
      client.user = user;

      logger.info(
        { clientId: client.clientId, userId: user.userId },
        'WebSocket client connected'
      );

      // Send welcome message
      client.send(
        JSON.stringify({
          type: 'connected',
          clientId: client.clientId,
          userId: user.userId,
        })
      );
    } catch (error) {
      const message =
        error instanceof WsAuthError ? error.message : 'Authentication failed';
      logger.warn(
        { clientId: client.clientId, error: message },
        'WebSocket connection rejected: auth failed'
      );
      client.close(4001, message);
      return;
    }

    // Handle incoming messages
    client.on('message', (data: Buffer | string) => {
      const message = parseMessage(data);

      if (!message) {
        client.send(
          JSON.stringify({
            type: WsMessageType.ERROR,
            message: 'Invalid message format',
            code: 'INVALID_FORMAT',
          })
        );
        return;
      }

      logger.debug(
        { clientId: client.clientId, messageType: message.type },
        'WebSocket message received'
      );

      handleMessage(client, message, manager);
    });

    // Handle disconnection
    client.on('close', (code: number, reason: Buffer) => {
      logger.info(
        {
          clientId: client.clientId,
          userId: client.user?.userId,
          code,
          reason: reason?.toString(),
        },
        'WebSocket client disconnected'
      );

      // Clean up subscriptions
      manager.unsubscribeAll(client);
    });

    // Handle errors
    client.on('error', (error: Error) => {
      logger.error(
        { clientId: client.clientId, error: error.message },
        'WebSocket error'
      );
    });
  });

  logger.info('WebSocket server registered at /ws');
}

/**
 * Broadcast ticker updates to subscribed clients
 * This is called by the price aggregator job
 */
export function broadcastTickers(tickers: AggregatedTicker[]): void {
  const manager = getChannelManager();
  const logger = getLogger();

  // Broadcast to 'tickers' channel (all tickers)
  if (tickers.length > 0) {
    const tickersCount = manager.broadcast('tickers', {
      type: 'tickers',
      data: tickers,
      timestamp: Date.now(),
    });

    if (tickersCount > 0) {
      logger.debug(
        { clients: tickersCount, symbols: tickers.length },
        'Broadcasted tickers to clients'
      );
    }
  }

  // Broadcast to individual ticker channels
  for (const ticker of tickers) {
    const channel = `ticker:${ticker.symbol}`;
    const count = manager.broadcast(channel, {
      type: 'ticker',
      data: ticker,
    });

    if (count > 0) {
      logger.debug(
        { clients: count, symbol: ticker.symbol },
        'Broadcasted ticker update'
      );
    }
  }
}

/**
 * Broadcast a signal to subscribers
 */
export function broadcastSignal(signal: {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  confidence: number;
  timestamp: number;
}): void {
  const manager = getChannelManager();
  manager.broadcast('signals', {
    type: 'signal',
    data: signal,
  });
}

/**
 * Broadcast a pump alert to subscribers
 */
export function broadcastPump(pump: {
  id: string;
  symbol: string;
  change: number;
  volume: number;
  timestamp: number;
}): void {
  const manager = getChannelManager();
  manager.broadcast('pumps', {
    type: 'pump',
    data: pump,
  });
}

/**
 * Broadcast a notification to a specific user
 */
export function broadcastNotification(
  userId: string,
  notification: {
    id: string;
    title: string;
    body: string;
    timestamp: number;
  }
): void {
  const manager = getChannelManager();
  const logger = getLogger();

  // For user-specific notifications, we need to iterate through connected clients
  // This is a simple implementation - for production, consider a user->connections map
  logger.debug(
    { userId, notificationId: notification.id },
    'Notification broadcast requested'
  );

  // The notification channel broadcasts to all - individual user targeting
  // would require maintaining a user ID -> client mapping
  manager.broadcast('notifications', {
    type: 'notification',
    data: {
      ...notification,
      userId,
    },
  });
}

/**
 * Get WebSocket server statistics
 */
export function getWsStats(): {
  channels: ReturnType<ChannelManager['getStats']>;
} {
  const manager = getChannelManager();
  return {
    channels: manager.getStats(),
  };
}
