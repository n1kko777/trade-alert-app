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

// Map WebSocket ticker to local Ticker format
function mapTickerData(data: TickerData): Ticker {
  return {
    symbol: data.symbol,
    price: data.price,
    priceChange24h: data.change24h,
    priceChangePct24h: (data.change24h / (data.price - data.change24h)) * 100,
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
  const { isPro } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [portfolioBalance] = useState(125432.50);
  const [portfolioChange] = useState(3.25);

  // Get data from WebSocket hooks
  const { allTickers, isConnected: tickersConnected } = useAllTickers();
  const { signals: signalData, isConnected: signalsConnected } = useSignals();

  // Map WebSocket data to local formats
  const hotCoins = useMemo(() => {
    const tickers = Array.from(allTickers.values()).map(mapTickerData);
    return tickers
      .sort((a, b) => b.volume24h - a.volume24h)
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
        title: 'Pumps',
        icon: 'flash',
        color: theme.colors.warning,
        route: 'Main' as keyof RootStackParamList,
      },
      {
        id: 'charts',
        title: 'Charts',
        icon: 'trending-up',
        color: theme.colors.accent,
        route: 'Charts',
      },
      {
        id: 'ai',
        title: 'AI Analysis',
        icon: 'sparkles',
        color: theme.colors.success,
        route: 'AIChat',
      },
    ],
    [theme.colors]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // WebSocket data refreshes automatically
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  const handleCoinPress = useCallback(
    (coin: Ticker) => {
      navigation.navigate('Charts');
    },
    [navigation]
  );

  const handleQuickAccessPress = useCallback(
    (item: QuickAccessItem) => {
      if (item.route === 'AIChat') {
        navigation.navigate('AIChat', {});
      } else if (item.route === 'Main') {
        // Navigate to Pumps tab - for now just show alert
      } else {
        navigation.navigate(item.route as any);
      }
    },
    [navigation]
  );

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
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
      ? 'Extreme Greed'
      : marketOverview.fearGreedIndex > 60
      ? 'Greed'
      : marketOverview.fearGreedIndex > 40
      ? 'Neutral'
      : marketOverview.fearGreedIndex > 25
      ? 'Fear'
      : 'Extreme Fear';

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
          Welcome back
        </Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Dashboard
        </Text>
      </View>

      {/* Portfolio Summary */}
      <PortfolioSummary
        balance={portfolioBalance}
        changePct={portfolioChange}
      />

      {/* Quick Access */}
      <View style={styles.quickAccessSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Quick Access
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
          Market Overview
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
                BTC Dominance
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
                Total Market Cap
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
                24h Volume
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
                Fear & Greed
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
});
