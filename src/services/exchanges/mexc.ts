import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://api.mexc.com';
const WS_URL = 'wss://wbs.mexc.com/ws';

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

interface MexcCandleData {
  0: number; // Open time
  1: string; // Open
  2: string; // High
  3: string; // Low
  4: string; // Close
  5: string; // Volume
}

function mapTicker(data: MexcTickerData): Ticker {
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

function mapOrderBook(symbol: string, bids: [string, string][], asks: [string, string][]): OrderBook {
  let bidTotal = 0;
  let askTotal = 0;

  const mappedBids: OrderBookEntry[] = bids.map(([price, quantity]) => {
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    bidTotal += q;
    return { price: p, quantity: q, total: bidTotal };
  });

  const mappedAsks: OrderBookEntry[] = asks.map(([price, quantity]) => {
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    askTotal += q;
    return { price: p, quantity: q, total: askTotal };
  });

  return {
    symbol,
    bids: mappedBids,
    asks: mappedAsks,
    lastUpdated: Date.now(),
  };
}

function mapCandle(data: MexcCandleData): Candle {
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

export const mexcService: ExchangeService = {
  id: 'mexc',
  name: 'MEXC',

  async getTicker(symbol: string): Promise<Ticker> {
    validateSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/api/v3/ticker/24hr?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for ${symbol}`);
    }
    const data: MexcTickerData = await response.json();
    return mapTicker(data);
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetchWithTimeout(`${BASE_URL}/api/v3/ticker/24hr`);
    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for getAllTickers`);
    }
    const data: MexcTickerData[] = await response.json();
    return data
      .filter((t) => t.symbol.endsWith('USDT'))
      .map(mapTicker);
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    validateSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/api/v3/depth?symbol=${symbol}&limit=${depth}`);
    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for ${symbol}`);
    }
    const data: MexcOrderBookResponse = await response.json();
    return mapOrderBook(symbol, data.bids, data.asks);
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    validateSymbol(symbol);
    if (!interval || typeof interval !== 'string') {
      throw new Error('Invalid interval: interval must be a non-empty string');
    }
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status} for ${symbol}`);
    }
    const data: MexcCandleData[] = await response.json();
    return data.map(mapCandle);
  },

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void, onError?: (error: Error) => void): () => void {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol: symbol must be a non-empty string');
    }

    const ws = new WebSocket(WS_URL);
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      ws.close();
    };

    ws.onerror = (event) => {
      console.warn('MEXC WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIPTION',
        params: [`spot@public.ticker.v3.api@${symbol}`],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Handle MEXC ping
        if (payload.ping) {
          ws.send(JSON.stringify({ pong: payload.ping }));
          return;
        }

        // Skip subscription confirmation messages or events without data
        if (!payload.d || payload.c !== `spot@public.ticker.v3.api@${symbol}`) {
          return;
        }

        const data = payload.d;
        if (!data.s || !data.p) {
          return;
        }

        const ticker: Ticker = {
          symbol: data.s,
          price: parseFloat(data.p),
          priceChange24h: parseFloat(data.pc || '0'),
          priceChangePct24h: parseFloat(data.r || '0'),
          volume24h: parseFloat(data.v || '0'),
          high24h: parseFloat(data.h || '0'),
          low24h: parseFloat(data.l || '0'),
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

    const ws = new WebSocket(WS_URL);
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      ws.close();
    };

    ws.onerror = (event) => {
      console.warn('MEXC WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIPTION',
        params: [`spot@public.limit.depth.v3.api@${symbol}@20`],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Handle MEXC ping
        if (payload.ping) {
          ws.send(JSON.stringify({ pong: payload.ping }));
          return;
        }

        // Skip subscription confirmation messages or events without data
        if (!payload.d || !payload.c?.includes('depth')) {
          return;
        }

        const data = payload.d;
        if (!Array.isArray(data.bids) || !Array.isArray(data.asks)) {
          return;
        }

        const orderBook = mapOrderBook(symbol, data.bids, data.asks);
        callback(orderBook);
      } catch (error) {
        console.error('Error parsing order book data:', error);
      }
    };

    return cleanup;
  },
};
