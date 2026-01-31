/**
 * WebSocket Context Provider
 * Manages WebSocket connection lifecycle and exposes state/methods to the app
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  wsManager,
  ConnectionStatus,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketEventHandler,
  TickerData,
  SignalData,
  PumpData,
  NotificationData,
} from '../services/websocket';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../api/client';

// =============================================================================
// Types
// =============================================================================

export interface WebSocketContextValue {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether the WebSocket is connected */
  isConnected: boolean;
  /** Subscribe to a channel */
  subscribe: (channel: string) => void;
  /** Unsubscribe from a channel */
  unsubscribe: (channel: string) => void;
  /** Add event handler for a message type */
  on: <T = unknown>(type: WebSocketMessageType, handler: WebSocketEventHandler<T>) => void;
  /** Remove event handler for a message type */
  off: <T = unknown>(type: WebSocketMessageType, handler: WebSocketEventHandler<T>) => void;
  /** Get current subscriptions */
  subscriptions: string[];
  /** Latest ticker data by symbol */
  tickers: Map<string, TickerData>;
  /** Latest signals */
  signals: SignalData[];
  /** Latest pumps */
  pumps: PumpData[];
  /** Latest notifications */
  notifications: NotificationData[];
  /** Clear notifications */
  clearNotifications: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface WebSocketProviderProps {
  children: React.ReactNode;
  /** Maximum number of signals to keep in memory */
  maxSignals?: number;
  /** Maximum number of pumps to keep in memory */
  maxPumps?: number;
  /** Maximum number of notifications to keep in memory */
  maxNotifications?: number;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  maxSignals = 50,
  maxPumps = 20,
  maxNotifications = 100,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map());
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [pumps, setPumps] = useState<PumpData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Track if we've initialized the connection for the current user
  const connectedUserRef = useRef<string | null>(null);

  // Connect/disconnect based on authentication state
  useEffect(() => {
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      setSubscriptions(wsManager.getSubscriptions());
    };

    // Subscribe to status changes
    wsManager.onStatusChange(handleStatusChange);

    return () => {
      wsManager.offStatusChange(handleStatusChange);
    };
  }, []);

  // Connect when authenticated, disconnect when logged out
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = getAccessToken();
      if (token && connectedUserRef.current !== user.id) {
        connectedUserRef.current = user.id;
        wsManager.connect(token);
      }
    } else {
      if (connectedUserRef.current) {
        connectedUserRef.current = null;
        wsManager.disconnect();
        // Clear all state on disconnect
        setTickers(new Map());
        setSignals([]);
        setPumps([]);
        setNotifications([]);
      }
    }

    return () => {
      // Don't disconnect on unmount - let the auth state control connection
    };
  }, [isAuthenticated, user]);

  // Set up message handlers for built-in data types
  useEffect(() => {
    const handleTicker = (message: WebSocketMessage<TickerData>) => {
      if (message.data) {
        setTickers((prev) => {
          const next = new Map(prev);
          next.set(message.data!.symbol, message.data!);
          return next;
        });
      }
    };

    const handleTickers = (message: WebSocketMessage<TickerData[]>) => {
      if (message.data && Array.isArray(message.data)) {
        setTickers((prev) => {
          const next = new Map(prev);
          message.data!.forEach((ticker) => {
            next.set(ticker.symbol, ticker);
          });
          return next;
        });
      }
    };

    const handleSignal = (message: WebSocketMessage<SignalData>) => {
      if (message.data) {
        setSignals((prev) => {
          // Add to beginning, remove if already exists (update)
          const filtered = prev.filter((s) => s.id !== message.data!.id);
          const next = [message.data!, ...filtered];
          // Limit size
          return next.slice(0, maxSignals);
        });
      }
    };

    const handlePump = (message: WebSocketMessage<PumpData>) => {
      if (message.data) {
        setPumps((prev) => {
          // Check if pump for this symbol already exists
          const existing = prev.find((p) => p.symbol === message.data!.symbol);
          if (existing) {
            // Update existing pump
            return prev.map((p) =>
              p.symbol === message.data!.symbol ? message.data! : p
            );
          }
          // Add new pump
          const next = [message.data!, ...prev];
          return next.slice(0, maxPumps);
        });
      }
    };

    const handleNotification = (message: WebSocketMessage<NotificationData>) => {
      if (message.data) {
        setNotifications((prev) => {
          const next = [message.data!, ...prev];
          return next.slice(0, maxNotifications);
        });
      }
    };

    const handleSubscribed = (message: WebSocketMessage) => {
      setSubscriptions(wsManager.getSubscriptions());
      console.log(`[WS Context] Subscribed to: ${message.channel}`);
    };

    const handleUnsubscribed = (message: WebSocketMessage) => {
      setSubscriptions(wsManager.getSubscriptions());
      console.log(`[WS Context] Unsubscribed from: ${message.channel}`);
    };

    const handleError = (message: WebSocketMessage) => {
      console.error('[WS Context] Server error:', message.message);
    };

    const handleConnected = (message: WebSocketMessage) => {
      console.log('[WS Context] Connection confirmed by server');
    };

    // Register handlers
    wsManager.on('ticker', handleTicker);
    wsManager.on('tickers', handleTickers);
    wsManager.on('signal', handleSignal);
    wsManager.on('pump', handlePump);
    wsManager.on('notification', handleNotification);
    wsManager.on('subscribed', handleSubscribed);
    wsManager.on('unsubscribed', handleUnsubscribed);
    wsManager.on('error', handleError);
    wsManager.on('connected', handleConnected);

    return () => {
      // Unregister handlers
      wsManager.off('ticker', handleTicker);
      wsManager.off('tickers', handleTickers);
      wsManager.off('signal', handleSignal);
      wsManager.off('pump', handlePump);
      wsManager.off('notification', handleNotification);
      wsManager.off('subscribed', handleSubscribed);
      wsManager.off('unsubscribed', handleUnsubscribed);
      wsManager.off('error', handleError);
      wsManager.off('connected', handleConnected);
    };
  }, [maxSignals, maxPumps, maxNotifications]);

  // Memoized context methods
  const subscribe = useCallback((channel: string) => {
    wsManager.subscribe(channel);
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    wsManager.unsubscribe(channel);
  }, []);

  const on = useCallback(<T = unknown>(
    type: WebSocketMessageType,
    handler: WebSocketEventHandler<T>
  ) => {
    wsManager.on(type, handler);
  }, []);

  const off = useCallback(<T = unknown>(
    type: WebSocketMessageType,
    handler: WebSocketEventHandler<T>
  ) => {
    wsManager.off(type, handler);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const reconnect = useCallback(() => {
    const token = getAccessToken();
    if (token && isAuthenticated) {
      wsManager.disconnect();
      wsManager.connect(token);
    }
  }, [isAuthenticated]);

  // Build context value
  const value = useMemo<WebSocketContextValue>(
    () => ({
      status,
      isConnected: status === 'connected',
      subscribe,
      unsubscribe,
      on,
      off,
      subscriptions,
      tickers,
      signals,
      pumps,
      notifications,
      clearNotifications,
      reconnect,
    }),
    [
      status,
      subscribe,
      unsubscribe,
      on,
      off,
      subscriptions,
      tickers,
      signals,
      pumps,
      notifications,
      clearNotifications,
      reconnect,
    ]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access WebSocket context
 * Must be used within WebSocketProvider
 */
export const useWebSocketContext = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
