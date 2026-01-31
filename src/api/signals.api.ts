/**
 * Signals API Module
 * Functions for trading signals operations
 */

import apiClient from './client';
import { ENDPOINTS, SignalsQueryParams } from './config';
import {
  ApiSignal,
  ApiSignalStats,
  PaginatedResponse,
} from './types';

/**
 * Get list of signals with optional filters
 */
export async function getSignals(
  params?: SignalsQueryParams
): Promise<PaginatedResponse<ApiSignal>> {
  const response = await apiClient.get<PaginatedResponse<ApiSignal>>(
    ENDPOINTS.signals.list,
    { params }
  );
  return response.data;
}

/**
 * Get a specific signal by ID
 */
export async function getSignal(id: string): Promise<ApiSignal> {
  const response = await apiClient.get<ApiSignal>(
    ENDPOINTS.signals.get(id)
  );
  return response.data;
}

/**
 * Get signal statistics
 */
export async function getSignalStats(): Promise<ApiSignalStats> {
  const response = await apiClient.get<ApiSignalStats>(
    ENDPOINTS.signals.stats
  );
  return response.data;
}

// Export all functions as named exports
export const signalsApi = {
  getSignals,
  getSignal,
  getSignalStats,
};

export default signalsApi;
