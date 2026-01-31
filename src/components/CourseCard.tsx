import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme-context';
import { Course } from '../data/educationData';

interface CourseCardProps {
  course: Course;
  onPress?: () => void;
  showProgress?: boolean;
  featured?: boolean;
}

function CourseCard({ course, onPress, showProgress, featured }: CourseCardProps) {
  const { theme } = useTheme();

  const completedLessons = course.lessons.filter((l) => l.completed).length;
  const totalLessons = course.lessons.length;
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
        featured && styles.cardFeatured,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: theme.colors.metaBadge }]}>
        <Text style={styles.thumbnailEmoji}>{course.thumbnailEmoji || '📚'}</Text>
        {course.isPro && (
          <View style={[styles.proBadge, { backgroundColor: theme.colors.warning }]}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          {course.title}
        </Text>

        {/* Instructor */}
        <Text style={[styles.instructor, { color: theme.colors.textMuted }]}>
          {course.instructor.name}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={[styles.metaItem, { backgroundColor: theme.colors.metaBadge }]}>
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {course.duration} мин
            </Text>
          </View>
          <View style={[styles.metaItem, { backgroundColor: theme.colors.metaBadge }]}>
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {totalLessons} уроков
            </Text>
          </View>
        </View>

        {/* Progress Bar (if enrolled and showProgress) */}
        {(course.enrolled || showProgress) && progressPercent > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.metaBadge }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.colors.accent, width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.accent }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(CourseCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardFeatured: {
    paddingVertical: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnailEmoji: {
    fontSize: 32,
  },
  proBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 9,
    color: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    marginBottom: 4,
  },
  instructor: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    minWidth: 32,
  },
});
