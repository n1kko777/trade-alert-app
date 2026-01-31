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

export interface Signal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  profit?: number;
  status: 'active' | 'pending' | 'closed';
}

export interface ExchangeService {
  id: ExchangeId;
  name: string;
  getTicker(symbol: string): Promise<Ticker>;
  getAllTickers(): Promise<Ticker[]>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;
  getCandles(symbol: string, interval: string, limit?: number): Promise<Candle[]>;
  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void, onError?: (error: Error) => void): () => void;
  subscribeOrderBook(symbol: string, callback: (orderBook: OrderBook) => void, onError?: (error: Error) => void): () => void;
}
