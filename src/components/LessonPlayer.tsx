import React from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme-context';
import { Lesson } from '../data/educationData';

interface LessonPlayerProps {
  lesson: Lesson;
  isCompleted: boolean;
  onMarkComplete: () => void;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex: number;
  totalLessons: number;
}

function LessonPlayer({
  lesson,
  isCompleted,
  onMarkComplete,
  onBack,
  onPrevious,
  onNext,
  currentIndex,
  totalLessons,
}: LessonPlayerProps) {
  const { theme, styles } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Back Button */}
      <TouchableOpacity style={localStyles.backButton} onPress={onBack}>
        <Text style={[localStyles.backText, { color: theme.colors.accent }]}>
          ← К урокам
        </Text>
      </TouchableOpacity>

      {/* Video Placeholder */}
      <View style={[localStyles.videoPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <View style={[localStyles.playIcon, { backgroundColor: theme.colors.metaBadge }]}>
          <Text style={[localStyles.playIconText, { color: theme.colors.textSecondary }]}>
            ▶
          </Text>
        </View>
        <Text style={[localStyles.videoText, { color: theme.colors.textMuted }]}>
          Видео урок
        </Text>
        <Text style={[localStyles.videoSubtext, { color: theme.colors.textFaint }]}>
          {lesson.duration} мин
        </Text>
      </View>

      {/* Lesson Progress */}
      <View style={[localStyles.progressIndicator, { backgroundColor: theme.colors.metaBadge }]}>
        <Text style={[localStyles.progressText, { color: theme.colors.textSecondary }]}>
          Урок {currentIndex + 1} из {totalLessons}
        </Text>
      </View>

      {/* Lesson Content */}
      <View style={[localStyles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[localStyles.lessonTitle, { color: theme.colors.textPrimary }]}>
          {lesson.title}
        </Text>
        <Text style={[localStyles.lessonDescription, { color: theme.colors.textSecondary }]}>
          {lesson.description}
        </Text>

        {/* Completed Status */}
        {isCompleted && (
          <View style={[localStyles.completedBadge, { backgroundColor: theme.colors.changeUp }]}>
            <Text style={[localStyles.completedText, { color: theme.colors.changeUpText }]}>
              ✓ Урок завершен
            </Text>
          </View>
        )}

        {/* Mark Complete Button */}
        {!isCompleted && (
          <TouchableOpacity
            style={[localStyles.completeButton, { backgroundColor: theme.colors.accent }]}
            onPress={onMarkComplete}
          >
            <Text style={[localStyles.completeButtonText, { color: theme.colors.buttonText }]}>
              Отметить как завершенный
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Buttons */}
      <View style={localStyles.navigation}>
        <TouchableOpacity
          style={[
            localStyles.navButton,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
            !onPrevious && localStyles.navButtonDisabled,
          ]}
          onPress={onPrevious}
          disabled={!onPrevious}
        >
          <Text
            style={[
              localStyles.navButtonText,
              { color: onPrevious ? theme.colors.textPrimary : theme.colors.textMuted },
            ]}
          >
            ← Предыдущий
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            localStyles.navButton,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
            !onNext && localStyles.navButtonDisabled,
          ]}
          onPress={onNext}
          disabled={!onNext}
        >
          <Text
            style={[
              localStyles.navButtonText,
              { color: onNext ? theme.colors.textPrimary : theme.colors.textMuted },
            ]}
          >
            Следующий →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lesson Content Preview */}
      {lesson.content && (
        <View style={[localStyles.contentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[localStyles.contentTitle, { color: theme.colors.textPrimary }]}>
            Содержание урока
          </Text>
          <Text style={[localStyles.contentText, { color: theme.colors.textSecondary }]}>
            {lesson.content}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default React.memo(LessonPlayer);

const localStyles = StyleSheet.create({
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  playIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  playIconText: {
    fontSize: 24,
    marginLeft: 4,
  },
  videoText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  videoSubtext: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
  progressIndicator: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  progressText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  contentCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  lessonTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    marginBottom: 12,
  },
  lessonDescription: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  completedBadge: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  completeButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  completeButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
  },
  contentTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  contentText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
});
