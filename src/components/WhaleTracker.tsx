import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme-context';
import type { ExchangeId } from '../services/exchanges/types';

export interface WhaleOrder {
  id: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  valueUsd: number;
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
}

interface WhaleTrackerProps {
  orders: WhaleOrder[];
  threshold: number; // Threshold in USD
  maxOrders?: number;
}

export default function WhaleTracker({
  orders,
  threshold,
  maxOrders = 5,
}: WhaleTrackerProps) {
  const { theme } = useTheme();

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => order.valueUsd >= threshold)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxOrders);
  }, [orders, threshold, maxOrders]);

  const formatVolume = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toPrecision(4);
  };

  const formatQuantity = (quantity: number) => {
    if (quantity >= 1000000) return `${(quantity / 1000000).toFixed(2)}M`;
    if (quantity >= 1000) return `${(quantity / 1000).toFixed(2)}K`;
    if (quantity >= 1) return quantity.toFixed(2);
    return quantity.toPrecision(4);
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (filteredOrders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Крупные ордера
          </Text>
          <View style={[styles.thresholdBadge, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.thresholdText, { color: theme.colors.textSecondary }]}>
              &gt; {formatVolume(threshold)}
            </Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon, { color: theme.colors.textMuted }]}>
            Крупные ордера не обнаружены
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textFaint }]}>
            Ордера выше {formatVolume(threshold)} будут отображаться здесь
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Крупные ордера
        </Text>
        <View style={[styles.thresholdBadge, { backgroundColor: theme.colors.metricCard }]}>
          <Text style={[styles.thresholdText, { color: theme.colors.textSecondary }]}>
            &gt; {formatVolume(threshold)}
          </Text>
        </View>
      </View>

      {filteredOrders.map((order, index) => {
        const isBuy = order.side === 'buy';
        const sideColor = isBuy ? theme.colors.success : theme.colors.danger;
        const bgColor = isBuy ? theme.colors.changeUp : theme.colors.changeDown;
        const textColor = isBuy ? theme.colors.changeUpText : theme.colors.changeDownText;

        // Calculate intensity based on value relative to threshold
        const intensity = Math.min((order.valueUsd / threshold - 1) / 4, 1);
        const barWidth = 30 + intensity * 70; // 30% to 100% width

        return (
          <Animated.View
            key={order.id}
            style={[
              styles.orderRow,
              {
                backgroundColor: bgColor,
                opacity: 1 - index * 0.1, // Fade older orders slightly
              },
            ]}
          >
            {/* Background intensity bar */}
            <View
              style={[
                styles.intensityBar,
                {
                  width: `${barWidth}%`,
                  backgroundColor: sideColor,
                  opacity: 0.15 + intensity * 0.15,
                },
              ]}
            />

            <View style={styles.orderContent}>
              {/* Side indicator */}
              <View style={[styles.sideIndicator, { backgroundColor: sideColor }]}>
                <Text style={styles.sideText}>
                  {isBuy ? 'ПОКУПКА' : 'ПРОДАЖА'}
                </Text>
              </View>

              {/* Order details */}
              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.valueText, { color: textColor }]}>
                    {formatVolume(order.valueUsd)}
                  </Text>
                  <Text style={[styles.quantityText, { color: theme.colors.textSecondary }]}>
                    {formatQuantity(order.quantity)} @ {formatPrice(order.price)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.exchangeText, { color: theme.colors.textMuted }]}>
                    {order.exchange.toUpperCase()}
                  </Text>
                  <Text style={[styles.timeText, { color: theme.colors.textFaint }]}>
                    {formatTime(order.timestamp)}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        );
      })}

      {orders.length > maxOrders && (
        <Text style={[styles.moreText, { color: theme.colors.textMuted }]}>
          +{orders.length - maxOrders} ещё ордеров
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  thresholdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  thresholdText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 14,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
  },
  orderRow: {
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  intensityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 8,
  },
  orderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  sideIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  sideText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderDetails: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exchangeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 10,
  },
  moreText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 4,
  },
});
