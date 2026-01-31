import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme-context';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: IoniconsName;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

export default function SettingsScreenNav() {
  const { theme, styles: globalStyles } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, logout, isPro } = useAuth();

  // Local state for toggles (in production, this would be connected to a settings context)
  const [notifications, setNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [darkMode, setDarkMode] = useState(theme.scheme === 'dark');
  const [biometrics, setBiometrics] = useState(false);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.goBack();
          },
        },
      ]
    );
  }, [logout, navigation]);

  const settingsSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Notifications',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive alerts and updates',
          icon: 'notifications-outline',
          type: 'toggle',
          value: notifications,
          onToggle: setNotifications,
        },
        {
          id: 'notification-sound',
          title: 'Notification Sound',
          subtitle: 'Play sound for alerts',
          icon: 'volume-high-outline',
          type: 'toggle',
          value: notificationSound,
          onToggle: setNotificationSound,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'dark-mode',
          title: 'Dark Mode',
          subtitle: 'Use dark theme',
          icon: 'moon-outline',
          type: 'toggle',
          value: darkMode,
          onToggle: (value) => {
            setDarkMode(value);
            Alert.alert('Theme', 'Theme settings will be applied on next restart.');
          },
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          id: 'biometrics',
          title: 'Biometric Login',
          subtitle: 'Use Face ID or fingerprint',
          icon: 'finger-print-outline',
          type: 'toggle',
          value: biometrics,
          onToggle: setBiometrics,
        },
        {
          id: 'change-password',
          title: 'Change Password',
          icon: 'key-outline',
          type: 'action',
          onPress: () => {
            Alert.alert('Change Password', 'Password change functionality coming soon.');
          },
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          id: 'terms',
          title: 'Terms of Service',
          icon: 'document-text-outline',
          type: 'action',
          onPress: () => {
            Alert.alert('Terms of Service', 'Terms of service will open in browser.');
          },
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          icon: 'shield-outline',
          type: 'action',
          onPress: () => {
            Alert.alert('Privacy Policy', 'Privacy policy will open in browser.');
          },
        },
        {
          id: 'version',
          title: 'Version',
          subtitle: '1.0.0 (Build 1)',
          icon: 'information-circle-outline',
          type: 'action',
          onPress: () => {},
        },
      ],
    },
  ];

  if (isAuthenticated) {
    settingsSections.push({
      title: 'Account',
      items: [
        {
          id: 'logout',
          title: 'Logout',
          icon: 'log-out-outline',
          type: 'action',
          onPress: handleLogout,
        },
      ],
    });
  }

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.settingItem, { backgroundColor: theme.colors.card }]}
        onPress={item.type === 'action' || item.type === 'navigation' ? item.onPress : undefined}
        activeOpacity={item.type === 'toggle' ? 1 : 0.7}
        disabled={item.type === 'toggle'}
      >
        <View
          style={[
            styles.settingIconContainer,
            { backgroundColor: theme.colors.metricCard },
          ]}
        >
          <Ionicons name={item.icon} size={20} color={theme.colors.accent} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {item.subtitle}
            </Text>
          )}
        </View>
        {item.type === 'toggle' && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{
              false: theme.colors.switchTrackOff,
              true: theme.colors.accent,
            }}
            thumbColor={theme.colors.switchThumb}
          />
        )}
        {item.type === 'navigation' && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textMuted}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={globalStyles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* User Info */}
      {isAuthenticated && user && (
        <View
          style={[
            styles.userCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
          ]}
        >
          <View
            style={[styles.userAvatar, { backgroundColor: theme.colors.accent }]}
          >
            <Text style={styles.userAvatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
                {user.name}
              </Text>
              {isPro() && (
                <View style={[styles.proBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
              {user.email}
            </Text>
          </View>
        </View>
      )}

      {/* Settings Sections */}
      {settingsSections.map((section) => (
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
                {renderSettingItem(item)}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userNameRow: {
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: 1,
    marginLeft: 62,
  },
});
