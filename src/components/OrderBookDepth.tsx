import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Svg, { Path, Line, Text as SvgText, G, Rect, Circle } from 'react-native-svg';
import { useTheme } from '../theme-context';
import type { OrderBookEntry } from '../services/exchanges/types';

interface OrderBookDepthProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  currentPrice: number;
  maxWidth?: number;
  height?: number;
}

interface TouchInfo {
  side: 'bid' | 'ask';
  price: number;
  volume: number;
}

export default function OrderBookDepth({
  bids,
  asks,
  currentPrice,
  maxWidth = Dimensions.get('window').width - 32,
  height = 200,
}: OrderBookDepthProps) {
  const { theme } = useTheme();
  const [touchInfo, setTouchInfo] = useState<TouchInfo | null>(null);

  // Calculate depth chart data
  const chartData = useMemo(() => {
    if (bids.length === 0 && asks.length === 0) {
      return { bidPath: '', askPath: '', minPrice: 0, maxPrice: 0, maxVolume: 0 };
    }

    // Get cumulative volumes (already provided in total)
    const bidData = bids.map(b => ({ price: b.price, cumVolume: b.total }));
    const askData = asks.map(a => ({ price: a.price, cumVolume: a.total }));

    // Find price range (with some padding)
    const allPrices = [...bidData.map(b => b.price), ...askData.map(a => a.price)];
    const minPrice = Math.min(...allPrices) * 0.995;
    const maxPrice = Math.max(...allPrices) * 1.005;
    const priceRange = maxPrice - minPrice;

    // Find max volume for scaling
    const maxBidVolume = bidData.length > 0 ? Math.max(...bidData.map(b => b.cumVolume)) : 0;
    const maxAskVolume = askData.length > 0 ? Math.max(...askData.map(a => a.cumVolume)) : 0;
    const maxVolume = Math.max(maxBidVolume, maxAskVolume, 1);

    // Chart dimensions
    const chartWidth = maxWidth;
    const chartHeight = height - 40; // Leave room for labels
    const midX = chartWidth / 2;

    // Scale functions
    const priceToY = (price: number) => {
      return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    const volumeToX = (volume: number, side: 'bid' | 'ask') => {
      const normalizedVolume = volume / maxVolume;
      const xOffset = normalizedVolume * (midX - 10);
      return side === 'bid' ? midX - xOffset : midX + xOffset;
    };

    // Build bid path (left side, green)
    let bidPath = '';
    if (bidData.length > 0) {
      // Sort bids by price descending (highest first)
      const sortedBids = [...bidData].sort((a, b) => b.price - a.price);

      // Start from middle at highest bid price
      bidPath = `M ${midX} ${priceToY(sortedBids[0].price)}`;

      // Draw step-wise path
      sortedBids.forEach((bid, i) => {
        const x = volumeToX(bid.cumVolume, 'bid');
        const y = priceToY(bid.price);
        if (i === 0) {
          bidPath += ` L ${x} ${y}`;
        } else {
          // Horizontal then vertical for step effect
          const prevY = priceToY(sortedBids[i - 1].price);
          const prevX = volumeToX(sortedBids[i - 1].cumVolume, 'bid');
          bidPath += ` L ${prevX} ${y} L ${x} ${y}`;
        }
      });

      // Close path back to middle
      const lastBid = sortedBids[sortedBids.length - 1];
      bidPath += ` L ${midX} ${priceToY(lastBid.price)} Z`;
    }

    // Build ask path (right side, red)
    let askPath = '';
    if (askData.length > 0) {
      // Sort asks by price ascending (lowest first)
      const sortedAsks = [...askData].sort((a, b) => a.price - b.price);

      // Start from middle at lowest ask price
      askPath = `M ${midX} ${priceToY(sortedAsks[0].price)}`;

      // Draw step-wise path
      sortedAsks.forEach((ask, i) => {
        const x = volumeToX(ask.cumVolume, 'ask');
        const y = priceToY(ask.price);
        if (i === 0) {
          askPath += ` L ${x} ${y}`;
        } else {
          // Horizontal then vertical for step effect
          const prevY = priceToY(sortedAsks[i - 1].price);
          const prevX = volumeToX(sortedAsks[i - 1].cumVolume, 'ask');
          askPath += ` L ${prevX} ${y} L ${x} ${y}`;
        }
      });

      // Close path back to middle
      const lastAsk = sortedAsks[sortedAsks.length - 1];
      askPath += ` L ${midX} ${priceToY(lastAsk.price)} Z`;
    }

    return {
      bidPath,
      askPath,
      minPrice,
      maxPrice,
      maxVolume,
      priceToY,
      volumeToX,
      chartHeight,
      midX,
    };
  }, [bids, asks, maxWidth, height]);

  const handleTouch = useCallback((event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = event.nativeEvent;
    const { midX, minPrice, maxPrice, maxVolume, chartHeight } = chartData;

    if (!chartHeight || !midX) return;

    // Determine which side was touched
    const side: 'bid' | 'ask' = locationX < midX ? 'bid' : 'ask';

    // Convert Y to price
    const priceRange = maxPrice - minPrice;
    const price = maxPrice - (locationY / chartHeight) * priceRange;

    // Find closest order
    const orders = side === 'bid' ? bids : asks;
    let closestOrder: OrderBookEntry | null = null;
    let minDiff = Infinity;

    for (const order of orders) {
      const diff = Math.abs(order.price - price);
      if (diff < minDiff) {
        minDiff = diff;
        closestOrder = order;
      }
    }

    if (closestOrder) {
      setTouchInfo({
        side,
        price: closestOrder.price,
        volume: closestOrder.total,
      });
    }
  }, [bids, asks, chartData]);

  const handleTouchEnd = useCallback(() => {
    setTouchInfo(null);
  }, []);

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

  if (bids.length === 0 && asks.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No order book data
        </Text>
      </View>
    );
  }

  const chartHeight = height - 40;
  const currentPriceY = chartData.priceToY ? chartData.priceToY(currentPrice) : chartHeight / 2;

  return (
    <View style={[styles.container, { height }]}>
      <TouchableWithoutFeedback
        onPressIn={handleTouch}
        onPressOut={handleTouchEnd}
      >
        <View>
          <Svg width={maxWidth} height={chartHeight}>
            {/* Bid area (green) */}
            {chartData.bidPath && (
              <Path
                d={chartData.bidPath}
                fill={theme.colors.changeUp}
                stroke={theme.colors.success}
                strokeWidth={1}
                opacity={0.7}
              />
            )}

            {/* Ask area (red) */}
            {chartData.askPath && (
              <Path
                d={chartData.askPath}
                fill={theme.colors.changeDown}
                stroke={theme.colors.danger}
                strokeWidth={1}
                opacity={0.7}
              />
            )}

            {/* Current price line */}
            {currentPriceY >= 0 && currentPriceY <= chartHeight && (
              <G>
                <Line
                  x1={0}
                  y1={currentPriceY}
                  x2={maxWidth}
                  y2={currentPriceY}
                  stroke={theme.colors.accent}
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />
                <Rect
                  x={maxWidth / 2 - 40}
                  y={currentPriceY - 10}
                  width={80}
                  height={20}
                  rx={4}
                  fill={theme.colors.accent}
                />
                <SvgText
                  x={maxWidth / 2}
                  y={currentPriceY + 4}
                  fontSize={10}
                  fontWeight="bold"
                  fill={theme.colors.buttonText}
                  textAnchor="middle"
                >
                  {formatPrice(currentPrice)}
                </SvgText>
              </G>
            )}

            {/* Touch indicator */}
            {touchInfo && chartData.priceToY && chartData.volumeToX && (
              <G>
                <Circle
                  cx={chartData.volumeToX(touchInfo.volume, touchInfo.side)}
                  cy={chartData.priceToY(touchInfo.price)}
                  r={6}
                  fill={touchInfo.side === 'bid' ? theme.colors.success : theme.colors.danger}
                />
                <Rect
                  x={chartData.volumeToX(touchInfo.volume, touchInfo.side) - 50}
                  y={chartData.priceToY(touchInfo.price) - 30}
                  width={100}
                  height={24}
                  rx={4}
                  fill={theme.colors.card}
                  stroke={touchInfo.side === 'bid' ? theme.colors.success : theme.colors.danger}
                  strokeWidth={1}
                />
                <SvgText
                  x={chartData.volumeToX(touchInfo.volume, touchInfo.side)}
                  y={chartData.priceToY(touchInfo.price) - 14}
                  fontSize={10}
                  fill={theme.colors.textPrimary}
                  textAnchor="middle"
                >
                  {formatVolume(touchInfo.volume)} @ {formatPrice(touchInfo.price)}
                </SvgText>
              </G>
            )}
          </Svg>

          {/* Labels */}
          <View style={styles.labels}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: theme.colors.success }]}>
                Bids (Buy)
              </Text>
              <Text style={[styles.labelCenter, { color: theme.colors.textMuted }]}>
                Price
              </Text>
              <Text style={[styles.label, { color: theme.colors.danger }]}>
                Asks (Sell)
              </Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={[styles.volumeLabel, { color: theme.colors.textSecondary }]}>
                Vol: {formatVolume(chartData.maxVolume)}
              </Text>
              <Text style={[styles.priceRange, { color: theme.colors.textMuted }]}>
                {formatPrice(chartData.minPrice)} - {formatPrice(chartData.maxPrice)}
              </Text>
              <Text style={[styles.volumeLabel, { color: theme.colors.textSecondary }]}>
                Vol: {formatVolume(chartData.maxVolume)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
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
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  labelCenter: {
    fontSize: 11,
    textAlign: 'center',
    flex: 1,
  },
  volumeLabel: {
    fontSize: 10,
    flex: 1,
  },
  priceRange: {
    fontSize: 10,
    textAlign: 'center',
    flex: 1,
  },
});
