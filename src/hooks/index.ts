/**
 * Hooks Index
 * Re-exports all custom hooks for easier imports
 */

export {
  useWebSocket,
  useWebSocketSubscription,
  useTicker,
  useAllTickers,
  useSignals,
  usePumps,
  useNotifications,
  useConnectionStatus,
  useWebSocketMessage,
  useWebSocketContext,
} from './useWebSocket';

export { useOfflineSync } from './useOfflineSync';

export type {
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketEventHandler,
  TickerData,
  SignalData,
  PumpData,
  NotificationData,
  ConnectionStatus,
} from '../services/websocket';
