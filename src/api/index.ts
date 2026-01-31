/**
 * API Module
 * Exports all API utilities for use throughout the mobile app
 */

// Client
export {
  default as apiClient,
  apiClient as client,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isAuthenticated,
  setLogoutCallback,
  triggerLogout,
  initializeTokenCache,
} from './client';

// Configuration
export {
  API_BASE_URL,
  WS_BASE_URL,
  API_TIMEOUT,
  ENDPOINTS,
} from './config';
export type { MarketQueryParams, SignalsQueryParams } from './config';

// API Modules
export { authApi, login, register, logout, refreshTokens, setup2FA, verify2FA, disable2FA, getCurrentUser } from './auth.api';
export { marketApi, getTickers, getTicker, getOrderBook, getCandles, getLiquidations } from './market.api';
export { signalsApi, getSignals, getSignal, getSignalStats } from './signals.api';
export { pumpsApi, getActivePumps, getPump } from './pumps.api';
export { portfolioApi, getPortfolio, addAsset, updateAsset, deleteAsset } from './portfolio.api';
export { aiApi, analyzeSymbol, chat, getLimits } from './ai.api';

// Types
export type {
  // Generic types
  ApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  ApiError,

  // Auth types
  SubscriptionTier,
  ApiUser,
  TokenPair,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshRequest,
  RefreshResponse,
  TwoFASetupResponse,
  UserSession,

  // Market types
  ApiTicker,
  OrderBookEntry,
  ApiOrderBook,
  ApiCandle,
  LiquidationLevel,
  ApiLiquidationMap,

  // Pump types
  ApiPump,

  // Signal types
  ApiSignal,
  ApiSignalStats,

  // Portfolio types
  ApiPortfolioAsset,
  ApiPortfolio,
  AddAssetRequest,
  UpdateAssetRequest,

  // AI types
  ApiAnalysis,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  AiLimits,

  // Health types
  HealthCheckResponse,
} from './types';
