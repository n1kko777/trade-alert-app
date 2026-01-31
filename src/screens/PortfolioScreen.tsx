import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../theme-context';
import AssetAllocation, { AssetAllocationItem } from '../components/AssetAllocation';
import PositionCard, { Position } from '../components/PositionCard';
import PnLChart, { PnLDataPoint } from '../components/PnLChart';
import { portfolioApi } from '../api';
import type { ApiPortfolio, ApiPortfolioAsset, ApiError } from '../api/types';

// Map API portfolio asset to Position format
function mapAssetToPosition(asset: ApiPortfolioAsset): Position {
  const value = asset.value ?? asset.amount * (asset.currentPrice ?? asset.avgBuyPrice);
  const costBasis = asset.amount * asset.avgBuyPrice;
  const profitLoss = asset.pnl ?? (value - costBasis);
  const profitLossPercent = asset.pnlPercent ?? (costBasis > 0 ? (profitLoss / costBasis) * 100 : 0);

  return {
    id: asset.id,
    symbol: asset.symbol.replace('USDT', ''),
    name: asset.symbol,
    quantity: asset.amount,
    entryPrice: asset.avgBuyPrice,
    currentPrice: asset.currentPrice ?? asset.avgBuyPrice,
    value,
    profitLoss,
    profitLossPercent,
  };
}

// Generate PnL history (would come from API in a full implementation)
const generatePnLHistory = (totalValue: number): PnLDataPoint[] => {
  const now = Date.now();
  const points: PnLDataPoint[] = [];
  const baseValue = totalValue * 0.85; // Start from 85% of current value

  // Generate 60 days of data
  for (let i = 60; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const randomChange = (Math.random() - 0.45) * (totalValue * 0.03);
    const trendFactor = ((60 - i) / 60) * (totalValue * 0.15);
    const value = baseValue + trendFactor + randomChange;
    points.push({ timestamp, value: Math.max(value, baseValue * 0.7) });
  }

  return points;
};

export default function PortfolioScreen() {
  const { theme, styles: globalStyles } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<ApiPortfolio | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setError(null);
      const data = await portfolioApi.getPortfolio();
      setPortfolio(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load portfolio');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPortfolio();
      setLoading(false);
    };
    loadData();
  }, [fetchPortfolio]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolio();
    setRefreshing(false);
  };

  const positions = useMemo(() => {
    if (!portfolio) return [];
    return portfolio.assets.map(mapAssetToPosition);
  }, [portfolio]);

  const totalValue = portfolio?.totalValue ?? 0;
  const totalPnL = portfolio?.totalPnl ?? 0;
  const totalPnLPercent = portfolio?.totalPnlPercent ?? 0;

  const pnlHistory = useMemo(() => generatePnLHistory(totalValue), [totalValue]);

  const assetAllocation: AssetAllocationItem[] = useMemo(() => {
    return positions.map(pos => ({
      symbol: pos.symbol,
      name: pos.name,
      value: pos.value,
      percentage: totalValue > 0 ? (pos.value / totalValue) * 100 : 0,
    }));
  }, [positions, totalValue]);

  const isPnLPositive = totalPnL >= 0;

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPnL = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(Math.abs(value))}`;
  };

  const formatPnLPercent = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const handleAddPosition = useCallback(() => {
    Alert.alert('Add Position', 'This feature will allow you to add a new position to your portfolio.');
  }, []);

  const handleSyncExchanges = useCallback(() => {
    Alert.alert('Sync Exchanges', 'This feature will sync your positions from connected exchanges.');
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading portfolio...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
          onPress={fetchPortfolio}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.buttonText }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Portfolio
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Portfolio Overview
        </Text>
      </View>

      {/* Total Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.balanceLabel, { color: theme.colors.textMuted }]}>
          Total Balance
        </Text>
        <Text style={[styles.balanceValue, { color: theme.colors.textPrimary }]}>
          {formatCurrency(totalValue)}
        </Text>
        <View style={styles.balanceChangeRow}>
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: isPnLPositive ? theme.colors.changeUp : theme.colors.changeDown },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
              ]}
            >
              {isPnLPositive ? '\u2191' : '\u2193'} {formatPnLPercent(totalPnLPercent)}
            </Text>
          </View>
          <Text
            style={[
              styles.changeAmount,
              { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
            ]}
          >
            {formatPnL(totalPnL)}
          </Text>
        </View>
      </View>

      {/* PnL Chart */}
      {totalValue > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Performance
            </Text>
          </View>
          <PnLChart data={pnlHistory} currentValue={totalValue} />
        </>
      )}

      {/* Asset Allocation */}
      {positions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Asset Allocation
            </Text>
          </View>
          <AssetAllocation assets={assetAllocation} totalValue={totalValue} />
        </>
      )}

      {/* PnL Summary Card */}
      {positions.length > 0 && (
        <View style={[styles.pnlSummaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.pnlSummaryTitle, { color: theme.colors.textPrimary }]}>
            P&L Summary
          </Text>
          <View style={styles.pnlSummaryRow}>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                Total Invested
              </Text>
              <Text style={[styles.pnlSummaryValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(totalValue - totalPnL)}
              </Text>
            </View>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                Unrealized P&L
              </Text>
              <Text
                style={[
                  styles.pnlSummaryValue,
                  { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
                ]}
              >
                {formatPnL(totalPnL)}
              </Text>
            </View>
          </View>
          <View style={styles.pnlSummaryRow}>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                Profitable Positions
              </Text>
              <Text style={[styles.pnlSummaryValue, { color: theme.colors.changeUpText }]}>
                {positions.filter(p => p.profitLoss >= 0).length} / {positions.length}
              </Text>
            </View>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                ROI
              </Text>
              <Text
                style={[
                  styles.pnlSummaryValue,
                  { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
                ]}
              >
                {formatPnLPercent(totalPnLPercent)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.accent }]}
          activeOpacity={0.8}
          onPress={handleAddPosition}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.buttonText }]}>
            + Add Position
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton, { backgroundColor: theme.colors.metaBadge }]}
          activeOpacity={0.8}
          onPress={handleSyncExchanges}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>
            Sync Exchanges
          </Text>
        </TouchableOpacity>
      </View>

      {/* Positions List */}
      {positions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Positions
            </Text>
            <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
              {positions.length} assets
            </Text>
          </View>

          {positions.map(position => (
            <PositionCard
              key={position.id}
              position={position}
              onPress={(pos) => {
                console.log('Position pressed:', pos.symbol);
              }}
            />
          ))}
        </>
      )}

      {/* Empty State */}
      {positions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No positions yet. Add your first position to start tracking your portfolio.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  balanceChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionCount: {
    fontSize: 13,
  },
  pnlSummaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  pnlSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pnlSummaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  pnlSummaryItem: {
    flex: 1,
  },
  pnlSummaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  pnlSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  syncButton: {
    // Additional styles for sync button if needed
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
