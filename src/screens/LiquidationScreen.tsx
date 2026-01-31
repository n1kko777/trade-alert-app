import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme-context';
import LiquidationChart from '../components/LiquidationChart';
import { apiClient, ENDPOINTS } from '../api';
import type { ApiLiquidationMap } from '../api/types';
import {
  formatVolume,
  type LiquidationLevel,
  type LiquidationSummary,
  type ExchangeId,
  SUPPORTED_EXCHANGES,
} from '../services/liquidations';

const POPULAR_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];

// Map API response to local data format
interface LiquidationData {
  symbol: string;
  exchange: ExchangeId;
  currentPrice: number;
  levels: LiquidationLevel[];
  totalLongVolume: number;
  totalShortVolume: number;
  lastUpdated: number;
}

function calculateLiquidationSummary(levels: LiquidationLevel[]): LiquidationSummary {
  const longLevels = levels.filter(l => l.type === 'long');
  const shortLevels = levels.filter(l => l.type === 'short');

  const totalLongVolume = longLevels.reduce((sum, l) => sum + l.longVolume, 0);
  const totalShortVolume = shortLevels.reduce((sum, l) => sum + l.shortVolume, 0);

  const nearestLong = longLevels.length > 0
    ? longLevels.reduce((min, l) => l.distancePercent < min.distancePercent ? l : min)
    : null;
  const nearestShort = shortLevels.length > 0
    ? shortLevels.reduce((min, l) => l.distancePercent < min.distancePercent ? l : min)
    : null;

  const highestVolume = levels.length > 0
    ? levels.reduce((max, l) => l.totalVolume > max.totalVolume ? l : max)
    : null;

  return {
    totalVolumeAtRisk: totalLongVolume + totalShortVolume,
    longVolumeAtRisk: totalLongVolume,
    shortVolumeAtRisk: totalShortVolume,
    nearestLongLevel: nearestLong,
    nearestShortLevel: nearestShort,
    highestVolumeLevel: highestVolume,
  };
}

export default function LiquidationScreen() {
  const { theme } = useTheme();
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId>('binance');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [inputSymbol, setInputSymbol] = useState('BTC');
  const [liquidationData, setLiquidationData] = useState<LiquidationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary: LiquidationSummary | null = useMemo(() => {
    if (!liquidationData) return null;
    return calculateLiquidationSummary(liquidationData.levels);
  }, [liquidationData]);

  const fetchLiquidationData = useCallback(async () => {
    try {
      setError(null);
      const fullSymbol = inputSymbol.toUpperCase().endsWith('USDT')
        ? inputSymbol.toUpperCase()
        : `${inputSymbol.toUpperCase()}USDT`;
      setSymbol(fullSymbol);

      // Fetch liquidation data from backend API
      const response = await apiClient.get<ApiLiquidationMap>(
        `${ENDPOINTS.market.liquidations}/${fullSymbol}`
      );

      const apiData = response.data;

      // Map API response to local format
      const levels: LiquidationLevel[] = apiData.levels.map(level => ({
        price: level.longLiquidation, // Use long liquidation as price
        longVolume: 1000000 / level.leverage, // Estimate volume based on leverage
        shortVolume: 1000000 / level.leverage,
        totalVolume: 2000000 / level.leverage,
        leverage: level.leverage,
        type: 'long' as const,
        distancePercent: ((apiData.currentPrice - level.longLiquidation) / apiData.currentPrice) * 100,
      }));

      // Add short levels
      apiData.levels.forEach(level => {
        levels.push({
          price: level.shortLiquidation,
          longVolume: 0,
          shortVolume: 1000000 / level.leverage,
          totalVolume: 1000000 / level.leverage,
          leverage: level.leverage,
          type: 'short' as const,
          distancePercent: ((level.shortLiquidation - apiData.currentPrice) / apiData.currentPrice) * 100,
        });
      });

      const data: LiquidationData = {
        symbol: apiData.symbol,
        exchange: selectedExchange,
        currentPrice: apiData.currentPrice,
        levels: levels.sort((a, b) => b.price - a.price),
        totalLongVolume: levels.filter(l => l.type === 'long').reduce((s, l) => s + l.longVolume, 0),
        totalShortVolume: levels.filter(l => l.type === 'short').reduce((s, l) => s + l.shortVolume, 0),
        lastUpdated: Date.now(),
      };

      setLiquidationData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLiquidationData(null);
    }
  }, [inputSymbol, selectedExchange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchLiquidationData();
    setLoading(false);
  }, [fetchLiquidationData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLiquidationData();
    setRefreshing(false);
  }, [fetchLiquidationData]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSymbolSubmit = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleQuickSelect = useCallback((sym: string) => {
    const base = sym.replace('USDT', '');
    setInputSymbol(base);
    setSymbol(sym);
    // Trigger load with new symbol
    setTimeout(() => {
      loadData();
    }, 0);
  }, [loadData]);

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
            onPress={() => {
              setSelectedExchange(exchange);
              loadData();
            }}
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
          <Text style={[styles.searchButtonText, { color: theme.colors.buttonText }]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick select symbols */}
      <View style={styles.quickSelectRow}>
        {POPULAR_SYMBOLS.map((sym) => (
          <TouchableOpacity
            key={sym}
            style={[
              styles.quickSelectButton,
              {
                backgroundColor:
                  symbol === sym ? theme.colors.accent : theme.colors.metricCard,
              },
            ]}
            onPress={() => handleQuickSelect(sym)}
          >
            <Text
              style={[
                styles.quickSelectText,
                {
                  color:
                    symbol === sym
                      ? theme.colors.buttonText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {sym.replace('USDT', '')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary cards */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
              Total at Risk
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
              {formatVolume(summary.totalVolumeAtRisk)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>
              Longs
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.changeUpText }]}>
              {formatVolume(summary.longVolumeAtRisk)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.danger }]}>
              Shorts
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.changeDownText }]}>
              {formatVolume(summary.shortVolumeAtRisk)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderChart = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading liquidation data...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
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

    if (!liquidationData) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Enter a symbol to view liquidation map
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
        <LiquidationChart
          levels={liquidationData.levels}
          currentPrice={liquidationData.currentPrice}
        />
      </View>
    );
  };

  const renderDisclaimer = () => (
    <View style={[styles.disclaimerContainer, { backgroundColor: theme.colors.metricCard }]}>
      <Text style={[styles.disclaimerTitle, { color: theme.colors.textSecondary }]}>
        About This Data
      </Text>
      <Text style={[styles.disclaimerText, { color: theme.colors.textMuted }]}>
        These are estimated liquidation levels based on current price and common leverage
        levels. Real liquidation data requires paid API access (Coinglass, etc.). Volumes
        shown are estimates based on typical market distribution.
      </Text>
    </View>
  );

  const data = [{ key: 'content' }];

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        Карта ликвидаций
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Estimated liquidation levels for leveraged positions
      </Text>

      <FlatList
        data={data}
        renderItem={() => (
          <View style={styles.content}>
            {renderHeader()}
            {renderChart()}
            {renderDisclaimer()}
          </View>
        )}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
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
    padding: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  list: {
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  quickSelectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickSelectText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
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
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  disclaimerContainer: {
    padding: 16,
    borderRadius: 8,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
