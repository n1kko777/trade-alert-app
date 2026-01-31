import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme-context';
import type { Signal } from '../services/signals/types';
import { formatPrice } from '../utils/format';

interface SignalCardProps {
  signal: Signal;
  onPress?: (signal: Signal) => void;
}

function SignalCard({ signal, onPress }: SignalCardProps) {
  const { theme } = useTheme();

  const isLong = signal.direction === 'BUY';
  const directionColor = isLong ? theme.colors.changeUpText : theme.colors.changeDownText;
  const directionBgColor = isLong ? theme.colors.changeUp : theme.colors.changeDown;

  const profitValue = signal.status === 'closed' ? signal.profit : signal.unrealizedProfit;
  const isProfitable = (profitValue ?? 0) > 0;
  const profitColor = isProfitable ? theme.colors.changeUpText : theme.colors.changeDownText;

  const statusColor = signal.status === 'active'
    ? theme.colors.statusGood
    : signal.status === 'pending'
      ? theme.colors.statusWarn
      : theme.colors.statusMuted;

  const formatTimeSince = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const confirmedTriggers = signal.aiTriggers.filter(t => t.confirmed).length;
  const totalTriggers = signal.aiTriggers.length;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
      onPress={() => onPress?.(signal)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.symbol, { color: theme.colors.textPrimary }]}>
            {signal.symbol.replace('USDT', '')}
          </Text>
          <View style={[styles.exchangeBadge, { backgroundColor: theme.colors.metaBadge }]}>
            <Text style={[styles.exchangeText, { color: theme.colors.textSecondary }]}>
              {signal.exchange.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.directionBadge, { backgroundColor: directionBgColor }]}>
            <Text style={[styles.directionArrow, { color: directionColor }]}>
              {isLong ? '\u2191' : '\u2193'}
            </Text>
            <Text style={[styles.directionText, { color: directionColor }]}>
              {signal.direction}
            </Text>
          </View>
        </View>
      </View>

      {/* Entry Price */}
      <View style={styles.priceSection}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Entry</Text>
        <Text style={[styles.entryPrice, { color: theme.colors.textPrimary }]}>
          ${formatPrice(signal.entryPrice)}
        </Text>
      </View>

      {/* Take Profit Levels */}
      <View style={styles.tpSection}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Take Profit</Text>
        <View style={styles.tpLevels}>
          {signal.takeProfit.map((tp, index) => (
            <View
              key={index}
              style={[
                styles.tpLevel,
                { backgroundColor: tp.hit ? theme.colors.changeUp : theme.colors.metaBadge }
              ]}
            >
              <Text style={[
                styles.tpLabel,
                { color: tp.hit ? theme.colors.changeUpText : theme.colors.textSecondary }
              ]}>
                TP{index + 1}
              </Text>
              <Text style={[
                styles.tpPrice,
                { color: tp.hit ? theme.colors.changeUpText : theme.colors.textPrimary }
              ]}>
                ${formatPrice(tp.price)}
              </Text>
              <Text style={[
                styles.tpPct,
                { color: tp.hit ? theme.colors.changeUpText : theme.colors.textMuted }
              ]}>
                +{tp.percentage.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stop Loss */}
      <View style={styles.slSection}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Stop Loss</Text>
        <View style={[styles.slBadge, { backgroundColor: theme.colors.changeDown }]}>
          <Text style={[styles.slPrice, { color: theme.colors.changeDownText }]}>
            ${formatPrice(signal.stopLoss)}
          </Text>
          <Text style={[styles.slPct, { color: theme.colors.changeDownText }]}>
            -{signal.stopLossPercentage.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* AI Triggers */}
      <View style={styles.triggersSection}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>AI Triggers</Text>
        <View style={styles.triggersRow}>
          {signal.aiTriggers.map((trigger, index) => (
            <View
              key={index}
              style={[
                styles.triggerDot,
                {
                  backgroundColor: trigger.confirmed
                    ? theme.colors.statusGood
                    : theme.colors.statusMuted
                }
              ]}
            />
          ))}
          <Text style={[styles.triggersText, { color: theme.colors.textSecondary }]}>
            {confirmedTriggers}/{totalTriggers} confirmed
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
            {signal.status.charAt(0).toUpperCase() + signal.status.slice(1)}
          </Text>
          <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
            {formatTimeSince(signal.createdAt)}
          </Text>
        </View>
        <View style={styles.footerRight}>
          {profitValue !== undefined && (
            <Text style={[styles.profitText, { color: profitColor }]}>
              {isProfitable ? '+' : ''}{profitValue.toFixed(2)}%
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(SignalCard);

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
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  exchangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exchangeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  directionArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  directionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceSection: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    marginBottom: 4,
  },
  entryPrice: {
    fontSize: 18,
    fontWeight: '600',
  },
  tpSection: {
    marginBottom: 12,
  },
  tpLevels: {
    flexDirection: 'row',
    gap: 8,
  },
  tpLevel: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tpLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  tpPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  tpPct: {
    fontSize: 10,
    marginTop: 2,
  },
  slSection: {
    marginBottom: 12,
  },
  slBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  slPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  slPct: {
    fontSize: 12,
  },
  triggersSection: {
    marginBottom: 12,
  },
  triggersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  triggerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  triggersText: {
    fontSize: 11,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    marginLeft: 8,
  },
  profitText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
