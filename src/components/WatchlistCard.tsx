import React from 'react';
import { Text, View } from 'react-native';
import { Polyline, Svg } from 'react-native-svg';
import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH } from '../constants';
import { useTheme } from '../theme-context';
import { PricePoint, Quote, Settings } from '../types';
import { resolveSymbolRule, getSparklinePoints } from '../utils/data';
import { formatClock, formatPrice } from '../utils/format';

type WatchlistCardProps = {
  symbol: string;
  quote?: Quote;
  history: PricePoint[];
  settings: Settings;
};

export default function WatchlistCard({ symbol, quote, history, settings }: WatchlistCardProps) {
  const { theme, styles } = useTheme();
  const changePct = quote?.changePct ?? 0;
  const isUp = changePct > 0.01;
  const isDown = changePct < -0.01;
  const { windowMinutes, thresholdPct, cooldownMinutes } = resolveSymbolRule(settings, symbol);
  const trimmedHistory = history.slice(-40);
  const historyPrices = trimmedHistory.map((point) => point.price);
  const minPrice = historyPrices.length ? Math.min(...historyPrices) : undefined;
  const maxPrice = historyPrices.length ? Math.max(...historyPrices) : undefined;
  const hasRange = typeof minPrice === 'number' && typeof maxPrice === 'number';
  const rangeText = hasRange
    ? `Диапазон $${formatPrice(minPrice)} - $${formatPrice(maxPrice)}`
    : 'Диапазон --';
  const sparklinePoints = getSparklinePoints(
    trimmedHistory,
    SPARKLINE_WIDTH,
    SPARKLINE_HEIGHT
  );
  const sparklineColor = isUp
    ? theme.colors.statusGood
    : isDown
    ? theme.colors.statusBad
    : theme.colors.statusMuted;
  const alertConfigText = `Алерт ${thresholdPct}% • ${windowMinutes}м • КД ${cooldownMinutes}м`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.cardSub}>Bybit Spot</Text>
        </View>
        <View
          style={[
            styles.changePill,
            isUp ? styles.changeUp : isDown ? styles.changeDown : styles.changeFlat,
          ]}
        >
          <Text
            style={[
              styles.changeText,
              isUp ? styles.changeUpText : isDown ? styles.changeDownText : null,
            ]}
          >
            {changePct >= 0 ? '+' : ''}
            {changePct.toFixed(2)}%
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.price}>${formatPrice(quote?.price)}</Text>
          <Text style={styles.cardMeta}>Обновлено {formatClock(quote?.lastUpdated)}</Text>
          <Text style={styles.cardRange}>{rangeText}</Text>
          <Text style={styles.cardConfig}>{alertConfigText}</Text>
        </View>
        <View style={styles.sparklineWrap}>
          <View style={styles.sparklineSurface}>
            <Svg width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT}>
              {sparklinePoints ? (
                <Polyline
                  points={sparklinePoints}
                  fill="none"
                  stroke={sparklineColor}
                  strokeWidth={2}
                />
              ) : null}
            </Svg>
          </View>
          <Text style={styles.sparklineLabel}>Тренд {windowMinutes}м</Text>
        </View>
      </View>
    </View>
  );
}
