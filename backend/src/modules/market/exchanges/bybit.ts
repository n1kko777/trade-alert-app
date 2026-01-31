import type { Logger } from 'pino';
import { BaseExchange, Ticker, OrderBook, Candle, ExchangeId } from './base.exchange.js';

const BASE_URL = 'https://api.bybit.com';

interface BybitTickerData {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  volume24h: string;
  highPrice24h: string;
  lowPrice24h: string;
  prevPrice24h: string;
}

interface BybitTickerResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: BybitTickerData[];
  };
}

interface BybitOrderBookResponse {
  retCode: number;
  retMsg: string;
  result: {
    s: string;
    b: [string, string][];
    a: [string, string][];
  };
}

interface BybitKlineResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: [string, string, string, string, string, string][];
  };
}

const INTERVAL_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
};

/**
 * Bybit exchange adapter
 */
export class BybitExchange extends BaseExchange {
  readonly id: ExchangeId = 'bybit';
  readonly name = 'Bybit';

  constructor(logger: Logger) {
    super(logger);
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.validateSymbol(symbol);

    const response = await this.fetchWithTimeout(
      `${BASE_URL}/v5/market/tickers?category=spot&symbol=${symbol}`
    );

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for ${symbol}`);
    }

    const json = (await response.json()) as BybitTickerResponse;
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for ${symbol}`);
    }

    if (!json.result.list || json.result.list.length === 0) {
      throw new Error(`Bybit API error: No ticker data for ${symbol}`);
    }

    return this.mapTicker(json.result.list[0]!);
  }

  async getAllTickers(): Promise<Ticker[]> {
    const response = await this.fetchWithTimeout(
      `${BASE_URL}/v5/market/tickers?category=spot`
    );

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for getAllTickers`);
    }

    const json = (await response.json()) as BybitTickerResponse;
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for getAllTickers`);
    }

    return json.result.list
      .filter((t) => t.symbol.endsWith('USDT'))
      .map((t) => this.mapTicker(t));
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    this.validateSymbol(symbol);

    const response = await this.fetchWithTimeout(
      `${BASE_URL}/v5/market/orderbook?category=spot&symbol=${symbol}&limit=${depth}`
    );

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for ${symbol}`);
    }

    const json = (await response.json()) as BybitOrderBookResponse;
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for ${symbol}`);
    }

    return {
      symbol,
      bids: this.mapOrderBookEntries(json.result.b),
      asks: this.mapOrderBookEntries(json.result.a),
      timestamp: Date.now(),
    };
  }

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    this.validateSymbol(symbol);
    this.validateInterval(interval);

    const bybitInterval = INTERVAL_MAP[interval] || interval;
    const response = await this.fetchWithTimeout(
      `${BASE_URL}/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for ${symbol}`);
    }

    const json = (await response.json()) as BybitKlineResponse;
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for ${symbol}`);
    }

    // Bybit returns candles in reverse order (newest first), so we reverse them
    return json.result.list
      .map((candle) => ({
        timestamp: parseInt(candle[0], 10),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }))
      .reverse();
  }

  private mapTicker(data: BybitTickerData): Ticker {
    const lastPrice = parseFloat(data.lastPrice);
    const priceChangePct = parseFloat(data.price24hPcnt) * 100;

    return {
      symbol: data.symbol,
      price: lastPrice,
      volume24h: parseFloat(data.volume24h),
      change24h: priceChangePct,
      high24h: parseFloat(data.highPrice24h),
      low24h: parseFloat(data.lowPrice24h),
      timestamp: Date.now(),
    };
  }
}
