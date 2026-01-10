import { DEFAULT_SETTINGS } from '../constants';
import { isThemeMode } from '../theme';
import { AlertEvent, PricePoint, Settings, SymbolRuleInputs } from '../types';
import { normalizeTimeInput } from './format';

export const resolveSymbolRule = (settings: Settings, symbol: string) => {
  const rule = settings.symbolRules[symbol];
  return {
    thresholdPct: rule?.thresholdPct ?? settings.thresholdPct,
    windowMinutes: rule?.windowMinutes ?? settings.windowMinutes,
    cooldownMinutes: rule?.cooldownMinutes ?? settings.cooldownMinutes,
  };
};

export const computeChange = (history: PricePoint[], price: number) => {
  const baseline = history[0]?.price ?? price;
  const changePct = baseline ? ((price - baseline) / baseline) * 100 : 0;
  const direction = Math.abs(changePct) < 0.01 ? 'flat' : changePct > 0 ? 'up' : 'down';
  return { changePct, direction };
};

export const pruneAlertsList = (items: AlertEvent[], retentionDays: number, maxAlerts: number) => {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return items.filter((alert) => alert.ts >= cutoff).slice(0, maxAlerts);
};

export const pruneHistoryMap = (history: Record<string, PricePoint[]>, settings: Settings) => {
  const now = Date.now();
  const symbols = settings.trackAllSymbols ? Object.keys(history) : settings.symbols;
  return symbols.reduce<Record<string, PricePoint[]>>((acc, symbol) => {
    const { windowMinutes } = resolveSymbolRule(settings, symbol);
    const cutoff = now - windowMinutes * 60 * 1000;
    acc[symbol] = (history[symbol] ?? []).filter((point) => point.ts >= cutoff);
    return acc;
  }, {});
};

export const getSparklinePoints = (data: PricePoint[], width: number, height: number) => {
  if (!data.length) return '';
  const prices = data.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const count = data.length - 1 || 1;
  return data
    .map((point, index) => {
      const x = (index / count) * width;
      const y = height - ((point.price - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

export const buildRuleInputs = (symbols: string[], rules: Settings['symbolRules']) => {
  return symbols.reduce<SymbolRuleInputs>((acc, symbol) => {
    const rule = rules?.[symbol];
    acc[symbol] = {
      threshold: typeof rule?.thresholdPct === 'number' ? String(rule.thresholdPct) : '',
      window: typeof rule?.windowMinutes === 'number' ? String(rule.windowMinutes) : '',
      cooldown: typeof rule?.cooldownMinutes === 'number' ? String(rule.cooldownMinutes) : '',
    };
    return acc;
  }, {});
};

export const normalizeSettings = (parsed?: Partial<Settings> | null): Settings => {
  const symbols =
    Array.isArray(parsed?.symbols) && parsed?.symbols?.length
      ? parsed.symbols
      : DEFAULT_SETTINGS.symbols;
  return {
    ...DEFAULT_SETTINGS,
    symbols,
    thresholdPct:
      typeof parsed?.thresholdPct === 'number'
        ? parsed.thresholdPct
        : DEFAULT_SETTINGS.thresholdPct,
    windowMinutes:
      typeof parsed?.windowMinutes === 'number'
        ? parsed.windowMinutes
        : DEFAULT_SETTINGS.windowMinutes,
    cooldownMinutes:
      typeof parsed?.cooldownMinutes === 'number'
        ? parsed.cooldownMinutes
        : DEFAULT_SETTINGS.cooldownMinutes,
    retentionDays:
      typeof parsed?.retentionDays === 'number'
        ? parsed.retentionDays
        : DEFAULT_SETTINGS.retentionDays,
    maxAlerts:
      typeof parsed?.maxAlerts === 'number' ? parsed.maxAlerts : DEFAULT_SETTINGS.maxAlerts,
    pollIntervalSec:
      typeof parsed?.pollIntervalSec === 'number'
        ? parsed.pollIntervalSec
        : DEFAULT_SETTINGS.pollIntervalSec,
    notificationsEnabled:
      typeof parsed?.notificationsEnabled === 'boolean'
        ? parsed.notificationsEnabled
        : DEFAULT_SETTINGS.notificationsEnabled,
    notificationSound:
      typeof parsed?.notificationSound === 'boolean'
        ? parsed.notificationSound
        : DEFAULT_SETTINGS.notificationSound,
    quietHoursEnabled:
      typeof parsed?.quietHoursEnabled === 'boolean'
        ? parsed.quietHoursEnabled
        : DEFAULT_SETTINGS.quietHoursEnabled,
    quietHoursStart: normalizeTimeInput(
      parsed?.quietHoursStart ?? DEFAULT_SETTINGS.quietHoursStart,
      DEFAULT_SETTINGS.quietHoursStart
    ),
    quietHoursEnd: normalizeTimeInput(
      parsed?.quietHoursEnd ?? DEFAULT_SETTINGS.quietHoursEnd,
      DEFAULT_SETTINGS.quietHoursEnd
    ),
    useWebSocket:
      typeof parsed?.useWebSocket === 'boolean' ? parsed.useWebSocket : DEFAULT_SETTINGS.useWebSocket,
    backgroundEnabled:
      typeof parsed?.backgroundEnabled === 'boolean'
        ? parsed.backgroundEnabled
        : DEFAULT_SETTINGS.backgroundEnabled,
    trackAllSymbols:
      typeof parsed?.trackAllSymbols === 'boolean'
        ? parsed.trackAllSymbols
        : DEFAULT_SETTINGS.trackAllSymbols,
    themeMode: isThemeMode(parsed?.themeMode) ? parsed.themeMode : DEFAULT_SETTINGS.themeMode,
    symbolRules: parsed?.symbolRules ?? DEFAULT_SETTINGS.symbolRules,
  };
};
