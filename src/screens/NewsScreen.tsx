import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useTheme } from '../theme-context';
import NewsCard from '../components/NewsCard';
import {
  NewsArticle,
  NewsCategory,
  NEWS_CATEGORIES,
  getNewsByCategory,
} from '../services/news';

type NewsScreenProps = {
  onArticlePress?: (article: NewsArticle) => void;
};

export default function NewsScreen({ onArticlePress }: NewsScreenProps) {
  const { theme, styles } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState<NewsArticle[]>(() =>
    getNewsByCategory('all')
  );

  const handleCategoryChange = useCallback((category: NewsCategory) => {
    setSelectedCategory(category);
    setArticles(getNewsByCategory(category));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setArticles(getNewsByCategory(selectedCategory));
      setRefreshing(false);
    }, 1000);
  }, [selectedCategory]);

  const handleArticlePress = useCallback(
    (article: NewsArticle) => {
      if (onArticlePress) {
        onArticlePress(article);
      } else {
        // Open article in browser
        Alert.alert(
          'Открыть статью',
          `Открыть "${article.title}" во внешнем браузере?`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Открыть',
              onPress: () => {
                Linking.openURL(article.url).catch(() => {
                  Alert.alert('Ошибка', 'Не удалось открыть ссылку');
                });
              },
            },
          ]
        );
      }
    },
    [onArticlePress]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
        />
      }
    >
      {/* Header */}
      <View style={localStyles.header}>
        <Text style={[styles.sectionTitle, localStyles.title]}>Новости</Text>
        <Text style={[styles.sectionSub, localStyles.subtitle]}>
          Последние новости криптовалютного рынка
        </Text>
      </View>

      {/* Category tabs */}
      <View style={localStyles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={localStyles.categoriesScroll}
          contentContainerStyle={localStyles.categoriesContent}
        >
          {NEWS_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                localStyles.categoryPill,
                { backgroundColor: theme.colors.input },
                selectedCategory === category.id && {
                  backgroundColor: theme.colors.accent,
                },
              ]}
              onPress={() => handleCategoryChange(category.id)}
            >
              <Text
                style={[
                  localStyles.categoryText,
                  { color: theme.colors.textSecondary },
                  selectedCategory === category.id && {
                    color: theme.colors.buttonText,
                  },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Articles count */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Статьи</Text>
        <Text style={styles.sectionSub}>
          {articles.length} {getArticlesCountText(articles.length)}
        </Text>
      </View>

      {/* Article list */}
      <View style={localStyles.articlesSection}>
        {articles.length > 0 ? (
          articles.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onPress={() => handleArticlePress(article)}
            />
          ))
        ) : (
          <View style={localStyles.emptyState}>
            <Text style={[styles.emptyText, localStyles.emptyText]}>
              Нет новостей в этой категории
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getArticlesCountText(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return 'статей';
  }
  if (mod10 === 1) {
    return 'статья';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'статьи';
  }
  return 'статей';
}

const localStyles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    marginTop: 4,
  },
  categoriesSection: {
    marginBottom: 20,
  },
  categoriesScroll: {
    marginHorizontal: -20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
  },
  articlesSection: {
    marginTop: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
