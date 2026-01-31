/**
 * API Types
 * Type definitions for API requests and responses
 */

// =============================================================================
// Generic API Types
// =============================================================================

/**
 * Base API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success?: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
  total?: number;
}

/**
 * API Error response from backend
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Transformed API error for client use
 */
export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;
  isNetworkError?: boolean;
  isAuthError?: boolean;
}

// =============================================================================
// Authentication Types
// =============================================================================

/**
 * User subscription tier
 */
export type SubscriptionTier = 'free' | 'pro' | 'premium' | 'vip';

/**
 * User data from API
 */
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  subscription: SubscriptionTier;
  createdAt: string;
  is2FAEnabled?: boolean;
}

/**
 * Token pair from authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  message: string;
  user?: ApiUser;
  tokens?: TokenPair;
  requires2FA?: boolean;
  userId?: string;
}

/**
 * Register request payload
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Register response
 */
export interface RegisterResponse {
  message: string;
  user: ApiUser;
}

/**
 * Refresh token request
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshResponse {
  message: string;
  tokens: TokenPair;
}

/**
 * 2FA Setup response
 */
export interface TwoFASetupResponse {
  message: string;
  secret: string;
  uri: string;
}

/**
 * User session info
 */
export interface UserSession {
  id: string;
  deviceInfo: {
    ip: string;
    userAgent: string;
  };
  expiresAt: string;
  createdAt: string;
}

// =============================================================================
// Market Data Types
// =============================================================================

/**
 * Ticker data from API
 */
export interface ApiTicker {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  exchanges: string[];
  updatedAt: string;
}

/**
 * Order book entry
 */
export interface OrderBookEntry {
  price: number;
  quantity: number;
}

/**
 * Order book data
 */
export interface ApiOrderBook {
  symbol: string;
  exchange: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

/**
 * Candle/Kline data
 */
export interface ApiCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

/**
 * Liquidation level data
 */
export interface LiquidationLevel {
  leverage: number;
  longLiquidation: number;
  shortLiquidation: number;
}

/**
 * Liquidation map response
 */
export interface ApiLiquidationMap {
  symbol: string;
  currentPrice: number;
  levels: LiquidationLevel[];
  calculatedAt: string;
}

// =============================================================================
// Pump Detection Types
// =============================================================================

/**
 * Pump event from API
 */
export interface ApiPump {
  symbol: string;
  priceChange: number;
  volumeChange: number;
  startPrice: number;
  currentPrice: number;
  startedAt: string;
  duration: number;
  exchanges: string[];
}

// =============================================================================
// Signal Types
// =============================================================================

/**
 * Trading signal from API
 */
export interface ApiSignal {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  minTier: SubscriptionTier;
  status: 'active' | 'closed' | 'expired';
  reason: string;
  aiAnalysis?: string;
  createdAt: string;
  closedAt?: string;
  result?: {
    profit: number;
    duration: number;
  };
}

/**
 * Signal statistics
 */
export interface ApiSignalStats {
  totalSignals: number;
  activeSignals: number;
  winRate: number;
  averageProfit: number;
  bestSignal: {
    symbol: string;
    profit: number;
  };
  lastUpdated: string;
}

// =============================================================================
// Portfolio Types
// =============================================================================

/**
 * Portfolio asset from API
 */
export interface ApiPortfolioAsset {
  id: string;
  symbol: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  value?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Portfolio summary
 */
export interface ApiPortfolio {
  assets: ApiPortfolioAsset[];
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
}

/**
 * Add asset request
 */
export interface AddAssetRequest {
  symbol: string;
  amount: number;
  avgBuyPrice: number;
}

/**
 * Update asset request
 */
export interface UpdateAssetRequest {
  amount?: number;
  avgBuyPrice?: number;
}

// =============================================================================
// AI Analysis Types
// =============================================================================

/**
 * AI Analysis result
 */
export interface ApiAnalysis {
  symbol: string;
  analysis: {
    summary: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    keyPoints: string[];
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  generatedAt: string;
  tokensUsed: number;
}

/**
 * Chat message
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat request
 */
export interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    symbol?: string;
    currentPrice?: number;
    priceChange24h?: number;
  };
}

/**
 * Chat response
 */
export interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    tokensUsed: number;
  };
  rateLimit: {
    remaining: number;
    resetAt: string;
  };
}

/**
 * AI Rate limits
 */
export interface AiLimits {
  tier: SubscriptionTier;
  limit: number;
  limits: Record<SubscriptionTier, number>;
}

// =============================================================================
// Health Check Types
// =============================================================================

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  services?: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}
