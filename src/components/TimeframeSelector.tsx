import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme-context';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1м' },
  { value: '5m', label: '5м' },
  { value: '15m', label: '15м' },
  { value: '1h', label: '1ч' },
  { value: '4h', label: '4ч' },
  { value: '1d', label: '1д' },
  { value: '1w', label: '1н' },
];

interface TimeframeSelectorProps {
  selectedTimeframe: Timeframe;
  onSelect: (timeframe: Timeframe) => void;
}

export default function TimeframeSelector({
  selectedTimeframe,
  onSelect,
}: TimeframeSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TIMEFRAMES.map((tf) => {
          const isActive = tf.value === selectedTimeframe;
          return (
            <TouchableOpacity
              key={tf.value}
              style={[
                styles.button,
                {
                  backgroundColor: isActive
                    ? theme.colors.accent
                    : theme.colors.metricCard,
                },
              ]}
              onPress={() => onSelect(tf.value)}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: isActive
                      ? theme.colors.buttonText
                      : theme.colors.textSecondary,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
  },
});
