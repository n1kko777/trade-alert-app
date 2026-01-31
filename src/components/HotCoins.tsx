import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme-context';
import type { Ticker } from '../services/exchanges/types';

interface HotCoinsProps {
  coins: Ticker[];
  onCoinPress?: (coin: Ticker) => void;
}

function HotCoins({ coins, onCoinPress }: HotCoinsProps) {
  const { theme } = useTheme();

  const renderCoin = useCallback(({ item }: { item: Ticker }) => {
    const isPositive = item.priceChangePct24h >= 0;
    return (
      <TouchableOpacity
        style={[styles.coinCard, { backgroundColor: theme.colors.card }]}
        onPress={() => onCoinPress?.(item)}
      >
        <Text style={[styles.symbol, { color: theme.colors.textPrimary }]}>
          {item.symbol.replace('USDT', '')}
        </Text>
        <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
          ${item.price < 1 ? item.price.toPrecision(4) : item.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.change, { color: isPositive ? theme.colors.changeUpText : theme.colors.changeDownText }]}>
          {isPositive ? '+' : ''}{item.priceChangePct24h.toFixed(2)}%
        </Text>
      </TouchableOpacity>
    );
  }, [theme.colors, onCoinPress]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Hot Coins</Text>
      <FlatList
        data={coins}
        renderItem={renderCoin}
        keyExtractor={(item) => item.symbol}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        maxToRenderPerBatch={10}
        initialNumToRender={5}
      />
    </View>
  );
}

export default React.memo(HotCoins);

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 16 },
  list: { paddingHorizontal: 12 },
  coinCard: { padding: 12, borderRadius: 12, marginHorizontal: 4, minWidth: 100, alignItems: 'center' },
  symbol: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  price: { fontSize: 14, marginBottom: 2 },
  change: { fontSize: 14, fontWeight: '600' },
});
