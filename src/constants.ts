import { Settings } from './types';

export const STORAGE_KEY = '@trade-alert/settings';
export const ALERTS_STORAGE_KEY = '@trade-alert/alerts';
export const HISTORY_STORAGE_KEY = '@trade-alert/history';
export const LAST_ALERT_AT_KEY = '@trade-alert/last-alert-at';
export const BACKGROUND_TASK = 'trade-alert-background';

export const SPARKLINE_WIDTH = 120;
export const SPARKLINE_HEIGHT = 36;

export const DEFAULT_SETTINGS: Settings = {
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  thresholdPct: 7,
  windowMinutes: 8,
  cooldownMinutes: 4,
  retentionDays: 7,
  maxAlerts: 120,
  pollIntervalSec: 60,
  notificationsEnabled: true,
  notificationSound: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  useWebSocket: true,
  backgroundEnabled: false,
  trackAllSymbols: false,
  themeMode: 'system',
  symbolRules: {},
};
