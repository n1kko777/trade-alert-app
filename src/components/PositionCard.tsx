import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme-context';
import { formatPrice } from '../utils/format';

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  value: number;
  profitLoss: number;
  profitLossPercent: number;
}

interface PositionCardProps {
  position: Position;
  onPress?: (position: Position) => void;
}

export default function PositionCard({ position, onPress }: PositionCardProps) {
  const { theme } = useTheme();

  const isProfit = position.profitLoss >= 0;
  const profitColor = isProfit ? theme.colors.changeUpText : theme.colors.changeDownText;
  const profitBgColor = isProfit ? theme.colors.changeUp : theme.colors.changeDown;

  const formatQuantity = (qty: number) => {
    if (qty >= 1000000) {
      return `${(qty / 1000000).toFixed(2)}M`;
    }
    if (qty >= 1000) {
      return `${(qty / 1000).toFixed(2)}K`;
    }
    if (qty >= 1) {
      return qty.toFixed(4);
    }
    return qty.toFixed(6);
  };

  const formatValue = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPnLPercent = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
      onPress={() => onPress?.(position)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.symbol, { color: theme.colors.textPrimary }]}>
            {position.symbol}
          </Text>
          <Text style={[styles.name, { color: theme.colors.textMuted }]}>
            {position.name}
          </Text>
        </View>
        <View style={[styles.pnlBadge, { backgroundColor: profitBgColor }]}>
          <Text style={[styles.pnlPercent, { color: profitColor }]}>
            {formatPnLPercent(position.profitLossPercent)}
          </Text>
        </View>
      </View>

      {/* Price row */}
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={[styles.priceLabel, { color: theme.colors.textMuted }]}>
            Current Price
          </Text>
          <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
            ${formatPrice(position.currentPrice)}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={[styles.priceLabel, { color: theme.colors.textMuted }]}>
            Entry Price
          </Text>
          <Text style={[styles.priceValue, { color: theme.colors.textSecondary }]}>
            ${formatPrice(position.entryPrice)}
          </Text>
        </View>
      </View>

      {/* Holdings row */}
      <View style={styles.holdingsRow}>
        <View style={styles.holdingsItem}>
          <Text style={[styles.holdingsLabel, { color: theme.colors.textMuted }]}>
            Holdings
          </Text>
          <Text style={[styles.holdingsValue, { color: theme.colors.textPrimary }]}>
            {formatQuantity(position.quantity)} {position.symbol}
          </Text>
        </View>
        <View style={styles.holdingsItem}>
          <Text style={[styles.holdingsLabel, { color: theme.colors.textMuted }]}>
            Value
          </Text>
          <Text style={[styles.holdingsValue, { color: theme.colors.textPrimary }]}>
            {formatValue(position.value)}
          </Text>
        </View>
      </View>

      {/* PnL row */}
      <View style={[styles.pnlRow, { borderTopColor: theme.colors.divider }]}>
        <Text style={[styles.pnlLabel, { color: theme.colors.textMuted }]}>
          Profit/Loss
        </Text>
        <Text style={[styles.pnlValue, { color: profitColor }]}>
          {formatPnL(position.profitLoss)} ({formatPnLPercent(position.profitLossPercent)})
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 12,
    marginTop: 2,
  },
  pnlBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pnlPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  holdingsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  holdingsItem: {
    flex: 1,
  },
  holdingsLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  holdingsValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  pnlLabel: {
    fontSize: 12,
  },
  pnlValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
