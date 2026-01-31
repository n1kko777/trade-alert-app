import { z } from 'zod';

/**
 * Symbol parameter validation for analysis endpoint
 */
export const analyzeParamsSchema = z.object({
  symbol: z
    .string()
    .min(3, 'Symbol must be at least 3 characters')
    .max(20, 'Symbol must be at most 20 characters')
    .regex(/^[A-Z0-9]+$/i, 'Symbol must be alphanumeric')
    .transform((s) => s.toUpperCase()),
});
export type AnalyzeParams = z.infer<typeof analyzeParamsSchema>;

/**
 * Chat message role
 */
export const chatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof chatRoleSchema>;

/**
 * Individual chat message
 */
export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

/**
 * Chat context for additional market information
 */
export const chatContextSchema = z.object({
  symbol: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/i)
    .transform((s) => s.toUpperCase())
    .optional(),
  currentPrice: z.number().positive().optional(),
  priceChange24h: z.number().optional(),
});
export type ChatContextInput = z.infer<typeof chatContextSchema>;

/**
 * Request body for chat endpoint
 */
export const chatBodySchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, 'At least one message is required')
    .max(50, 'Too many messages'),
  context: chatContextSchema.optional(),
});
export type ChatBody = z.infer<typeof chatBodySchema>;
