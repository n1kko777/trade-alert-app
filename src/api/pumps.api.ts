/**
 * Pumps API Module
 * Functions for pump detection operations
 */

import apiClient from './client';
import { ENDPOINTS } from './config';
import { ApiPump } from './types';

/**
 * Get list of active pumps
 */
export async function getActivePumps(): Promise<ApiPump[]> {
  const response = await apiClient.get<{ pumps: ApiPump[]; count: number }>(ENDPOINTS.pumps.list);
  return response.data.pumps;
}

/**
 * Get pump details for a specific symbol
 */
export async function getPump(symbol: string): Promise<ApiPump> {
  const response = await apiClient.get<ApiPump>(
    ENDPOINTS.pumps.get(symbol)
  );
  return response.data;
}

// Export all functions as named exports
export const pumpsApi = {
  getActivePumps,
  getPump,
};

export default pumpsApi;
