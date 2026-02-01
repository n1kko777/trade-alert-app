import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../theme-context';
import AIChat from '../components/AIChat';
import { apiClient, ENDPOINTS } from '../api';
import type { ChatRequest, ChatResponse, ApiAnalysis, ChatMessage as ApiChatMessage } from '../api/types';
import type { ChatMessage, AnalysisResponse } from '../services/ai/types';

type QuickAction = 'BTC' | 'ETH' | 'SOL' | 'BNB' | 'XRP';

const QUICK_PROMPTS: Record<QuickAction, string> = {
  BTC: 'Анализ BTC',
  ETH: 'Анализ ETH',
  SOL: 'Анализ SOL',
  BNB: 'Анализ BNB',
  XRP: 'Анализ XRP',
};

const QUICK_ACTIONS: { key: QuickAction; label: string }[] = [
  { key: 'BTC', label: 'Анализ BTC' },
  { key: 'ETH', label: 'Анализ ETH' },
  { key: 'SOL', label: 'Анализ SOL' },
  { key: 'BNB', label: 'Анализ BNB' },
  { key: 'XRP', label: 'Анализ XRP' },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect sentiment from analysis text
 */
function detectSentiment(text: string): 'BUY' | 'SELL' | 'HOLD' {
  const lowerText = text.toLowerCase();

  const bullishKeywords = ['bullish', 'uptrend', 'buying opportunity', 'buy', 'long', 'upward', 'breakout', 'rally'];
  const bearishKeywords = ['bearish', 'downtrend', 'sell', 'short', 'decline', 'drop', 'breakdown', 'falling'];

  let bullishScore = 0;
  let bearishScore = 0;

  for (const keyword of bullishKeywords) {
    if (lowerText.includes(keyword)) bullishScore++;
  }
  for (const keyword of bearishKeywords) {
    if (lowerText.includes(keyword)) bearishScore++;
  }

  if (bullishScore > bearishScore + 1) return 'BUY';
  if (bearishScore > bullishScore + 1) return 'SELL';
  return 'HOLD';
}

/**
 * Extract price levels from analysis text
 * Looks for dollar amounts near support/resistance keywords
 */
function extractPriceLevels(text: string): { support: number[]; resistance: number[] } {
  const support: number[] = [];
  const resistance: number[] = [];

  // Pattern to match prices like $75,500 or $78,000.50 or 75500
  const pricePattern = /\$?([\d,]+(?:\.\d+)?)/g;

  // Split text into sentences for context analysis
  const sentences = text.split(/[.!?\n]+/);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const prices: number[] = [];

    // Extract all prices from this sentence
    let match;
    while ((match = pricePattern.exec(sentence)) !== null) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      // Only consider reasonable crypto prices (> $10 to filter out percentages)
      if (!isNaN(price) && price > 10) {
        prices.push(price);
      }
    }

    // Categorize prices based on context
    if (prices.length > 0) {
      if (lowerSentence.includes('support') || lowerSentence.includes('low') || lowerSentence.includes('floor')) {
        support.push(...prices);
      }
      if (lowerSentence.includes('resistance') || lowerSentence.includes('high') || lowerSentence.includes('ceiling')) {
        resistance.push(...prices);
      }
    }
  }

  // Remove duplicates and sort
  const uniqueSupport = [...new Set(support)].sort((a, b) => a - b).slice(0, 3);
  const uniqueResistance = [...new Set(resistance)].sort((a, b) => b - a).slice(0, 3);

  return { support: uniqueSupport, resistance: uniqueResistance };
}

export default function AIAnalysisScreen() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, analysis?: AnalysisResponse) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      analysis,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    addMessage('user', text.trim());
    setInputText('');
    setIsTyping(true);

    try {
      // Prepare chat request for backend API (filter to only user/assistant messages)
      const chatMessages: ApiChatMessage[] = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      chatMessages.push({ role: 'user', content: text.trim() });

      const response = await apiClient.post<ChatResponse>(
        ENDPOINTS.ai.chat,
        { messages: chatMessages } as ChatRequest
      );

      if (response.data.success && response.data.data) {
        addMessage('assistant', response.data.data.message);
      } else {
        addMessage('assistant', 'Не удалось получить ответ от AI.');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Произошла неизвестная ошибка. Попробуйте позже.';
      addMessage('assistant', `Ошибка: ${errorMessage}`);
    } finally {
      setIsTyping(false);
    }
  }, [messages, addMessage]);

  const handleQuickAction = useCallback(async (action: QuickAction) => {
    const prompt = QUICK_PROMPTS[action];
    addMessage('user', prompt);
    setIsTyping(true);

    try {
      // Fetch analysis from backend API (POST method)
      const response = await apiClient.post<{ success: boolean; data: ApiAnalysis }>(
        ENDPOINTS.ai.analyze(`${action}USDT`)
      );

      if (response.data.success && response.data.data) {
        const apiAnalysis = response.data.data;

        // Handle both structured and raw string analysis responses
        const analysisContent = typeof apiAnalysis.analysis === 'string'
          ? apiAnalysis.analysis
          : apiAnalysis.analysis?.summary || '';

        // Extract support/resistance levels from the analysis text
        const extractedLevels = extractPriceLevels(analysisContent);

        // Map API response to local AnalysisResponse format
        const analysis: AnalysisResponse = {
          symbol: apiAnalysis.symbol,
          summary: analysisContent,
          technicalAnalysis: typeof apiAnalysis.analysis === 'string'
            ? analysisContent
            : (apiAnalysis.analysis?.keyPoints?.join('\n') || ''),
          keyLevels: extractedLevels,
          recommendation: typeof apiAnalysis.analysis === 'string'
            ? detectSentiment(analysisContent)
            : (apiAnalysis.analysis?.sentiment === 'bullish' ? 'BUY' :
               apiAnalysis.analysis?.sentiment === 'bearish' ? 'SELL' : 'HOLD'),
          confidence: typeof apiAnalysis.analysis === 'string'
            ? 75
            : (apiAnalysis.analysis?.confidence || 75),
          reasoning: typeof apiAnalysis.analysis === 'string'
            ? analysisContent
            : (apiAnalysis.analysis?.recommendation || ''),
          timestamp: new Date(apiAnalysis.generatedAt).getTime(),
          rawResponse: analysisContent,
        };

        // Add message with attached analysis card
        addMessage('assistant', analysisContent, analysis);
      } else {
        addMessage('assistant', 'Не удалось получить анализ.');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Произошла ошибка при анализе. Попробуйте позже.';
      addMessage('assistant', `Ошибка анализа: ${errorMessage}`);
    } finally {
      setIsTyping(false);
    }
  }, [addMessage]);

  const handleSubmit = useCallback(() => {
    handleSendMessage(inputText);
  }, [inputText, handleSendMessage]);

  const handleCopyMessage = useCallback((content: string) => {
    // Clipboard is handled in the component
  }, []);

  const clearChat = useCallback(() => {
    Alert.alert(
      'Очистить чат',
      'Вы уверены, что хотите очистить историю чата?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
          },
        },
      ]
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            GPT Анализ
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            AI-помощник для криптотрейдинга
          </Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: theme.colors.danger }]}>
              Очистить
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chat Messages */}
      <View style={styles.chatContainer}>
        <AIChat
          messages={messages}
          isTyping={isTyping}
          onCopyMessage={handleCopyMessage}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContent}
        >
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.quickActionButton,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.divider },
              ]}
              onPress={() => handleQuickAction(action.key)}
              disabled={isTyping}
            >
              <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.input,
              color: theme.colors.textPrimary,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Задайте вопрос о крипто..."
          placeholderTextColor={theme.colors.textPlaceholder}
          multiline
          maxLength={500}
          editable={!isTyping}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && !isTyping
                ? theme.colors.accent
                : theme.colors.input,
            },
          ]}
          onPress={handleSubmit}
          disabled={!inputText.trim() || isTyping}
        >
          <Text
            style={[
              styles.sendButtonText,
              {
                color: inputText.trim() && !isTyping
                  ? theme.colors.buttonText
                  : theme.colors.textMuted,
              },
            ]}
          >
            {isTyping ? '...' : 'Отправить'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
  },
  quickActionsContainer: {
    paddingVertical: 8,
  },
  quickActionsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    gap: 12,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
