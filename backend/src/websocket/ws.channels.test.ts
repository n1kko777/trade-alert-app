import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WebSocket } from 'ws';

import {
  ChannelManager,
  CHANNEL_TYPES,
  isValidChannel,
  parseChannel,
} from './ws.channels.js';

// Mock WebSocket client
function createMockClient(id: string): WebSocket & { id: string } {
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
  } as unknown as WebSocket & { id: string };
}

describe('WebSocket Channels', () => {
  describe('CHANNEL_TYPES', () => {
    it('should have correct channel type definitions', () => {
      expect(CHANNEL_TYPES.TICKERS).toBe('tickers');
      expect(CHANNEL_TYPES.TICKER).toBe('ticker');
      expect(CHANNEL_TYPES.SIGNALS).toBe('signals');
      expect(CHANNEL_TYPES.PUMPS).toBe('pumps');
    });
  });

  describe('isValidChannel', () => {
    it('should return true for valid tickers channel', () => {
      expect(isValidChannel('tickers')).toBe(true);
    });

    it('should return true for valid ticker:symbol channel', () => {
      expect(isValidChannel('ticker:BTCUSDT')).toBe(true);
      expect(isValidChannel('ticker:ETHUSDT')).toBe(true);
    });

    it('should return true for valid signals channel', () => {
      expect(isValidChannel('signals')).toBe(true);
    });

    it('should return true for valid pumps channel', () => {
      expect(isValidChannel('pumps')).toBe(true);
    });

    it('should return false for invalid channel', () => {
      expect(isValidChannel('invalid')).toBe(false);
      expect(isValidChannel('')).toBe(false);
      expect(isValidChannel('ticker:')).toBe(false);
      expect(isValidChannel('ticker')).toBe(false);
    });
  });

  describe('parseChannel', () => {
    it('should parse tickers channel', () => {
      const result = parseChannel('tickers');

      expect(result).toEqual({ type: 'tickers', symbol: undefined });
    });

    it('should parse ticker:symbol channel', () => {
      const result = parseChannel('ticker:BTCUSDT');

      expect(result).toEqual({ type: 'ticker', symbol: 'BTCUSDT' });
    });

    it('should parse signals channel', () => {
      const result = parseChannel('signals');

      expect(result).toEqual({ type: 'signals', symbol: undefined });
    });

    it('should parse pumps channel', () => {
      const result = parseChannel('pumps');

      expect(result).toEqual({ type: 'pumps', symbol: undefined });
    });

    it('should return null for invalid channel', () => {
      expect(parseChannel('invalid')).toBeNull();
      expect(parseChannel('')).toBeNull();
    });
  });

  describe('ChannelManager', () => {
    let manager: ChannelManager;
    let client1: WebSocket & { id: string };
    let client2: WebSocket & { id: string };

    beforeEach(() => {
      manager = new ChannelManager();
      client1 = createMockClient('client-1');
      client2 = createMockClient('client-2');
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('subscribe', () => {
      it('should add client to channel', () => {
        const result = manager.subscribe(client1, 'tickers');

        expect(result).toBe(true);
        expect(manager.getSubscribers('tickers')).toContain(client1);
      });

      it('should not add same client to same channel twice', () => {
        manager.subscribe(client1, 'tickers');
        const result = manager.subscribe(client1, 'tickers');

        expect(result).toBe(false);
        expect(manager.getSubscribers('tickers')).toHaveLength(1);
      });

      it('should allow client to subscribe to multiple channels', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client1, 'signals');

        expect(manager.getSubscribers('tickers')).toContain(client1);
        expect(manager.getSubscribers('signals')).toContain(client1);
      });

      it('should allow multiple clients in same channel', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');

        expect(manager.getSubscribers('tickers')).toHaveLength(2);
      });

      it('should return false for invalid channel', () => {
        const result = manager.subscribe(client1, 'invalid');

        expect(result).toBe(false);
      });
    });

    describe('unsubscribe', () => {
      it('should remove client from channel', () => {
        manager.subscribe(client1, 'tickers');
        const result = manager.unsubscribe(client1, 'tickers');

        expect(result).toBe(true);
        expect(manager.getSubscribers('tickers')).not.toContain(client1);
      });

      it('should return false if client was not subscribed', () => {
        const result = manager.unsubscribe(client1, 'tickers');

        expect(result).toBe(false);
      });

      it('should not affect other clients in channel', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');
        manager.unsubscribe(client1, 'tickers');

        expect(manager.getSubscribers('tickers')).toContain(client2);
        expect(manager.getSubscribers('tickers')).toHaveLength(1);
      });
    });

    describe('unsubscribeAll', () => {
      it('should remove client from all channels', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client1, 'signals');
        manager.subscribe(client1, 'pumps');

        manager.unsubscribeAll(client1);

        expect(manager.getSubscribers('tickers')).not.toContain(client1);
        expect(manager.getSubscribers('signals')).not.toContain(client1);
        expect(manager.getSubscribers('pumps')).not.toContain(client1);
      });

      it('should not affect other clients', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');

        manager.unsubscribeAll(client1);

        expect(manager.getSubscribers('tickers')).toContain(client2);
      });
    });

    describe('getSubscribers', () => {
      it('should return empty array for channel with no subscribers', () => {
        const subscribers = manager.getSubscribers('tickers');

        expect(subscribers).toEqual([]);
      });

      it('should return all subscribers for a channel', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');

        const subscribers = manager.getSubscribers('tickers');

        expect(subscribers).toHaveLength(2);
        expect(subscribers).toContain(client1);
        expect(subscribers).toContain(client2);
      });
    });

    describe('getClientChannels', () => {
      it('should return empty array if client has no subscriptions', () => {
        const channels = manager.getClientChannels(client1);

        expect(channels).toEqual([]);
      });

      it('should return all channels client is subscribed to', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client1, 'signals');

        const channels = manager.getClientChannels(client1);

        expect(channels).toHaveLength(2);
        expect(channels).toContain('tickers');
        expect(channels).toContain('signals');
      });
    });

    describe('broadcast', () => {
      it('should send message to all subscribers in channel', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');

        const data = { type: 'ticker', symbol: 'BTCUSDT', price: 50000 };
        manager.broadcast('tickers', data);

        expect(client1.send).toHaveBeenCalledWith(JSON.stringify(data));
        expect(client2.send).toHaveBeenCalledWith(JSON.stringify(data));
      });

      it('should not send to clients not subscribed to channel', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'signals');

        manager.broadcast('tickers', { type: 'ticker' });

        expect(client1.send).toHaveBeenCalled();
        expect(client2.send).not.toHaveBeenCalled();
      });

      it('should skip clients with closed connections', () => {
        manager.subscribe(client1, 'tickers');
        (client1 as unknown as { readyState: number }).readyState = 3; // WebSocket.CLOSED

        manager.broadcast('tickers', { type: 'ticker' });

        expect(client1.send).not.toHaveBeenCalled();
      });

      it('should return count of messages sent', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');

        const count = manager.broadcast('tickers', { type: 'ticker' });

        expect(count).toBe(2);
      });
    });

    describe('getChannelCount', () => {
      it('should return 0 for channel with no subscribers', () => {
        expect(manager.getChannelCount('tickers')).toBe(0);
      });

      it('should return correct count of subscribers', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');

        expect(manager.getChannelCount('tickers')).toBe(2);
      });
    });

    describe('getStats', () => {
      it('should return stats for all channels', () => {
        manager.subscribe(client1, 'tickers');
        manager.subscribe(client2, 'tickers');
        manager.subscribe(client1, 'signals');

        const stats = manager.getStats();

        expect(stats).toEqual({
          tickers: 2,
          signals: 1,
          pumps: 0,
          tickerSymbols: {},
        });
      });

      it('should include individual ticker symbol counts', () => {
        manager.subscribe(client1, 'ticker:BTCUSDT');
        manager.subscribe(client2, 'ticker:BTCUSDT');
        manager.subscribe(client1, 'ticker:ETHUSDT');

        const stats = manager.getStats();

        expect(stats.tickerSymbols).toEqual({
          BTCUSDT: 2,
          ETHUSDT: 1,
        });
      });
    });
  });
});
