import type { WebSocket } from 'ws';

/**
 * Channel type constants
 */
export const CHANNEL_TYPES = {
  TICKERS: 'tickers',
  TICKER: 'ticker',
  SIGNALS: 'signals',
  PUMPS: 'pumps',
} as const;

export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];

/**
 * Valid channel patterns:
 * - 'tickers' - All ticker updates
 * - 'ticker:{symbol}' - Updates for specific symbol (e.g., 'ticker:BTCUSDT')
 * - 'signals' - All trading signals
 * - 'pumps' - Pump detection alerts
 */
const VALID_CHANNELS = new Set(['tickers', 'signals', 'pumps']);
const TICKER_CHANNEL_REGEX = /^ticker:[A-Z0-9]+$/;

/**
 * Check if a channel name is valid
 */
export function isValidChannel(channel: string): boolean {
  if (!channel) return false;

  // Check static channels
  if (VALID_CHANNELS.has(channel)) {
    return true;
  }

  // Check ticker:symbol pattern
  if (TICKER_CHANNEL_REGEX.test(channel)) {
    return true;
  }

  return false;
}

/**
 * Parsed channel result
 */
export interface ParsedChannel {
  type: ChannelType;
  symbol?: string | undefined;
}

/**
 * Parse a channel string into type and optional symbol
 */
export function parseChannel(channel: string): ParsedChannel | null {
  if (!channel) return null;

  if (channel === 'tickers') {
    return { type: 'tickers' };
  }

  if (channel === 'signals') {
    return { type: 'signals' };
  }

  if (channel === 'pumps') {
    return { type: 'pumps' };
  }

  if (TICKER_CHANNEL_REGEX.test(channel)) {
    const symbol = channel.split(':')[1];
    if (symbol) {
      return { type: 'ticker', symbol };
    }
  }

  return null;
}

/**
 * Channel subscription manager
 * Manages client subscriptions to various channels
 */
export class ChannelManager {
  private channels: Map<string, Set<WebSocket>> = new Map();
  private clientChannels: Map<WebSocket, Set<string>> = new Map();

  /**
   * Subscribe a client to a channel
   * @returns true if subscription was added, false if already subscribed or invalid
   */
  subscribe(client: WebSocket, channel: string): boolean {
    if (!isValidChannel(channel)) {
      return false;
    }

    // Get or create channel set
    let subscribers = this.channels.get(channel);
    if (!subscribers) {
      subscribers = new Set();
      this.channels.set(channel, subscribers);
    }

    // Check if already subscribed
    if (subscribers.has(client)) {
      return false;
    }

    // Add to channel subscribers
    subscribers.add(client);

    // Track client's channels
    let clientSubs = this.clientChannels.get(client);
    if (!clientSubs) {
      clientSubs = new Set();
      this.clientChannels.set(client, clientSubs);
    }
    clientSubs.add(channel);

    return true;
  }

  /**
   * Unsubscribe a client from a channel
   * @returns true if unsubscribed, false if wasn't subscribed
   */
  unsubscribe(client: WebSocket, channel: string): boolean {
    const subscribers = this.channels.get(channel);
    if (!subscribers || !subscribers.has(client)) {
      return false;
    }

    // Remove from channel
    subscribers.delete(client);

    // Clean up empty channels
    if (subscribers.size === 0) {
      this.channels.delete(channel);
    }

    // Remove from client's channel list
    const clientSubs = this.clientChannels.get(client);
    if (clientSubs) {
      clientSubs.delete(channel);
      if (clientSubs.size === 0) {
        this.clientChannels.delete(client);
      }
    }

    return true;
  }

  /**
   * Unsubscribe a client from all channels
   * Call this when a client disconnects
   */
  unsubscribeAll(client: WebSocket): void {
    const clientSubs = this.clientChannels.get(client);
    if (!clientSubs) return;

    // Remove from all subscribed channels
    for (const channel of clientSubs) {
      const subscribers = this.channels.get(channel);
      if (subscribers) {
        subscribers.delete(client);
        if (subscribers.size === 0) {
          this.channels.delete(channel);
        }
      }
    }

    // Remove client channel tracking
    this.clientChannels.delete(client);
  }

  /**
   * Get all subscribers for a channel
   */
  getSubscribers(channel: string): WebSocket[] {
    const subscribers = this.channels.get(channel);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Get all channels a client is subscribed to
   */
  getClientChannels(client: WebSocket): string[] {
    const channels = this.clientChannels.get(client);
    return channels ? Array.from(channels) : [];
  }

  /**
   * Broadcast data to all subscribers of a channel
   * @returns Number of clients the message was sent to
   */
  broadcast(channel: string, data: unknown): number {
    const subscribers = this.channels.get(channel);
    if (!subscribers) return 0;

    const message = JSON.stringify(data);
    let sent = 0;

    for (const client of subscribers) {
      // Only send to open connections (readyState === 1 means OPEN)
      if (client.readyState === 1) {
        client.send(message);
        sent++;
      }
    }

    return sent;
  }

  /**
   * Get number of subscribers for a channel
   */
  getChannelCount(channel: string): number {
    const subscribers = this.channels.get(channel);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * Get statistics for all channels
   */
  getStats(): {
    tickers: number;
    signals: number;
    pumps: number;
    tickerSymbols: Record<string, number>;
  } {
    const tickerSymbols: Record<string, number> = {};

    // Count individual ticker symbol subscriptions
    for (const [channel, subscribers] of this.channels) {
      if (channel.startsWith('ticker:')) {
        const symbol = channel.split(':')[1];
        if (symbol) {
          tickerSymbols[symbol] = subscribers.size;
        }
      }
    }

    return {
      tickers: this.getChannelCount('tickers'),
      signals: this.getChannelCount('signals'),
      pumps: this.getChannelCount('pumps'),
      tickerSymbols,
    };
  }
}
