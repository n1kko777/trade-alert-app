import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme-context';

interface PortfolioSummaryProps {
  balance: number;
  changePct: number;
  currency?: string;
}

export default function PortfolioSummary({ balance, changePct, currency = 'USD' }: PortfolioSummaryProps) {
  const { theme } = useTheme();
  const isPositive = changePct >= 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Portfolio</Text>
      <Text style={[styles.balance, { color: theme.colors.textPrimary }]}>
        {currency} {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
      <Text style={[styles.change, { color: isPositive ? theme.colors.changeUpText : theme.colors.changeDownText }]}>
        {isPositive ? '\u2191' : '\u2193'} {isPositive ? '+' : ''}{changePct.toFixed(2)}% today
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12, marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 4 },
  balance: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  change: { fontSize: 16 },
});
