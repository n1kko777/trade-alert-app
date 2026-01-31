import { z } from 'zod';

/**
 * Signal direction: buy (long) or sell (short)
 */
export const signalDirectionSchema = z.enum(['buy', 'sell']);
export type SignalDirection = z.infer<typeof signalDirectionSchema>;

/**
 * Signal status lifecycle
 */
export const signalStatusSchema = z.enum([
  'active',
  'tp1_hit',
  'tp2_hit',
  'tp3_hit',
  'closed',
  'cancelled',
]);
export type SignalStatus = z.infer<typeof signalStatusSchema>;

/**
 * AI trigger types that can generate signals
 */
export const aiTriggerTypeSchema = z.enum([
  'pump_detection',
  'volume_anomaly',
  'support_bounce',
  'resistance_break',
  'macd_cross',
  'rsi_oversold',
]);
export type AiTriggerType = z.infer<typeof aiTriggerTypeSchema>;

/**
 * AI trigger data structure
 */
export const aiTriggerSchema = z.object({
  type: aiTriggerTypeSchema,
  confidence: z.number().min(0).max(100),
  data: z.record(z.unknown()).optional(),
});
export type AiTrigger = z.infer<typeof aiTriggerSchema>;

/**
 * Subscription tier
 */
export const tierSchema = z.enum(['free', 'pro', 'premium', 'vip']);
export type Tier = z.infer<typeof tierSchema>;

/**
 * Signal data stored in database
 */
export const signalSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(3).max(20),
  exchange: z.string().min(2).max(20),
  direction: signalDirectionSchema,
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit1: z.number().positive().nullable(),
  takeProfit2: z.number().positive().nullable(),
  takeProfit3: z.number().positive().nullable(),
  aiConfidence: z.number().min(0).max(100).nullable(),
  aiTriggers: z.array(aiTriggerSchema).nullable(),
  status: signalStatusSchema,
  resultPnl: z.number().nullable(),
  closedAt: z.date().nullable(),
  createdAt: z.date(),
  minTier: tierSchema,
});
export type Signal = z.infer<typeof signalSchema>;

/**
 * Signal creation input (without auto-generated fields)
 */
export const createSignalSchema = z.object({
  symbol: z.string().min(3).max(20).regex(/^[A-Z0-9]+$/i, 'Symbol must be alphanumeric'),
  exchange: z.string().min(2).max(20),
  direction: signalDirectionSchema,
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit1: z.number().positive().optional(),
  takeProfit2: z.number().positive().optional(),
  takeProfit3: z.number().positive().optional(),
  aiConfidence: z.number().min(0).max(100).optional(),
  aiTriggers: z.array(aiTriggerSchema).optional(),
  minTier: tierSchema.optional().default('free'),
});
export type CreateSignalInput = z.infer<typeof createSignalSchema>;

/**
 * Signal filter parameters for listing
 */
export const signalFilterSchema = z.object({
  status: signalStatusSchema.optional(),
  symbol: z.string().min(3).max(20).optional(),
  direction: signalDirectionSchema.optional(),
  minTier: tierSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
export type SignalFilter = z.infer<typeof signalFilterSchema>;

/**
 * Signal statistics
 */
export const signalStatsSchema = z.object({
  totalSignals: z.number().int(),
  activeSignals: z.number().int(),
  closedSignals: z.number().int(),
  winRate: z.number().min(0).max(100),
  averagePnl: z.number(),
  totalPnl: z.number(),
  signalsByTrigger: z.record(z.number().int()),
});
export type SignalStats = z.infer<typeof signalStatsSchema>;

/**
 * URL parameter schema for signal ID
 */
export const signalIdParamSchema = z.object({
  id: z.string().uuid('Invalid signal ID format'),
});
export type SignalIdParam = z.infer<typeof signalIdParamSchema>;
