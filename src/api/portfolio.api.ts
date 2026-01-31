/**
 * Portfolio API Module
 * Functions for portfolio management operations
 */

import apiClient from './client';
import { ENDPOINTS } from './config';
import {
  ApiPortfolio,
  ApiPortfolioAsset,
  AddAssetRequest,
  UpdateAssetRequest,
} from './types';

/**
 * Get user's portfolio
 */
export async function getPortfolio(): Promise<ApiPortfolio> {
  const response = await apiClient.get<{ portfolio: ApiPortfolio }>(ENDPOINTS.portfolio.get);
  return response.data.portfolio;
}

/**
 * Add a new asset to portfolio
 */
export async function addAsset(asset: AddAssetRequest): Promise<ApiPortfolioAsset> {
  const response = await apiClient.post<{ asset: ApiPortfolioAsset; message: string }>(
    ENDPOINTS.portfolio.addAsset,
    asset
  );
  return response.data.asset;
}

/**
 * Update an existing asset in portfolio
 */
export async function updateAsset(
  id: string,
  updates: UpdateAssetRequest
): Promise<ApiPortfolioAsset> {
  const response = await apiClient.patch<{ asset: ApiPortfolioAsset; message: string }>(
    ENDPOINTS.portfolio.updateAsset(id),
    updates
  );
  return response.data.asset;
}

/**
 * Delete an asset from portfolio
 */
export async function deleteAsset(id: string): Promise<void> {
  await apiClient.delete(ENDPOINTS.portfolio.deleteAsset(id));
}

// Export all functions as named exports
export const portfolioApi = {
  getPortfolio,
  addAsset,
  updateAsset,
  deleteAsset,
};

export default portfolioApi;
