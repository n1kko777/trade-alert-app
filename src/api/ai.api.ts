/**
 * AI API Module
 * Functions for AI analysis operations
 */

import apiClient from './client';
import { ENDPOINTS } from './config';
import {
  ApiAnalysis,
  ChatRequest,
  ChatResponse,
  AiLimits,
} from './types';

/**
 * Response wrapper for analysis endpoint
 */
interface AnalyzeResponse {
  success: boolean;
  data: ApiAnalysis;
}

/**
 * Analyze a symbol using AI
 */
export async function analyzeSymbol(symbol: string): Promise<ApiAnalysis> {
  const response = await apiClient.post<AnalyzeResponse>(
    ENDPOINTS.ai.analyze(symbol)
  );
  return response.data.data;
}

/**
 * Send a chat message to AI assistant
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>(
    ENDPOINTS.ai.chat,
    request
  );
  return response.data;
}

/**
 * Get AI usage limits for current user
 */
export async function getLimits(): Promise<AiLimits> {
  const response = await apiClient.get<AiLimits>(ENDPOINTS.ai.limits);
  return response.data;
}

// Export all functions as named exports
export const aiApi = {
  analyzeSymbol,
  chat,
  getLimits,
};

export default aiApi;
