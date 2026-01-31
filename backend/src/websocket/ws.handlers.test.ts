import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WebSocket } from 'ws';

import {
  parseMessage,
  handleMessage,
  WsMessageType,
  type WsClientMessage,
  type WsServerMessage,
} from './ws.handlers.js';
import { ChannelManager } from './ws.channels.js';

// Mock WebSocket client
function createMockClient(id: string): WebSocket & { id: string; user?: { userId: string } } {
  return {
    id,
    readyState: 1, // WebSocket.OPEN
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    user: { userId: 'user-123' },
  } as unknown as WebSocket & { id: string; user?: { userId: string } };
}

describe('WebSocket Handlers', () => {
  describe('WsMessageType', () => {
    it('should have correct message type constants', () => {
      // Client messages
      expect(WsMessageType.SUBSCRIBE).toBe('subscribe');
      expect(WsMessageType.UNSUBSCRIBE).toBe('unsubscribe');
      expect(WsMessageType.PING).toBe('ping');

      // Server messages
      expect(WsMessageType.TICKER).toBe('ticker');
      expect(WsMessageType.SIGNAL).toBe('signal');
      expect(WsMessageType.PUMP).toBe('pump');
      expect(WsMessageType.NOTIFICATION).toBe('notification');
      expect(WsMessageType.PONG).toBe('pong');
      expect(WsMessageType.ERROR).toBe('error');
      expect(WsMessageType.SUBSCRIBED).toBe('subscribed');
      expect(WsMessageType.UNSUBSCRIBED).toBe('unsubscribed');
    });
  });

  describe('parseMessage', () => {
    it('should parse valid JSON message', () => {
      const message = JSON.stringify({ type: 'subscribe', channel: 'tickers' });

      const result = parseMessage(message);

      expect(result).toEqual({ type: 'subscribe', channel: 'tickers' });
    });

    it('should return null for invalid JSON', () => {
      const result = parseMessage('invalid json {{{');

      expect(result).toBeNull();
    });

    it('should return null for non-object message', () => {
      expect(parseMessage('"string"')).toBeNull();
      expect(parseMessage('123')).toBeNull();
      expect(parseMessage('null')).toBeNull();
      expect(parseMessage('[]')).toBeNull();
    });

    it('should return null for message without type', () => {
      const result = parseMessage(JSON.stringify({ channel: 'tickers' }));

      expect(result).toBeNull();
    });

    it('should handle Buffer input', () => {
      const buffer = Buffer.from(JSON.stringify({ type: 'ping' }));

      const result = parseMessage(buffer);

      expect(result).toEqual({ type: 'ping' });
    });
  });

  describe('handleMessage', () => {
    let client: WebSocket & { id: string; user?: { userId: string } };
    let channelManager: ChannelManager;

    beforeEach(() => {
      client = createMockClient('client-1');
      channelManager = new ChannelManager();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('subscribe message', () => {
      it('should subscribe client to valid channel', () => {
        const message: WsClientMessage = { type: 'subscribe', channel: 'tickers' };

        handleMessage(client, message, channelManager);

        expect(channelManager.getSubscribers('tickers')).toContain(client);
        expect(client.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'subscribed', channel: 'tickers' })
        );
      });

      it('should send error for invalid channel', () => {
        const message: WsClientMessage = { type: 'subscribe', channel: 'invalid' };

        handleMessage(client, message, channelManager);

        expect(channelManager.getSubscribers('invalid')).toHaveLength(0);
        expect(client.send).toHaveBeenCalledWith(
          expect.stringContaining('"type":"error"')
        );
      });

      it('should send error if already subscribed', () => {
        channelManager.subscribe(client, 'tickers');
        const message: WsClientMessage = { type: 'subscribe', channel: 'tickers' };

        handleMessage(client, message, channelManager);

        expect(client.send).toHaveBeenCalledWith(
          expect.stringContaining('Already subscribed')
        );
      });

      it('should handle subscribe to ticker:symbol channel', () => {
        const message: WsClientMessage = { type: 'subscribe', channel: 'ticker:BTCUSDT' };

        handleMessage(client, message, channelManager);

        expect(channelManager.getSubscribers('ticker:BTCUSDT')).toContain(client);
      });
    });

    describe('unsubscribe message', () => {
      it('should unsubscribe client from channel', () => {
        channelManager.subscribe(client, 'tickers');
        const message: WsClientMessage = { type: 'unsubscribe', channel: 'tickers' };

        handleMessage(client, message, channelManager);

        expect(channelManager.getSubscribers('tickers')).not.toContain(client);
        expect(client.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'unsubscribed', channel: 'tickers' })
        );
      });

      it('should send error if not subscribed', () => {
        const message: WsClientMessage = { type: 'unsubscribe', channel: 'tickers' };

        handleMessage(client, message, channelManager);

        expect(client.send).toHaveBeenCalledWith(
          expect.stringContaining('Not subscribed')
        );
      });
    });

    describe('ping message', () => {
      it('should respond with pong', () => {
        const message: WsClientMessage = { type: 'ping' };

        handleMessage(client, message, channelManager);

        expect(client.send).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockSend = client.send as any;
        const sentMessage = JSON.parse(mockSend.mock.calls[0][0]);
        expect(sentMessage.type).toBe('pong');
        expect(typeof sentMessage.timestamp).toBe('number');
      });
    });

    describe('unknown message type', () => {
      it('should send error for unknown message type', () => {
        const message = { type: 'unknown' } as unknown as WsClientMessage;

        handleMessage(client, message, channelManager);

        expect(client.send).toHaveBeenCalledWith(
          expect.stringContaining('Unknown message type')
        );
      });
    });
  });

  describe('Server message types', () => {
    it('should define ticker message structure', () => {
      const message: WsServerMessage = {
        type: 'ticker',
        data: {
          symbol: 'BTCUSDT',
          price: 50000,
          change24h: 2.5,
          volume24h: 1000000,
          high24h: 51000,
          low24h: 49000,
          timestamp: Date.now(),
          exchanges: ['binance', 'bybit'],
        },
      };

      expect(message.type).toBe('ticker');
      expect(message.data.symbol).toBe('BTCUSDT');
    });

    it('should define signal message structure', () => {
      const message: WsServerMessage = {
        type: 'signal',
        data: {
          id: 'signal-123',
          symbol: 'BTCUSDT',
          direction: 'long',
          confidence: 0.85,
          timestamp: Date.now(),
        },
      };

      expect(message.type).toBe('signal');
    });

    it('should define pump message structure', () => {
      const message: WsServerMessage = {
        type: 'pump',
        data: {
          id: 'pump-123',
          symbol: 'BTCUSDT',
          change: 15.5,
          volume: 5000000,
          timestamp: Date.now(),
        },
      };

      expect(message.type).toBe('pump');
    });

    it('should define notification message structure', () => {
      const message: WsServerMessage = {
        type: 'notification',
        data: {
          id: 'notif-123',
          title: 'Price Alert',
          body: 'BTC reached $50,000',
          timestamp: Date.now(),
        },
      };

      expect(message.type).toBe('notification');
    });
  });
});
