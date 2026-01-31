import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../theme-context';

export interface PnLDataPoint {
  timestamp: number;
  value: number;
}

interface PnLChartProps {
  data: PnLDataPoint[];
  currentValue: number;
}

type TimePeriod = '24h' | '7d' | '30d' | 'all';

const CHART_HEIGHT = 120;
const CHART_PADDING = { top: 10, right: 10, bottom: 20, left: 10 };

export default function PnLChart({ data, currentValue }: PnLChartProps) {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<TimePeriod>('7d');

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    const now = Date.now();
    let cutoff: number;

    switch (period) {
      case '24h':
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'all':
      default:
        cutoff = 0;
        break;
    }

    return data.filter(d => d.timestamp >= cutoff).sort((a, b) => a.timestamp - b.timestamp);
  }, [data, period]);

  const { change, changePercent, isPositive } = useMemo(() => {
    if (filteredData.length < 2) {
      return { change: 0, changePercent: 0, isPositive: true };
    }

    const firstValue = filteredData[0].value;
    const lastValue = filteredData[filteredData.length - 1].value;
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

    return {
      change,
      changePercent,
      isPositive: change >= 0,
    };
  }, [filteredData]);

  const chartWidth = useMemo(() => {
    // Will be set dynamically, default to reasonable value
    return 300;
  }, []);

  const pathData = useMemo(() => {
    if (filteredData.length < 2) return { linePath: '', areaPath: '', points: [] };

    const width = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
    const height = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

    const values = filteredData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    const points = filteredData.map((d, i) => {
      const x = CHART_PADDING.left + (i / (filteredData.length - 1)) * width;
      const y = CHART_PADDING.top + height - ((d.value - minValue) / valueRange) * height;
      return { x, y };
    });

    // Create smooth curve path
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Area path for gradient fill
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${points[0].x} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`;

    return { linePath, areaPath, points };
  }, [filteredData, chartWidth]);

  const formatValue = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChangePercent = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const periods: TimePeriod[] = ['24h', '7d', '30d', 'all'];

  const lineColor = isPositive ? theme.colors.changeUpText : theme.colors.changeDownText;
  const gradientColor = isPositive ? theme.colors.changeUp : theme.colors.changeDown;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            Portfolio Value
          </Text>
          <Text style={[styles.value, { color: theme.colors.textPrimary }]}>
            {formatValue(currentValue)}
          </Text>
        </View>
        <View style={styles.changeContainer}>
          <Text style={[styles.changeValue, { color: lineColor }]}>
            {formatChange(change)}
          </Text>
          <View style={[styles.changeBadge, { backgroundColor: gradientColor }]}>
            <Text style={[styles.changePercent, { color: lineColor }]}>
              {isPositive ? '\u2191' : '\u2193'} {formatChangePercent(changePercent)}
            </Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View
        style={styles.chartContainer}
        onLayout={(e) => {
          // Dynamic width handling could be added here
        }}
      >
        {filteredData.length >= 2 ? (
          <Svg width="100%" height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
                <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            {/* Area fill */}
            <Path d={pathData.areaPath} fill="url(#areaGradient)" />
            {/* Line */}
            <Path
              d={pathData.linePath}
              stroke={lineColor}
              strokeWidth={2}
              fill="none"
            />
            {/* Grid lines */}
            <Line
              x1={CHART_PADDING.left}
              y1={CHART_HEIGHT - CHART_PADDING.bottom}
              x2={chartWidth - CHART_PADDING.right}
              y2={CHART_HEIGHT - CHART_PADDING.bottom}
              stroke={theme.colors.divider}
              strokeWidth={1}
            />
          </Svg>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: theme.colors.textMuted }]}>
              Not enough data for this period
            </Text>
          </View>
        )}
      </View>

      {/* Period selector */}
      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodButton,
              { backgroundColor: period === p ? theme.colors.accent : theme.colors.metaBadge },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodText,
                { color: period === p ? theme.colors.buttonText : theme.colors.textSecondary },
              ]}
            >
              {p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  changeContainer: {
    alignItems: 'flex-end',
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changePercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    height: CHART_HEIGHT,
    marginBottom: 16,
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 13,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
