import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../theme-context';
import { pumpDetector, type PumpEvent } from '../services/pumps';

export default function PumpsScreen() {
  const { theme } = useTheme();
  const [pumps, setPumps] = useState<PumpEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setPumps(pumpDetector.getAllPumps());

    const unsubscribe = pumpDetector.onPump(() => {
      setPumps(pumpDetector.getAllPumps());
    });

    // Update time display every minute
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setPumps(pumpDetector.getAllPumps());
      setRefreshing(false);
    }, 300);
  }, []);

  const activeCount = useMemo(
    () => pumps.filter(p => p.status === 'active').length,
    [pumps]
  );

  const renderPump = useCallback(({ item }: { item: PumpEvent }) => {
    const statusColor = item.status === 'active'
      ? theme.colors.changeUp
      : item.status === 'cooling'
        ? theme.colors.statusWarn
        : theme.colors.textSecondary;

    return (
      <View style={[styles.pumpCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.pumpHeader}>
          <Text style={[styles.symbol, { color: theme.colors.textPrimary }]}>
            {item.symbol.replace('USDT', '')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.exchange, { color: theme.colors.textSecondary }]}>
          {item.exchange.toUpperCase()}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
            ${item.currentPrice < 1 ? item.currentPrice.toPrecision(4) : item.currentPrice.toLocaleString()}
          </Text>
          <Text style={[styles.change, { color: theme.colors.changeUpText }]}>
            +{item.changePct.toFixed(2)}%
          </Text>
        </View>
        <Text style={[styles.peak, { color: theme.colors.textSecondary }]}>
          Peak: +{item.peakChangePct.toFixed(2)}% @ ${item.peakPrice.toLocaleString()}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          Started {Math.round((Date.now() - item.startTime) / 60000)}m ago
        </Text>
      </View>
    );
  }, [theme.colors]);

  const keyExtractor = useCallback((item: PumpEvent) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        Pump Detection
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {activeCount} active pumps
      </Text>
      <FlatList
        data={pumps}
        renderItem={renderPump}
        keyExtractor={keyExtractor}
        extraData={theme.colors}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No pumps detected yet. Monitoring all exchanges...
            </Text>
          </View>
        }
        maxToRenderPerBatch={10}
        initialNumToRender={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', padding: 16, paddingBottom: 4 },
  subtitle: { fontSize: 14, paddingHorizontal: 16, paddingBottom: 16 },
  list: { padding: 16, paddingTop: 0 },
  pumpCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  pumpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  symbol: { fontSize: 20, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  exchange: { fontSize: 12, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  price: { fontSize: 18, fontWeight: '600' },
  change: { fontSize: 16, fontWeight: 'bold' },
  peak: { fontSize: 12, marginBottom: 4 },
  time: { fontSize: 12 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { textAlign: 'center' },
});
