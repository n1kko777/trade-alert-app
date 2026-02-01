import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme-context';
import { useAuth } from '../context/AuthContext';
import PortfolioSummary from '../components/PortfolioSummary';
import HotCoins from '../components/HotCoins';
import ActiveSignals from '../components/ActiveSignals';
import type { RootStackParamList } from '../navigation/types';
import type { Ticker } from '../services/exchanges/types';
import type { Signal } from '../services/signals/types';
import { useAllTickers, useSignals } from '../hooks/useWebSocket';
import type { TickerData, SignalData } from '../services/websocket';
import { portfolioApi } from '../api';

// Map WebSocket ticker to local Ticker format
function mapTickerData(data: TickerData): Ticker {
  // change24h from API is already a percentage, not absolute value
  const changePercent = data.change24h;
  const previousPrice = data.price / (1 + changePercent / 100);
  const absoluteChange = data.price - previousPrice;
  return {
    symbol: data.symbol,
    price: data.price,
    priceChange24h: absoluteChange,
    priceChangePct24h: changePercent,
    volume24h: data.volume24h,
    high24h: data.high24h,
    low24h: data.low24h,
    lastUpdated: Date.now(),
  };
}

// Map WebSocket signal to local Signal format
function mapSignalData(data: SignalData): Signal {
  return {
    id: data.id,
    symbol: data.symbol,
    exchange: 'binance' as const,
    direction: data.direction.toUpperCase() as 'BUY' | 'SELL',
    entryPrice: data.entryPrice,
    currentPrice: data.entryPrice,
    takeProfit: [
      { price: data.targetPrice, percentage: ((data.targetPrice - data.entryPrice) / data.entryPrice) * 100, hit: false },
    ],
    stopLoss: data.stopLoss,
    stopLossPercentage: Math.abs((data.entryPrice - data.stopLoss) / data.entryPrice * 100),
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface QuickAccessItem {
  id: string;
  title: string;
  icon: IoniconsName;
  color: string;
  route: keyof RootStackParamList;
}

export default function NewDashboardScreen() {
  const { theme, styles: globalStyles } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isPro, isAuthenticated } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [portfolioBalance, setPortfolioBalance] = useState<number>(0);
  const [portfolioChange, setPortfolioChange] = useState<number>(0);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const portfolio = await portfolioApi.getPortfolio();
      setPortfolioBalance(portfolio.totalValue ?? 0);
      setPortfolioChange(portfolio.totalPnl ?? 0);
    } catch (err) {
      // Ignore error - portfolio might not be available without auth
      console.log('Portfolio fetch error (may require auth):', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Get data from WebSocket hooks
  const { allTickers, isConnected: tickersConnected } = useAllTickers();
  const { signals: signalData, isConnected: signalsConnected } = useSignals();

  // Known popular cryptocurrencies whitelist
  const POPULAR_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
    'LINKUSDT', 'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT',
    'XLMUSDT', 'APTUSDT', 'NEARUSDT', 'ARBUSDT', 'OPUSDT',
  ];

  // Map WebSocket data to local formats - filter to only popular coins
  const hotCoins = useMemo(() => {
    const tickers = Array.from(allTickers.values())
      .map(mapTickerData)
      .filter(t =>
        // Only include popular coins OR coins with reasonable price (> $0.0001)
        POPULAR_SYMBOLS.includes(t.symbol) || t.price > 0.0001
      );

    // Sort by volume, prioritizing popular coins
    return tickers
      .sort((a, b) => {
        const aPopular = POPULAR_SYMBOLS.includes(a.symbol) ? 1 : 0;
        const bPopular = POPULAR_SYMBOLS.includes(b.symbol) ? 1 : 0;
        if (aPopular !== bPopular) return bPopular - aPopular;
        return b.volume24h - a.volume24h;
      })
      .slice(0, 10);
  }, [allTickers]);

  const signals = useMemo(() => {
    return signalData
      .map(mapSignalData)
      .filter(s => s.status === 'active' || s.status === 'pending');
  }, [signalData]);

  const quickAccessItems: QuickAccessItem[] = useMemo(
    () => [
      {
        id: 'pumps',
        title: 'Пампы',
        icon: 'flash',
        color: theme.colors.warning,
        route: 'Main' as keyof RootStackParamList,
      },
      {
        id: 'charts',
        title: 'Графики',
        icon: 'trending-up',
        color: theme.colors.accent,
        route: 'Charts',
      },
      {
        id: 'ai',
        title: 'AI Анализ',
        icon: 'sparkles',
        color: theme.colors.success,
        route: 'AIChat',
      },
    ],
    [theme.colors]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPortfolio();
    // WebSocket data refreshes automatically
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, [fetchPortfolio]);

  const handleCoinPress = useCallback(
    (coin: Ticker) => {
      navigation.navigate('Charts');
    },
    [navigation]
  );

  const handleQuickAccessPress = useCallback(
    (item: QuickAccessItem) => {
      // AI Chat is a Pro feature
      if (item.route === 'AIChat') {
        if (!isPro()) {
          navigation.navigate('Subscription');
          return;
        }
        navigation.navigate('AIChat', {});
      } else if (item.id === 'pumps') {
        // Navigate to Pumps tab within Main navigator
        navigation.navigate('Main', { screen: 'Pumps' });
      } else {
        navigation.navigate(item.route as any);
      }
    },
    [navigation, isPro]
  );

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  // Market overview data (mock)
  const marketOverview = useMemo(
    () => ({
      btcDominance: 51.2,
      totalMarketCap: 2.43,
      totalVolume24h: 98.5,
      fearGreedIndex: 65,
    }),
    []
  );

  const fearGreedColor =
    marketOverview.fearGreedIndex > 60
      ? theme.colors.changeUpText
      : marketOverview.fearGreedIndex < 40
      ? theme.colors.changeDownText
      : theme.colors.textSecondary;

  const fearGreedLabel =
    marketOverview.fearGreedIndex > 75
      ? 'Крайняя жадность'
      : marketOverview.fearGreedIndex > 60
      ? 'Жадность'
      : marketOverview.fearGreedIndex > 40
      ? 'Нейтрально'
      : marketOverview.fearGreedIndex > 25
      ? 'Страх'
      : 'Крайний страх';

  return (
    <ScrollView
      contentContainerStyle={globalStyles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accent}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
          {isAuthenticated ? 'С возвращением' : 'Добро пожаловать'}
        </Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Главная
        </Text>
      </View>

      {/* Portfolio Summary or Login Card */}
      {isAuthenticated ? (
        <PortfolioSummary
          balance={portfolioBalance}
          changePct={portfolioChange}
        />
      ) : (
        <View style={[styles.loginCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Ionicons name="person-circle-outline" size={48} color={theme.colors.accent} />
          <Text style={[styles.loginTitle, { color: theme.colors.textPrimary }]}>
            Войдите в аккаунт
          </Text>
          <Text style={[styles.loginDescription, { color: theme.colors.textSecondary }]}>
            Авторизуйтесь для доступа к портфолио, сигналам и AI-анализу
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.accent }]}
            onPress={handleLogin}
            activeOpacity={0.7}
          >
            <Text style={styles.loginButtonText}>Войти</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Access */}
      <View style={styles.quickAccessSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Быстрый доступ
        </Text>
        <View style={styles.quickAccessGrid}>
          {quickAccessItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.quickAccessCard,
                { backgroundColor: theme.colors.card },
              ]}
              onPress={() => handleQuickAccessPress(item)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickAccessIcon,
                  { backgroundColor: `${item.color}20` },
                ]}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text
                style={[
                  styles.quickAccessTitle,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Market Overview */}
      <View style={styles.marketSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Обзор рынка
        </Text>
        <View
          style={[
            styles.marketCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
          ]}
        >
          <View style={styles.marketRow}>
            <View style={styles.marketItem}>
              <Text
                style={[styles.marketLabel, { color: theme.colors.textMuted }]}
              >
                Доминация BTC
              </Text>
              <Text
                style={[styles.marketValue, { color: theme.colors.textPrimary }]}
              >
                {marketOverview.btcDominance}%
              </Text>
            </View>
            <View style={styles.marketItem}>
              <Text
                style={[styles.marketLabel, { color: theme.colors.textMuted }]}
              >
                Капитализация
              </Text>
              <Text
                style={[styles.marketValue, { color: theme.colors.textPrimary }]}
              >
                ${marketOverview.totalMarketCap}T
              </Text>
            </View>
          </View>
          <View style={styles.marketRow}>
            <View style={styles.marketItem}>
              <Text
                style={[styles.marketLabel, { color: theme.colors.textMuted }]}
              >
                Объём 24ч
              </Text>
              <Text
                style={[styles.marketValue, { color: theme.colors.textPrimary }]}
              >
                ${marketOverview.totalVolume24h}B
              </Text>
            </View>
            <View style={styles.marketItem}>
              <Text
                style={[styles.marketLabel, { color: theme.colors.textMuted }]}
              >
                Страх и жадность
              </Text>
              <View style={styles.fearGreedRow}>
                <Text style={[styles.marketValue, { color: fearGreedColor }]}>
                  {marketOverview.fearGreedIndex}
                </Text>
                <Text style={[styles.fearGreedLabel, { color: fearGreedColor }]}>
                  {fearGreedLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Hot Coins */}
      <HotCoins coins={hotCoins} onCoinPress={handleCoinPress} />

      {/* Active Signals */}
      <ActiveSignals
        signals={signals}
        isPro={isPro()}
        onUpgrade={handleUpgrade}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quickAccessSection: {
    marginBottom: 24,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  marketSection: {
    marginBottom: 24,
  },
  marketCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  marketRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  marketItem: {
    flex: 1,
  },
  marketLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  marketValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  fearGreedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  fearGreedLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  loginCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  loginDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
