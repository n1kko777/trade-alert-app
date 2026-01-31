import type { Logger } from 'pino';
import { BaseExchange, Ticker, OrderBook, Candle, ExchangeId } from './base.exchange.js';

const BASE_URL = 'https://api.mexc.com';

interface MexcTickerData {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
}

interface MexcOrderBookResponse {
  bids: [string, string][];
  asks: [string, string][];
}

type MexcKlineResponse = [
  number,  // Open time
  string,  // Open
  string,  // High
  string,  // Low
  string,  // Close
  string,  // Volume
  ...unknown[]
];

/**
 * MEXC exchange adapter
 */
export class MexcExchange extends BaseExchange {
  readonly id: ExchangeId = 'mexc';
  readonly name = 'MEXC';

  constructor(logger: Logger) {
    super(logger);
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.validateSymbol(symbol);

    const response = await this.fetchWithTimeout(
      `${BASE_URL}/api/v3/ticker/24hr?symbol=${symbol}`
    );

    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for ${symbol}`);
    }

    const data = (await response.json()) as MexcTickerData;
    return this.mapTicker(data);
  }

  async getAllTickers(): Promise<Ticker[]> {
    const response = await this.fetchWithTimeout(`${BASE_URL}/api/v3/ticker/24hr`);

    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for getAllTickers`);
    }

    const data = (await response.json()) as MexcTickerData[];
    return data
      .filter((t) => t.symbol.endsWith('USDT'))
      .map((t) => this.mapTicker(t));
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    this.validateSymbol(symbol);

    const response = await this.fetchWithTimeout(
      `${BASE_URL}/api/v3/depth?symbol=${symbol}&limit=${depth}`
    );

    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for ${symbol}`);
    }

    const data = (await response.json()) as MexcOrderBookResponse;
    return {
      symbol,
      bids: this.mapOrderBookEntries(data.bids),
      asks: this.mapOrderBookEntries(data.asks),
      timestamp: Date.now(),
    };
  }

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    this.validateSymbol(symbol);
    this.validateInterval(interval);

    const response = await this.fetchWithTimeout(
      `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for ${symbol}`);
    }

    const data = (await response.json()) as MexcKlineResponse[];
    return data.map((candle) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  }

  private mapTicker(data: MexcTickerData): Ticker {
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      volume24h: parseFloat(data.volume),
      change24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      timestamp: Date.now(),
    };
  }
}
