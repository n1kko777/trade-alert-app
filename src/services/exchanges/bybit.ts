import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://api.bybit.com';
const WS_URL = 'wss://stream.bybit.com/v5/public/spot';

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

interface BybitKlineData {
  0: string; // Start time
  1: string; // Open
  2: string; // High
  3: string; // Low
  4: string; // Close
  5: string; // Volume
}

interface BybitKlineResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: BybitKlineData[];
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

function mapTicker(data: BybitTickerData): Ticker {
  const lastPrice = parseFloat(data.lastPrice);
  const prevPrice = parseFloat(data.prevPrice24h);
  const priceChange24h = lastPrice - prevPrice;

  return {
    symbol: data.symbol,
    price: lastPrice,
    priceChange24h,
    priceChangePct24h: parseFloat(data.price24hPcnt) * 100,
    volume24h: parseFloat(data.volume24h),
    high24h: parseFloat(data.highPrice24h),
    low24h: parseFloat(data.lowPrice24h),
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

function mapCandle(data: BybitKlineData): Candle {
  return {
    time: parseInt(data[0], 10),
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

export const bybitService: ExchangeService = {
  id: 'bybit',
  name: 'Bybit',

  async getTicker(symbol: string): Promise<Ticker> {
    validateSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/v5/market/tickers?category=spot&symbol=${symbol}`);
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for ${symbol}`);
    }
    const json: BybitTickerResponse = await response.json();
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for ${symbol}`);
    }
    if (!json.result.list || json.result.list.length === 0) {
      throw new Error(`Bybit API error: No ticker data for ${symbol}`);
    }
    return mapTicker(json.result.list[0]);
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetchWithTimeout(`${BASE_URL}/v5/market/tickers?category=spot`);
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for getAllTickers`);
    }
    const json: BybitTickerResponse = await response.json();
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for getAllTickers`);
    }
    return json.result.list
      .filter((t) => t.symbol.endsWith('USDT'))
      .map(mapTicker);
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    validateSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/v5/market/orderbook?category=spot&symbol=${symbol}&limit=${depth}`);
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for ${symbol}`);
    }
    const json: BybitOrderBookResponse = await response.json();
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for ${symbol}`);
    }
    return mapOrderBook(symbol, json.result.b, json.result.a);
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    validateSymbol(symbol);
    if (!interval || typeof interval !== 'string') {
      throw new Error('Invalid interval: interval must be a non-empty string');
    }
    const bybitInterval = INTERVAL_MAP[interval] || interval;
    const response = await fetchWithTimeout(
      `${BASE_URL}/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status} for ${symbol}`);
    }
    const json: BybitKlineResponse = await response.json();
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg} for ${symbol}`);
    }
    // Bybit returns candles in reverse order (newest first), so we reverse them
    return json.result.list.map(mapCandle).reverse();
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
      console.warn('Bybit WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ op: 'subscribe', args: [`tickers.${symbol}`] }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Handle Bybit ping/pong
        if (payload.op === 'ping') {
          ws.send(JSON.stringify({ op: 'pong' }));
          return;
        }

        // Skip subscription confirmation messages
        if (payload.op === 'subscribe' || !payload.data) {
          return;
        }

        const data = payload.data;
        const price = parseFloat(data.lastPrice);
        const prevPrice = parseFloat(data.prevPrice24h);
        const ticker: Ticker = {
          symbol: data.symbol,
          price,
          priceChange24h: price - prevPrice,
          priceChangePct24h: parseFloat(data.price24hPcnt) * 100,
          volume24h: parseFloat(data.volume24h),
          high24h: parseFloat(data.highPrice24h),
          low24h: parseFloat(data.lowPrice24h),
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
      console.warn('Bybit WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ op: 'subscribe', args: [`orderbook.50.${symbol}`] }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Handle Bybit ping/pong
        if (payload.op === 'ping') {
          ws.send(JSON.stringify({ op: 'pong' }));
          return;
        }

        // Skip subscription confirmation messages
        if (payload.op === 'subscribe' || !payload.data) {
          return;
        }

        const data = payload.data;
        const orderBook = mapOrderBook(symbol, data.b, data.a);
        callback(orderBook);
      } catch (error) {
        console.error('Error parsing order book data:', error);
      }
    };

    return cleanup;
  },
};
