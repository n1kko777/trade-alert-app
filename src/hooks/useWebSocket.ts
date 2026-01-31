/**
 * WebSocket Hooks
 * Custom hooks for WebSocket functionality with automatic cleanup
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';
import {
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketEventHandler,
  TickerData,
  SignalData,
  PumpData,
  NotificationData,
  ConnectionStatus,
} from '../services/websocket';

// =============================================================================
// Main Hook - Access WebSocket Context
// =============================================================================

/**
 * Main hook to access WebSocket functionality
 * Alias for useWebSocketContext with cleaner name
 */
export const useWebSocket = () => {
  return useWebSocketContext();
};

// =============================================================================
// Subscription Hook
// =============================================================================

interface UseWebSocketSubscriptionOptions<T> {
  /** Initial data to use before any data is received */
  initialData?: T;
  /** Whether to auto-subscribe on mount (default: true) */
  autoSubscribe?: boolean;
}

interface UseWebSocketSubscriptionResult<T> {
  /** Current data for this subscription */
  data: T | undefined;
  /** Whether currently subscribed */
  isSubscribed: boolean;
  /** Subscribe to the channel */
  subscribe: () => void;
  /** Unsubscribe from the channel */
  unsubscribe: () => void;
  /** Connection status */
  status: ConnectionStatus;
  /** Whether connected */
  isConnected: boolean;
}

/**
 * Hook to subscribe to a specific WebSocket channel
 * Automatically cleans up subscription on unmount
 *
 * @param channel - The channel to subscribe to (e.g., 'tickers', 'signals', 'pumps')
 * @param messageType - The message type to listen for (e.g., 'ticker', 'signal', 'pump')
 * @param options - Configuration options
 */
export function useWebSocketSubscription<T = unknown>(
  channel: string,
  messageType: WebSocketMessageType,
  options: UseWebSocketSubscriptionOptions<T> = {}
): UseWebSocketSubscriptionResult<T> {
  const { autoSubscribe = true, initialData } = options;
  const { subscribe: wsSubscribe, unsubscribe: wsUnsubscribe, on, off, status, isConnected, subscriptions } = useWebSocketContext();

  const [data, setData] = useState<T | undefined>(initialData);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Track subscription status
  useEffect(() => {
    setIsSubscribed(subscriptions.includes(channel));
  }, [subscriptions, channel]);

  // Handle incoming messages
  useEffect(() => {
    const handler: WebSocketEventHandler<T> = (message) => {
      if (message.channel === channel || !message.channel) {
        setData(message.data);
      }
    };

    on(messageType, handler);

    return () => {
      off(messageType, handler);
    };
  }, [channel, messageType, on, off]);

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    if (autoSubscribe) {
      wsSubscribe(channel);
    }

    return () => {
      wsUnsubscribe(channel);
    };
  }, [channel, autoSubscribe, wsSubscribe, wsUnsubscribe]);

  const subscribe = useCallback(() => {
    wsSubscribe(channel);
  }, [channel, wsSubscribe]);

  const unsubscribe = useCallback(() => {
    wsUnsubscribe(channel);
  }, [channel, wsUnsubscribe]);

  return {
    data,
    isSubscribed,
    subscribe,
    unsubscribe,
    status,
    isConnected,
  };
}

// =============================================================================
// Ticker Hook
// =============================================================================

interface UseTickerOptions {
  /** Polling interval for ticker updates (if not using WS) */
  pollInterval?: number;
}

interface UseTickerResult {
  /** Ticker data for the symbol */
  ticker: TickerData | undefined;
  /** All tickers */
  allTickers: Map<string, TickerData>;
  /** Whether connected */
  isConnected: boolean;
  /** Connection status */
  status: ConnectionStatus;
}

/**
 * Hook to get real-time ticker data for a specific symbol
 *
 * @param symbol - The ticker symbol (e.g., 'BTCUSDT')
 */
export function useTicker(symbol?: string, _options: UseTickerOptions = {}): UseTickerResult {
  const { tickers, status, isConnected, subscribe, unsubscribe } = useWebSocketContext();

  // Subscribe to ticker channel on mount
  useEffect(() => {
    subscribe('tickers');

    return () => {
      // Note: Don't unsubscribe if other components might be using it
      // The context handles reference counting if needed
    };
  }, [subscribe]);

  const ticker = symbol ? tickers.get(symbol) : undefined;

  return {
    ticker,
    allTickers: tickers,
    isConnected,
    status,
  };
}

/**
 * Hook to get all tickers
 */
export function useAllTickers(): UseTickerResult {
  return useTicker();
}

// =============================================================================
// Signals Hook
// =============================================================================

interface UseSignalsOptions {
  /** Filter by symbol */
  symbol?: string;
  /** Filter by direction */
  direction?: 'buy' | 'sell';
  /** Filter by status */
  status?: 'active' | 'closed' | 'expired';
  /** Maximum number of signals to return */
  limit?: number;
}

interface UseSignalsResult {
  /** Filtered signals */
  signals: SignalData[];
  /** Latest signal */
  latestSignal: SignalData | undefined;
  /** Whether connected */
  isConnected: boolean;
  /** Connection status */
  connectionStatus: ConnectionStatus;
}

/**
 * Hook to get real-time trading signals
 */
export function useSignals(options: UseSignalsOptions = {}): UseSignalsResult {
  const { symbol, direction, status: signalStatus, limit } = options;
  const { signals: allSignals, status, isConnected, subscribe } = useWebSocketContext();

  // Subscribe to signals channel on mount
  useEffect(() => {
    subscribe('signals');
  }, [subscribe]);

  // Filter signals based on options
  const filteredSignals = useMemo(() => {
    let result = allSignals;

    if (symbol) {
      result = result.filter((s) => s.symbol === symbol);
    }

    if (direction) {
      result = result.filter((s) => s.direction === direction);
    }

    if (signalStatus) {
      result = result.filter((s) => s.status === signalStatus);
    }

    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }, [allSignals, symbol, direction, signalStatus, limit]);

  return {
    signals: filteredSignals,
    latestSignal: filteredSignals[0],
    isConnected,
    connectionStatus: status,
  };
}

// =============================================================================
// Pumps Hook
// =============================================================================

interface UsePumpsOptions {
  /** Filter by symbol */
  symbol?: string;
  /** Minimum price change percentage */
  minPriceChange?: number;
}

interface UsePumpsResult {
  /** Active pumps */
  pumps: PumpData[];
  /** Latest pump */
  latestPump: PumpData | undefined;
  /** Whether connected */
  isConnected: boolean;
  /** Connection status */
  connectionStatus: ConnectionStatus;
}

/**
 * Hook to get real-time pump detection alerts
 */
export function usePumps(options: UsePumpsOptions = {}): UsePumpsResult {
  const { symbol, minPriceChange } = options;
  const { pumps: allPumps, status, isConnected, subscribe } = useWebSocketContext();

  // Subscribe to pumps channel on mount
  useEffect(() => {
    subscribe('pumps');
  }, [subscribe]);

  // Filter pumps based on options
  const filteredPumps = useMemo(() => {
    let result = allPumps;

    if (symbol) {
      result = result.filter((p) => p.symbol === symbol);
    }

    if (minPriceChange !== undefined) {
      result = result.filter((p) => p.priceChange >= minPriceChange);
    }

    return result;
  }, [allPumps, symbol, minPriceChange]);

  return {
    pumps: filteredPumps,
    latestPump: filteredPumps[0],
    isConnected,
    connectionStatus: status,
  };
}

// =============================================================================
// Notifications Hook
// =============================================================================

interface UseNotificationsResult {
  /** All notifications */
  notifications: NotificationData[];
  /** Unread count (all notifications are considered unread until cleared) */
  unreadCount: number;
  /** Clear all notifications */
  clearAll: () => void;
  /** Whether connected */
  isConnected: boolean;
}

/**
 * Hook to get real-time notifications
 */
export function useNotifications(): UseNotificationsResult {
  const { notifications, clearNotifications, isConnected, subscribe } = useWebSocketContext();

  // Subscribe to notifications channel on mount
  useEffect(() => {
    subscribe('notifications');
  }, [subscribe]);

  return {
    notifications,
    unreadCount: notifications.length,
    clearAll: clearNotifications,
    isConnected,
  };
}

// =============================================================================
// Connection Status Hook
// =============================================================================

interface UseConnectionStatusResult {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether connected */
  isConnected: boolean;
  /** Whether connecting */
  isConnecting: boolean;
  /** Whether reconnecting */
  isReconnecting: boolean;
  /** Whether disconnected */
  isDisconnected: boolean;
  /** Manually trigger reconnect */
  reconnect: () => void;
}

/**
 * Hook to get WebSocket connection status
 */
export function useConnectionStatus(): UseConnectionStatusResult {
  const { status, isConnected, reconnect } = useWebSocketContext();

  return {
    status,
    isConnected,
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    isDisconnected: status === 'disconnected',
    reconnect,
  };
}

// =============================================================================
// Message Listener Hook
// =============================================================================

/**
 * Hook to listen for specific WebSocket message types
 * Automatically cleans up on unmount
 *
 * @param messageType - The message type to listen for
 * @param handler - Callback function when message is received
 */
export function useWebSocketMessage<T = unknown>(
  messageType: WebSocketMessageType,
  handler: WebSocketEventHandler<T>
): void {
  const { on, off } = useWebSocketContext();
  const handlerRef = useRef(handler);

  // Update ref on each render to avoid stale closures
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const wrappedHandler: WebSocketEventHandler<T> = (message) => {
      handlerRef.current(message);
    };

    on(messageType, wrappedHandler);

    return () => {
      off(messageType, wrappedHandler);
    };
  }, [messageType, on, off]);
}

// =============================================================================
// Export all hooks
// =============================================================================

export {
  useWebSocketContext,
} from '../context/WebSocketContext';
