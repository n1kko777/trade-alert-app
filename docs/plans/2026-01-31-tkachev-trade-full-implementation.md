# TradePulse Alerts → Full Trading Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform TradePulse Alerts from a simple price alert app into a comprehensive crypto trading platform with pump detection, liquidation maps, order books, AI analysis, charts, portfolio management, and community features.

**Architecture:** Modular React Native (Expo) app with:
- Screen-based navigation (bottom tabs + stack navigation for detail screens)
- Service layer for multiple exchange APIs (Binance, Bybit, OKX, Mexc)
- Context-based state management for global state (auth, settings, portfolio)
- AsyncStorage for persistence + future backend integration ready

**Tech Stack:**
- Expo 54 + React Native 0.81
- React Navigation (tabs + stack)
- TradingView Lightweight Charts (via WebView)
- OpenAI API for GPT analysis
- Multiple exchange WebSocket/REST APIs

---

## Phase 1: Foundation & Architecture (Week 1-2)

### Task 1.1: Project Structure Reorganization

**Files:**
- Create: `src/navigation/AppNavigator.tsx`
- Create: `src/navigation/MainTabNavigator.tsx`
- Create: `src/navigation/types.ts`
- Create: `src/context/AuthContext.tsx`
- Create: `src/context/SettingsContext.tsx`
- Create: `src/context/PortfolioContext.tsx`
- Create: `src/hooks/useExchange.ts`
- Create: `src/services/exchanges/index.ts`
- Create: `src/services/exchanges/types.ts`
- Create: `src/services/exchanges/binance.ts`
- Create: `src/services/exchanges/bybit.ts`
- Create: `src/services/exchanges/okx.ts`
- Create: `src/services/exchanges/mexc.ts`
- Modify: `App.tsx` (refactor to use new structure)

**Step 1: Create navigation types**

```typescript
// src/navigation/types.ts
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  CoinDetail: { symbol: string; exchange: string };
  ChartFullscreen: { symbol: string; exchange: string; timeframe: string };
  OrderBook: { symbol: string; exchange: string };
  LiquidationMap: { symbol: string };
  AIChat: { initialSymbol?: string };
  SignalDetail: { signalId: string };
  PortfolioDetail: undefined;
  TradeHistory: undefined;
  Education: undefined;
  CourseDetail: { courseId: string };
  Community: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Pumps: undefined;
  Signals: undefined;
  Portfolio: undefined;
  More: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
```

**Step 2: Create exchange service types**

```typescript
// src/services/exchanges/types.ts
export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'mexc';

export interface Ticker {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePct24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastUpdated: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiquidationLevel {
  price: number;
  longVolume: number;
  shortVolume: number;
  totalVolume: number;
}

export interface PumpEvent {
  id: string;
  symbol: string;
  exchange: ExchangeId;
  startPrice: number;
  currentPrice: number;
  peakPrice: number;
  changePct: number;
  volume: number;
  startTime: number;
  duration: number;
  status: 'active' | 'cooling' | 'ended';
}

export interface ExchangeService {
  id: ExchangeId;
  name: string;
  getTicker(symbol: string): Promise<Ticker>;
  getAllTickers(): Promise<Ticker[]>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;
  getCandles(symbol: string, interval: string, limit?: number): Promise<Candle[]>;
  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void): () => void;
  subscribeOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): () => void;
}
```

**Step 3: Implement Binance service**

```typescript
// src/services/exchanges/binance.ts
import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://api.binance.com';
const WS_URL = 'wss://stream.binance.com:9443/ws';

export const binanceService: ExchangeService = {
  id: 'binance',
  name: 'Binance',

  async getTicker(symbol: string): Promise<Ticker> {
    const response = await fetch(`${BASE_URL}/api/v3/ticker/24hr?symbol=${symbol}`);
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    const data = await response.json();
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange24h: parseFloat(data.priceChange),
      priceChangePct24h: parseFloat(data.priceChangePercent),
      volume24h: parseFloat(data.quoteVolume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      lastUpdated: Date.now(),
    };
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetch(`${BASE_URL}/api/v3/ticker/24hr`);
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    const data = await response.json();
    return data
      .filter((item: any) => item.symbol.endsWith('USDT'))
      .map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        priceChange24h: parseFloat(item.priceChange),
        priceChangePct24h: parseFloat(item.priceChangePercent),
        volume24h: parseFloat(item.quoteVolume),
        high24h: parseFloat(item.highPrice),
        low24h: parseFloat(item.lowPrice),
        lastUpdated: Date.now(),
      }));
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const response = await fetch(`${BASE_URL}/api/v3/depth?symbol=${symbol}&limit=${depth}`);
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    const data = await response.json();

    const mapEntries = (entries: [string, string][]): OrderBookEntry[] => {
      let cumulative = 0;
      return entries.map(([price, qty]) => {
        const quantity = parseFloat(qty);
        cumulative += quantity;
        return { price: parseFloat(price), quantity, total: cumulative };
      });
    };

    return {
      symbol,
      bids: mapEntries(data.bids),
      asks: mapEntries(data.asks),
      lastUpdated: Date.now(),
    };
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    const response = await fetch(
      `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    const data = await response.json();
    return data.map((item: any[]) => ({
      time: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  },

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@ticker`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback({
          symbol: data.s,
          price: parseFloat(data.c),
          priceChange24h: parseFloat(data.p),
          priceChangePct24h: parseFloat(data.P),
          volume24h: parseFloat(data.q),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('Binance ticker parse error', e);
      }
    };

    return () => ws.close();
  },

  subscribeOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): () => void {
    const ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@depth20@100ms`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const mapEntries = (entries: [string, string][]): OrderBookEntry[] => {
          let cumulative = 0;
          return entries.map(([price, qty]) => {
            const quantity = parseFloat(qty);
            cumulative += quantity;
            return { price: parseFloat(price), quantity, total: cumulative };
          });
        };
        callback({
          symbol,
          bids: mapEntries(data.bids || data.b || []),
          asks: mapEntries(data.asks || data.a || []),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('Binance orderbook parse error', e);
      }
    };

    return () => ws.close();
  },
};
```

**Step 4: Create exchange service index**

```typescript
// src/services/exchanges/index.ts
import { binanceService } from './binance';
import { bybitService } from './bybit';
import { okxService } from './okx';
import { mexcService } from './mexc';
import type { ExchangeId, ExchangeService } from './types';

export * from './types';

export const exchanges: Record<ExchangeId, ExchangeService> = {
  binance: binanceService,
  bybit: bybitService,
  okx: okxService,
  mexc: mexcService,
};

export const getExchange = (id: ExchangeId): ExchangeService => {
  const exchange = exchanges[id];
  if (!exchange) throw new Error(`Unknown exchange: ${id}`);
  return exchange;
};

export const getAllExchanges = (): ExchangeService[] => Object.values(exchanges);
```

**Step 5: Commit foundation**

```bash
git add src/navigation/ src/services/exchanges/ src/context/
git commit -m "feat: add foundation architecture for multi-exchange trading platform"
```

---

### Task 1.2: Update Bybit Service to New Interface

**Files:**
- Create: `src/services/exchanges/bybit.ts` (rewrite existing)
- Delete: `src/services/bybit.ts` (old file)

**Step 1: Implement new Bybit service**

```typescript
// src/services/exchanges/bybit.ts
import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://api.bybit.com';
const WS_URL = 'wss://stream.bybit.com/v5/public/spot';

export const bybitService: ExchangeService = {
  id: 'bybit',
  name: 'Bybit',

  async getTicker(symbol: string): Promise<Ticker> {
    const response = await fetch(`${BASE_URL}/v5/market/tickers?category=spot&symbol=${symbol}`);
    if (!response.ok) throw new Error(`Bybit API error: ${response.status}`);
    const json = await response.json();
    const data = json.result?.list?.[0];
    if (!data) throw new Error(`No data for ${symbol}`);
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange24h: parseFloat(data.price24hPcnt) * parseFloat(data.lastPrice) / 100,
      priceChangePct24h: parseFloat(data.price24hPcnt) * 100,
      volume24h: parseFloat(data.turnover24h),
      high24h: parseFloat(data.highPrice24h),
      low24h: parseFloat(data.lowPrice24h),
      lastUpdated: Date.now(),
    };
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetch(`${BASE_URL}/v5/market/tickers?category=spot`);
    if (!response.ok) throw new Error(`Bybit API error: ${response.status}`);
    const json = await response.json();
    const list = json.result?.list || [];
    return list
      .filter((item: any) => item.symbol.endsWith('USDT'))
      .map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        priceChange24h: parseFloat(item.price24hPcnt) * parseFloat(item.lastPrice) / 100,
        priceChangePct24h: parseFloat(item.price24hPcnt) * 100,
        volume24h: parseFloat(item.turnover24h),
        high24h: parseFloat(item.highPrice24h),
        low24h: parseFloat(item.lowPrice24h),
        lastUpdated: Date.now(),
      }));
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const response = await fetch(`${BASE_URL}/v5/market/orderbook?category=spot&symbol=${symbol}&limit=${depth}`);
    if (!response.ok) throw new Error(`Bybit API error: ${response.status}`);
    const json = await response.json();
    const data = json.result;

    const mapEntries = (entries: [string, string][]): OrderBookEntry[] => {
      let cumulative = 0;
      return entries.map(([price, qty]) => {
        const quantity = parseFloat(qty);
        cumulative += quantity;
        return { price: parseFloat(price), quantity, total: cumulative };
      });
    };

    return {
      symbol,
      bids: mapEntries(data.b || []),
      asks: mapEntries(data.a || []),
      lastUpdated: Date.now(),
    };
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    const intervalMap: Record<string, string> = {
      '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W',
    };
    const bybitInterval = intervalMap[interval] || interval;
    const response = await fetch(
      `${BASE_URL}/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`Bybit API error: ${response.status}`);
    const json = await response.json();
    return (json.result?.list || []).reverse().map((item: any[]) => ({
      time: parseInt(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  },

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ op: 'subscribe', args: [`tickers.${symbol}`] }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.op === 'ping') {
          ws.send(JSON.stringify({ op: 'pong' }));
          return;
        }
        const data = payload.data;
        if (!data) return;
        callback({
          symbol: data.symbol,
          price: parseFloat(data.lastPrice),
          priceChange24h: parseFloat(data.price24hPcnt || 0) * parseFloat(data.lastPrice) / 100,
          priceChangePct24h: parseFloat(data.price24hPcnt || 0) * 100,
          volume24h: parseFloat(data.turnover24h || 0),
          high24h: parseFloat(data.highPrice24h || 0),
          low24h: parseFloat(data.lowPrice24h || 0),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('Bybit ticker parse error', e);
      }
    };

    return () => ws.close();
  },

  subscribeOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): () => void {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ op: 'subscribe', args: [`orderbook.50.${symbol}`] }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.op === 'ping') {
          ws.send(JSON.stringify({ op: 'pong' }));
          return;
        }
        const data = payload.data;
        if (!data) return;

        const mapEntries = (entries: [string, string][]): OrderBookEntry[] => {
          let cumulative = 0;
          return entries.map(([price, qty]) => {
            const quantity = parseFloat(qty);
            cumulative += quantity;
            return { price: parseFloat(price), quantity, total: cumulative };
          });
        };

        callback({
          symbol,
          bids: mapEntries(data.b || []),
          asks: mapEntries(data.a || []),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('Bybit orderbook parse error', e);
      }
    };

    return () => ws.close();
  },
};
```

**Step 2: Commit**

```bash
git add src/services/exchanges/bybit.ts
git rm src/services/bybit.ts
git commit -m "feat: migrate bybit service to new exchange interface"
```

---

### Task 1.3: Implement OKX and Mexc Services

**Files:**
- Create: `src/services/exchanges/okx.ts`
- Create: `src/services/exchanges/mexc.ts`

**Step 1: Implement OKX service**

```typescript
// src/services/exchanges/okx.ts
import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://www.okx.com';
const WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';

export const okxService: ExchangeService = {
  id: 'okx',
  name: 'OKX',

  async getTicker(symbol: string): Promise<Ticker> {
    const instId = symbol.replace('USDT', '-USDT');
    const response = await fetch(`${BASE_URL}/api/v5/market/ticker?instId=${instId}`);
    if (!response.ok) throw new Error(`OKX API error: ${response.status}`);
    const json = await response.json();
    const data = json.data?.[0];
    if (!data) throw new Error(`No data for ${symbol}`);

    const price = parseFloat(data.last);
    const open24h = parseFloat(data.open24h);
    const change = price - open24h;
    const changePct = open24h ? (change / open24h) * 100 : 0;

    return {
      symbol,
      price,
      priceChange24h: change,
      priceChangePct24h: changePct,
      volume24h: parseFloat(data.volCcy24h),
      high24h: parseFloat(data.high24h),
      low24h: parseFloat(data.low24h),
      lastUpdated: Date.now(),
    };
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetch(`${BASE_URL}/api/v5/market/tickers?instType=SPOT`);
    if (!response.ok) throw new Error(`OKX API error: ${response.status}`);
    const json = await response.json();

    return (json.data || [])
      .filter((item: any) => item.instId.endsWith('-USDT'))
      .map((item: any) => {
        const symbol = item.instId.replace('-USDT', 'USDT');
        const price = parseFloat(item.last);
        const open24h = parseFloat(item.open24h);
        const change = price - open24h;
        const changePct = open24h ? (change / open24h) * 100 : 0;

        return {
          symbol,
          price,
          priceChange24h: change,
          priceChangePct24h: changePct,
          volume24h: parseFloat(item.volCcy24h),
          high24h: parseFloat(item.high24h),
          low24h: parseFloat(item.low24h),
          lastUpdated: Date.now(),
        };
      });
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const instId = symbol.replace('USDT', '-USDT');
    const response = await fetch(`${BASE_URL}/api/v5/market/books?instId=${instId}&sz=${depth}`);
    if (!response.ok) throw new Error(`OKX API error: ${response.status}`);
    const json = await response.json();
    const data = json.data?.[0];

    const mapEntries = (entries: [string, string, string, string][]): OrderBookEntry[] => {
      let cumulative = 0;
      return entries.map(([price, qty]) => {
        const quantity = parseFloat(qty);
        cumulative += quantity;
        return { price: parseFloat(price), quantity, total: cumulative };
      });
    };

    return {
      symbol,
      bids: mapEntries(data?.bids || []),
      asks: mapEntries(data?.asks || []),
      lastUpdated: Date.now(),
    };
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    const instId = symbol.replace('USDT', '-USDT');
    const barMap: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1W',
    };
    const bar = barMap[interval] || interval;
    const response = await fetch(
      `${BASE_URL}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`OKX API error: ${response.status}`);
    const json = await response.json();

    return (json.data || []).reverse().map((item: any[]) => ({
      time: parseInt(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  },

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const ws = new WebSocket(WS_URL);
    const instId = symbol.replace('USDT', '-USDT');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'tickers', instId }],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data?.[0];
        if (!data) return;

        const price = parseFloat(data.last);
        const open24h = parseFloat(data.open24h);
        const change = price - open24h;
        const changePct = open24h ? (change / open24h) * 100 : 0;

        callback({
          symbol,
          price,
          priceChange24h: change,
          priceChangePct24h: changePct,
          volume24h: parseFloat(data.volCcy24h),
          high24h: parseFloat(data.high24h),
          low24h: parseFloat(data.low24h),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('OKX ticker parse error', e);
      }
    };

    return () => ws.close();
  },

  subscribeOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): () => void {
    const ws = new WebSocket(WS_URL);
    const instId = symbol.replace('USDT', '-USDT');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'books', instId }],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data?.[0];
        if (!data) return;

        const mapEntries = (entries: [string, string, string, string][]): OrderBookEntry[] => {
          let cumulative = 0;
          return entries.map(([price, qty]) => {
            const quantity = parseFloat(qty);
            cumulative += quantity;
            return { price: parseFloat(price), quantity, total: cumulative };
          });
        };

        callback({
          symbol,
          bids: mapEntries(data.bids || []),
          asks: mapEntries(data.asks || []),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('OKX orderbook parse error', e);
      }
    };

    return () => ws.close();
  },
};
```

**Step 2: Implement Mexc service**

```typescript
// src/services/exchanges/mexc.ts
import type { ExchangeService, Ticker, OrderBook, Candle, OrderBookEntry } from './types';

const BASE_URL = 'https://api.mexc.com';
const WS_URL = 'wss://wbs.mexc.com/ws';

export const mexcService: ExchangeService = {
  id: 'mexc',
  name: 'MEXC',

  async getTicker(symbol: string): Promise<Ticker> {
    const response = await fetch(`${BASE_URL}/api/v3/ticker/24hr?symbol=${symbol}`);
    if (!response.ok) throw new Error(`MEXC API error: ${response.status}`);
    const data = await response.json();
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange24h: parseFloat(data.priceChange),
      priceChangePct24h: parseFloat(data.priceChangePercent),
      volume24h: parseFloat(data.quoteVolume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      lastUpdated: Date.now(),
    };
  },

  async getAllTickers(): Promise<Ticker[]> {
    const response = await fetch(`${BASE_URL}/api/v3/ticker/24hr`);
    if (!response.ok) throw new Error(`MEXC API error: ${response.status}`);
    const data = await response.json();
    return data
      .filter((item: any) => item.symbol.endsWith('USDT'))
      .map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        priceChange24h: parseFloat(item.priceChange),
        priceChangePct24h: parseFloat(item.priceChangePercent),
        volume24h: parseFloat(item.quoteVolume),
        high24h: parseFloat(item.highPrice),
        low24h: parseFloat(item.lowPrice),
        lastUpdated: Date.now(),
      }));
  },

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const response = await fetch(`${BASE_URL}/api/v3/depth?symbol=${symbol}&limit=${depth}`);
    if (!response.ok) throw new Error(`MEXC API error: ${response.status}`);
    const data = await response.json();

    const mapEntries = (entries: [string, string][]): OrderBookEntry[] => {
      let cumulative = 0;
      return entries.map(([price, qty]) => {
        const quantity = parseFloat(qty);
        cumulative += quantity;
        return { price: parseFloat(price), quantity, total: cumulative };
      });
    };

    return {
      symbol,
      bids: mapEntries(data.bids || []),
      asks: mapEntries(data.asks || []),
      lastUpdated: Date.now(),
    };
  },

  async getCandles(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    const response = await fetch(
      `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`MEXC API error: ${response.status}`);
    const data = await response.json();
    return data.map((item: any[]) => ({
      time: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  },

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIPTION',
        params: [`spot@public.ticker.v3.api@${symbol}`],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.d;
        if (!data) return;
        callback({
          symbol: data.s,
          price: parseFloat(data.c),
          priceChange24h: parseFloat(data.p || 0),
          priceChangePct24h: parseFloat(data.P || 0),
          volume24h: parseFloat(data.q || 0),
          high24h: parseFloat(data.h || 0),
          low24h: parseFloat(data.l || 0),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('MEXC ticker parse error', e);
      }
    };

    return () => ws.close();
  },

  subscribeOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): () => void {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIPTION',
        params: [`spot@public.limit.depth.v3.api@${symbol}@20`],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.d;
        if (!data) return;

        const mapEntries = (entries: { p: string; v: string }[]): OrderBookEntry[] => {
          let cumulative = 0;
          return entries.map(({ p, v }) => {
            const quantity = parseFloat(v);
            cumulative += quantity;
            return { price: parseFloat(p), quantity, total: cumulative };
          });
        };

        callback({
          symbol,
          bids: mapEntries(data.bids || []),
          asks: mapEntries(data.asks || []),
          lastUpdated: Date.now(),
        });
      } catch (e) {
        console.warn('MEXC orderbook parse error', e);
      }
    };

    return () => ws.close();
  },
};
```

**Step 3: Commit**

```bash
git add src/services/exchanges/okx.ts src/services/exchanges/mexc.ts
git commit -m "feat: add OKX and MEXC exchange services"
```

---

## Phase 2: Core Screens & Components (Week 2-3)

### Task 2.1: New Dashboard Screen with Portfolio Summary

**Files:**
- Create: `src/screens/DashboardScreen.tsx` (rewrite)
- Create: `src/components/PortfolioSummary.tsx`
- Create: `src/components/HotCoins.tsx`
- Create: `src/components/ActiveSignals.tsx`

[Detailed implementation steps would continue...]

---

## Phase 3: Pump Detection Module (Week 3-4)

### Task 3.1: Pump Detection Algorithm

**Files:**
- Create: `src/services/pumps/detector.ts`
- Create: `src/services/pumps/types.ts`
- Create: `src/screens/PumpsScreen.tsx`
- Create: `src/components/PumpCard.tsx`
- Create: `src/components/PumpFilters.tsx`

[Detailed implementation steps would continue...]

---

## Phase 4: Liquidation Map Module (Week 4-5)

### Task 4.1: Liquidation Data Service

**Files:**
- Create: `src/services/liquidations/index.ts`
- Create: `src/services/liquidations/types.ts`
- Create: `src/screens/LiquidationScreen.tsx`
- Create: `src/components/LiquidationChart.tsx`

[Detailed implementation steps would continue...]

---

## Phase 5: Order Book Module (Week 5)

### Task 5.1: Order Book Screen

**Files:**
- Create: `src/screens/OrderBookScreen.tsx`
- Create: `src/components/OrderBookDepth.tsx`
- Create: `src/components/WhaleTracker.tsx`

[Detailed implementation steps would continue...]

---

## Phase 6: Charts Module (Week 5-6)

### Task 6.1: TradingView Integration

**Files:**
- Create: `src/screens/ChartScreen.tsx`
- Create: `src/components/TradingChart.tsx`
- Create: `src/components/IndicatorSelector.tsx`
- Create: `src/components/TimeframeSelector.tsx`

[Detailed implementation steps would continue...]

---

## Phase 7: GPT Analysis Module (Week 6-7)

### Task 7.1: OpenAI Integration

**Files:**
- Create: `src/services/ai/openai.ts`
- Create: `src/services/ai/types.ts`
- Create: `src/screens/AIAnalysisScreen.tsx`
- Create: `src/components/AIChat.tsx`
- Create: `src/components/AnalysisCard.tsx`

[Detailed implementation steps would continue...]

---

## Phase 8: Trading Signals Module (Week 7-8)

### Task 8.1: Signal Service

**Files:**
- Create: `src/services/signals/index.ts`
- Create: `src/services/signals/types.ts`
- Create: `src/screens/SignalsScreen.tsx`
- Create: `src/components/SignalCard.tsx`

[Detailed implementation steps would continue...]

---

## Phase 9: Portfolio Module (Week 8-9)

### Task 9.1: Portfolio Management

**Files:**
- Create: `src/screens/PortfolioScreen.tsx`
- Create: `src/components/AssetAllocation.tsx`
- Create: `src/components/PositionCard.tsx`
- Create: `src/components/PnLChart.tsx`

[Detailed implementation steps would continue...]

---

## Phase 10: Tools Module (Week 9)

### Task 10.1: Trading Calculators

**Files:**
- Create: `src/screens/ToolsScreen.tsx`
- Create: `src/components/calculators/RiskCalculator.tsx`
- Create: `src/components/calculators/LeverageCalculator.tsx`
- Create: `src/components/calculators/ROICalculator.tsx`

[Detailed implementation steps would continue...]

---

## Phase 11: Education Module (Week 9-10)

### Task 11.1: Education Content

**Files:**
- Create: `src/screens/EducationScreen.tsx`
- Create: `src/screens/CourseDetailScreen.tsx`
- Create: `src/components/CourseCard.tsx`
- Create: `src/components/LessonPlayer.tsx`

[Detailed implementation steps would continue...]

---

## Phase 12: Community Module (Week 10-11)

### Task 12.1: Community Features

**Files:**
- Create: `src/screens/CommunityScreen.tsx`
- Create: `src/components/ChatRoom.tsx`
- Create: `src/components/TraderCard.tsx`

[Detailed implementation steps would continue...]

---

## Phase 13: News Module (Week 11)

### Task 13.1: News Aggregation

**Files:**
- Create: `src/services/news/index.ts`
- Create: `src/screens/NewsScreen.tsx`
- Create: `src/components/NewsCard.tsx`

[Detailed implementation steps would continue...]

---

## Phase 14: Authentication & Subscriptions (Week 11-12)

### Task 14.1: Auth System

**Files:**
- Create: `src/screens/auth/LoginScreen.tsx`
- Create: `src/screens/auth/RegisterScreen.tsx`
- Create: `src/screens/auth/SubscriptionScreen.tsx`
- Create: `src/services/auth/index.ts`

[Detailed implementation steps would continue...]

---

## Phase 15: Final Integration & Polish (Week 12)

### Task 15.1: Integration Testing

### Task 15.2: Performance Optimization

### Task 15.3: App Store Preparation

---

## Summary

**Total Tasks:** ~45 major tasks across 15 phases
**Estimated Duration:** 12 weeks with full-time development
**Key Dependencies:**
- Phase 1 must complete before any other phase
- Phases 2-8 can partially run in parallel
- Phase 14 (Auth) should be integrated early for subscription features

**Required API Keys:**
- OpenAI API key for GPT analysis
- Exchange API keys for authenticated features (portfolio sync)
- Push notification certificates (iOS/Android)

**Testing Strategy:**
- Unit tests for all services
- Integration tests for exchange APIs
- E2E tests for critical user flows
