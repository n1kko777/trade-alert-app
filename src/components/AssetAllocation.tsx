import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme-context';

export interface AssetAllocationItem {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
}

interface AssetAllocationProps {
  assets: AssetAllocationItem[];
  totalValue: number;
}

const CHART_SIZE = 180;
const OUTER_RADIUS = 80;
const INNER_RADIUS = 50;

// Colors for pie chart segments
const SEGMENT_COLORS = [
  '#2A9D8F', // Teal
  '#E9C46A', // Yellow
  '#E76F51', // Orange
  '#264653', // Dark blue
  '#F4A261', // Light orange
  '#7B68EE', // Purple
];

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  // Handle full circle case
  if (endAngle - startAngle >= 359.99) {
    endAngle = startAngle + 359.99;
  }

  const outerStart = polarToCartesian(x, y, outerRadius, endAngle);
  const outerEnd = polarToCartesian(x, y, outerRadius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    'M', outerStart.x, outerStart.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
    'L', innerEnd.x, innerEnd.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');
}

export default function AssetAllocation({ assets, totalValue }: AssetAllocationProps) {
  const { theme } = useTheme();

  const chartData = useMemo(() => {
    if (assets.length === 0) return [];

    // Sort by value descending
    const sorted = [...assets].sort((a, b) => b.value - a.value);

    // Take top 5 and group rest as "Other"
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);

    const result = [...top5];

    if (rest.length > 0) {
      const otherValue = rest.reduce((sum, item) => sum + item.value, 0);
      const otherPercentage = rest.reduce((sum, item) => sum + item.percentage, 0);
      result.push({
        symbol: 'OTHER',
        name: 'Other',
        value: otherValue,
        percentage: otherPercentage,
      });
    }

    return result;
  }, [assets]);

  const segments = useMemo(() => {
    let currentAngle = 0;
    return chartData.map((item, index) => {
      const segmentAngle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + segmentAngle;
      currentAngle = endAngle;

      // Calculate label position
      const midAngle = startAngle + segmentAngle / 2;
      const labelRadius = (INNER_RADIUS + OUTER_RADIUS) / 2;
      const labelPos = polarToCartesian(CHART_SIZE / 2, CHART_SIZE / 2, labelRadius, midAngle);

      return {
        ...item,
        startAngle,
        endAngle,
        color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
        labelX: labelPos.x,
        labelY: labelPos.y,
      };
    });
  }, [chartData]);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  if (assets.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
          No assets to display
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
      <View style={styles.chartRow}>
        {/* Donut Chart */}
        <View style={styles.chartContainer}>
          <Svg width={CHART_SIZE} height={CHART_SIZE}>
            <G>
              {segments.map((segment, index) => (
                <Path
                  key={segment.symbol}
                  d={describeArc(
                    CHART_SIZE / 2,
                    CHART_SIZE / 2,
                    INNER_RADIUS,
                    OUTER_RADIUS,
                    segment.startAngle,
                    segment.endAngle
                  )}
                  fill={segment.color}
                />
              ))}
            </G>
            {/* Center text */}
            <SvgText
              x={CHART_SIZE / 2}
              y={CHART_SIZE / 2 - 8}
              textAnchor="middle"
              fontSize={12}
              fill={theme.colors.textMuted}
            >
              Total
            </SvgText>
            <SvgText
              x={CHART_SIZE / 2}
              y={CHART_SIZE / 2 + 12}
              textAnchor="middle"
              fontSize={16}
              fontWeight="bold"
              fill={theme.colors.textPrimary}
            >
              {formatValue(totalValue)}
            </SvgText>
          </Svg>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {segments.map((segment, index) => (
            <View key={segment.symbol} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <View style={styles.legendText}>
                <Text style={[styles.legendSymbol, { color: theme.colors.textPrimary }]}>
                  {segment.symbol}
                </Text>
                <Text style={[styles.legendPercentage, { color: theme.colors.textMuted }]}>
                  {segment.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  legendSymbol: {
    fontSize: 13,
    fontWeight: '600',
  },
  legendPercentage: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 40,
  },
});
