import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme-context';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: IoniconsName;
  route?: keyof RootStackParamList;
  isPro?: boolean;
  action?: () => void;
}

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Аналитика',
    items: [
      {
        id: 'charts',
        title: 'Графики',
        subtitle: 'Продвинутые торговые графики',
        icon: 'trending-up',
        route: 'Charts',
      },
      {
        id: 'orderbook',
        title: 'Стакан',
        subtitle: 'Анализ глубины в реальном времени',
        icon: 'layers-outline',
        route: 'OrderBook',
      },
      {
        id: 'liquidations',
        title: 'Карта ликвидаций',
        subtitle: 'Отслеживание зон ликвидации',
        icon: 'flame-outline',
        route: 'LiquidationMap',
        isPro: true,
      },
      {
        id: 'ai',
        title: 'AI Анализ',
        subtitle: 'Инсайты на основе ИИ',
        icon: 'sparkles',
        route: 'AIChat',
        isPro: true,
      },
    ],
  },
  {
    title: 'Инструменты',
    items: [
      {
        id: 'tools',
        title: 'Торговые инструменты',
        subtitle: 'Калькуляторы и утилиты',
        icon: 'calculator-outline',
        route: 'Tools',
      },
    ],
  },
  {
    title: 'Аккаунт',
    items: [
      {
        id: 'settings',
        title: 'Настройки',
        subtitle: 'Параметры приложения',
        icon: 'settings-outline',
        route: 'Settings',
      },
      {
        id: 'subscription',
        title: 'Подписка',
        subtitle: 'Управление планом',
        icon: 'diamond-outline',
        route: 'Subscription',
      },
    ],
  },
];

export default function MoreScreen() {
  const { theme, styles: globalStyles } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, isPro, logout } = useAuth();

  const handleMenuPress = useCallback(
    (item: MenuItem) => {
      if (item.action) {
        item.action();
        return;
      }
      if (item.route) {
        // Navigate to the route with empty params for screens that need them
        if (item.route === 'OrderBook' || item.route === 'LiquidationMap') {
          navigation.navigate(item.route, {});
        } else if (item.route === 'AIChat') {
          navigation.navigate(item.route, {});
        } else {
          navigation.navigate(item.route as any);
        }
      }
    },
    [navigation]
  );

  const handleLoginPress = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handleLogoutPress = useCallback(async () => {
    await logout();
  }, [logout]);

  const renderUserCard = () => {
    if (!isAuthenticated || !user) {
      return (
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: theme.colors.card }]}
          onPress={handleLoginPress}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: theme.colors.metricCard },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={32}
              color={theme.colors.textMuted}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.loginPrompt, { color: theme.colors.textPrimary }]}>
              Войти в аккаунт
            </Text>
            <Text style={[styles.loginSubtext, { color: theme.colors.textSecondary }]}>
              Доступ ко всем функциям и синхронизация данных
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.userCard, { backgroundColor: theme.colors.card }]}>
        <View
          style={[
            styles.avatarPlaceholder,
            { backgroundColor: theme.colors.accent },
          ]}
        >
          <Text style={styles.avatarText}>
            {(user.name || user.email).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
              {user.name || user.email.split('@')[0]}
            </Text>
            {isPro() && (
              <View
                style={[styles.proBadge, { backgroundColor: theme.colors.accent }]}
              >
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
            {user.email}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogoutPress}>
          <Ionicons
            name="log-out-outline"
            size={22}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMenuItem = (item: MenuItem) => {
    const showProBadge = item.isPro && !isPro();

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, { backgroundColor: theme.colors.card }]}
        onPress={() => handleMenuPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: theme.colors.metricCard },
          ]}
        >
          <Ionicons name={item.icon} size={22} color={theme.colors.accent} />
        </View>
        <View style={styles.menuContent}>
          <View style={styles.menuTitleRow}>
            <Text style={[styles.menuTitle, { color: theme.colors.textPrimary }]}>
              {item.title}
            </Text>
            {showProBadge && (
              <View
                style={[
                  styles.proLabel,
                  { backgroundColor: theme.colors.warning },
                ]}
              >
                <Text style={styles.proLabelText}>PRO</Text>
              </View>
            )}
          </View>
          {item.subtitle && (
            <Text
              style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}
            >
              {item.subtitle}
            </Text>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={globalStyles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Ещё
        </Text>
      </View>

      {/* User Card */}
      {renderUserCard()}

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
          >
            {section.title}
          </Text>
          <View
            style={[
              styles.sectionItems,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            {section.items.map((item, index) => (
              <React.Fragment key={item.id}>
                {renderMenuItem(item)}
                {index < section.items.length - 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.colors.divider },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: theme.colors.textMuted }]}>
          Версия 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  loginPrompt: {
    fontSize: 17,
    fontWeight: '600',
  },
  loginSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionItems: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  proLabel: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proLabelText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    marginLeft: 66,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 13,
  },
});
