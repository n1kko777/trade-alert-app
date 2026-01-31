import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme-context';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../../services/auth';

interface SubscriptionScreenProps {
  onBack?: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { user, upgradeSubscription, isLoading } = useAuth();
  const styles = createStyles(theme);

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(
    null
  );

  const currentTier = user?.subscriptionTier ?? SubscriptionTier.FREE;

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === currentTier) {
      Alert.alert('Информация', 'Это ваш текущий план');
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
    if (!plan) return;

    Alert.alert(
      'Подтвердите покупку',
      `Вы хотите перейти на план ${plan.name} за ${plan.priceLabel}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Подтвердить',
          onPress: async () => {
            try {
              setSelectedTier(tier);
              await upgradeSubscription(tier);
              Alert.alert(
                'Успешно!',
                `Вы успешно перешли на план ${plan.name}`
              );
            } catch (error) {
              Alert.alert(
                'Ошибка',
                error instanceof Error
                  ? error.message
                  : 'Не удалось обновить подписку'
              );
            } finally {
              setSelectedTier(null);
            }
          },
        },
      ]
    );
  };

  const getTierOrder = (tier: SubscriptionTier): number => {
    const order: Record<SubscriptionTier, number> = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.PRO]: 1,
      [SubscriptionTier.PREMIUM]: 2,
      [SubscriptionTier.VIP]: 3,
    };
    return order[tier];
  };

  const isDowngrade = (tier: SubscriptionTier): boolean => {
    return getTierOrder(tier) < getTierOrder(currentTier);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Подписки</Text>
          <Text style={styles.subtitle}>
            Выберите план, который подходит вам
          </Text>
        </View>

        {/* Trial Badge */}
        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>7 дней бесплатный пробный период</Text>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = plan.tier === currentTier;
            const isSelected = selectedTier === plan.tier;
            const isDowngrading = isDowngrade(plan.tier);

            return (
              <View
                key={plan.tier}
                style={[
                  styles.planCard,
                  isCurrent && styles.planCardCurrent,
                  plan.isPopular && styles.planCardPopular,
                ]}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Популярный</Text>
                  </View>
                )}

                {/* Current Badge */}
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Текущий план</Text>
                  </View>
                )}

                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.priceLabel}</Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Text style={styles.featureCheck}>✓</Text>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.planButton,
                    isCurrent && styles.planButtonCurrent,
                    isDowngrading && styles.planButtonDowngrade,
                  ]}
                  onPress={() => handleUpgrade(plan.tier)}
                  disabled={isLoading || isCurrent}
                >
                  {isSelected && isLoading ? (
                    <ActivityIndicator color={theme.colors.buttonText} />
                  ) : (
                    <Text
                      style={[
                        styles.planButtonText,
                        isCurrent && styles.planButtonTextCurrent,
                      ]}
                    >
                      {isCurrent
                        ? 'Текущий план'
                        : isDowngrading
                        ? 'Понизить'
                        : 'Выбрать'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Подписку можно отменить в любое время.{'\n'}
            Оплата производится через App Store / Google Play.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.appBackground,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 100,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 28,
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    trialBadge: {
      backgroundColor: theme.colors.changeUp,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 24,
      alignItems: 'center',
    },
    trialBadgeText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      color: theme.colors.changeUpText,
    },
    plansContainer: {
      gap: 16,
    },
    planCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 2,
      borderColor: theme.colors.cardBorder,
      position: 'relative',
    },
    planCardCurrent: {
      borderColor: theme.colors.accent,
    },
    planCardPopular: {
      borderColor: theme.colors.warning,
    },
    popularBadge: {
      position: 'absolute',
      top: -12,
      right: 20,
      backgroundColor: theme.colors.warning,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    popularBadgeText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
      color: theme.colors.textPrimary,
    },
    currentBadge: {
      position: 'absolute',
      top: -12,
      left: 20,
      backgroundColor: theme.colors.accent,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    currentBadgeText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
      color: theme.colors.buttonText,
    },
    planName: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 24,
      color: theme.colors.textPrimary,
      marginBottom: 4,
      marginTop: 8,
    },
    planPrice: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 18,
      color: theme.colors.accent,
      marginBottom: 16,
    },
    featuresContainer: {
      marginBottom: 16,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    featureCheck: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      color: theme.colors.success,
      marginRight: 10,
      width: 20,
    },
    featureText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    planButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    planButtonCurrent: {
      backgroundColor: theme.colors.input,
    },
    planButtonDowngrade: {
      backgroundColor: theme.colors.textMuted,
    },
    planButtonText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
      color: theme.colors.buttonText,
    },
    planButtonTextCurrent: {
      color: theme.colors.textMuted,
    },
    footer: {
      marginTop: 32,
      alignItems: 'center',
    },
    footerText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

export default SubscriptionScreen;
