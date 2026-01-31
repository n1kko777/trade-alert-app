import type { ExchangeId } from '../exchanges/types';

export interface PumpConfig {
  thresholdPct: number;      // e.g., 5 = 5% increase triggers pump
  windowMinutes: number;     // e.g., 15 = look at last 15 minutes
  volumeMultiplier: number;  // e.g., 2 = volume must be 2x average
  cooldownMinutes: number;   // e.g., 5 = wait 5min before re-alerting
}

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

export interface PumpDetectorState {
  pumps: Map<string, PumpEvent>;
  priceHistory: Map<string, { ts: number; price: number; volume: number }[]>;
}

export const DEFAULT_PUMP_CONFIG: PumpConfig = {
  thresholdPct: 5,
  windowMinutes: 15,
  volumeMultiplier: 1.5,
  cooldownMinutes: 5,
};
