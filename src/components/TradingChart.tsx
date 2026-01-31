import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../theme-context';
import type { Candle } from '../services/exchanges/types';

interface TradingChartProps {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  onReady?: () => void;
  height?: number;
}

export default function TradingChart({
  candles,
  symbol,
  timeframe,
  onReady,
  height = 350,
}: TradingChartProps) {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format candles for TradingView Lightweight Charts
  const formatCandlesForChart = useCallback((data: Candle[]) => {
    return data.map((candle) => ({
      time: Math.floor(candle.time / 1000), // Convert to seconds
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
  }, []);

  // HTML content with TradingView Lightweight Charts
  const chartHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: ${theme.colors.card};
    }
    #chart {
      width: 100%;
      height: 100%;
    }
    .watermark {
      position: absolute;
      top: 12px;
      left: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: ${theme.colors.textMuted};
      opacity: 0.7;
      pointer-events: none;
      z-index: 10;
    }
  </style>
</head>
<body>
  <div class="watermark" id="watermark"></div>
  <div id="chart"></div>
  <script>
    let chart = null;
    let candleSeries = null;

    function initChart() {
      const container = document.getElementById('chart');

      chart = LightweightCharts.createChart(container, {
        layout: {
          background: { type: 'solid', color: '${theme.colors.card}' },
          textColor: '${theme.colors.textSecondary}',
        },
        grid: {
          vertLines: { color: '${theme.colors.divider}' },
          horzLines: { color: '${theme.colors.divider}' },
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: {
            color: '${theme.colors.accent}',
            width: 1,
            style: LightweightCharts.LineStyle.Dashed,
          },
          horzLine: {
            color: '${theme.colors.accent}',
            width: 1,
            style: LightweightCharts.LineStyle.Dashed,
          },
        },
        rightPriceScale: {
          borderColor: '${theme.colors.divider}',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: '${theme.colors.divider}',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: {
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          pinch: true,
        },
      });

      candleSeries = chart.addCandlestickSeries({
        upColor: '${theme.colors.success}',
        downColor: '${theme.colors.danger}',
        borderUpColor: '${theme.colors.success}',
        borderDownColor: '${theme.colors.danger}',
        wickUpColor: '${theme.colors.success}',
        wickDownColor: '${theme.colors.danger}',
      });

      // Handle resize
      window.addEventListener('resize', () => {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      });

      // Notify React Native that chart is ready
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'chartReady' }));
    }

    function updateCandles(data) {
      if (!candleSeries || !data || data.length === 0) return;

      try {
        candleSeries.setData(data);
        chart.timeScale().fitContent();
      } catch (error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    }

    function updateWatermark(text) {
      const watermark = document.getElementById('watermark');
      if (watermark) {
        watermark.textContent = text;
      }
    }

    function zoomIn() {
      if (chart) {
        const timeScale = chart.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        if (range) {
          const newRange = {
            from: range.from + (range.to - range.from) * 0.1,
            to: range.to - (range.to - range.from) * 0.1,
          };
          timeScale.setVisibleLogicalRange(newRange);
        }
      }
    }

    function zoomOut() {
      if (chart) {
        const timeScale = chart.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        if (range) {
          const newRange = {
            from: range.from - (range.to - range.from) * 0.1,
            to: range.to + (range.to - range.from) * 0.1,
          };
          timeScale.setVisibleLogicalRange(newRange);
        }
      }
    }

    function fitContent() {
      if (chart) {
        chart.timeScale().fitContent();
      }
    }

    // Initialize chart when DOM is ready
    document.addEventListener('DOMContentLoaded', initChart);

    // Handle messages from React Native
    window.addEventListener('message', function(event) {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'updateCandles':
            updateCandles(message.data);
            break;
          case 'updateWatermark':
            updateWatermark(message.text);
            break;
          case 'zoomIn':
            zoomIn();
            break;
          case 'zoomOut':
            zoomOut();
            break;
          case 'fitContent':
            fitContent();
            break;
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
  </script>
</body>
</html>
`;

  // Send candle data to WebView
  const sendCandleData = useCallback(() => {
    if (webViewRef.current && candles.length > 0) {
      const formattedCandles = formatCandlesForChart(candles);
      const message = JSON.stringify({
        type: 'updateCandles',
        data: formattedCandles,
      });
      webViewRef.current.postMessage(message);

      // Update watermark
      const watermarkMessage = JSON.stringify({
        type: 'updateWatermark',
        text: `${symbol} ${timeframe.toUpperCase()}`,
      });
      webViewRef.current.postMessage(watermarkMessage);
    }
  }, [candles, symbol, timeframe, formatCandlesForChart]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      switch (message.type) {
        case 'chartReady':
          setIsLoading(false);
          sendCandleData();
          onReady?.();
          break;
        case 'error':
          setError(message.message);
          break;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [sendCandleData, onReady]);

  // Update candles when data changes
  useEffect(() => {
    if (!isLoading) {
      sendCandleData();
    }
  }, [candles, isLoading, sendCandleData]);

  // Expose zoom controls
  const zoomIn = useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'zoomIn' }));
  }, []);

  const zoomOut = useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'zoomOut' }));
  }, []);

  const fitContent = useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'fitContent' }));
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { height, backgroundColor: theme.colors.card }]}>
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>
          Chart Error: {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, backgroundColor: theme.colors.card }]}>
      <WebView
        ref={webViewRef}
        source={{ html: chartHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setError(nativeEvent.description);
        }}
      />
      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.card }]}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading chart...
          </Text>
        </View>
      )}
    </View>
  );
}

// Export zoom controls for external use
export const ChartControls = {
  zoomIn: () => {},
  zoomOut: () => {},
  fitContent: () => {},
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
