import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard } from 'react-native';
import { useTheme } from '../theme-context';
import { AnalysisResponse, Recommendation } from '../services/ai/types';

/**
 * Strip markdown syntax from text for clean display
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/__([^_]+)__/g, '$1') // Remove bold (underscore)
    .replace(/_([^_]+)_/g, '$1') // Remove italic (underscore)
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/^\s*[-*+]\s+/gm, '• ') // Convert list markers to bullets
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    .trim();
}

interface AnalysisCardProps {
  analysis: AnalysisResponse;
  onCopy?: () => void;
}

function getRecommendationColor(
  recommendation: Recommendation,
  colors: { success: string; danger: string; warning: string; textMuted: string }
): string {
  switch (recommendation) {
    case 'BUY':
      return colors.success;
    case 'SELL':
      return colors.danger;
    case 'HOLD':
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

function getRecommendationText(recommendation: Recommendation): string {
  switch (recommendation) {
    case 'BUY':
      return 'ПОКУПАТЬ';
    case 'SELL':
      return 'ПРОДАВАТЬ';
    case 'HOLD':
      return 'ДЕРЖАТЬ';
    default:
      return 'НЕЙТРАЛЬНО';
  }
}

export default function AnalysisCard({ analysis, onCopy }: AnalysisCardProps) {
  const { theme } = useTheme();

  const handleCopy = () => {
    const text = `${analysis.symbol} Analysis

Summary:
${analysis.summary}

Technical Analysis:
${analysis.technicalAnalysis}

Key Levels:
Support: ${analysis.keyLevels.support.join(', ') || 'N/A'}
Resistance: ${analysis.keyLevels.resistance.join(', ') || 'N/A'}

Recommendation: ${analysis.recommendation} (${analysis.confidence}% confidence)

${analysis.reasoning}`;

    Clipboard.setString(text);
    onCopy?.();
  };

  const recommendationColor = getRecommendationColor(analysis.recommendation, theme.colors);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    }
    // For very small prices (< $1), show more decimals
    return `$${price.toFixed(4)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.symbol, { color: theme.colors.textPrimary }]}>
            {analysis.symbol}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.textMuted }]}>
            {new Date(analysis.timestamp).toLocaleString('ru-RU')}
          </Text>
        </View>
        <View style={[styles.recommendationBadge, { backgroundColor: recommendationColor }]}>
          <Text style={styles.recommendationText}>
            {getRecommendationText(analysis.recommendation)}
          </Text>
        </View>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Резюме
        </Text>
        <Text style={[styles.sectionContent, { color: theme.colors.textSecondary }]}>
          {stripMarkdown(analysis.summary)}
        </Text>
      </View>

      {/* Technical Analysis Section */}
      {analysis.technicalAnalysis && analysis.technicalAnalysis !== analysis.summary && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Технический анализ
          </Text>
          <Text style={[styles.sectionContent, { color: theme.colors.textSecondary }]} numberOfLines={10}>
            {stripMarkdown(analysis.technicalAnalysis)}
          </Text>
        </View>
      )}

      {/* Key Levels Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Ключевые уровни
        </Text>
        <View style={styles.levelsContainer}>
          {/* Support Levels */}
          <View style={styles.levelColumn}>
            <Text style={[styles.levelLabel, { color: theme.colors.success }]}>
              Поддержка
            </Text>
            {analysis.keyLevels.support.length > 0 ? (
              analysis.keyLevels.support.map((level, index) => (
                <Text
                  key={`support-${index}`}
                  style={[styles.levelValue, { color: theme.colors.textPrimary }]}
                >
                  {formatPrice(level)}
                </Text>
              ))
            ) : (
              <Text style={[styles.levelValue, { color: theme.colors.textMuted }]}>
                N/A
              </Text>
            )}
          </View>
          {/* Resistance Levels */}
          <View style={styles.levelColumn}>
            <Text style={[styles.levelLabel, { color: theme.colors.danger }]}>
              Сопротивление
            </Text>
            {analysis.keyLevels.resistance.length > 0 ? (
              analysis.keyLevels.resistance.map((level, index) => (
                <Text
                  key={`resistance-${index}`}
                  style={[styles.levelValue, { color: theme.colors.textPrimary }]}
                >
                  {formatPrice(level)}
                </Text>
              ))
            ) : (
              <Text style={[styles.levelValue, { color: theme.colors.textMuted }]}>
                N/A
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Confidence */}
      <View style={styles.confidenceSection}>
        <Text style={[styles.confidenceLabel, { color: theme.colors.textMuted }]}>
          Уверенность:
        </Text>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              {
                width: `${analysis.confidence}%`,
                backgroundColor: recommendationColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.confidenceValue, { color: theme.colors.textPrimary }]}>
          {analysis.confidence}%
        </Text>
      </View>

      {/* Reasoning - only show if different from summary/technical */}
      {analysis.reasoning &&
       analysis.reasoning !== analysis.technicalAnalysis &&
       analysis.reasoning !== analysis.summary && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Обоснование
          </Text>
          <Text
            style={[styles.sectionContent, { color: theme.colors.textSecondary }]}
            numberOfLines={5}
          >
            {stripMarkdown(analysis.reasoning)}
          </Text>
        </View>
      )}

      {/* Copy Button */}
      <TouchableOpacity
        style={[styles.copyButton, { borderColor: theme.colors.divider }]}
        onPress={handleCopy}
      >
        <Text style={[styles.copyButtonText, { color: theme.colors.accent }]}>
          Копировать анализ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  symbol: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  recommendationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recommendationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  levelsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  levelColumn: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  levelValue: {
    fontSize: 14,
    marginBottom: 4,
  },
  confidenceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  confidenceLabel: {
    fontSize: 12,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  copyButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
