import type { Logger } from 'pino';

/**
 * Ticker data representing the current market state of a trading pair
 */
export interface Ticker {
  symbol: string;
  price: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

/**
 * Single order book entry with price, quantity and cumulative total
 */
export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

/**
 * Order book with bids (buy orders) and asks (sell orders)
 */
export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

/**
 * OHLCV candlestick data
 */
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Supported exchange identifiers
 */
export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'mexc';

/**
 * Abstract base class for exchange adapters.
 * All exchange implementations must extend this class.
 */
export abstract class BaseExchange {
  abstract readonly id: ExchangeId;
  abstract readonly name: string;
  protected readonly logger: Logger;
  protected readonly timeout: number = 15000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Get ticker data for a specific trading pair
   * @param symbol Trading pair symbol (e.g., 'BTCUSDT')
   */
  abstract getTicker(symbol: string): Promise<Ticker>;

  /**
   * Get all available tickers (filtered to USDT pairs)
   */
  abstract getAllTickers(): Promise<Ticker[]>;

  /**
   * Get order book for a specific trading pair
   * @param symbol Trading pair symbol
   * @param depth Number of price levels to return (default: 20)
   */
  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  /**
   * Get candlestick/kline data for a specific trading pair
   * @param symbol Trading pair symbol
   * @param interval Time interval (e.g., '1m', '5m', '1h', '1d')
   * @param limit Number of candles to return (default: 100)
   */
  abstract getCandles(symbol: string, interval: string, limit?: number): Promise<Candle[]>;

  /**
   * Validate that a symbol is a valid non-empty string
   */
  protected validateSymbol(symbol: string): void {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol: symbol must be a non-empty string');
    }
  }

  /**
   * Validate that an interval is a valid non-empty string
   */
  protected validateInterval(interval: string): void {
    if (!interval || typeof interval !== 'string') {
      throw new Error('Invalid interval: interval must be a non-empty string');
    }
  }

  /**
   * Fetch with timeout support
   */
  protected async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      this.logger.debug({ url }, `${this.name} API request`);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout for ${url}`);
      }
      throw error;
    }
  }

  /**
   * Map raw order book entries to OrderBookEntry with cumulative totals
   */
  protected mapOrderBookEntries(entries: [string, string][]): OrderBookEntry[] {
    let total = 0;
    return entries.map(([price, quantity]) => {
      const p = parseFloat(price);
      const q = parseFloat(quantity);
      total += q;
      return { price: p, quantity: q, total };
    });
  }
}
