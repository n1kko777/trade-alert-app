import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://fapi.binance.com';
const WS_URL = 'wss://fstream.binance.com/ws';

interface BinanceTickerResponse {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
}

interface BinanceOrderBookResponse {
  bids: [string, string][];
  asks: [string, string][];
}

interface BinanceKlineResponse {
  0: number; // Open time
  1: string; // Open
  2: string; // High
  3: string; // Low
  4: string; // Close
  5: string; // Volume
}

function mapTicker(data: BinanceTickerResponse): Ticker {
  return {
    symbol: data.symbol,
    price: parseFloat(data.lastPrice),
    priceChange24h: parseFloat(data.priceChange),
    priceChangePct24h: parseFloat(data.priceChangePercent),
    volume24h: parseFloat(data.volume),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    lastUpdated: Date.now(),
  };
}

function mapOrderBook(symbol: string, data: BinanceOrderBookResponse): OrderBook {
  let bidTotal = 0;
  let askTotal = 0;

  const bids: OrderBookEntry[] = data.bids.map(([price, quantity]) => {
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    bidTotal += q;
    return { price: p, quantity: q, total: bidTotal };
  });

  const asks: OrderBookEntry[] = data.asks.map(([price, quantity]) => {
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    askTotal += q;
    return { price: p, quantity: q, total: askTotal };
  });

  return {
    symbol,
    bids,
    asks,
    lastUpdated: Date.now(),
  };
}

function mapCandle(data: BinanceKlineResponse): Candle {
  return {
    time: data[0],
    open: parseFloat(data[1]),
    high: parseFloat(data[2]),
    low: parseFloat(data[3]),
    close: parseFloat(data[4]),
    volume: parseFloat(data[5]),
  };
}

const FETCH_TIMEOUT = 15000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
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

function validateSymbol(symbol: string): void {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Invalid symbol: symbol must be a non-empty string');
  }
}

export const binanceService: ExchangeService = {
  id: 'binance',
  name: 'Binance',

  async getTicker(symbol: string): Promise<Ticker> {
    validateSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/fapi/v1/ticker/24hr?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} for ${symbol}`);
    }
    const data: BinanceTickerResponse = await response.json();
    return mapTicker(data);
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetchWithTimeout(`${BASE_URL}/fapi/v1/ticker/24hr`);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} for getAllTickers`);
    }
    const data: BinanceTickerResponse[] = await response.json();
    return data
      .filter((t) => t.symbol.endsWith('USDT'))
      .map(mapTicker);
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    validateSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/fapi/v1/depth?symbol=${symbol}&limit=${depth}`);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} for ${symbol}`);
    }
    const data: BinanceOrderBookResponse = await response.json();
    return mapOrderBook(symbol, data);
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    validateSymbol(symbol);
    if (!interval || typeof interval !== 'string') {
      throw new Error('Invalid interval: interval must be a non-empty string');
    }
    const response = await fetchWithTimeout(
      `${BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} for ${symbol}`);
    }
    const data: BinanceKlineResponse[] = await response.json();
    return data.map(mapCandle);
  },

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void, onError?: (error: Error) => void): () => void {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol: symbol must be a non-empty string');
    }

    const ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@ticker`);
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      ws.close();
    };

    ws.onerror = (event) => {
      console.warn('Binance WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const ticker: Ticker = {
          symbol: data.s,
          price: parseFloat(data.c),
          priceChange24h: parseFloat(data.p),
          priceChangePct24h: parseFloat(data.P),
          volume24h: parseFloat(data.v),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          lastUpdated: Date.now(),
        };
        callback(ticker);
      } catch (error) {
        console.error('Error parsing ticker data:', error);
      }
    };

    return cleanup;
  },

  subscribeOrderBook(symbol: string, callback: (orderBook: OrderBook) => void, onError?: (error: Error) => void): () => void {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol: symbol must be a non-empty string');
    }

    const ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@depth20@100ms`);
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      ws.close();
    };

    ws.onerror = (event) => {
      console.warn('Binance WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const orderBook = mapOrderBook(symbol, {
          bids: data.b,
          asks: data.a,
        });
        callback(orderBook);
      } catch (error) {
        console.error('Error parsing order book data:', error);
      }
    };

    return cleanup;
  },
};
