import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://www.okx.com';
const WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';

interface OkxTickerData {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  volCcy24h: string;
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

interface OkxCandleData {
  0: string; // Timestamp
  1: string; // Open
  2: string; // High
  3: string; // Low
  4: string; // Close
  5: string; // Volume
}

interface OkxCandleResponse {
  code: string;
  msg: string;
  data: OkxCandleData[];
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

// Convert symbol format: BTCUSDT -> BTC-USDT
function toOkxSymbol(symbol: string): string {
  if (symbol.endsWith('USDT')) {
    return symbol.slice(0, -4) + '-USDT';
  }
  return symbol;
}

// Convert symbol format: BTC-USDT -> BTCUSDT
function fromOkxSymbol(instId: string): string {
  return instId.replace('-', '');
}

function mapTicker(data: OkxTickerData): Ticker {
  const lastPrice = parseFloat(data.last);
  const open24h = parseFloat(data.open24h);
  const priceChange24h = lastPrice - open24h;
  const priceChangePct24h = open24h !== 0 ? (priceChange24h / open24h) * 100 : 0;

  return {
    symbol: fromOkxSymbol(data.instId),
    price: lastPrice,
    priceChange24h,
    priceChangePct24h,
    volume24h: parseFloat(data.vol24h),
    high24h: parseFloat(data.high24h),
    low24h: parseFloat(data.low24h),
    lastUpdated: Date.now(),
  };
}

function mapOrderBook(symbol: string, bids: [string, string, string, string][], asks: [string, string, string, string][]): OrderBook {
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

function mapCandle(data: OkxCandleData): Candle {
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

export const okxService: ExchangeService = {
  id: 'okx',
  name: 'OKX',

  async getTicker(symbol: string): Promise<Ticker> {
    validateSymbol(symbol);
    const instId = toOkxSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/api/v5/market/ticker?instId=${instId}`);
    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for ${symbol}`);
    }
    const json: OkxTickerResponse = await response.json();
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for ${symbol}`);
    }
    if (!json.data || json.data.length === 0) {
      throw new Error(`OKX API error: No ticker data for ${symbol}`);
    }
    return mapTicker(json.data[0]);
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetchWithTimeout(`${BASE_URL}/api/v5/market/tickers?instType=SPOT`);
    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for getAllTickers`);
    }
    const json: OkxTickerResponse = await response.json();
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for getAllTickers`);
    }
    return json.data
      .filter((t) => t.instId.endsWith('-USDT'))
      .map(mapTicker);
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    validateSymbol(symbol);
    const instId = toOkxSymbol(symbol);
    const response = await fetchWithTimeout(`${BASE_URL}/api/v5/market/books?instId=${instId}&sz=${depth}`);
    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for ${symbol}`);
    }
    const json: OkxOrderBookResponse = await response.json();
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for ${symbol}`);
    }
    if (!json.data || json.data.length === 0) {
      throw new Error(`OKX API error: No order book data for ${symbol}`);
    }
    return mapOrderBook(symbol, json.data[0].bids, json.data[0].asks);
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    validateSymbol(symbol);
    if (!interval || typeof interval !== 'string') {
      throw new Error('Invalid interval: interval must be a non-empty string');
    }
    const instId = toOkxSymbol(symbol);
    const okxInterval = INTERVAL_MAP[interval] || interval;
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/v5/market/candles?instId=${instId}&bar=${okxInterval}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} for ${symbol}`);
    }
    const json: OkxCandleResponse = await response.json();
    if (json.code !== '0') {
      throw new Error(`OKX API error: ${json.msg} for ${symbol}`);
    }
    // OKX returns candles in reverse order (newest first), so we reverse them
    return json.data.map(mapCandle).reverse();
  },

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void, onError?: (error: Error) => void): () => void {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol: symbol must be a non-empty string');
    }

    const ws = new WebSocket(WS_URL);
    let isCleanedUp = false;
    const instId = toOkxSymbol(symbol);

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      ws.close();
    };

    ws.onerror = (event) => {
      console.warn('OKX WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'tickers', instId }],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Skip subscription confirmation messages or events without data
        if (payload.event || !payload.data || payload.data.length === 0) {
          return;
        }

        const data = payload.data[0];
        if (!data.instId || !data.last) {
          return;
        }

        callback(mapTicker(data));
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
    const instId = toOkxSymbol(symbol);

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      ws.close();
    };

    ws.onerror = (event) => {
      console.warn('OKX WebSocket error', event);
      onError?.(new Error('WebSocket connection error'));
      cleanup();
    };

    ws.onclose = () => {
      isCleanedUp = true;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'books5', instId }],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Skip subscription confirmation messages or events without data
        if (payload.event || !payload.data || payload.data.length === 0) {
          return;
        }

        const data = payload.data[0];
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
