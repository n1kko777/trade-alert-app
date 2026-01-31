import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme-context';
import CourseCard from '../components/CourseCard';
import { Course, CourseCategory, demoCourses } from '../data/educationData';

type EducationScreenProps = {
  onCoursePress?: (course: Course) => void;
};

const categories: { id: CourseCategory; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'basic', label: 'Основы' },
  { id: 'technical', label: 'Тех. анализ' },
  { id: 'psychology', label: 'Психология' },
  { id: 'advanced', label: 'Продвинутый' },
];

export default function EducationScreen({ onCoursePress }: EducationScreenProps) {
  const { theme, styles } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory>('all');

  const filteredCourses = selectedCategory === 'all'
    ? demoCourses
    : demoCourses.filter((course) => course.category === selectedCategory);

  const enrolledCourses = demoCourses.filter((course) => course.enrolled);
  const featuredCourses = demoCourses.filter((course) => course.featured);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={localStyles.header}>
        <Text style={[styles.sectionTitle, localStyles.title]}>Обучение</Text>
        <Text style={[styles.sectionSub, localStyles.subtitle]}>
          Изучайте криптовалюты и трейдинг
        </Text>
      </View>

      {/* Progress Section for Enrolled Courses */}
      {enrolledCourses.length > 0 && (
        <View style={localStyles.progressSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Мой прогресс</Text>
            <Text style={styles.sectionSub}>{enrolledCourses.length} курс(ов)</Text>
          </View>
          {enrolledCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onPress={() => onCoursePress?.(course)}
              showProgress
            />
          ))}
        </View>
      )}

      {/* Featured Courses */}
      {featuredCourses.length > 0 && (
        <View style={localStyles.featuredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Рекомендуемые</Text>
          </View>
          {featuredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onPress={() => onCoursePress?.(course)}
              featured
            />
          ))}
        </View>
      )}

      {/* Categories */}
      <View style={localStyles.categoriesSection}>
        <Text style={styles.sectionTitle}>Категории</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={localStyles.categoriesScroll}
          contentContainerStyle={localStyles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                localStyles.categoryPill,
                { backgroundColor: theme.colors.input },
                selectedCategory === category.id && {
                  backgroundColor: theme.colors.accent,
                },
              ]}
              onPress={() => setSelectedCategory(category.id)}
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

      {/* All Courses */}
      <View style={localStyles.coursesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Все курсы</Text>
          <Text style={styles.sectionSub}>{filteredCourses.length} курс(ов)</Text>
        </View>
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onPress={() => onCoursePress?.(course)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 24,
  },
  featuredSection: {
    marginBottom: 24,
  },
  categoriesSection: {
    marginBottom: 16,
  },
  categoriesScroll: {
    marginTop: 12,
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
  coursesSection: {
    marginTop: 8,
  },
});
