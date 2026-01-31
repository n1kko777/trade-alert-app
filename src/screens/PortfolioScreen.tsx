import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../theme-context';
import AssetAllocation, { AssetAllocationItem } from '../components/AssetAllocation';
import PositionCard, { Position } from '../components/PositionCard';
import PnLChart, { PnLDataPoint } from '../components/PnLChart';

// Demo data for testing
const generateDemoPositions = (): Position[] => [
  {
    id: '1',
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: 0.5432,
    entryPrice: 42500,
    currentPrice: 67890,
    value: 36875.95,
    profitLoss: 13792.10,
    profitLossPercent: 59.75,
  },
  {
    id: '2',
    symbol: 'ETH',
    name: 'Ethereum',
    quantity: 8.25,
    entryPrice: 2850,
    currentPrice: 3456,
    value: 28512.00,
    profitLoss: 4999.50,
    profitLossPercent: 21.26,
  },
  {
    id: '3',
    symbol: 'SOL',
    name: 'Solana',
    quantity: 125.5,
    entryPrice: 98,
    currentPrice: 142.50,
    value: 17883.75,
    profitLoss: 5585.25,
    profitLossPercent: 45.41,
  },
  {
    id: '4',
    symbol: 'AVAX',
    name: 'Avalanche',
    quantity: 215,
    entryPrice: 42,
    currentPrice: 35.80,
    value: 7697.00,
    profitLoss: -1333.00,
    profitLossPercent: -14.76,
  },
  {
    id: '5',
    symbol: 'LINK',
    name: 'Chainlink',
    quantity: 450,
    entryPrice: 15.50,
    currentPrice: 14.25,
    value: 6412.50,
    profitLoss: -562.50,
    profitLossPercent: -8.06,
  },
  {
    id: '6',
    symbol: 'DOT',
    name: 'Polkadot',
    quantity: 320,
    entryPrice: 7.80,
    currentPrice: 8.95,
    value: 2864.00,
    profitLoss: 368.00,
    profitLossPercent: 14.74,
  },
];

const generateDemoPnLHistory = (): PnLDataPoint[] => {
  const now = Date.now();
  const points: PnLDataPoint[] = [];
  const baseValue = 85000;

  // Generate 60 days of data
  for (let i = 60; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const randomChange = (Math.random() - 0.45) * 3000;
    const trendFactor = ((60 - i) / 60) * 15000; // Upward trend
    const value = baseValue + trendFactor + randomChange;
    points.push({ timestamp, value: Math.max(value, baseValue * 0.7) });
  }

  return points;
};

export default function PortfolioScreen() {
  const { theme, styles: globalStyles } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const positions = useMemo(() => generateDemoPositions(), []);
  const pnlHistory = useMemo(() => generateDemoPnLHistory(), []);

  const totalValue = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.value, 0);
  }, [positions]);

  const totalPnL = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
  }, [positions]);

  const totalPnLPercent = useMemo(() => {
    const totalCost = positions.reduce((sum, pos) => sum + (pos.value - pos.profitLoss), 0);
    return totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  }, [positions, totalPnL]);

  const assetAllocation: AssetAllocationItem[] = useMemo(() => {
    return positions.map(pos => ({
      symbol: pos.symbol,
      name: pos.name,
      value: pos.value,
      percentage: (pos.value / totalValue) * 100,
    }));
  }, [positions, totalValue]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

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
          Портфель
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
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Performance
        </Text>
      </View>
      <PnLChart data={pnlHistory} currentValue={totalValue} />

      {/* Asset Allocation */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Asset Allocation
        </Text>
      </View>
      <AssetAllocation assets={assetAllocation} totalValue={totalValue} />

      {/* PnL Summary Card */}
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

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.accent }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.buttonText }]}>
            + Add Position
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton, { backgroundColor: theme.colors.metaBadge }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>
            Sync Exchanges
          </Text>
        </TouchableOpacity>
      </View>

      {/* Positions List */}
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
            // Handle position press - could navigate to detail screen
            console.log('Position pressed:', pos.symbol);
          }}
        />
      ))}
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
});
