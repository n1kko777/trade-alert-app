/**
 * API Configuration
 * Contains base URLs and endpoint definitions for the TradePulse API
 */

// Detect environment using React Native's __DEV__ global
declare const __DEV__: boolean;

/**
 * API Base URLs
 */
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.tradepulse.app/api/v1';

/**
 * WebSocket URLs
 */
export const WS_BASE_URL = __DEV__
  ? 'ws://localhost:3000'
  : 'wss://api.tradepulse.app';

/**
 * API Timeout (in milliseconds)
 */
export const API_TIMEOUT = 30000;

/**
 * API Endpoints
 * Organized by module for easy reference
 */
export const ENDPOINTS = {
  // Authentication
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    setup2FA: '/auth/2fa/setup',
    verify2FA: '/auth/2fa/verify',
    disable2FA: '/auth/2fa/disable',
  },

  // User
  user: {
    me: '/user/me',
    sessions: '/user/sessions',
    revokeSession: (id: string) => `/user/sessions/${id}`,
  },

  // Subscription
  subscription: {
    current: '/subscription',
    upgrade: '/subscription/upgrade',
    cancel: '/subscription/cancel',
    history: '/subscription/history',
  },

  // Market Data
  market: {
    tickers: '/market/tickers',
    ticker: (symbol: string) => `/market/ticker/${symbol}`,
    orderbook: (symbol: string) => `/market/orderbook/${symbol}`,
    candles: (symbol: string) => `/market/candles/${symbol}`,
    liquidations: (symbol: string) => `/market/liquidations/${symbol}`,
  },

  // Pump Detection
  pumps: {
    list: '/pumps',
    get: (symbol: string) => `/pumps/${symbol}`,
  },

  // Trading Signals
  signals: {
    list: '/signals',
    get: (id: string) => `/signals/${id}`,
    stats: '/signals/stats',
  },

  // Portfolio Management
  portfolio: {
    get: '/portfolio',
    addAsset: '/portfolio/asset',
    updateAsset: (id: string) => `/portfolio/asset/${id}`,
    deleteAsset: (id: string) => `/portfolio/asset/${id}`,
  },

  // AI Analysis
  ai: {
    analyze: (symbol: string) => `/ai/analyze/${symbol}`,
    chat: '/ai/chat',
    limits: '/ai/limits',
  },

  // Health Check
  health: '/health',
} as const;

/**
 * Query Parameters for Market endpoints
 */
export interface MarketQueryParams {
  exchange?: 'binance' | 'bybit' | 'okx' | 'mexc';
  depth?: number;
  interval?: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '1w';
  limit?: number;
}

/**
 * Query Parameters for Signals endpoint
 */
export interface SignalsQueryParams {
  status?: 'active' | 'closed' | 'expired';
  symbol?: string;
  direction?: 'buy' | 'sell';
  limit?: number;
  offset?: number;
}
