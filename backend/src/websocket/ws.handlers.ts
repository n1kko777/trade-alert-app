import type { WebSocket } from 'ws';
import { ChannelManager, isValidChannel } from './ws.channels.js';
import type { AggregatedTicker } from '../jobs/priceAggregator.job.js';

/**
 * WebSocket message types
 */
export const WsMessageType = {
  // Client -> Server
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',

  // Server -> Client
  TICKER: 'ticker',
  SIGNAL: 'signal',
  PUMP: 'pump',
  NOTIFICATION: 'notification',
  PONG: 'pong',
  ERROR: 'error',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
} as const;

export type WsMessageTypeValue = (typeof WsMessageType)[keyof typeof WsMessageType];

/**
 * Client message types
 */
export interface WsSubscribeMessage {
  type: 'subscribe';
  channel: string;
}

export interface WsUnsubscribeMessage {
  type: 'unsubscribe';
  channel: string;
}

export interface WsPingMessage {
  type: 'ping';
}

export type WsClientMessage =
  | WsSubscribeMessage
  | WsUnsubscribeMessage
  | WsPingMessage;

/**
 * Server message types
 */
export interface WsTickerMessage {
  type: 'ticker';
  data: AggregatedTicker;
}

export interface WsSignalMessage {
  type: 'signal';
  data: {
    id: string;
    symbol: string;
    direction: 'long' | 'short';
    confidence: number;
    timestamp: number;
  };
}

export interface WsPumpMessage {
  type: 'pump';
  data: {
    id: string;
    symbol: string;
    change: number;
    volume: number;
    timestamp: number;
  };
}

export interface WsNotificationMessage {
  type: 'notification';
  data: {
    id: string;
    title: string;
    body: string;
    timestamp: number;
  };
}

export interface WsPongMessage {
  type: 'pong';
  timestamp: number;
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
  code?: string | undefined;
}

export interface WsSubscribedMessage {
  type: 'subscribed';
  channel: string;
}

export interface WsUnsubscribedMessage {
  type: 'unsubscribed';
  channel: string;
}

export type WsServerMessage =
  | WsTickerMessage
  | WsSignalMessage
  | WsPumpMessage
  | WsNotificationMessage
  | WsPongMessage
  | WsErrorMessage
  | WsSubscribedMessage
  | WsUnsubscribedMessage;

/**
 * Parse incoming WebSocket message
 * @returns Parsed message object or null if invalid
 */
export function parseMessage(data: string | Buffer): WsClientMessage | null {
  try {
    const str = typeof data === 'string' ? data : data.toString('utf8');
    const parsed = JSON.parse(str);

    // Must be an object with a type property
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    if (typeof parsed.type !== 'string') {
      return null;
    }

    return parsed as WsClientMessage;
  } catch {
    return null;
  }
}

/**
 * Send a message to a WebSocket client
 */
function sendMessage(client: WebSocket, message: WsServerMessage): void {
  if (client.readyState === 1) {
    // OPEN
    client.send(JSON.stringify(message));
  }
}

/**
 * Send an error message to a client
 */
function sendError(client: WebSocket, message: string, code?: string): void {
  sendMessage(client, { type: 'error', message, code });
}

/**
 * Handle incoming client message
 */
export function handleMessage(
  client: WebSocket,
  message: WsClientMessage,
  channelManager: ChannelManager
): void {
  switch (message.type) {
    case 'subscribe':
      handleSubscribe(client, message, channelManager);
      break;

    case 'unsubscribe':
      handleUnsubscribe(client, message, channelManager);
      break;

    case 'ping':
      handlePing(client);
      break;

    default:
      sendError(client, `Unknown message type: ${(message as { type: string }).type}`);
  }
}

/**
 * Handle subscribe message
 */
function handleSubscribe(
  client: WebSocket,
  message: WsSubscribeMessage,
  channelManager: ChannelManager
): void {
  const { channel } = message;

  if (!isValidChannel(channel)) {
    sendError(client, `Invalid channel: ${channel}`, 'INVALID_CHANNEL');
    return;
  }

  const success = channelManager.subscribe(client, channel);

  if (success) {
    sendMessage(client, { type: 'subscribed', channel });
  } else {
    sendError(client, `Already subscribed to channel: ${channel}`, 'ALREADY_SUBSCRIBED');
  }
}

/**
 * Handle unsubscribe message
 */
function handleUnsubscribe(
  client: WebSocket,
  message: WsUnsubscribeMessage,
  channelManager: ChannelManager
): void {
  const { channel } = message;

  const success = channelManager.unsubscribe(client, channel);

  if (success) {
    sendMessage(client, { type: 'unsubscribed', channel });
  } else {
    sendError(client, `Not subscribed to channel: ${channel}`, 'NOT_SUBSCRIBED');
  }
}

/**
 * Handle ping message
 */
function handlePing(client: WebSocket): void {
  sendMessage(client, { type: 'pong', timestamp: Date.now() });
}
