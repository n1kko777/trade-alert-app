/**
 * Market API Module
 * Functions for market data operations
 */

import apiClient from './client';
import { ENDPOINTS, MarketQueryParams } from './config';
import {
  ApiTicker,
  ApiOrderBook,
  ApiCandle,
  ApiLiquidationMap,
} from './types';

/**
 * Get all tickers
 */
export async function getTickers(
  params?: Pick<MarketQueryParams, 'exchange'>
): Promise<ApiTicker[]> {
  const response = await apiClient.get<ApiTicker[]>(
    ENDPOINTS.market.tickers,
    { params }
  );
  return response.data;
}

/**
 * Get ticker for a specific symbol
 */
export async function getTicker(symbol: string): Promise<ApiTicker> {
  const response = await apiClient.get<ApiTicker>(
    ENDPOINTS.market.ticker(symbol)
  );
  return response.data;
}

/**
 * Get order book for a symbol
 */
export async function getOrderBook(
  symbol: string,
  params?: Pick<MarketQueryParams, 'exchange' | 'depth'>
): Promise<ApiOrderBook> {
  const response = await apiClient.get<ApiOrderBook>(
    ENDPOINTS.market.orderbook(symbol),
    { params }
  );
  return response.data;
}

/**
 * Get candles/klines for a symbol
 */
export async function getCandles(
  symbol: string,
  params?: Pick<MarketQueryParams, 'exchange' | 'interval' | 'limit'>
): Promise<ApiCandle[]> {
  const response = await apiClient.get<ApiCandle[]>(
    ENDPOINTS.market.candles(symbol),
    { params }
  );
  return response.data;
}

/**
 * Get liquidation map for a symbol
 */
export async function getLiquidations(symbol: string): Promise<ApiLiquidationMap> {
  const response = await apiClient.get<ApiLiquidationMap>(
    ENDPOINTS.market.liquidations(symbol)
  );
  return response.data;
}

// Export all functions as named exports
export const marketApi = {
  getTickers,
  getTicker,
  getOrderBook,
  getCandles,
  getLiquidations,
};

export default marketApi;
