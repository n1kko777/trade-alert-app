import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme-context';
import OrderBookDepth from '../components/OrderBookDepth';
import WhaleTracker, { type WhaleOrder } from '../components/WhaleTracker';
import {
  binanceService,
  bybitService,
  okxService,
  mexcService,
  type ExchangeId,
  type ExchangeService,
  type OrderBook,
  type OrderBookEntry,
} from '../services/exchanges';

const EXCHANGES: { id: ExchangeId; name: string }[] = [
  { id: 'binance', name: 'Binance' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'okx', name: 'OKX' },
  { id: 'mexc', name: 'MEXC' },
];

const POPULAR_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];

const WHALE_THRESHOLD_USD = 100000; // $100K
const ORDER_BOOK_DEPTH = 20;

const getExchangeService = (exchangeId: ExchangeId): ExchangeService => {
  switch (exchangeId) {
    case 'binance':
      return binanceService;
    case 'bybit':
      return bybitService;
    case 'okx':
      return okxService;
    case 'mexc':
      return mexcService;
    default:
      return binanceService;
  }
};

export default function OrderBookScreen() {
  const { theme } = useTheme();
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId>('binance');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [inputSymbol, setInputSymbol] = useState('BTC');
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [whaleOrders, setWhaleOrders] = useState<WhaleOrder[]>([]);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Calculate spread
  const spread = useMemo(() => {
    if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return null;
    }
    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    const spreadValue = bestAsk - bestBid;
    const spreadPercent = (spreadValue / bestAsk) * 100;
    return { value: spreadValue, percent: spreadPercent, bestBid, bestAsk };
  }, [orderBook]);

  // Detect whale orders from order book
  const detectWhales = useCallback((book: OrderBook, price: number) => {
    const newWhales: WhaleOrder[] = [];

    book.bids.forEach((bid, index) => {
      const valueUsd = bid.quantity * bid.price;
      if (valueUsd >= WHALE_THRESHOLD_USD) {
        newWhales.push({
          id: `bid-${book.symbol}-${bid.price}-${Date.now()}-${index}`,
          side: 'buy',
          price: bid.price,
          quantity: bid.quantity,
          valueUsd,
          exchange: selectedExchange,
          symbol: book.symbol,
          timestamp: Date.now(),
        });
      }
    });

    book.asks.forEach((ask, index) => {
      const valueUsd = ask.quantity * ask.price;
      if (valueUsd >= WHALE_THRESHOLD_USD) {
        newWhales.push({
          id: `ask-${book.symbol}-${ask.price}-${Date.now()}-${index}`,
          side: 'sell',
          price: ask.price,
          quantity: ask.quantity,
          valueUsd,
          exchange: selectedExchange,
          symbol: book.symbol,
          timestamp: Date.now(),
        });
      }
    });

    // Merge with existing whales, keeping only recent ones
    setWhaleOrders(prev => {
      const combined = [...newWhales, ...prev];
      // Keep only unique orders and limit to last 50
      const uniqueOrders = combined.filter((order, index, self) =>
        index === self.findIndex(o =>
          o.side === order.side &&
          Math.abs(o.price - order.price) < 0.01 &&
          o.exchange === order.exchange
        )
      );
      return uniqueOrders.slice(0, 50);
    });
  }, [selectedExchange]);

  // Fetch order book data
  const fetchOrderBook = useCallback(async () => {
    try {
      setError(null);
      const fullSymbol = inputSymbol.toUpperCase().endsWith('USDT')
        ? inputSymbol.toUpperCase()
        : `${inputSymbol.toUpperCase()}USDT`;
      setSymbol(fullSymbol);

      const service = getExchangeService(selectedExchange);

      // Fetch ticker for current price
      const ticker = await service.getTicker(fullSymbol);
      if (ticker && ticker.price) {
        setCurrentPrice(ticker.price);
      }

      // Fetch order book
      const book = await service.getOrderBook(fullSymbol, ORDER_BOOK_DEPTH);
      setOrderBook(book);

      // Detect whale orders
      if (ticker && ticker.price) {
        detectWhales(book, ticker.price);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order book');
      setOrderBook(null);
    }
  }, [inputSymbol, selectedExchange, detectWhales]);

  // Subscribe to WebSocket updates
  const subscribeToOrderBook = useCallback(() => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      const fullSymbol = inputSymbol.toUpperCase().endsWith('USDT')
        ? inputSymbol.toUpperCase()
        : `${inputSymbol.toUpperCase()}USDT`;

      const service = getExchangeService(selectedExchange);

      unsubscribeRef.current = service.subscribeOrderBook(
        fullSymbol,
        (book) => {
          setOrderBook(book);
          setIsWebSocketConnected(true);

          // Update current price from best bid/ask midpoint
          if (book.bids.length > 0 && book.asks.length > 0) {
            const midPrice = (book.bids[0].price + book.asks[0].price) / 2;
            setCurrentPrice(midPrice);
            detectWhales(book, midPrice);
          }
        },
        (err) => {
          console.warn('WebSocket error:', err);
          setIsWebSocketConnected(false);
        }
      );
    } catch (err) {
      console.warn('Failed to subscribe to order book:', err);
      setIsWebSocketConnected(false);
    }
  }, [inputSymbol, selectedExchange, detectWhales]);

  // Initial load
  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchOrderBook();
    setLoading(false);
    subscribeToOrderBook();
  }, [fetchOrderBook, subscribeToOrderBook]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrderBook();
    subscribeToOrderBook();
    setRefreshing(false);
  }, [fetchOrderBook, subscribeToOrderBook]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const handleSymbolSubmit = useCallback(() => {
    setWhaleOrders([]);
    loadData();
  }, [loadData]);

  const handleQuickSelect = useCallback((sym: string) => {
    const base = sym.replace('USDT', '');
    setInputSymbol(base);
    setSymbol(sym);
    setWhaleOrders([]);
    setTimeout(() => {
      loadData();
    }, 0);
  }, [loadData]);

  const handleExchangeChange = useCallback((exchangeId: ExchangeId) => {
    setSelectedExchange(exchangeId);
    setWhaleOrders([]);
    setTimeout(() => {
      loadData();
    }, 0);
  }, [loadData]);

  // Calculate max volume for color intensity
  const maxBidVolume = useMemo(() => {
    if (!orderBook) return 1;
    return Math.max(...orderBook.bids.map(b => b.quantity), 1);
  }, [orderBook]);

  const maxAskVolume = useMemo(() => {
    if (!orderBook) return 1;
    return Math.max(...orderBook.asks.map(a => a.quantity), 1);
  }, [orderBook]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toPrecision(4);
  };

  const formatQuantity = (quantity: number) => {
    if (quantity >= 1000000) return `${(quantity / 1000000).toFixed(2)}M`;
    if (quantity >= 1000) return `${(quantity / 1000).toFixed(2)}K`;
    if (quantity >= 1) return quantity.toFixed(4);
    return quantity.toPrecision(4);
  };

  const formatTotal = (total: number) => {
    if (total >= 1000000) return `${(total / 1000000).toFixed(2)}M`;
    if (total >= 1000) return `${(total / 1000).toFixed(2)}K`;
    return total.toFixed(2);
  };

  const renderOrderBookRow = (
    entry: OrderBookEntry,
    side: 'bid' | 'ask',
    index: number,
    maxVolume: number
  ) => {
    const isBid = side === 'bid';
    const bgColor = isBid ? theme.colors.changeUp : theme.colors.changeDown;
    const textColor = isBid ? theme.colors.changeUpText : theme.colors.changeDownText;
    const volumeIntensity = entry.quantity / maxVolume;
    const valueUsd = entry.quantity * entry.price;
    const isWhale = valueUsd >= WHALE_THRESHOLD_USD;

    return (
      <View
        key={`${side}-${index}`}
        style={[
          styles.orderRow,
          {
            backgroundColor: bgColor,
            opacity: 0.3 + volumeIntensity * 0.7,
          },
          isWhale && styles.whaleRow,
        ]}
      >
        <Text
          style={[
            styles.priceText,
            { color: textColor },
            isWhale && styles.whaleText,
          ]}
        >
          {formatPrice(entry.price)}
        </Text>
        <Text
          style={[
            styles.quantityText,
            { color: theme.colors.textPrimary },
            isWhale && styles.whaleText,
          ]}
        >
          {formatQuantity(entry.quantity)}
        </Text>
        <Text
          style={[
            styles.totalText,
            { color: theme.colors.textSecondary },
          ]}
        >
          {formatTotal(entry.total)}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Exchange selector */}
      <View style={styles.exchangeRow}>
        {EXCHANGES.map((exchange) => (
          <TouchableOpacity
            key={exchange.id}
            style={[
              styles.exchangeButton,
              {
                backgroundColor:
                  selectedExchange === exchange.id
                    ? theme.colors.accent
                    : theme.colors.metricCard,
              },
            ]}
            onPress={() => handleExchangeChange(exchange.id)}
          >
            <Text
              style={[
                styles.exchangeButtonText,
                {
                  color:
                    selectedExchange === exchange.id
                      ? theme.colors.buttonText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {exchange.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Symbol input */}
      <View style={styles.symbolRow}>
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.input }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            value={inputSymbol}
            onChangeText={setInputSymbol}
            placeholder="BTC"
            placeholderTextColor={theme.colors.textPlaceholder}
            autoCapitalize="characters"
            onSubmitEditing={handleSymbolSubmit}
            returnKeyType="search"
          />
          <Text style={[styles.inputSuffix, { color: theme.colors.textMuted }]}>
            USDT
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.colors.accent }]}
          onPress={handleSymbolSubmit}
        >
          <Text style={[styles.searchButtonText, { color: theme.colors.buttonText }]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick select symbols */}
      <View style={styles.quickSelectRow}>
        {POPULAR_SYMBOLS.map((sym) => (
          <TouchableOpacity
            key={sym}
            style={[
              styles.quickSelectButton,
              {
                backgroundColor:
                  symbol === sym ? theme.colors.accent : theme.colors.metricCard,
              },
            ]}
            onPress={() => handleQuickSelect(sym)}
          >
            <Text
              style={[
                styles.quickSelectText,
                {
                  color:
                    symbol === sym
                      ? theme.colors.buttonText
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {sym.replace('USDT', '')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Connection status */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isWebSocketConnected
                ? theme.colors.success
                : theme.colors.statusMuted,
            },
          ]}
        />
        <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>
          {isWebSocketConnected ? 'Live updates' : 'Polling'}
        </Text>
      </View>

      {/* Spread display */}
      {spread && (
        <View style={[styles.spreadCard, { backgroundColor: theme.colors.metricCard }]}>
          <View style={styles.spreadRow}>
            <View style={styles.spreadItem}>
              <Text style={[styles.spreadLabel, { color: theme.colors.success }]}>
                Best Bid
              </Text>
              <Text style={[styles.spreadValue, { color: theme.colors.changeUpText }]}>
                {formatPrice(spread.bestBid)}
              </Text>
            </View>
            <View style={styles.spreadItem}>
              <Text style={[styles.spreadLabel, { color: theme.colors.textMuted }]}>
                Spread
              </Text>
              <Text style={[styles.spreadValue, { color: theme.colors.textPrimary }]}>
                {formatPrice(spread.value)} ({spread.percent.toFixed(3)}%)
              </Text>
            </View>
            <View style={styles.spreadItem}>
              <Text style={[styles.spreadLabel, { color: theme.colors.danger }]}>
                Best Ask
              </Text>
              <Text style={[styles.spreadValue, { color: theme.colors.changeDownText }]}>
                {formatPrice(spread.bestAsk)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderDepthChart = () => {
    if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return null;
    }

    return (
      <View style={[styles.depthContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Depth Chart
        </Text>
        <OrderBookDepth
          bids={orderBook.bids}
          asks={orderBook.asks}
          currentPrice={currentPrice}
          maxWidth={Dimensions.get('window').width - 64}
          height={180}
        />
      </View>
    );
  };

  const renderOrderBook = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading order book...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
            onPress={loadData}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.buttonText }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!orderBook) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Enter a symbol to view order book
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.orderBookContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Order Book
        </Text>

        {/* Two-sided display */}
        <View style={styles.orderBookSides}>
          {/* Bids (left) */}
          <View style={styles.orderBookSide}>
            <View style={styles.orderBookHeader}>
              <Text style={[styles.headerText, { color: theme.colors.success }]}>
                Bids (Buy)
              </Text>
            </View>
            <View style={styles.columnHeaders}>
              <Text style={[styles.columnHeader, { color: theme.colors.textMuted }]}>
                Price
              </Text>
              <Text style={[styles.columnHeader, { color: theme.colors.textMuted }]}>
                Qty
              </Text>
              <Text style={[styles.columnHeader, { color: theme.colors.textMuted }]}>
                Total
              </Text>
            </View>
            {orderBook.bids.slice(0, 10).map((bid, index) =>
              renderOrderBookRow(bid, 'bid', index, maxBidVolume)
            )}
          </View>

          {/* Asks (right) */}
          <View style={styles.orderBookSide}>
            <View style={styles.orderBookHeader}>
              <Text style={[styles.headerText, { color: theme.colors.danger }]}>
                Asks (Sell)
              </Text>
            </View>
            <View style={styles.columnHeaders}>
              <Text style={[styles.columnHeader, { color: theme.colors.textMuted }]}>
                Price
              </Text>
              <Text style={[styles.columnHeader, { color: theme.colors.textMuted }]}>
                Qty
              </Text>
              <Text style={[styles.columnHeader, { color: theme.colors.textMuted }]}>
                Total
              </Text>
            </View>
            {orderBook.asks.slice(0, 10).map((ask, index) =>
              renderOrderBookRow(ask, 'ask', index, maxAskVolume)
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderWhaleTracker = () => (
    <WhaleTracker
      orders={whaleOrders}
      threshold={WHALE_THRESHOLD_USD}
      maxOrders={5}
    />
  );

  const data = [{ key: 'content' }];

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        Стакан
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Real-time order book with depth analysis
      </Text>

      <FlatList
        data={data}
        renderItem={() => (
          <View style={styles.content}>
            {renderHeader()}
            {renderDepthChart()}
            {renderOrderBook()}
            {renderWhaleTracker()}
          </View>
        )}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  list: {
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  exchangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  exchangeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exchangeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  symbolRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  quickSelectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickSelectText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
  spreadCard: {
    padding: 12,
    borderRadius: 8,
  },
  spreadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spreadItem: {
    alignItems: 'center',
    flex: 1,
  },
  spreadLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  spreadValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  depthContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  orderBookContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderBookSides: {
    flexDirection: 'row',
    gap: 8,
  },
  orderBookSide: {
    flex: 1,
  },
  orderBookHeader: {
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  columnHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  columnHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: '500',
  },
  orderRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginBottom: 2,
  },
  whaleRow: {
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  priceText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  quantityText: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
  },
  totalText: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
  },
  whaleText: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
