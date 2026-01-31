import type { Logger } from 'pino';
import { BaseExchange, Ticker, OrderBook, Candle, ExchangeId } from './base.exchange.js';

const BASE_URL = 'https://www.okx.com';

interface OkxTickerData {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
}

interface OkxTickerResponse {
  code: string;
  msg: string;
  data: OkxTickerData[];
}

interface OkxOrderBookResponse {
  code: string;
  msg: string;
  data: Array<{
    bids: [string, string, string, string][];
    asks: [string, string, string, string][];
  }>;
}

interface OkxCandleResponse {
  code: string;
  msg: string;
  data: [string, string, string, string, string, string, ...string[]][];
}

const INTERVAL_MAP: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1H',
  '4h': '4H',
  '1d': '1D',
  '1w': '1W',
};

/**
 * OKX exchange adapter
 */
export class OkxExchange extends BaseExchange {
  readonly id: ExchangeId = 'okx';
  readonly name = 'OKX';

  constructor(logger: Logger) {
    super(logger);
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.validateSymbol(symbol);

    const instId = this.toOkxSymbol(symbol);
    const response = await this.fetchWithTimeout(
      `${BASE_URL}/api/v5/market/ticker?instId=${instId}`
    );

    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for ${symbol}`);
    }

    const json = (await response.json()) as OkxTickerResponse;
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for ${symbol}`);
    }

    if (!json.data || json.data.length === 0) {
      throw new Error(`OKX API error: No ticker data for ${symbol}`);
    }

    return this.mapTicker(json.data[0]!);
  }

  async getAllTickers(): Promise<Ticker[]> {
    const response = await this.fetchWithTimeout(
      `${BASE_URL}/api/v5/market/tickers?instType=SPOT`
    );

    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for getAllTickers`);
    }

    const json = (await response.json()) as OkxTickerResponse;
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for getAllTickers`);
    }

    return json.data
      .filter((t) => t.instId.endsWith('-USDT'))
      .map((t) => this.mapTicker(t));
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    this.validateSymbol(symbol);

    const instId = this.toOkxSymbol(symbol);
    const response = await this.fetchWithTimeout(
      `${BASE_URL}/api/v5/market/books?instId=${instId}&sz=${depth}`
    );

    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for ${symbol}`);
    }

    const json = (await response.json()) as OkxOrderBookResponse;
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for ${symbol}`);
    }

    if (!json.data || json.data.length === 0) {
      throw new Error(`OKX API error: No order book data for ${symbol}`);
    }

    const orderBookData = json.data[0]!;
    return {
      symbol,
      bids: this.mapOkxOrderBookEntries(orderBookData.bids),
      asks: this.mapOkxOrderBookEntries(orderBookData.asks),
      timestamp: Date.now(),
    };
  }

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    this.validateSymbol(symbol);
    this.validateInterval(interval);

    const instId = this.toOkxSymbol(symbol);
    const okxInterval = INTERVAL_MAP[interval] || interval;
    const response = await this.fetchWithTimeout(
      `${BASE_URL}/api/v5/market/candles?instId=${instId}&bar=${okxInterval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for ${symbol}`);
    }

    const json = (await response.json()) as OkxCandleResponse;
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for ${symbol}`);
    }

    // OKX returns candles in reverse order (newest first), so we reverse them
    return json.data
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

  /**
   * Convert symbol format: BTCUSDT -> BTC-USDT
   */
  private toOkxSymbol(symbol: string): string {
    if (symbol.endsWith('USDT')) {
      return symbol.slice(0, -4) + '-USDT';
    }
    return symbol;
  }

  /**
   * Convert symbol format: BTC-USDT -> BTCUSDT
   */
  private fromOkxSymbol(instId: string): string {
    return instId.replace('-', '');
  }

  private mapTicker(data: OkxTickerData): Ticker {
    const lastPrice = parseFloat(data.last);
    const open24h = parseFloat(data.open24h);
    const priceChange24h = lastPrice - open24h;
    const priceChangePct24h = open24h !== 0 ? (priceChange24h / open24h) * 100 : 0;

    return {
      symbol: this.fromOkxSymbol(data.instId),
      price: lastPrice,
      volume24h: parseFloat(data.vol24h),
      change24h: priceChangePct24h,
      high24h: parseFloat(data.high24h),
      low24h: parseFloat(data.low24h),
      timestamp: Date.now(),
    };
  }

  /**
   * OKX order book entries have 4 elements: [price, quantity, deprecated, order_count]
   */
  private mapOkxOrderBookEntries(entries: [string, string, string, string][]): { price: number; quantity: number; total: number }[] {
    let total = 0;
    return entries.map(([price, quantity]) => {
      const p = parseFloat(price);
      const q = parseFloat(quantity);
      total += q;
      return { price: p, quantity: q, total };
    });
  }
}
