export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  analysis?: AnalysisResponse; // Optional attached analysis card
}

export interface AnalysisRequest {
  symbol: string;
  includePrice?: boolean;
  includeTechnical?: boolean;
  includeFundamental?: boolean;
  customPrompt?: string;
}

export interface AnalysisSection {
  title: string;
  content: string;
}

export type Recommendation = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';

export interface AnalysisResponse {
  symbol: string;
  summary: string;
  technicalAnalysis: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  recommendation: Recommendation;
  confidence: number; // 0-100
  reasoning: string;
  timestamp: number;
  rawResponse?: string;
}

export interface AIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  baseUrl?: string;
}

export interface AIError {
  code: string;
  message: string;
  retryable: boolean;
}

export const DEFAULT_AI_CONFIG: Omit<AIConfig, 'apiKey'> = {
  model: 'gpt-4',
  maxTokens: 2048,
  temperature: 0.7,
  baseUrl: 'https://api.openai.com/v1',
};
