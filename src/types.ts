import type { ThemeMode } from './theme';

export type Quote = {
  price: number;
  changePct: number;
  direction: 'up' | 'down' | 'flat';
  lastUpdated: number;
};

export type PricePoint = {
  ts: number;
  price: number;
};

export type AlertEvent = {
  id: string;
  symbol: string;
  changePct: number;
  price: number;
  ts: number;
};

export type Settings = {
  symbols: string[];
  thresholdPct: number;
  windowMinutes: number;
  cooldownMinutes: number;
  retentionDays: number;
  maxAlerts: number;
  pollIntervalSec: number;
  notificationsEnabled: boolean;
  notificationSound: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  useWebSocket: boolean;
  backgroundEnabled: boolean;
  trackAllSymbols: boolean;
  themeMode: ThemeMode;
  symbolRules: Record<
    string,
    { thresholdPct?: number; windowMinutes?: number; cooldownMinutes?: number }
  >;
};

export type SymbolRuleInputs = Record<
  string,
  { threshold: string; window: string; cooldown: string }
>;
