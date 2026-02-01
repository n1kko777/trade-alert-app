import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme-context';
import { Course, Lesson, demoCourses } from '../data/educationData';
import LessonPlayer from '../components/LessonPlayer';
import type { RootStackParamList } from '../navigation/types';

const PROGRESS_STORAGE_KEY = '@tradepulse:course_progress';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'CourseDetail'>;

export default function CourseDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { courseId } = route.params;

  // Find the course by ID from demo data
  const course = useMemo(() => {
    return demoCourses.find(c => c.id === courseId) || demoCourses[0];
  }, [courseId]);

  const onBack = () => {
    navigation.goBack();
  };

  const { theme, styles } = useTheme();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(course.lessons.filter((l) => l.completed).map((l) => l.id))
  );

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
        if (stored) {
          const allProgress: Record<string, string[]> = JSON.parse(stored);
          const courseProgress = allProgress[courseId];
          if (courseProgress && Array.isArray(courseProgress)) {
            setCompletedLessons(new Set(courseProgress));
          }
        }
      } catch (error) {
        console.warn('Failed to load course progress:', error);
      }
    };
    loadProgress();
  }, [courseId]);

  // Save progress when completed lessons change
  const saveProgress = useCallback(async (lessonIds: Set<string>) => {
    try {
      const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
      const allProgress: Record<string, string[]> = stored ? JSON.parse(stored) : {};
      allProgress[courseId] = Array.from(lessonIds);
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allProgress));
    } catch (error) {
      console.warn('Failed to save course progress:', error);
    }
  }, [courseId]);

  const completedCount = completedLessons.size;
  const totalLessons = course.lessons.length;
  const progressPercent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  const handleMarkComplete = useCallback((lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      next.add(lessonId);
      saveProgress(next);
      return next;
    });
  }, [saveProgress]);

  const getCurrentLessonIndex = () => {
    if (!selectedLesson) return -1;
    return course.lessons.findIndex((l) => l.id === selectedLesson.id);
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex > 0) {
      setSelectedLesson(course.lessons[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < course.lessons.length - 1) {
      setSelectedLesson(course.lessons[currentIndex + 1]);
    }
  };

  if (selectedLesson) {
    const currentIndex = getCurrentLessonIndex();
    return (
      <LessonPlayer
        lesson={selectedLesson}
        isCompleted={completedLessons.has(selectedLesson.id)}
        onMarkComplete={() => handleMarkComplete(selectedLesson.id)}
        onBack={() => setSelectedLesson(null)}
        onPrevious={currentIndex > 0 ? handlePrevious : undefined}
        onNext={currentIndex < course.lessons.length - 1 ? handleNext : undefined}
        currentIndex={currentIndex}
        totalLessons={totalLessons}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Back Button */}
      <TouchableOpacity style={localStyles.backButton} onPress={onBack}>
        <Text style={[localStyles.backText, { color: theme.colors.accent }]}>
          ← Назад
        </Text>
      </TouchableOpacity>

      {/* Course Header */}
      <View style={[localStyles.courseHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        {/* Thumbnail Placeholder */}
        <View style={[localStyles.thumbnail, { backgroundColor: theme.colors.metaBadge }]}>
          <Text style={[localStyles.thumbnailText, { color: theme.colors.textMuted }]}>
            {course.thumbnailEmoji || '📚'}
          </Text>
        </View>

        {/* Pro Badge */}
        {course.isPro && (
          <View style={[localStyles.proBadge, { backgroundColor: theme.colors.warning }]}>
            <Text style={localStyles.proBadgeText}>PRO</Text>
          </View>
        )}

        {/* Title and Description */}
        <Text style={[localStyles.courseTitle, { color: theme.colors.textPrimary }]}>
          {course.title}
        </Text>
        <Text style={[localStyles.courseDescription, { color: theme.colors.textSecondary }]}>
          {course.description}
        </Text>

        {/* Instructor Info */}
        <View style={localStyles.instructorRow}>
          <View style={[localStyles.instructorAvatar, { backgroundColor: theme.colors.accent }]}>
            <Text style={localStyles.instructorInitial}>
              {course.instructor.name.charAt(0)}
            </Text>
          </View>
          <View style={localStyles.instructorInfo}>
            <Text style={[localStyles.instructorName, { color: theme.colors.textPrimary }]}>
              {course.instructor.name}
            </Text>
            <Text style={[localStyles.instructorTitle, { color: theme.colors.textMuted }]}>
              {course.instructor.title}
            </Text>
          </View>
        </View>

        {/* Course Stats */}
        <View style={localStyles.statsRow}>
          <View style={[localStyles.statItem, { backgroundColor: theme.colors.metaBadge }]}>
            <Text style={[localStyles.statValue, { color: theme.colors.textPrimary }]}>
              {totalLessons}
            </Text>
            <Text style={[localStyles.statLabel, { color: theme.colors.textMuted }]}>
              уроков
            </Text>
          </View>
          <View style={[localStyles.statItem, { backgroundColor: theme.colors.metaBadge }]}>
            <Text style={[localStyles.statValue, { color: theme.colors.textPrimary }]}>
              {course.duration}
            </Text>
            <Text style={[localStyles.statLabel, { color: theme.colors.textMuted }]}>
              минут
            </Text>
          </View>
          <View style={[localStyles.statItem, { backgroundColor: theme.colors.metaBadge }]}>
            <Text style={[localStyles.statValue, { color: theme.colors.textPrimary }]}>
              {course.level === 'beginner' ? 'Начальный' : course.level === 'intermediate' ? 'Средний' : 'Продвинутый'}
            </Text>
            <Text style={[localStyles.statLabel, { color: theme.colors.textMuted }]}>
              уровень
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        {course.enrolled && (
          <View style={localStyles.progressContainer}>
            <View style={localStyles.progressHeader}>
              <Text style={[localStyles.progressText, { color: theme.colors.textSecondary }]}>
                Прогресс
              </Text>
              <Text style={[localStyles.progressPercent, { color: theme.colors.accent }]}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <View style={[localStyles.progressBar, { backgroundColor: theme.colors.metaBadge }]}>
              <View
                style={[
                  localStyles.progressFill,
                  { backgroundColor: theme.colors.accent, width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Enroll/Continue Button */}
        <TouchableOpacity
          style={[localStyles.enrollButton, { backgroundColor: theme.colors.accent }]}
          onPress={() => {
            // Find first incomplete lesson or first lesson
            const nextLesson = course.lessons.find((l) => !completedLessons.has(l.id)) || course.lessons[0];
            if (nextLesson) {
              setSelectedLesson(nextLesson);
            }
          }}
        >
          <Text style={[localStyles.enrollButtonText, { color: theme.colors.buttonText }]}>
            {course.enrolled ? 'Продолжить' : 'Начать курс'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lessons List */}
      <View style={localStyles.lessonsSection}>
        <Text style={[styles.sectionTitle, localStyles.lessonsTitle]}>
          Уроки
        </Text>
        {course.lessons.map((lesson, index) => {
          const isCompleted = completedLessons.has(lesson.id);
          return (
            <TouchableOpacity
              key={lesson.id}
              style={[
                localStyles.lessonItem,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
              ]}
              onPress={() => setSelectedLesson(lesson)}
            >
              <View style={localStyles.lessonLeft}>
                <View
                  style={[
                    localStyles.lessonNumber,
                    {
                      backgroundColor: isCompleted
                        ? theme.colors.changeUp
                        : theme.colors.metaBadge,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Text style={[localStyles.checkmark, { color: theme.colors.changeUpText }]}>
                      ✓
                    </Text>
                  ) : (
                    <Text style={[localStyles.lessonNumberText, { color: theme.colors.textSecondary }]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <View style={localStyles.lessonContent}>
                  <Text style={[localStyles.lessonTitle, { color: theme.colors.textPrimary }]}>
                    {lesson.title}
                  </Text>
                  <Text style={[localStyles.lessonDuration, { color: theme.colors.textMuted }]}>
                    {lesson.duration} мин
                  </Text>
                </View>
              </View>
              <Text style={[localStyles.lessonArrow, { color: theme.colors.textMuted }]}>
                →
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
  },
  courseHeader: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  thumbnail: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  thumbnailText: {
    fontSize: 48,
  },
  proBadge: {
    position: 'absolute',
    top: 32,
    right: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadgeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: '#000',
  },
  courseTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    marginBottom: 8,
  },
  courseDescription: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructorInitial: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: '#FFF',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  instructorTitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  statValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  statLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
  },
  progressPercent: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  enrollButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  enrollButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  lessonsSection: {
    marginTop: 8,
  },
  lessonsTitle: {
    marginBottom: 16,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lessonNumberText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  checkmark: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  lessonDuration: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  lessonArrow: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 18,
    marginLeft: 8,
  },
});
