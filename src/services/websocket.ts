/**
 * WebSocket Connection Manager
 * Handles WebSocket connections with auto-reconnect, keep-alive, and message dispatching
 */

import { WS_BASE_URL } from '../api/config';

// =============================================================================
// Types
// =============================================================================

export type WebSocketMessageType =
  | 'connected'
  | 'ticker'
  | 'tickers'
  | 'signal'
  | 'pump'
  | 'notification'
  | 'error'
  | 'subscribed'
  | 'unsubscribed'
  | 'pong';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  channel?: string;
  data?: T;
  message?: string;
  timestamp?: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  exchanges: string[];
  updatedAt: string;
}

export interface SignalData {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  minTier: string;
  status: 'active' | 'closed' | 'expired';
  reason: string;
  aiAnalysis?: string;
  createdAt: string;
}

export interface PumpData {
  symbol: string;
  priceChange: number;
  volumeChange: number;
  startPrice: number;
  currentPrice: number;
  startedAt: string;
  duration: number;
  exchanges: string[];
}

export interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  createdAt: string;
}

export type WebSocketEventHandler<T = unknown> = (message: WebSocketMessage<T>) => void;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// =============================================================================
// Constants
// =============================================================================

const RECONNECT_BASE_DELAY = 1000; // 1 second
const RECONNECT_MAX_DELAY = 30000; // 30 seconds
const PING_INTERVAL = 30000; // 30 seconds
const PONG_TIMEOUT = 10000; // 10 seconds

// =============================================================================
// WebSocket Manager Class
// =============================================================================

class WebSocketManager {
  private static instance: WebSocketManager | null = null;

  private ws: WebSocket | null = null;
  private token: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Set<string> = new Set();
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private statusChangeHandlers: Set<(status: ConnectionStatus) => void> = new Set();
  private pendingSubscriptions: Set<string> = new Set();
  private isManualDisconnect = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get current subscriptions
   */
  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(accessToken: string): void {
    if (this.ws && (this.status === 'connected' || this.status === 'connecting')) {
      console.log('[WS] Already connected or connecting');
      return;
    }

    this.token = accessToken;
    this.isManualDisconnect = false;
    this.establishConnection();
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.isManualDisconnect = true;
    this.cleanup();
    this.setStatus('disconnected');
  }

  /**
   * Subscribe to a channel
   */
  public subscribe(channel: string): void {
    if (this.subscriptions.has(channel)) {
      console.log(`[WS] Already subscribed to ${channel}`);
      return;
    }

    this.subscriptions.add(channel);

    if (this.status === 'connected' && this.ws) {
      this.sendSubscribe(channel);
    } else {
      // Queue subscription for when connected
      this.pendingSubscriptions.add(channel);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  public unsubscribe(channel: string): void {
    if (!this.subscriptions.has(channel)) {
      console.log(`[WS] Not subscribed to ${channel}`);
      return;
    }

    this.subscriptions.delete(channel);
    this.pendingSubscriptions.delete(channel);

    if (this.status === 'connected' && this.ws) {
      this.sendUnsubscribe(channel);
    }
  }

  /**
   * Add event handler for a specific message type
   */
  public on<T = unknown>(type: WebSocketMessageType, handler: WebSocketEventHandler<T>): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler as WebSocketEventHandler);
  }

  /**
   * Remove event handler for a specific message type
   */
  public off<T = unknown>(type: WebSocketMessageType, handler: WebSocketEventHandler<T>): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.delete(handler as WebSocketEventHandler);
    }
  }

  /**
   * Add status change handler
   */
  public onStatusChange(handler: (status: ConnectionStatus) => void): void {
    this.statusChangeHandlers.add(handler);
  }

  /**
   * Remove status change handler
   */
  public offStatusChange(handler: (status: ConnectionStatus) => void): void {
    this.statusChangeHandlers.delete(handler);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private establishConnection(): void {
    if (!this.token) {
      console.error('[WS] No access token provided');
      return;
    }

    this.setStatus('connecting');

    try {
      const wsUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('[WS] Connected');
    this.setStatus('connected');
    this.reconnectAttempts = 0;

    // Start ping/pong keep-alive
    this.startPingPong();

    // Restore subscriptions
    this.restoreSubscriptions();
  }

  private handleClose(event: CloseEvent): void {
    console.log(`[WS] Disconnected: code=${event.code}, reason=${event.reason}`);
    this.cleanup();

    if (!this.isManualDisconnect) {
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    } else {
      this.setStatus('disconnected');
    }
  }

  private handleError(event: Event): void {
    console.error('[WS] Error:', event);
    // The close event will handle reconnection
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle pong response
      if (message.type === 'pong') {
        this.clearPongTimeout();
        return;
      }

      // Dispatch to event handlers
      this.dispatchMessage(message);
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }

  private dispatchMessage(message: WebSocketMessage): void {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[WS] Error in handler for ${message.type}:`, error);
        }
      });
    }

    // Also dispatch to wildcard handlers if needed
    const wildcardHandlers = this.eventHandlers.get('*' as WebSocketMessageType);
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WS] Error in wildcard handler:', error);
        }
      });
    }
  }

  private sendSubscribe(channel: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel,
      }));
    }
  }

  private sendUnsubscribe(channel: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
      }));
    }
  }

  private restoreSubscriptions(): void {
    // Send all pending subscriptions
    this.pendingSubscriptions.forEach((channel) => {
      this.sendSubscribe(channel);
    });
    this.pendingSubscriptions.clear();

    // Re-subscribe to all active subscriptions
    this.subscriptions.forEach((channel) => {
      this.sendSubscribe(channel);
    });
  }

  private startPingPong(): void {
    this.stopPingPong();

    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, PING_INTERVAL);
  }

  private stopPingPong(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.clearPongTimeout();
  }

  private sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));

      // Set timeout for pong response
      this.pongTimer = setTimeout(() => {
        console.warn('[WS] Pong timeout - reconnecting');
        this.ws?.close();
      }, PONG_TIMEOUT);
    }
  }

  private clearPongTimeout(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isManualDisconnect) {
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.establishConnection();
    }, delay);
  }

  private cleanup(): void {
    this.stopPingPong();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }

      this.ws = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusChangeHandlers.forEach((handler) => {
        try {
          handler(status);
        } catch (error) {
          console.error('[WS] Error in status change handler:', error);
        }
      });
    }
  }

  /**
   * Update the access token (for token refresh scenarios)
   */
  public updateToken(newToken: string): void {
    this.token = newToken;

    // If connected, reconnect with new token
    if (this.status === 'connected' || this.status === 'reconnecting') {
      this.cleanup();
      this.establishConnection();
    }
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  public static resetInstance(): void {
    if (WebSocketManager.instance) {
      WebSocketManager.instance.disconnect();
      WebSocketManager.instance = null;
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export const wsManager = WebSocketManager.getInstance();

export default WebSocketManager;
