import { z } from 'zod';

/**
 * Schema for adding a new asset to portfolio
 */
export const addAssetSchema = z.object({
  symbol: z.string()
    .min(3, 'Symbol must be at least 3 characters')
    .max(20, 'Symbol must be at most 20 characters')
    .regex(/^[A-Z0-9]+$/i, 'Symbol must be alphanumeric')
    .transform((s) => s.toUpperCase()),
  amount: z.number()
    .positive('Amount must be positive'),
  avgBuyPrice: z.number()
    .positive('Average buy price must be positive'),
});
export type AddAssetInput = z.infer<typeof addAssetSchema>;

/**
 * Schema for updating an existing asset
 */
export const updateAssetSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  avgBuyPrice: z.number().positive('Average buy price must be positive').optional(),
}).refine(
  (data) => data.amount !== undefined || data.avgBuyPrice !== undefined,
  { message: 'At least one field must be provided for update' }
);
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

/**
 * URL parameter schema for asset ID
 */
export const assetIdParamSchema = z.object({
  id: z.string().uuid('Invalid asset ID format'),
});
export type AssetIdParam = z.infer<typeof assetIdParamSchema>;

/**
 * Portfolio asset with calculated values
 */
export interface PortfolioAsset {
  id: string;
  userId: string;
  symbol: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number | null;
  currentValue: number | null;
  pnl: number | null;  // P&L percentage
  pnlAbsolute: number | null;  // P&L in absolute terms
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Full portfolio with total values
 */
export interface Portfolio {
  assets: PortfolioAsset[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;  // Total P&L percentage
  totalPnlAbsolute: number;  // Total P&L in absolute terms
  assetsWithPrice: number;  // Number of assets with available prices
  assetsWithoutPrice: number;  // Number of assets without available prices
}

/**
 * Database row type for portfolios table
 */
export interface PortfolioDbRow {
  id: string;
  user_id: string;
  symbol: string;
  quantity: string;  // NUMERIC comes as string from Postgres
  avg_buy_price: string;  // NUMERIC comes as string from Postgres
  created_at: Date;
  updated_at: Date;
}
