/**
 * Signal Types
 * Type definitions for trading signals from the backend
 */

export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'mexc';
export type SignalDirection = 'BUY' | 'SELL';
export type SignalStatus = 'active' | 'pending' | 'closed';

export interface TakeProfitLevel {
  price: number;
  percentage: number;  // Target profit percentage
  hit: boolean;        // Whether this level was hit
  hitAt?: number;      // Timestamp when hit
}

export interface AITrigger {
  name: string;
  confirmed: boolean;
  weight: number;  // 0-1
}

export interface Signal {
  id: string;
  symbol: string;
  exchange: ExchangeId;
  direction: SignalDirection;
  entryPrice: number;
  currentPrice?: number;
  takeProfit: TakeProfitLevel[];  // Multiple TP levels (TP1, TP2, TP3)
  stopLoss: number;
  stopLossPercentage: number;
  status: SignalStatus;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  closePrice?: number;
  profit?: number;           // Realized profit percentage (if closed)
  unrealizedProfit?: number; // Current unrealized profit percentage
  aiTriggers: AITrigger[];   // 6 AI triggers confirmation
  confidence: number;        // Overall confidence score 0-100
  notes?: string;
}

export interface SignalStats {
  totalSignals: number;
  activeSignals: number;
  closedSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;           // Percentage
  totalProfit: number;       // Sum of all closed signal profits
  avgProfit: number;         // Average profit per closed signal
  avgWin: number;            // Average winning trade profit
  avgLoss: number;           // Average losing trade loss
  bestTrade: number;         // Best single trade profit
  worstTrade: number;        // Worst single trade loss
  profitFactor: number;      // Gross profit / Gross loss
  avgHoldingTime: number;    // Average time from open to close (ms)
}

export interface SignalFilter {
  symbol?: string;
  exchange?: ExchangeId;
  direction?: SignalDirection;
  status?: SignalStatus;
  dateFrom?: number;
  dateTo?: number;
  minProfit?: number;
  maxProfit?: number;
}

export const DEFAULT_AI_TRIGGERS: Omit<AITrigger, 'confirmed'>[] = [
  { name: 'Trend Analysis', weight: 0.2 },
  { name: 'Volume Confirmation', weight: 0.15 },
  { name: 'Support/Resistance', weight: 0.2 },
  { name: 'Momentum Indicator', weight: 0.15 },
  { name: 'Market Sentiment', weight: 0.15 },
  { name: 'Whale Activity', weight: 0.15 },
];
