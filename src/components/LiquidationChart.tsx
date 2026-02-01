import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme-context';
import type { LiquidationLevel } from '../services/liquidations';
import { formatVolume, formatPrice } from '../services/liquidations';

interface LiquidationChartProps {
  levels: LiquidationLevel[];
  currentPrice: number;
  maxWidth?: number;
}

const CHART_HEIGHT = 24;
const MIN_BAR_WIDTH = 8;
const MAX_BAR_WIDTH_RATIO = 0.6; // Bar takes max 60% of available space

export default function LiquidationChart({
  levels,
  currentPrice,
  maxWidth = Dimensions.get('window').width - 120,
}: LiquidationChartProps) {
  const { theme } = useTheme();

  // Separate long and short levels with validation
  const { shortLevels, longLevels, maxVolume } = useMemo(() => {
    // Filter out levels with invalid prices
    const validLevels = (levels || []).filter(
      l => Number.isFinite(l.price) && l.price > 0
    );

    const shorts = validLevels
      .filter(l => l.type === 'short')
      .sort((a, b) => a.price - b.price); // Sort ascending by price
    const longs = validLevels
      .filter(l => l.type === 'long')
      .sort((a, b) => b.price - a.price); // Sort descending by price

    const max = validLevels.length > 0
      ? Math.max(...validLevels.map(l => l.totalVolume), 1)
      : 1;

    return { shortLevels: shorts, longLevels: longs, maxVolume: max };
  }, [levels]);

  const renderLevel = (level: LiquidationLevel, index: number) => {
    // Calculate bar width as percentage of available space (capped at MAX_BAR_WIDTH_RATIO)
    const volumeRatio = level.totalVolume / maxVolume;
    const barWidthPercent = Math.max(volumeRatio * MAX_BAR_WIDTH_RATIO * 100, 5); // Min 5%

    const isLong = level.type === 'long';
    const barColor = isLong ? theme.colors.success : theme.colors.danger;
    const textColor = isLong ? theme.colors.changeUpText : theme.colors.changeDownText;

    return (
      <View key={`${level.type}-${level.leverage}`} style={styles.levelRow}>
        {/* Price label */}
        <View style={styles.priceColumn}>
          <Text style={[styles.priceText, { color: theme.colors.textSecondary }]}>
            {formatPrice(level.price)}
          </Text>
          <Text style={[styles.leverageText, { color: theme.colors.textMuted }]}>
            {level.leverage}x
          </Text>
        </View>

        {/* Bar and Volume container */}
        <View style={styles.barContainer}>
          <View style={styles.barRow}>
            {/* Bar (proportional width) */}
            <View
              style={[
                styles.bar,
                {
                  width: `${barWidthPercent}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
            {/* Volume text (outside bar) */}
            <Text style={[styles.volumeText, { color: theme.colors.textSecondary }]}>
              {formatVolume(level.totalVolume)}
            </Text>
          </View>
        </View>

        {/* Distance */}
        <View style={styles.distanceColumn}>
          <Text style={[styles.distanceText, { color: textColor }]}>
            {isLong ? '-' : '+'}{Number.isFinite(level.distancePercent) ? level.distancePercent.toFixed(1) : '—'}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Short liquidations (above current price) */}
      {shortLevels.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>
              Ликвидации шортов
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
              (если цена вырастет)
            </Text>
          </View>
          {shortLevels.map((level, i) => renderLevel(level, i))}
        </View>
      )}

      {/* Current price indicator */}
      {Number.isFinite(currentPrice) && currentPrice > 0 && (
        <View style={[styles.currentPriceRow, { backgroundColor: theme.colors.metricCard }]}>
          <View style={styles.priceColumn}>
            <Text style={[styles.currentPriceLabel, { color: theme.colors.textMuted }]}>
              Текущая
            </Text>
          </View>
          <View style={styles.currentPriceCenter}>
            <View style={[styles.priceLine, { backgroundColor: theme.colors.accent }]} />
            <View style={[styles.priceIndicator, { backgroundColor: theme.colors.accent }]}>
              <Text style={[styles.currentPriceText, { color: theme.colors.buttonText }]}>
                {formatPrice(currentPrice)}
              </Text>
            </View>
            <View style={[styles.priceLine, { backgroundColor: theme.colors.accent }]} />
          </View>
          <View style={styles.distanceColumn} />
        </View>
      )}

      {/* Long liquidations (below current price) */}
      {longLevels.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>
              Ликвидации лонгов
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
              (если цена упадёт)
            </Text>
          </View>
          {longLevels.map((level, i) => renderLevel(level, i))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginLeft: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    height: CHART_HEIGHT,
  },
  priceColumn: {
    width: 70,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  leverageText: {
    fontSize: 9,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CHART_HEIGHT,
  },
  bar: {
    height: CHART_HEIGHT - 4,
    borderRadius: 4,
    opacity: 0.8,
  },
  volumeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
  },
  distanceColumn: {
    width: 55,
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  currentPriceCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLine: {
    flex: 1,
    height: 2,
  },
  priceIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  currentPriceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentPriceLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
