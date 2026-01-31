/**
 * Pump Types
 * Type definitions for pump detection data from the backend
 */

export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'mexc';

export interface PumpEvent {
  id: string;
  symbol: string;
  exchange: ExchangeId;
  startPrice: number;
  currentPrice: number;
  peakPrice: number;
  changePct: number;
  peakChangePct: number;
  volume24h: number;
  startTime: number;
  lastUpdateTime: number;
  status: 'active' | 'cooling' | 'ended';
}
