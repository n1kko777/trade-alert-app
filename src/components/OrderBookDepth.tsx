import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Rect, G } from 'react-native-svg';
import { useTheme } from '../theme-context';
import type { OrderBookEntry } from '../services/exchanges/types';

interface OrderBookDepthProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  currentPrice: number;
  maxWidth?: number;
  height?: number;
}

export default function OrderBookDepth({
  bids,
  asks,
  currentPrice,
  maxWidth = Dimensions.get('window').width - 32,
  height = 200,
}: OrderBookDepthProps) {
  const { theme } = useTheme();

  const chartHeight = height - 50;
  const padding = 15;

  // Calculate depth chart data
  const chartData = useMemo(() => {
    if (bids.length === 0 && asks.length === 0) {
      return null;
    }

    // Sort bids by price descending (highest first - closest to spread)
    const sortedBids = [...bids].sort((a, b) => b.price - a.price);
    // Sort asks by price ascending (lowest first - closest to spread)
    const sortedAsks = [...asks].sort((a, b) => a.price - b.price);

    // Use equal spacing for visualization - each side gets half the width
    const halfWidth = (maxWidth - padding * 2) / 2;
    const midX = maxWidth / 2;

    // Calculate max cumulative volume for Y scaling
    const maxBidVolume = sortedBids.length > 0 ? Math.max(...sortedBids.map(b => b.total)) : 0;
    const maxAskVolume = sortedAsks.length > 0 ? Math.max(...sortedAsks.map(a => a.total)) : 0;
    const maxVolume = Math.max(maxBidVolume, maxAskVolume, 0.001);

    // Volume to Y: 0 at bottom, maxVolume at top
    const volumeToY = (volume: number): number => {
      const normalized = volume / maxVolume;
      return chartHeight - normalized * (chartHeight - padding);
    };

    // Build bid path - bids go from center to LEFT
    // Each bid spreads evenly across the left half
    let bidPath = '';
    if (sortedBids.length > 0) {
      const stepWidth = halfWidth / sortedBids.length;

      // Start at center bottom
      bidPath = `M ${midX} ${chartHeight}`;

      // First point - at center, up to first bid's volume
      bidPath += ` L ${midX} ${volumeToY(sortedBids[0].total)}`;

      // Step through each bid going left
      for (let i = 1; i < sortedBids.length; i++) {
        const prevY = volumeToY(sortedBids[i - 1].total);
        const currX = midX - (i * stepWidth);
        const currY = volumeToY(sortedBids[i].total);

        // Horizontal line to new X at previous height
        bidPath += ` L ${currX} ${prevY}`;
        // Vertical line to new height
        bidPath += ` L ${currX} ${currY}`;
      }

      // Close to bottom-left then back to start
      const lastX = midX - ((sortedBids.length - 1) * stepWidth);
      bidPath += ` L ${lastX} ${chartHeight}`;
      bidPath += ' Z';
    }

    // Build ask path - asks go from center to RIGHT
    let askPath = '';
    if (sortedAsks.length > 0) {
      const stepWidth = halfWidth / sortedAsks.length;

      // Start at center bottom
      askPath = `M ${midX} ${chartHeight}`;

      // First point - at center, up to first ask's volume
      askPath += ` L ${midX} ${volumeToY(sortedAsks[0].total)}`;

      // Step through each ask going right
      for (let i = 1; i < sortedAsks.length; i++) {
        const prevY = volumeToY(sortedAsks[i - 1].total);
        const currX = midX + (i * stepWidth);
        const currY = volumeToY(sortedAsks[i].total);

        // Horizontal line to new X at previous height
        askPath += ` L ${currX} ${prevY}`;
        // Vertical line to new height
        askPath += ` L ${currX} ${currY}`;
      }

      // Close to bottom-right then back to start
      const lastX = midX + ((sortedAsks.length - 1) * stepWidth);
      askPath += ` L ${lastX} ${chartHeight}`;
      askPath += ' Z';
    }

    // Get price info for labels
    const bestBid = sortedBids.length > 0 ? sortedBids[0].price : 0;
    const bestAsk = sortedAsks.length > 0 ? sortedAsks[0].price : 0;
    const worstBid = sortedBids.length > 0 ? sortedBids[sortedBids.length - 1].price : 0;
    const worstAsk = sortedAsks.length > 0 ? sortedAsks[sortedAsks.length - 1].price : 0;
    const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : currentPrice;

    return {
      bidPath,
      askPath,
      maxVolume,
      midX,
      midPrice,
      bestBid,
      bestAsk,
      worstBid,
      worstAsk,
    };
  }, [bids, asks, currentPrice, maxWidth, chartHeight, padding]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toPrecision(4);
  };

  if (!chartData) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Нет данных стакана
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={maxWidth} height={chartHeight}>
        {/* Bid area (green) - left side */}
        {chartData.bidPath && (
          <Path
            d={chartData.bidPath}
            fill={theme.colors.success}
            fillOpacity={0.3}
            stroke={theme.colors.success}
            strokeWidth={2}
          />
        )}

        {/* Ask area (red) - right side */}
        {chartData.askPath && (
          <Path
            d={chartData.askPath}
            fill={theme.colors.danger}
            fillOpacity={0.3}
            stroke={theme.colors.danger}
            strokeWidth={2}
          />
        )}

        {/* Center line (spread) */}
        <Line
          x1={chartData.midX}
          y1={0}
          x2={chartData.midX}
          y2={chartHeight}
          stroke={theme.colors.accent}
          strokeWidth={2}
          strokeDasharray="5,5"
        />

        {/* Mid price label */}
        <G>
          <Rect
            x={chartData.midX - 50}
            y={5}
            width={100}
            height={22}
            rx={4}
            fill={theme.colors.accent}
          />
          <SvgText
            x={chartData.midX}
            y={20}
            fontSize={12}
            fontWeight="bold"
            fill={theme.colors.buttonText}
            textAnchor="middle"
          >
            {formatPrice(chartData.midPrice)}
          </SvgText>
        </G>
      </Svg>

      {/* Labels */}
      <View style={styles.labels}>
        <View style={styles.labelRow}>
          <View style={styles.labelLeft}>
            <Text style={[styles.sideLabel, { color: theme.colors.success }]}>
              Биды
            </Text>
            <Text style={[styles.priceSmall, { color: theme.colors.textMuted }]}>
              {formatPrice(chartData.worstBid)} - {formatPrice(chartData.bestBid)}
            </Text>
          </View>
          <Text style={[styles.volumeLabel, { color: theme.colors.textSecondary }]}>
            Макс: {formatVolume(chartData.maxVolume)}
          </Text>
          <View style={styles.labelRight}>
            <Text style={[styles.sideLabel, { color: theme.colors.danger, textAlign: 'right' }]}>
              Аски
            </Text>
            <Text style={[styles.priceSmall, { color: theme.colors.textMuted, textAlign: 'right' }]}>
              {formatPrice(chartData.bestAsk)} - {formatPrice(chartData.worstAsk)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  labels: {
    width: '100%',
    paddingTop: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  labelLeft: {
    flex: 1,
  },
  labelRight: {
    flex: 1,
  },
  sideLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceSmall: {
    fontSize: 9,
    marginTop: 2,
  },
  volumeLabel: {
    fontSize: 10,
    textAlign: 'center',
    flex: 1,
  },
});
