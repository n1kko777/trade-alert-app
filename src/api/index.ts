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
} from './client';

// Configuration
export {
  API_BASE_URL,
  WS_BASE_URL,
  API_TIMEOUT,
  ENDPOINTS,
} from './config';
export type { MarketQueryParams, SignalsQueryParams } from './config';

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
