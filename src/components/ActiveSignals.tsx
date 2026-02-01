import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../theme-context';
import type { Signal } from '../services/signals/types';

interface SignalRowProps {
  signal: Signal;
  dividerColor: string;
  textPrimaryColor: string;
  changeUpColor: string;
  changeDownColor: string;
}

const SignalRow = React.memo(function SignalRow({
  signal,
  dividerColor,
  textPrimaryColor,
  changeUpColor,
  changeDownColor,
}: SignalRowProps) {
  return (
    <View style={[styles.signalRow, { borderBottomColor: dividerColor }]}>
      <View style={styles.signalInfo}>
        <Text style={[styles.signalSymbol, { color: textPrimaryColor }]}>{signal.symbol}</Text>
        <Text style={[
          styles.signalDirection,
          { color: signal.direction === 'BUY' ? changeUpColor : changeDownColor }
        ]}>
          {signal.direction}
        </Text>
      </View>
      <Text style={[styles.signalProfit, { color: changeUpColor }]}>
        {signal.profit ? `+$${signal.profit.toFixed(2)}` : 'Ожидание'}
      </Text>
    </View>
  );
});

interface ActiveSignalsProps {
  signals: Signal[];
  isPro?: boolean;
  onUpgrade?: () => void;
}

function ActiveSignals({ signals, isPro = false, onUpgrade }: ActiveSignalsProps) {
  const { theme } = useTheme();

  const renderSignal = useCallback(({ item }: { item: Signal }) => (
    <SignalRow
      signal={item}
      dividerColor={theme.colors.divider}
      textPrimaryColor={theme.colors.textPrimary}
      changeUpColor={theme.colors.changeUpText}
      changeDownColor={theme.colors.changeDownText}
    />
  ), [theme.colors]);

  const keyExtractor = useCallback((item: Signal) => item.id, []);

  if (!isPro) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Торговые сигналы</Text>
        <Text style={[styles.proText, { color: theme.colors.textSecondary }]}>
          Получите AI-сигналы с Pro подпиской
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: theme.colors.accent }]}
          onPress={onUpgrade}
        >
          <Text style={styles.upgradeText}>Оформить Pro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Мои сигналы (Pro)</Text>
      {signals.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Нет активных сигналов. Скоро появятся новые.
        </Text>
      ) : (
        <FlatList
          data={signals}
          renderItem={renderSignal}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
          maxToRenderPerBatch={10}
          initialNumToRender={5}
        />
      )}
    </View>
  );
}

export default React.memo(ActiveSignals);

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12, marginBottom: 16, marginHorizontal: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  proText: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  upgradeButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  upgradeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  signalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  signalInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalSymbol: { fontSize: 16, fontWeight: 'bold' },
  signalDirection: { fontSize: 14, fontWeight: '600' },
  signalProfit: { fontSize: 16, fontWeight: 'bold' },
});
