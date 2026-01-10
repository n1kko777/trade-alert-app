import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as BackgroundTask from 'expo-background-task';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Share, View, useColorScheme } from 'react-native';
import { enableScreens } from 'react-native-screens';
import {
  ALERTS_STORAGE_KEY,
  BACKGROUND_TASK,
  DEFAULT_SETTINGS,
  HISTORY_STORAGE_KEY,
  LAST_ALERT_AT_KEY,
  STORAGE_KEY,
} from './src/constants';
import './src/background/task';
import AlertsScreen from './src/screens/AlertsScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { fetchAllTickers, fetchTicker } from './src/services/bybit';
import { ensureAndroidChannel } from './src/services/notifications';
import createStyles from './src/styles';
import { ThemeProvider } from './src/theme-context';
import { getTheme } from './src/theme';
import { AlertEvent, PricePoint, Quote, Settings, SymbolRuleInputs } from './src/types';
import {
  buildRuleInputs,
  computeChange,
  normalizeSettings,
  pruneAlertsList,
  pruneHistoryMap,
  resolveSymbolRule,
} from './src/utils/data';
import {
  clampInteger,
  clampNumber,
  formatClock,
  formatPrice,
  isWithinQuietHours,
  normalizeTimeInput,
  parseOptionalNumber,
  parseSymbols,
} from './src/utils/format';
import { loadJson } from './src/utils/storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

enableScreens();

const Tab = createBottomTabNavigator();

type Tone = 'good' | 'warn' | 'bad' | 'muted';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SETTINGS.symbols.join(', '));
  const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_SETTINGS.thresholdPct));
  const [windowInput, setWindowInput] = useState(String(DEFAULT_SETTINGS.windowMinutes));
  const [cooldownInput, setCooldownInput] = useState(String(DEFAULT_SETTINGS.cooldownMinutes));
  const [retentionInput, setRetentionInput] = useState(String(DEFAULT_SETTINGS.retentionDays));
  const [maxAlertsInput, setMaxAlertsInput] = useState(String(DEFAULT_SETTINGS.maxAlerts));
  const [pollInput, setPollInput] = useState(String(DEFAULT_SETTINGS.pollIntervalSec));
  const [notificationsInput, setNotificationsInput] = useState(
    DEFAULT_SETTINGS.notificationsEnabled
  );
  const [notificationSoundInput, setNotificationSoundInput] = useState(
    DEFAULT_SETTINGS.notificationSound
  );
  const [trackAllSymbolsInput, setTrackAllSymbolsInput] = useState(
    DEFAULT_SETTINGS.trackAllSymbols
  );
  const [quietHoursEnabledInput, setQuietHoursEnabledInput] = useState(
    DEFAULT_SETTINGS.quietHoursEnabled
  );
  const [quietStartInput, setQuietStartInput] = useState(DEFAULT_SETTINGS.quietHoursStart);
  const [quietEndInput, setQuietEndInput] = useState(DEFAULT_SETTINGS.quietHoursEnd);
  const [useWebSocketInput, setUseWebSocketInput] = useState(DEFAULT_SETTINGS.useWebSocket);
  const [backgroundInput, setBackgroundInput] = useState(DEFAULT_SETTINGS.backgroundEnabled);
  const [themeModeInput, setThemeModeInput] = useState(DEFAULT_SETTINGS.themeMode);
  const [symbolRuleInputs, setSymbolRuleInputs] = useState<SymbolRuleInputs>(() =>
    buildRuleInputs(DEFAULT_SETTINGS.symbols, DEFAULT_SETTINGS.symbolRules)
  );

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [prices, setPrices] = useState<Record<string, PricePoint[]>>({});
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'unknown' | 'granted' | 'denied'>(
    'unknown'
  );
  const [streamStatus, setStreamStatus] = useState<
    'off' | 'connecting' | 'live' | 'reconnecting' | 'error'
  >('off');
  const [backgroundStatus, setBackgroundStatus] = useState<
    'off' | 'on' | 'unavailable' | 'error'
  >('off');

  const systemScheme = useColorScheme();
  const theme = useMemo(
    () => getTheme(themeModeInput, systemScheme),
    [systemScheme, themeModeInput]
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: 'transparent',
      },
    };
  }, [theme.scheme]);

  const pricesRef = useRef(prices);
  const lastAlertAtRef = useRef<Record<string, number>>({});
  const streamStatusRef = useRef(streamStatus);
  const streamRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runtimeLoadedRef = useRef(false);

  const pulse = useRef(new Animated.Value(0)).current;

  const effectiveWebSocket = useMemo(
    () => settings.useWebSocket && !settings.trackAllSymbols,
    [settings.trackAllSymbols, settings.useWebSocket]
  );

  const activeSymbols = useMemo(() => {
    if (!settings.trackAllSymbols) return settings.symbols;
    return allSymbols.length ? allSymbols : settings.symbols;
  }, [allSymbols, settings.symbols, settings.trackAllSymbols]);

  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  useEffect(() => {
    streamStatusRef.current = streamStatus;
  }, [streamStatus]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Settings>;
        if (!parsed) return;
        const loadedSettings = normalizeSettings(parsed);
        const adjustedSettings = loadedSettings.trackAllSymbols
          ? { ...loadedSettings, useWebSocket: false }
          : loadedSettings;
        setSettings(adjustedSettings);
        setSymbolInput(adjustedSettings.symbols.join(', '));
        setThresholdInput(String(adjustedSettings.thresholdPct));
        setWindowInput(String(adjustedSettings.windowMinutes));
        setCooldownInput(String(adjustedSettings.cooldownMinutes));
        setRetentionInput(String(adjustedSettings.retentionDays));
        setMaxAlertsInput(String(adjustedSettings.maxAlerts));
        setPollInput(String(adjustedSettings.pollIntervalSec));
        setNotificationsInput(adjustedSettings.notificationsEnabled);
        setNotificationSoundInput(adjustedSettings.notificationSound);
        setTrackAllSymbolsInput(adjustedSettings.trackAllSymbols);
        setQuietHoursEnabledInput(adjustedSettings.quietHoursEnabled);
        setQuietStartInput(adjustedSettings.quietHoursStart);
        setQuietEndInput(adjustedSettings.quietHoursEnd);
        setUseWebSocketInput(adjustedSettings.useWebSocket);
        setBackgroundInput(adjustedSettings.backgroundEnabled);
        setThemeModeInput(adjustedSettings.themeMode);
        setSymbolRuleInputs(buildRuleInputs(adjustedSettings.symbols, adjustedSettings.symbolRules));
      } catch (storageError) {
        console.warn('Failed to load settings', storageError);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (runtimeLoadedRef.current) return;
    runtimeLoadedRef.current = true;
    const loadRuntimeState = async () => {
      const [rawSettings, storedHistory, storedLastAlertAt] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        loadJson<Record<string, PricePoint[]>>(HISTORY_STORAGE_KEY, {}),
        loadJson<Record<string, number>>(LAST_ALERT_AT_KEY, {}),
      ]);
      let parsedSettings: Partial<Settings> | null = null;
      if (rawSettings) {
        try {
          parsedSettings = JSON.parse(rawSettings) as Partial<Settings>;
        } catch {
          parsedSettings = null;
        }
      }
      const settingsSnapshot = normalizeSettings(parsedSettings);
      lastAlertAtRef.current = storedLastAlertAt;
      const cleaned = pruneHistoryMap(storedHistory, settingsSnapshot);
      setPrices(cleaned);
      pricesRef.current = cleaned;
    };
    loadRuntimeState();
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status === 'granted') {
        setNotificationStatus('granted');
        return true;
      }
      const request = await Notifications.requestPermissionsAsync();
      const granted = request.status === 'granted';
      setNotificationStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch (permissionError) {
      console.warn('Failed to request notification permission', permissionError);
      setNotificationStatus('denied');
      return false;
    }
  }, []);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const existing = await Notifications.getPermissionsAsync();
        if (existing.status === 'granted') {
          setNotificationStatus('granted');
        } else if (existing.status === 'denied') {
          setNotificationStatus('denied');
        } else {
          setNotificationStatus('unknown');
        }
      } catch (permissionError) {
        console.warn('Failed to read notification permission', permissionError);
      }
    };
    checkPermission();
  }, []);

  useEffect(() => {
    if (settings.notificationsEnabled) {
      ensureNotificationPermission();
    }
  }, [ensureNotificationPermission, settings.notificationsEnabled]);

  useEffect(() => {
    const updateBackgroundTask = async () => {
      if (!settings.backgroundEnabled) {
        setBackgroundStatus('off');
        try {
          await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK);
        } catch {
          // ignore if not registered
        }
        return;
      }

      try {
        const status = await BackgroundTask.getStatusAsync();
        if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
          setBackgroundStatus('unavailable');
          return;
        }
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
        if (isRegistered) {
          await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK);
        }
        await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, {
          minimumInterval: Math.max(300, settings.pollIntervalSec),
        });
        setBackgroundStatus('on');
      } catch (backgroundError) {
        console.warn('Background task registration failed', backgroundError);
        setBackgroundStatus('error');
      }
    };

    updateBackgroundTask();
  }, [settings.backgroundEnabled, settings.pollIntervalSec]);

  const persistRuntimeState = useCallback(
    (history?: Record<string, PricePoint[]>) => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(async () => {
        try {
          const pruned = pruneHistoryMap(history ?? pricesRef.current, settings);
          await Promise.all([
            AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(pruned)),
            AsyncStorage.setItem(LAST_ALERT_AT_KEY, JSON.stringify(lastAlertAtRef.current)),
          ]);
        } catch (storageError) {
          console.warn('Failed to persist runtime state', storageError);
        }
      }, 1200);
    },
    [settings]
  );

  useEffect(() => {
    setPrices((prev) => {
      const cleaned = pruneHistoryMap(prev, settings);
      pricesRef.current = cleaned;
      return cleaned;
    });
    const symbols = settings.trackAllSymbols
      ? Object.keys(pricesRef.current)
      : settings.symbols;
    lastAlertAtRef.current = symbols.reduce<Record<string, number>>((acc, symbol) => {
      const ts = lastAlertAtRef.current[symbol];
      if (typeof ts === 'number') {
        acc[symbol] = ts;
      }
      return acc;
    }, {});
    persistRuntimeState();
  }, [persistRuntimeState, settings]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [rawAlerts, rawSettings] = await Promise.all([
          AsyncStorage.getItem(ALERTS_STORAGE_KEY),
          AsyncStorage.getItem(STORAGE_KEY),
        ]);
        if (!rawAlerts) return;
        let parsedSettings: Partial<Settings> | null = null;
        if (rawSettings) {
          try {
            parsedSettings = JSON.parse(rawSettings) as Partial<Settings>;
          } catch {
            parsedSettings = null;
          }
        }
        const settingsSnapshot = normalizeSettings(parsedSettings);
        const parsed = JSON.parse(rawAlerts);
        if (!Array.isArray(parsed)) return;
        const cleaned = parsed.filter(
          (item) =>
            item &&
            typeof item.symbol === 'string' &&
            typeof item.changePct === 'number' &&
            typeof item.price === 'number' &&
            typeof item.ts === 'number'
        ) as AlertEvent[];
        setAlerts(
          pruneAlertsList(cleaned, settingsSnapshot.retentionDays, settingsSnapshot.maxAlerts)
        );
      } catch (storageError) {
        console.warn('Failed to load alerts', storageError);
      }
    };
    loadAlerts();
  }, []);

  useEffect(() => {
    setAlerts((prev) => pruneAlertsList(prev, settings.retentionDays, settings.maxAlerts));
  }, [settings.maxAlerts, settings.retentionDays]);

  useEffect(() => {
    const persistAlerts = async () => {
      try {
        await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
      } catch (storageError) {
        console.warn('Failed to store alerts', storageError);
      }
    };
    persistAlerts();
  }, [alerts]);

  useEffect(() => {
    if (settings.trackAllSymbols) {
      setAllSymbols([]);
    }
  }, [settings.trackAllSymbols]);

  const saveSettings = useCallback(async (nextSettings: Settings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    } catch (storageError) {
      console.warn('Failed to save settings', storageError);
    }
  }, []);

  const applySettings = useCallback(() => {
    const symbols = parseSymbols(symbolInput);
    const thresholdPct = clampNumber(thresholdInput, 1, 25, DEFAULT_SETTINGS.thresholdPct);
    const windowMinutes = clampNumber(windowInput, 1, 30, DEFAULT_SETTINGS.windowMinutes);
    const cooldownMinutes = clampNumber(cooldownInput, 1, 60, DEFAULT_SETTINGS.cooldownMinutes);
    const retentionDays = clampInteger(retentionInput, 1, 30, DEFAULT_SETTINGS.retentionDays);
    const maxAlerts = clampInteger(maxAlertsInput, 20, 500, DEFAULT_SETTINGS.maxAlerts);
    const pollIntervalSec = clampNumber(pollInput, 10, 300, DEFAULT_SETTINGS.pollIntervalSec);
    const trackAllSymbols = trackAllSymbolsInput;
    const useWebSocket = trackAllSymbols ? false : useWebSocketInput;
    const quietHoursStart = normalizeTimeInput(
      quietStartInput,
      DEFAULT_SETTINGS.quietHoursStart
    );
    const quietHoursEnd = normalizeTimeInput(
      quietEndInput,
      DEFAULT_SETTINGS.quietHoursEnd
    );
    const nextSymbols = symbols.length ? symbols : DEFAULT_SETTINGS.symbols;
    const nextSymbolRules: Settings['symbolRules'] = {};

    nextSymbols.forEach((symbol) => {
      const input = symbolRuleInputs[symbol];
      if (!input) return;
      const thresholdOverride = input.threshold.trim().length
        ? parseOptionalNumber(input.threshold, 1, 25)
        : undefined;
      const windowOverride = input.window.trim().length
        ? parseOptionalNumber(input.window, 1, 30)
        : undefined;
      const cooldownOverride = input.cooldown.trim().length
        ? parseOptionalNumber(input.cooldown, 1, 60)
        : undefined;
      if (
        typeof thresholdOverride === 'number' ||
        typeof windowOverride === 'number' ||
        typeof cooldownOverride === 'number'
      ) {
        nextSymbolRules[symbol] = {
          thresholdPct: thresholdOverride,
          windowMinutes: windowOverride,
          cooldownMinutes: cooldownOverride,
        };
      }
    });

    const nextSettings: Settings = {
      symbols: nextSymbols,
      thresholdPct,
      windowMinutes,
      cooldownMinutes,
      retentionDays,
      maxAlerts,
      pollIntervalSec,
      notificationsEnabled: notificationsInput,
      notificationSound: notificationSoundInput,
      quietHoursEnabled: quietHoursEnabledInput,
      quietHoursStart,
      quietHoursEnd,
      useWebSocket,
      backgroundEnabled: backgroundInput,
      trackAllSymbols,
      themeMode: themeModeInput,
      symbolRules: trackAllSymbols ? {} : nextSymbolRules,
    };

    setSettings(nextSettings);
    setSymbolInput(nextSettings.symbols.join(', '));
    setThresholdInput(String(nextSettings.thresholdPct));
    setWindowInput(String(nextSettings.windowMinutes));
    setCooldownInput(String(nextSettings.cooldownMinutes));
    setRetentionInput(String(nextSettings.retentionDays));
    setMaxAlertsInput(String(nextSettings.maxAlerts));
    setPollInput(String(nextSettings.pollIntervalSec));
    setNotificationsInput(nextSettings.notificationsEnabled);
    setNotificationSoundInput(nextSettings.notificationSound);
    setTrackAllSymbolsInput(nextSettings.trackAllSymbols);
    setQuietHoursEnabledInput(nextSettings.quietHoursEnabled);
    setQuietStartInput(nextSettings.quietHoursStart);
    setQuietEndInput(nextSettings.quietHoursEnd);
    setUseWebSocketInput(nextSettings.useWebSocket);
    setBackgroundInput(nextSettings.backgroundEnabled);
    setThemeModeInput(nextSettings.themeMode);
    setSymbolRuleInputs(buildRuleInputs(nextSettings.symbols, nextSettings.symbolRules));
    saveSettings(nextSettings);
  }, [
    backgroundInput,
    cooldownInput,
    maxAlertsInput,
    notificationsInput,
    notificationSoundInput,
    pollInput,
    quietEndInput,
    quietHoursEnabledInput,
    quietStartInput,
    retentionInput,
    saveSettings,
    symbolInput,
    symbolRuleInputs,
    trackAllSymbolsInput,
    themeModeInput,
    thresholdInput,
    useWebSocketInput,
    windowInput,
  ]);

  const updateSymbolRuleInput = useCallback(
    (symbol: string, field: 'threshold' | 'window' | 'cooldown', value: string) => {
      setSymbolRuleInputs((prev) => ({
        ...prev,
        [symbol]: {
          ...prev[symbol],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleTrackAllSymbolsToggle = useCallback((value: boolean) => {
    setTrackAllSymbolsInput(value);
    if (value) {
      setUseWebSocketInput(false);
    }
  }, []);

  const scheduleAlertNotification = useCallback(
    async (alert: AlertEvent) => {
      if (!settings.notificationsEnabled) return;
      if (
        settings.quietHoursEnabled &&
        isWithinQuietHours(new Date(), settings.quietHoursStart, settings.quietHoursEnd)
      ) {
        return;
      }
      const granted = await ensureNotificationPermission();
      if (!granted) return;
      const direction = alert.changePct >= 0 ? 'Spike' : 'Drop';
      const body = `${alert.changePct >= 0 ? '+' : ''}${alert.changePct.toFixed(
        2
      )}% to $${formatPrice(alert.price)}`;
      const channelId = await ensureAndroidChannel(settings.notificationSound);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${alert.symbol} ${direction}`,
          body,
          sound: settings.notificationSound ? 'default' : null,
          ...(channelId ? { channelId } : null),
        },
        trigger: null,
      });
    },
    [
      ensureNotificationPermission,
      settings.notificationsEnabled,
      settings.notificationSound,
      settings.quietHoursEnabled,
      settings.quietHoursEnd,
      settings.quietHoursStart,
    ]
  );

  const applyPriceTick = useCallback(
    (
      symbol: string,
      price: number,
      now: number,
      nextPrices: Record<string, PricePoint[]>,
      nextQuotes: Record<string, Quote>,
      newAlerts: AlertEvent[]
    ) => {
      const { thresholdPct, windowMinutes, cooldownMinutes } = resolveSymbolRule(settings, symbol);
      const cutoff = now - windowMinutes * 60 * 1000;
      const coolDown = Math.max(60_000, cooldownMinutes * 60_000);
      const history = [...(nextPrices[symbol] ?? []), { ts: now, price }];
      const pruned = history.filter((point) => point.ts >= cutoff);
      nextPrices[symbol] = pruned;

      const { changePct, direction } = computeChange(pruned, price);

      nextQuotes[symbol] = {
        price,
        changePct,
        direction,
        lastUpdated: now,
      };

      if (Math.abs(changePct) >= thresholdPct) {
        const lastAlertAt = lastAlertAtRef.current[symbol] ?? 0;
        if (now - lastAlertAt > coolDown) {
          lastAlertAtRef.current[symbol] = now;
          newAlerts.push({
            id: `${symbol}-${now}`,
            symbol,
            changePct,
            price,
            ts: now,
          });
        }
      }
    },
    [settings]
  );

  const handleStreamTick = useCallback(
    (symbol: string, price: number, now: number) => {
      const nextPrices: Record<string, PricePoint[]> = { ...pricesRef.current };
      const nextQuotes: Record<string, Quote> = {};
      const newAlerts: AlertEvent[] = [];
      applyPriceTick(symbol, price, now, nextPrices, nextQuotes, newAlerts);
      pricesRef.current = nextPrices;
      setPrices(nextPrices);
      setQuotes((prev) => ({ ...prev, ...nextQuotes }));
      persistRuntimeState(nextPrices);
      if (newAlerts.length) {
        setAlerts((prev) =>
          pruneAlertsList([...newAlerts, ...prev], settings.retentionDays, settings.maxAlerts)
        );
        newAlerts.forEach((alert) => {
          void scheduleAlertNotification(alert);
        });
      }
      setLastUpdated(now);
      setIsLoading(false);
      setError(null);
    },
    [
      applyPriceTick,
      persistRuntimeState,
      scheduleAlertNotification,
      settings.maxAlerts,
      settings.retentionDays,
    ]
  );

  const fetchAllQuotes = useCallback(async () => {
    if (!settings.symbols.length && !settings.trackAllSymbols) return;
    setError(null);
    const now = Date.now();
    try {
      const responses = settings.trackAllSymbols
        ? await fetchAllTickers()
        : await Promise.all(settings.symbols.map((symbol) => fetchTicker(symbol)));
      if (settings.trackAllSymbols) {
        const nextSymbols = responses.map((entry) => entry.symbol);
        setAllSymbols((prev) =>
          prev.length === nextSymbols.length && prev.every((item, idx) => item === nextSymbols[idx])
            ? prev
            : nextSymbols
        );
      }
      const nextPrices: Record<string, PricePoint[]> = { ...pricesRef.current };
      const nextQuotes: Record<string, Quote> = {};
      const nextAlerts: AlertEvent[] = [];

      responses.forEach(({ symbol, price }) => {
        applyPriceTick(symbol, price, now, nextPrices, nextQuotes, nextAlerts);
      });

      pricesRef.current = nextPrices;
      setPrices(nextPrices);
      setQuotes((prev) => ({ ...prev, ...nextQuotes }));
      persistRuntimeState(nextPrices);
      if (nextAlerts.length) {
        setAlerts((prev) =>
          pruneAlertsList([...nextAlerts, ...prev], settings.retentionDays, settings.maxAlerts)
        );
        nextAlerts.forEach((alert) => {
          void scheduleAlertNotification(alert);
        });
      }
      setLastUpdated(now);
      setIsLoading(false);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unexpected API error');
      setIsLoading(false);
    }
  }, [
    applyPriceTick,
    settings.trackAllSymbols,
    persistRuntimeState,
    scheduleAlertNotification,
    settings.maxAlerts,
    settings.retentionDays,
    settings.symbols,
  ]);

  useEffect(() => {
    const poll = () => {
      if (!effectiveWebSocket || streamStatusRef.current !== 'live') {
        fetchAllQuotes();
      }
    };
    poll();
    const interval = setInterval(poll, settings.pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [effectiveWebSocket, fetchAllQuotes, settings.pollIntervalSec]);

  useEffect(() => {
    if (!effectiveWebSocket) {
      setStreamStatus('off');
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      return;
    }

    let active = true;
    let retries = 0;

    const clearReconnect = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    const disconnect = () => {
      clearReconnect();
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };

    const connect = () => {
      if (!active) return;
      setStreamStatus(retries ? 'reconnecting' : 'connecting');
      const ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
      streamRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        setStreamStatus('live');
        retries = 0;
        const args = settings.symbols.map((symbol) => `tickers.${symbol}`);
        ws.send(JSON.stringify({ op: 'subscribe', args }));
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.op === 'ping') {
            ws.send(JSON.stringify({ op: 'pong' }));
            return;
          }
          const data = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
          if (!data) return;
          const symbol =
            data.symbol ??
            (typeof payload?.topic === 'string' ? payload.topic.split('.')[1] : undefined);
          const price = Number(data.lastPrice);
          if (!symbol || !Number.isFinite(price)) return;
          handleStreamTick(symbol, price, Date.now());
        } catch (messageError) {
          console.warn('Stream parse error', messageError);
        }
      };

      ws.onerror = () => {
        if (!active) return;
        setStreamStatus('error');
      };

      ws.onclose = () => {
        if (!active) return;
        setStreamStatus('reconnecting');
        const delay = Math.min(15000, 1000 * 2 ** retries);
        retries += 1;
        clearReconnect();
        reconnectRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      active = false;
      disconnect();
    };
  }, [effectiveWebSocket, handleStreamTick, settings.symbols]);

  const healthLabel = useMemo(() => {
    if (error) return 'Degraded';
    if (isLoading) return 'Syncing';
    return 'Live';
  }, [error, isLoading]);

  const alertLabel = useMemo(() => {
    if (!alerts.length) return 'No alerts yet';
    return `${alerts.length} recent alerts`;
  }, [alerts.length]);

  const notificationLabel = useMemo(() => {
    if (!settings.notificationsEnabled) return 'Notifications off';
    const soundLabel = settings.notificationSound ? 'Sound on' : 'Silent';
    if (notificationStatus === 'granted') return `Notifications on • ${soundLabel}`;
    if (notificationStatus === 'denied') return 'Notifications blocked';
    return 'Notifications checking';
  }, [notificationStatus, settings.notificationSound, settings.notificationsEnabled]);

  const quietLabel = useMemo(() => {
    if (!settings.quietHoursEnabled) return 'Quiet hours off';
    return `Quiet ${settings.quietHoursStart}-${settings.quietHoursEnd}`;
  }, [settings.quietHoursEnabled, settings.quietHoursEnd, settings.quietHoursStart]);

  const streamLabel = useMemo(() => {
    if (settings.trackAllSymbols) return 'All coins polling';
    if (!effectiveWebSocket) return 'Polling mode';
    if (streamStatus === 'live') return 'WebSocket live';
    if (streamStatus === 'connecting') return 'WebSocket connecting';
    if (streamStatus === 'reconnecting') return 'Reconnecting stream';
    if (streamStatus === 'error') return 'Stream error';
    return 'Stream idle';
  }, [effectiveWebSocket, settings.trackAllSymbols, streamStatus]);

  const backgroundLabel = useMemo(() => {
    if (!settings.backgroundEnabled) return 'Background off';
    if (backgroundStatus === 'on') return 'Background on';
    if (backgroundStatus === 'unavailable') return 'Background unavailable';
    if (backgroundStatus === 'error') return 'Background error';
    return 'Background idle';
  }, [backgroundStatus, settings.backgroundEnabled]);

  const lastSyncLabel = useMemo(
    () => `Last sync ${formatClock(lastUpdated ?? undefined)}`,
    [lastUpdated]
  );

  const healthTone: Tone = error ? 'bad' : isLoading ? 'warn' : 'good';
  const notificationTone: Tone = !settings.notificationsEnabled
    ? 'muted'
    : notificationStatus === 'granted'
    ? 'good'
    : notificationStatus === 'denied'
    ? 'bad'
    : 'warn';
  const streamTone: Tone = settings.trackAllSymbols
    ? 'muted'
    : !effectiveWebSocket
    ? 'muted'
    : streamStatus === 'live'
    ? 'good'
    : streamStatus === 'error'
    ? 'bad'
    : 'warn';
  const backgroundTone: Tone = !settings.backgroundEnabled
    ? 'muted'
    : backgroundStatus === 'on'
    ? 'good'
    : backgroundStatus === 'error' || backgroundStatus === 'unavailable'
    ? 'bad'
    : 'warn';
  const quietTone: Tone = settings.quietHoursEnabled ? 'warn' : 'muted';

  const watchSymbols = useMemo(() => {
    if (!settings.trackAllSymbols) return settings.symbols;
    const sorted = [...activeSymbols].sort((a, b) => {
      const changeA = Math.abs(quotes[a]?.changePct ?? 0);
      const changeB = Math.abs(quotes[b]?.changePct ?? 0);
      return changeB - changeA;
    });
    return sorted.slice(0, 12);
  }, [activeSymbols, quotes, settings.symbols, settings.trackAllSymbols]);

  const watchlistTitle = settings.trackAllSymbols ? 'Top movers' : 'Watchlist';
  const watchlistSubtitle = settings.trackAllSymbols
    ? activeSymbols.length
      ? `${watchSymbols.length} of ${activeSymbols.length} coins`
      : 'Loading coins...'
    : `${settings.symbols.length} symbols`;

  const exportAlerts = useCallback(async () => {
    if (!alerts.length) return;
    const header = 'symbol,changePct,price,time';
    const lines = alerts.map((alert) => {
      const change = `${alert.changePct >= 0 ? '+' : ''}${alert.changePct.toFixed(2)}`;
      return `${alert.symbol},${change},${formatPrice(alert.price)},${new Date(
        alert.ts
      ).toISOString()}`;
    });
    try {
      await Share.share({
        title: 'Trade alerts',
        message: [header, ...lines].join('\n'),
      });
    } catch (shareError) {
      console.warn('Failed to export alerts', shareError);
    }
  }, [alerts]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    lastAlertAtRef.current = {};
    persistRuntimeState();
  }, [persistRuntimeState]);

  const alertsBadge = alerts.length ? Math.min(alerts.length, 99) : undefined;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <SafeAreaProvider>
        <LinearGradient
          colors={[theme.colors.appBackground, theme.colors.appBackgroundAlt]}
          style={styles.app}
        >
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
          <View style={styles.orbLarge} />
          <View style={styles.orbSmall} />
          <SafeAreaView style={styles.safe} edges={['top']}>
            <NavigationContainer theme={navTheme}>
              <Tab.Navigator
                sceneContainerStyle={{ backgroundColor: 'transparent' }}
                screenOptions={({ route }) => ({
                  headerShown: false,
                  tabBarStyle: styles.tabBar,
                  tabBarLabelStyle: styles.tabBarLabel,
                  tabBarActiveTintColor: theme.colors.tabBarActive,
                  tabBarInactiveTintColor: theme.colors.tabBarInactive,
                  tabBarHideOnKeyboard: true,
                  tabBarIcon: ({ color, size, focused }) => {
                    const iconName =
                      route.name === 'Dashboard'
                        ? focused
                          ? 'stats-chart'
                          : 'stats-chart-outline'
                        : route.name === 'Alerts'
                        ? focused
                          ? 'notifications'
                          : 'notifications-outline'
                        : focused
                        ? 'settings'
                        : 'settings-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                  },
                })}
              >
                <Tab.Screen name="Dashboard" options={{ tabBarLabel: 'Overview' }}>
                  {() => (
                    <DashboardScreen
                      settings={settings}
                      quotes={quotes}
                      prices={prices}
                      watchSymbols={watchSymbols}
                      watchlistTitle={watchlistTitle}
                      watchlistSubtitle={watchlistSubtitle}
                      healthLabel={healthLabel}
                      lastSyncLabel={lastSyncLabel}
                      error={error}
                      notificationLabel={notificationLabel}
                      streamLabel={streamLabel}
                      backgroundLabel={backgroundLabel}
                      quietLabel={quietLabel}
                      healthTone={healthTone}
                      notificationTone={notificationTone}
                      streamTone={streamTone}
                      backgroundTone={backgroundTone}
                      quietTone={quietTone}
                      pulse={pulse}
                    />
                  )}
                </Tab.Screen>
                <Tab.Screen
                  name="Alerts"
                  options={{
                    tabBarBadge: alertsBadge,
                    tabBarBadgeStyle: styles.tabBarBadge,
                  }}
                >
                  {() => (
                    <AlertsScreen
                      alerts={alerts}
                      alertLabel={alertLabel}
                      onExport={exportAlerts}
                      onClear={clearAlerts}
                    />
                  )}
                </Tab.Screen>
                <Tab.Screen name="Settings" options={{ tabBarLabel: 'Settings' }}>
                  {() => (
                    <SettingsScreen
                      settings={settings}
                      symbolInput={symbolInput}
                      thresholdInput={thresholdInput}
                      windowInput={windowInput}
                      cooldownInput={cooldownInput}
                      retentionInput={retentionInput}
                      maxAlertsInput={maxAlertsInput}
                      pollInput={pollInput}
                      notificationsInput={notificationsInput}
                      notificationSoundInput={notificationSoundInput}
                      trackAllSymbolsInput={trackAllSymbolsInput}
                      quietHoursEnabledInput={quietHoursEnabledInput}
                      quietStartInput={quietStartInput}
                      quietEndInput={quietEndInput}
                      useWebSocketInput={useWebSocketInput}
                      backgroundInput={backgroundInput}
                      themeModeInput={themeModeInput}
                      symbolRuleInputs={symbolRuleInputs}
                      notificationStatus={notificationStatus}
                      backgroundStatus={backgroundStatus}
                      onSymbolChange={setSymbolInput}
                      onThresholdChange={setThresholdInput}
                      onWindowChange={setWindowInput}
                      onCooldownChange={setCooldownInput}
                      onRetentionChange={setRetentionInput}
                      onMaxAlertsChange={setMaxAlertsInput}
                      onPollChange={setPollInput}
                      onNotificationsToggle={setNotificationsInput}
                      onNotificationSoundToggle={setNotificationSoundInput}
                      onTrackAllSymbolsToggle={handleTrackAllSymbolsToggle}
                      onQuietHoursToggle={setQuietHoursEnabledInput}
                      onQuietStartChange={setQuietStartInput}
                      onQuietEndChange={setQuietEndInput}
                      onWebSocketToggle={setUseWebSocketInput}
                      onBackgroundToggle={setBackgroundInput}
                      onThemeModeChange={setThemeModeInput}
                      onRuleChange={updateSymbolRuleInput}
                      onApply={applySettings}
                    />
                  )}
                </Tab.Screen>
              </Tab.Navigator>
            </NavigationContainer>
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
