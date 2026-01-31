import {
  AIConfig,
  AIError,
  AnalysisRequest,
  AnalysisResponse,
  ChatMessage,
  DEFAULT_AI_CONFIG,
  Recommendation,
} from './types';

// Placeholder API key - should be set via app config/environment
let apiConfig: AIConfig = {
  ...DEFAULT_AI_CONFIG,
  apiKey: '', // Set via setApiKey function
};

const CRYPTO_SYSTEM_PROMPT = `You are an expert cryptocurrency trading analyst. Your role is to:
1. Analyze crypto market conditions and price movements
2. Provide technical analysis including support/resistance levels
3. Give trading recommendations with clear reasoning
4. Explain market dynamics and whale activity
5. Answer questions about crypto trading strategies

Always be concise but thorough. When providing analysis:
- Include key price levels (support and resistance)
- Mention relevant technical indicators
- Consider market sentiment and volume
- Provide a clear recommendation (BUY/SELL/HOLD) with confidence level
- Explain your reasoning

For price levels, use realistic values based on current market conditions.
Be objective and acknowledge uncertainty when present.
Responses should be in Russian language unless the user asks otherwise.`;

export function setApiKey(key: string): void {
  apiConfig = { ...apiConfig, apiKey: key };
}

export function setConfig(config: Partial<AIConfig>): void {
  apiConfig = { ...apiConfig, ...config };
}

export function getConfig(): AIConfig {
  return { ...apiConfig };
}

export function isConfigured(): boolean {
  return Boolean(apiConfig.apiKey && apiConfig.apiKey.length > 0);
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
  finish_reason: string;
  index: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

function createAIError(error: unknown): AIError {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key. Please check your OpenAI API key.',
        retryable: false,
      };
    }
    if (error.message.includes('429')) {
      return {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded. Please try again later.',
        retryable: true,
      };
    }
    if (error.message.includes('500') || error.message.includes('503')) {
      return {
        code: 'SERVER_ERROR',
        message: 'OpenAI service is temporarily unavailable.',
        retryable: true,
      };
    }
    if (error.message.includes('Network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
        retryable: true,
      };
    }
    return {
      code: 'UNKNOWN',
      message: error.message,
      retryable: false,
    };
  }
  return {
    code: 'UNKNOWN',
    message: 'An unknown error occurred',
    retryable: false,
  };
}

async function callOpenAI(messages: OpenAIMessage[]): Promise<string> {
  if (!apiConfig.apiKey) {
    throw new Error('API key not configured. Please set your OpenAI API key in settings.');
  }

  const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: apiConfig.model,
      messages,
      max_tokens: apiConfig.maxTokens,
      temperature: apiConfig.temperature,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as OpenAIError;
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`OpenAI API error: ${errorMessage}`);
  }

  const data = (await response.json()) as OpenAIResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenAI');
  }

  return data.choices[0].message.content;
}

export async function sendMessage(
  message: string,
  conversationHistory: ChatMessage[] = []
): Promise<{ response: string; error?: AIError }> {
  try {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: CRYPTO_SYSTEM_PROMPT },
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await callOpenAI(messages);
    return { response };
  } catch (error) {
    const aiError = createAIError(error);
    return { response: '', error: aiError };
  }
}

function parseAnalysisResponse(
  response: string,
  symbol: string
): Omit<AnalysisResponse, 'rawResponse'> {
  // Default values
  let summary = '';
  let technicalAnalysis = '';
  let recommendation: Recommendation = 'NEUTRAL';
  let confidence = 50;
  let reasoning = '';
  const support: number[] = [];
  const resistance: number[] = [];

  // Try to extract structured data from response
  const lines = response.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect section headers
    if (lowerLine.includes('summary') || lowerLine.includes('резюме')) {
      currentSection = 'summary';
      continue;
    }
    if (lowerLine.includes('technical') || lowerLine.includes('технический')) {
      currentSection = 'technical';
      continue;
    }
    if (lowerLine.includes('recommendation') || lowerLine.includes('рекомендация')) {
      currentSection = 'recommendation';
      continue;
    }
    if (lowerLine.includes('support') || lowerLine.includes('поддержка')) {
      currentSection = 'support';
    }
    if (lowerLine.includes('resistance') || lowerLine.includes('сопротивление')) {
      currentSection = 'resistance';
    }

    // Extract content based on current section
    if (currentSection === 'summary') {
      summary += line + '\n';
    } else if (currentSection === 'technical') {
      technicalAnalysis += line + '\n';
    } else if (currentSection === 'recommendation') {
      reasoning += line + '\n';
    }

    // Extract recommendation
    if (lowerLine.includes('buy') || lowerLine.includes('покупать') || lowerLine.includes('лонг')) {
      recommendation = 'BUY';
    } else if (lowerLine.includes('sell') || lowerLine.includes('продавать') || lowerLine.includes('шорт')) {
      recommendation = 'SELL';
    } else if (lowerLine.includes('hold') || lowerLine.includes('держать') || lowerLine.includes('удерживать')) {
      recommendation = 'HOLD';
    }

    // Extract price levels (numbers that look like prices)
    const priceMatches = line.match(/\$?(\d{1,6}(?:[.,]\d{1,8})?)/g);
    if (priceMatches && (currentSection === 'support' || currentSection === 'resistance')) {
      for (const match of priceMatches) {
        const price = parseFloat(match.replace(/[$,]/g, ''));
        if (price > 0) {
          if (currentSection === 'support') {
            support.push(price);
          } else {
            resistance.push(price);
          }
        }
      }
    }

    // Extract confidence
    const confidenceMatch = line.match(/(\d{1,3})%/);
    if (confidenceMatch && (lowerLine.includes('confidence') || lowerLine.includes('уверенность'))) {
      confidence = Math.min(100, Math.max(0, parseInt(confidenceMatch[1], 10)));
    }
  }

  // If parsing didn't extract much, use the whole response
  if (!summary.trim()) {
    summary = response.slice(0, 500);
  }
  if (!technicalAnalysis.trim()) {
    technicalAnalysis = response;
  }
  if (!reasoning.trim()) {
    reasoning = response;
  }

  return {
    symbol,
    summary: summary.trim(),
    technicalAnalysis: technicalAnalysis.trim(),
    keyLevels: {
      support: support.slice(0, 3),
      resistance: resistance.slice(0, 3),
    },
    recommendation,
    confidence,
    reasoning: reasoning.trim(),
    timestamp: Date.now(),
  };
}

export async function getCoinAnalysis(
  request: AnalysisRequest
): Promise<{ analysis?: AnalysisResponse; error?: AIError }> {
  try {
    const { symbol, customPrompt } = request;

    let prompt = `Проведи анализ криптовалюты ${symbol}. `;

    if (request.includeTechnical !== false) {
      prompt += 'Включи технический анализ с уровнями поддержки и сопротивления. ';
    }
    if (request.includeFundamental) {
      prompt += 'Добавь фундаментальный анализ проекта. ';
    }
    if (customPrompt) {
      prompt += customPrompt;
    }

    prompt += '\n\nСтруктурируй ответ по разделам:\n1. Резюме\n2. Технический анализ\n3. Уровни поддержки и сопротивления\n4. Рекомендация (BUY/SELL/HOLD) с уровнем уверенности в процентах';

    const { response, error } = await sendMessage(prompt);

    if (error) {
      return { error };
    }

    const analysis = parseAnalysisResponse(response, symbol);

    return {
      analysis: {
        ...analysis,
        rawResponse: response,
      },
    };
  } catch (error) {
    return { error: createAIError(error) };
  }
}

// Quick analysis prompts for common actions
export const QUICK_PROMPTS = {
  BTC: 'Анализ BTC',
  ETH: 'Анализ ETH',
  SOL: 'Анализ SOL',
  BNB: 'Анализ BNB',
  XRP: 'Анализ XRP',
} as const;

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
