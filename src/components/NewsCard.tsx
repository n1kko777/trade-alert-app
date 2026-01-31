import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme-context';
import { NewsArticle, formatTimeAgo } from '../services/news';

interface NewsCardProps {
  article: NewsArticle;
  onPress?: () => void;
}

const categoryLabels: Record<string, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  altcoins: 'Altcoins',
  defi: 'DeFi',
  nft: 'NFT',
  regulation: 'Регулирование',
};

const categoryColors: Record<string, string> = {
  bitcoin: '#F7931A',
  ethereum: '#627EEA',
  altcoins: '#8B5CF6',
  defi: '#10B981',
  nft: '#EC4899',
  regulation: '#6B7280',
};

function NewsCard({ article, onPress }: NewsCardProps) {
  const { theme } = useTheme();

  const categoryColor = categoryColors[article.category] || theme.colors.accent;
  const categoryLabel = categoryLabels[article.category] || article.category;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Image placeholder / gradient */}
      <View
        style={[
          styles.imagePlaceholder,
          {
            backgroundColor: categoryColor,
            opacity: 0.15,
          },
        ]}
      >
        <View
          style={[
            styles.gradientOverlay,
            { backgroundColor: categoryColor },
          ]}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Category badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {categoryLabel}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={[styles.title, { color: theme.colors.textPrimary }]}
          numberOfLines={2}
        >
          {article.title}
        </Text>

        {/* Summary */}
        <Text
          style={[styles.summary, { color: theme.colors.textSecondary }]}
          numberOfLines={3}
        >
          {article.summary}
        </Text>

        {/* Footer: source and time */}
        <View style={styles.footer}>
          <Text style={[styles.source, { color: theme.colors.textMuted }]}>
            {article.source}
          </Text>
          <View style={[styles.dot, { backgroundColor: theme.colors.textMuted }]} />
          <Text style={[styles.time, { color: theme.colors.textMuted }]}>
            {formatTimeAgo(article.publishedAt)}
          </Text>
        </View>

        {/* Read more */}
        <View style={styles.readMoreContainer}>
          <Text style={[styles.readMore, { color: theme.colors.accent }]}>
            Читать далее
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(NewsCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    height: 120,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    opacity: 0.3,
  },
  content: {
    padding: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  categoryText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  summary: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  time: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
  },
  readMoreContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
  readMore: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
  },
});
