import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme-context';
import TradingChart from '../components/TradingChart';
import TimeframeSelector, { type Timeframe } from '../components/TimeframeSelector';
import { apiClient, ENDPOINTS } from '../api';
import type { ApiTicker, ApiCandle } from '../api/types';
import type { Candle, Ticker, ExchangeId } from '../services/exchanges/types';
import { Ionicons } from '@expo/vector-icons';

const SUPPORTED_EXCHANGES: ExchangeId[] = ['binance', 'bybit'];
const POPULAR_SYMBOLS = ['BTC', 'ETH', 'SOL'];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Map API ticker to local format
function mapApiTicker(data: ApiTicker): Ticker {
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

// Map API candle to local format
function mapApiCandle(data: ApiCandle): Candle {
  return {
    time: data.timestamp,
    open: data.open,
    high: data.high,
    low: data.low,
    close: data.close,
    volume: data.volume,
  };
}

export default function ChartScreen() {
  const { theme } = useTheme();

  const [selectedExchange, setSelectedExchange] = useState<ExchangeId>('binance');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [inputSymbol, setInputSymbol] = useState('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const fullSymbol = inputSymbol.toUpperCase().endsWith('USDT')
        ? inputSymbol.toUpperCase()
        : `${inputSymbol.toUpperCase()}USDT`;
      setSymbol(fullSymbol);

      // Fetch candles and ticker from backend API in parallel
      const [candlesResponse, tickerResponse] = await Promise.all([
        apiClient.get<{ candles: ApiCandle[] }>(
          ENDPOINTS.market.candles(fullSymbol),
          { params: { interval: timeframe, limit: 200 } }
        ),
        apiClient.get<{ ticker: ApiTicker }>(
          ENDPOINTS.market.ticker(fullSymbol)
        ),
      ]);

      setCandles(candlesResponse.data.candles.map(mapApiCandle));
      setTicker(mapApiTicker(tickerResponse.data.ticker));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      setCandles([]);
      setTicker(null);
    }
  }, [inputSymbol, timeframe]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    loadData();
  }, []);

  // Reload when exchange or timeframe changes
  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [selectedExchange, timeframe]);

  const handleSymbolSubmit = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleQuickSelect = useCallback((sym: string) => {
    setInputSymbol(sym);
    setTimeout(() => {
      loadData();
    }, 0);
  }, [loadData]);

  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setTimeframe(tf);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (price >= 1) {
      return price.toFixed(4);
    }
    return price.toFixed(8);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Exchange selector */}
      <View style={styles.exchangeRow}>
        {SUPPORTED_EXCHANGES.map((exchange) => (
          <TouchableOpacity
            key={exchange}
            style={[
              styles.exchangeButton,
              {
                backgroundColor:
                  selectedExchange === exchange
                    ? theme.colors.accent
                    : theme.colors.metricCard,
              },
            ]}
            onPress={() => setSelectedExchange(exchange)}
          >
            <Text
              style={[
                styles.exchangeButtonText,
                {
                  color:
                    selectedExchange === exchange
                      ? theme.colors.buttonText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {exchange.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Symbol input */}
      <View style={styles.symbolRow}>
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.input }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            value={inputSymbol}
            onChangeText={setInputSymbol}
            placeholder="BTC"
            placeholderTextColor={theme.colors.textPlaceholder}
            autoCapitalize="characters"
            onSubmitEditing={handleSymbolSubmit}
            returnKeyType="search"
          />
          <Text style={[styles.inputSuffix, { color: theme.colors.textMuted }]}>
            USDT
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.colors.accent }]}
          onPress={handleSymbolSubmit}
        >
          <Ionicons name="search" size={18} color={theme.colors.buttonText} />
        </TouchableOpacity>
      </View>

      {/* Quick select symbols */}
      <View style={styles.quickSelectRow}>
        {POPULAR_SYMBOLS.map((sym) => {
          const fullSym = `${sym}USDT`;
          return (
            <TouchableOpacity
              key={sym}
              style={[
                styles.quickSelectButton,
                {
                  backgroundColor:
                    symbol === fullSym ? theme.colors.accent : theme.colors.metricCard,
                },
              ]}
              onPress={() => handleQuickSelect(sym)}
            >
              <Text
                style={[
                  styles.quickSelectText,
                  {
                    color:
                      symbol === fullSym
                        ? theme.colors.buttonText
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {sym}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Timeframe selector */}
      <TimeframeSelector
        selectedTimeframe={timeframe}
        onSelect={handleTimeframeChange}
      />

      {/* Price and change display */}
      {ticker && (
        <View style={[styles.priceRow, { backgroundColor: theme.colors.card }]}>
          <View style={styles.priceInfo}>
            <Text style={[styles.symbolLabel, { color: theme.colors.textMuted }]}>
              {symbol}
            </Text>
            <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
              ${formatPrice(ticker.price)}
            </Text>
          </View>
          <View style={styles.changeInfo}>
            <Text
              style={[
                styles.changeValue,
                {
                  color:
                    ticker.priceChangePct24h >= 0
                      ? theme.colors.changeUpText
                      : theme.colors.changeDownText,
                },
              ]}
            >
              {formatChange(ticker.priceChangePct24h)}
            </Text>
            <Text style={[styles.changeLabel, { color: theme.colors.textMuted }]}>
              24h
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.fullscreenButton, { backgroundColor: theme.colors.metricCard }]}
            onPress={toggleFullscreen}
          >
            <Ionicons
              name={isFullscreen ? 'contract' : 'expand'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderChart = () => {
    if (loading && candles.length === 0) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.card }]}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading chart data...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.danger} />
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
            onPress={loadData}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.buttonText }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (candles.length === 0) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="bar-chart-outline" size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Enter a symbol to view chart
          </Text>
        </View>
      );
    }

    const chartHeight = isFullscreen ? SCREEN_HEIGHT - 200 : 350;

    return (
      <View style={styles.chartWrapper}>
        <TradingChart
          candles={candles}
          symbol={symbol}
          timeframe={timeframe}
          height={chartHeight}
        />
      </View>
    );
  };

  const renderStats = () => {
    if (!ticker) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            24h High
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.changeUpText }]}>
            ${formatPrice(ticker.high24h)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            24h Low
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.changeDownText }]}>
            ${formatPrice(ticker.low24h)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            Volume
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatVolume(ticker.volume24h)}
          </Text>
        </View>
      </View>
    );
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) {
      return `${(volume / 1e9).toFixed(2)}B`;
    }
    if (volume >= 1e6) {
      return `${(volume / 1e6).toFixed(2)}M`;
    }
    if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  };

  if (isFullscreen) {
    return (
      <View style={[styles.fullscreenContainer, { backgroundColor: theme.colors.appBackground }]}>
        <View style={styles.fullscreenHeader}>
          <View style={styles.fullscreenTitleRow}>
            <Text style={[styles.fullscreenSymbol, { color: theme.colors.textPrimary }]}>
              {symbol}
            </Text>
            {ticker && (
              <Text
                style={[
                  styles.fullscreenChange,
                  {
                    color:
                      ticker.priceChangePct24h >= 0
                        ? theme.colors.changeUpText
                        : theme.colors.changeDownText,
                  },
                ]}
              >
                {formatChange(ticker.priceChangePct24h)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.exitFullscreenButton, { backgroundColor: theme.colors.metricCard }]}
            onPress={toggleFullscreen}
          >
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <TimeframeSelector
          selectedTimeframe={timeframe}
          onSelect={handleTimeframeChange}
        />
        {renderChart()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        График
      </Text>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderChart()}
        {renderStats()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullscreenContainer: {
    flex: 1,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  exchangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  exchangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exchangeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  symbolRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickSelectButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  priceInfo: {
    flex: 1,
  },
  symbolLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  changeInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 11,
  },
  fullscreenButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartWrapper: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 350,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    height: 350,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    height: 350,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  fullscreenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fullscreenSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fullscreenChange: {
    fontSize: 16,
    fontWeight: '600',
  },
  exitFullscreenButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
