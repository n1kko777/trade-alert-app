import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import {
  ALERTS_STORAGE_KEY,
  BACKGROUND_TASK,
  HISTORY_STORAGE_KEY,
  LAST_ALERT_AT_KEY,
  STORAGE_KEY,
} from '../constants';
import { AlertEvent, PricePoint, Settings } from '../types';
import { fetchAllTickers, fetchFuturesSymbols, fetchTicker } from '../services/bybit';
import { ensureAndroidChannel } from '../services/notifications';
import {
  computeChange,
  normalizeSettings,
  pruneAlertsList,
  pruneHistoryMap,
  resolveSymbolRule,
} from '../utils/data';
import { formatPrice, isWithinQuietHours } from '../utils/format';
import { loadJson } from '../utils/storage';

const isExpoGo = Constants.appOwnership === 'expo' && Platform.OS === 'android';

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    const rawSettings = await AsyncStorage.getItem(STORAGE_KEY);
    let parsedSettings: Partial<Settings> | null = null;
    if (rawSettings) {
      try {
        parsedSettings = JSON.parse(rawSettings) as Partial<Settings>;
      } catch {
        parsedSettings = null;
      }
    }
    const settings = normalizeSettings(parsedSettings);
    if (!settings.backgroundEnabled) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const [history, storedAlerts, lastAlertAt] = await Promise.all([
      loadJson<Record<string, PricePoint[]>>(HISTORY_STORAGE_KEY, {}),
      loadJson<AlertEvent[]>(ALERTS_STORAGE_KEY, []),
      loadJson<Record<string, number>>(LAST_ALERT_AT_KEY, {}),
    ]);

    let futuresSymbols: string[] = [];
    try {
      futuresSymbols = await fetchFuturesSymbols();
    } catch (fetchError) {
      console.warn('Failed to load futures symbols', fetchError);
    }
    const futuresSymbolsSet = new Set(futuresSymbols);
    const filterFuturesSymbols = (symbols: string[]) =>
      futuresSymbolsSet.size ? symbols.filter((symbol) => futuresSymbolsSet.has(symbol)) : symbols;

    const now = Date.now();
    const responses = settings.trackAllSymbols
      ? await fetchAllTickers()
      : await Promise.all(
          filterFuturesSymbols(settings.symbols).map((symbol) => fetchTicker(symbol))
        );
    const filteredResponses =
      settings.trackAllSymbols && futuresSymbolsSet.size
        ? responses.filter(({ symbol }) => futuresSymbolsSet.has(symbol))
        : responses;
    const nextHistory: Record<string, PricePoint[]> = { ...history };
    const newAlerts: AlertEvent[] = [];

    filteredResponses.forEach(({ symbol, price }) => {
      const { thresholdPct, windowMinutes, cooldownMinutes } = resolveSymbolRule(settings, symbol);
      const cutoff = now - windowMinutes * 60 * 1000;
      const historyPoints = [...(nextHistory[symbol] ?? []), { ts: now, price }].filter(
        (point) => point.ts >= cutoff
      );
      nextHistory[symbol] = historyPoints;

      const { changePct } = computeChange(historyPoints, price);
      if (Math.abs(changePct) >= thresholdPct) {
        const lastAlertAtTs = lastAlertAt[symbol] ?? 0;
        if (now - lastAlertAtTs >= cooldownMinutes * 60 * 1000) {
          lastAlertAt[symbol] = now;
          newAlerts.push({
            id: `${symbol}-${now}`,
            symbol,
            changePct,
            price,
            ts: now,
          });
        }
      }
    });

    const prunedHistory = pruneHistoryMap(nextHistory, settings);
    const mergedAlerts = pruneAlertsList(
      [...newAlerts, ...storedAlerts],
      settings.retentionDays,
      settings.maxAlerts
    );

    await Promise.all([
      AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(prunedHistory)),
      AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(mergedAlerts)),
      AsyncStorage.setItem(LAST_ALERT_AT_KEY, JSON.stringify(lastAlertAt)),
    ]);

    if (
      !isExpoGo &&
      settings.notificationsEnabled &&
      newAlerts.length &&
      (!settings.quietHoursEnabled ||
        !isWithinQuietHours(new Date(), settings.quietHoursStart, settings.quietHoursEnd))
    ) {
      try {
        const channelId = await ensureAndroidChannel(settings.notificationSound);
        await Promise.all(
          newAlerts.map((alert) =>
            Notifications.scheduleNotificationAsync({
              content: {
                title: `${alert.symbol} ${alert.changePct >= 0 ? 'Spike' : 'Drop'}`,
                body: `${alert.changePct >= 0 ? '+' : ''}${alert.changePct.toFixed(
                  2
                )}% to $${formatPrice(alert.price)}`,
                sound: settings.notificationSound ? 'default' : false,
                ...(channelId ? { channelId } : {}),
              },
              trigger: null,
            })
          )
        );
      } catch (notificationError) {
        console.warn('Background notification failed', notificationError);
      }
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn('Background task failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
