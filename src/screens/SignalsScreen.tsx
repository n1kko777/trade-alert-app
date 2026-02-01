import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme-context';
import type { RootStackParamList } from '../navigation/types';
import { useIsOffline } from '../context/NetworkContext';
import { useSignals } from '../hooks/useWebSocket';
import { cacheSignals, getCachedSignals } from '../utils/offlineCache';
import { signalsApi } from '../api';
import type { Signal, SignalStats } from '../services/signals/types';
import type { SignalData } from '../services/websocket';
import type { ApiSignal } from '../api/types';
import SignalCard from '../components/SignalCard';

type TabType = 'active' | 'history';

interface SignalFilter {
  symbol?: string;
  exchange?: string;
  direction?: 'BUY' | 'SELL';
}

// Map SignalData from WebSocket to local Signal format
function mapSignalDataToSignal(data: SignalData): Signal {
  return {
    id: data.id,
    symbol: data.symbol,
    exchange: 'binance' as const, // Default exchange
    direction: data.direction.toUpperCase() as 'BUY' | 'SELL',
    entryPrice: data.entryPrice,
    currentPrice: data.entryPrice, // Use entry as current for now
    takeProfit: [
      { price: data.targetPrice, percentage: ((data.targetPrice - data.entryPrice) / data.entryPrice) * 100, hit: false },
    ],
    stopLoss: data.stopLoss,
    stopLossPercentage: ((data.entryPrice - data.stopLoss) / data.entryPrice) * 100,
    status: data.status as 'active' | 'pending' | 'closed',
    createdAt: new Date(data.createdAt).getTime(),
    updatedAt: Date.now(),
    aiTriggers: [
      { name: 'Trend Analysis', confirmed: data.confidence > 60, weight: 0.2 },
      { name: 'Volume Confirmation', confirmed: data.confidence > 50, weight: 0.15 },
      { name: 'Support/Resistance', confirmed: data.confidence > 70, weight: 0.2 },
      { name: 'Momentum Indicator', confirmed: data.confidence > 55, weight: 0.15 },
      { name: 'Market Sentiment', confirmed: data.confidence > 65, weight: 0.15 },
      { name: 'Whale Activity', confirmed: data.confidence > 75, weight: 0.15 },
    ],
    confidence: data.confidence,
  };
}

interface SignalsScreenProps {
  isPro?: boolean;
  onUpgrade?: () => void;
}

// Map API signal to local Signal format
function mapApiSignalToSignal(apiSignal: ApiSignal): Signal {
  return {
    id: apiSignal.id,
    symbol: apiSignal.symbol,
    exchange: 'binance' as const,
    direction: apiSignal.direction.toUpperCase() as 'BUY' | 'SELL',
    entryPrice: apiSignal.entryPrice,
    currentPrice: apiSignal.entryPrice,
    takeProfit: [
      { price: apiSignal.targetPrice, percentage: ((apiSignal.targetPrice - apiSignal.entryPrice) / apiSignal.entryPrice) * 100, hit: false },
    ],
    stopLoss: apiSignal.stopLoss,
    stopLossPercentage: ((apiSignal.entryPrice - apiSignal.stopLoss) / apiSignal.entryPrice) * 100,
    status: apiSignal.status as 'active' | 'pending' | 'closed',
    createdAt: new Date(apiSignal.createdAt).getTime(),
    updatedAt: Date.now(),
    aiTriggers: [
      { name: 'Trend Analysis', confirmed: apiSignal.confidence > 60, weight: 0.2 },
      { name: 'Volume Confirmation', confirmed: apiSignal.confidence > 50, weight: 0.15 },
      { name: 'Support/Resistance', confirmed: apiSignal.confidence > 70, weight: 0.2 },
      { name: 'Momentum Indicator', confirmed: apiSignal.confidence > 55, weight: 0.15 },
      { name: 'Market Sentiment', confirmed: apiSignal.confidence > 65, weight: 0.15 },
      { name: 'Whale Activity', confirmed: apiSignal.confidence > 75, weight: 0.15 },
    ],
    confidence: apiSignal.confidence,
  };
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignalsScreen({ isPro = false, onUpgrade }: SignalsScreenProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const isOffline = useIsOffline();
  const { signals: signalData, isConnected } = useSignals();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [filter, setFilter] = useState<SignalFilter>({});
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cachedSignals, setCachedSignals] = useState<Signal[]>([]);
  const [isStaleData, setIsStaleData] = useState(false);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const lastCachedRef = useRef<number>(0);

  // Load cached signals on mount and when offline
  useEffect(() => {
    const loadCachedSignals = async () => {
      const cached = await getCachedSignals();
      if (cached) {
        setCachedSignals(cached.data.map(mapApiSignalToSignal));
        setCachedAt(cached.cachedAt);
      }
    };
    loadCachedSignals();
  }, []);

  // Cache signals when we have fresh data (debounced)
  useEffect(() => {
    if (signalData.length > 0 && !isOffline) {
      const now = Date.now();
      // Only cache every 30 seconds to avoid excessive writes
      if (now - lastCachedRef.current > 30000) {
        lastCachedRef.current = now;
        // Convert SignalData to ApiSignal format for caching
        const apiSignals: ApiSignal[] = signalData.map(s => ({
          id: s.id,
          symbol: s.symbol,
          direction: s.direction as 'buy' | 'sell',
          entryPrice: s.entryPrice,
          targetPrice: s.targetPrice,
          stopLoss: s.stopLoss,
          confidence: s.confidence,
          minTier: 'free' as const,
          status: s.status as 'active' | 'closed' | 'expired',
          reason: 'AI Signal',
          createdAt: s.createdAt,
        }));
        cacheSignals(apiSignals);
        setIsStaleData(false);
      }
    }
  }, [signalData, isOffline]);

  // Map WebSocket data to Signal format, use cached if offline
  const signals = useMemo(() => {
    if (isOffline && signalData.length === 0) {
      setIsStaleData(cachedSignals.length > 0);
      return cachedSignals;
    }
    setIsStaleData(false);
    return signalData.map(mapSignalDataToSignal);
  }, [signalData, isOffline, cachedSignals]);

  // Calculate stats from signals
  const stats: SignalStats | null = useMemo(() => {
    if (signals.length === 0) return null;

    const closedSignals = signals.filter(s => s.status === 'closed');
    const activeSignals = signals.filter(s => s.status === 'active' || s.status === 'pending');
    const winningSignals = closedSignals.filter(s => (s.profit ?? 0) > 0);

    return {
      totalSignals: signals.length,
      activeSignals: activeSignals.length,
      closedSignals: closedSignals.length,
      winningSignals: winningSignals.length,
      losingSignals: closedSignals.length - winningSignals.length,
      winRate: closedSignals.length > 0 ? (winningSignals.length / closedSignals.length) * 100 : 0,
      totalProfit: closedSignals.reduce((sum, s) => sum + (s.profit ?? 0), 0),
      avgProfit: closedSignals.length > 0 ? closedSignals.reduce((sum, s) => sum + (s.profit ?? 0), 0) / closedSignals.length : 0,
      avgWin: winningSignals.length > 0 ? winningSignals.reduce((sum, s) => sum + (s.profit ?? 0), 0) / winningSignals.length : 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      profitFactor: 0,
      avgHoldingTime: 0,
    };
  }, [signals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // WebSocket data refreshes automatically
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  const filteredSignals = useMemo(() => {
    let result = signals;

    // Filter by tab
    if (activeTab === 'active') {
      result = result.filter(s => s.status === 'active' || s.status === 'pending');
    } else {
      result = result.filter(s => s.status === 'closed');
    }

    // Apply search/symbol filter
    if (searchText) {
      result = result.filter(s =>
        s.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
        s.exchange.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply other filters
    if (filter.exchange) {
      result = result.filter(s => s.exchange === filter.exchange);
    }
    if (filter.direction) {
      result = result.filter(s => s.direction === filter.direction);
    }

    return result;
  }, [signals, activeTab, searchText, filter]);

  // Limit signals for free users
  const displayedSignals = useMemo(() => {
    if (isPro) return filteredSignals;
    return filteredSignals.slice(0, 3);
  }, [filteredSignals, isPro]);

  const handleSignalPress = useCallback((signal: Signal) => {
    navigation.navigate('SignalDetail', { signalId: signal.id });
  }, [navigation]);

  const renderSignal = useCallback(({ item }: { item: Signal }) => (
    <SignalCard signal={item} onPress={handleSignalPress} />
  ), [handleSignalPress]);

  const keyExtractor = useCallback((item: Signal) => item.id, []);

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={[styles.statsCard, { backgroundColor: theme.colors.panel }]}>
        <Text style={[styles.statsTitle, { color: theme.colors.textPrimary }]}>
          Статистика
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Винрейт</Text>
            <Text style={[
              styles.statValue,
              { color: stats.winRate >= 50 ? theme.colors.changeUpText : theme.colors.changeDownText }
            ]}>
              {stats.winRate.toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Всего сигналов</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {stats.totalSignals}
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Ср. прибыль</Text>
            <Text style={[
              styles.statValue,
              { color: stats.avgProfit >= 0 ? theme.colors.changeUpText : theme.colors.changeDownText }
            ]}>
              {stats.avgProfit >= 0 ? '+' : ''}{stats.avgProfit.toFixed(2)}%
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Общая прибыль</Text>
            <Text style={[
              styles.statValue,
              { color: stats.totalProfit >= 0 ? theme.colors.changeUpText : theme.colors.changeDownText }
            ]}>
              {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderProGate = () => {
    if (isPro) return null;

    return (
      <View style={[styles.proGate, { backgroundColor: theme.colors.panel }]}>
        <View style={[styles.proBadge, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
        <Text style={[styles.proTitle, { color: theme.colors.textPrimary }]}>
          Разблокировать все сигналы
        </Text>
        <Text style={[styles.proDescription, { color: theme.colors.textSecondary }]}>
          Получите неограниченный доступ ко всем торговым сигналам, расширенным фильтрам и уведомлениям в реальном времени.
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: theme.colors.accent }]}
          onPress={onUpgrade}
        >
          <Text style={styles.upgradeButtonText}>Перейти на Pro</Text>
        </TouchableOpacity>
        <Text style={[styles.limitText, { color: theme.colors.textMuted }]}>
          Показано {displayedSignals.length} из {filteredSignals.length} сигналов
        </Text>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, { backgroundColor: theme.colors.input }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'active' && { backgroundColor: theme.colors.accent }
        ]}
        onPress={() => setActiveTab('active')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'active' ? theme.colors.buttonText : theme.colors.textMuted }
        ]}>
          Активные ({signals.filter(s => s.status !== 'closed').length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'history' && { backgroundColor: theme.colors.accent }
        ]}
        onPress={() => setActiveTab('history')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'history' ? theme.colors.buttonText : theme.colors.textMuted }
        ]}>
          История ({signals.filter(s => s.status === 'closed').length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {renderStatsCard()}
      {renderTabs()}
      <View style={styles.filterRow}>
        <TextInput
          style={[styles.searchInput, {
            backgroundColor: theme.colors.input,
            color: theme.colors.textPrimary,
          }]}
          placeholder="Поиск по символу или бирже..."
          placeholderTextColor={theme.colors.textPlaceholder}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {activeTab === 'active'
          ? 'Нет активных сигналов. Новые сигналы скоро появятся...'
          : 'История сигналов пуста.'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (isPro || displayedSignals.length === filteredSignals.length) return null;
    return renderProGate();
  };

  const formatCacheTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    return `${Math.floor(diffHours / 24)} дней назад`;
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        Сигналы
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        AI-сигналы с подтверждением по 6 триггерам
      </Text>

      {/* Stale Data Indicator */}
      {isStaleData && (
        <View style={[styles.staleBanner, { backgroundColor: theme.colors.warning }]}>
          <Text style={[styles.staleBannerText, { color: '#000' }]}>
            Показаны кэшированные сигналы от {formatCacheTime(cachedAt)}
          </Text>
        </View>
      )}

      <FlatList
        data={displayedSignals}
        renderItem={renderSignal}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
        initialNumToRender={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  header: {
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  proGate: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  proTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  proDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  limitText: {
    fontSize: 12,
  },
  staleBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staleBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
