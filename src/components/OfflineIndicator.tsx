/**
 * OfflineIndicator Component
 * Displays a banner when the device is offline, with reconnection feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../context/NetworkContext';
import { useTheme } from '../theme-context';

interface OfflineIndicatorProps {
  /** Allow user to dismiss the banner */
  dismissible?: boolean;
  /** Show at top or bottom of screen */
  position?: 'top' | 'bottom';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  dismissible = true,
  position = 'top',
}) => {
  const { isConnected, isInternetReachable, isChecking } = useNetwork();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showReconnecting, setShowReconnecting] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const prevOfflineRef = useRef(false);

  // Determine if we're offline
  const isOffline = !isConnected || isInternetReachable === false;

  // Track offline state changes
  useEffect(() => {
    if (isOffline && !prevOfflineRef.current) {
      // Just went offline - show banner and reset dismissed state
      setIsDismissed(false);
      setShowReconnecting(false);
    } else if (!isOffline && prevOfflineRef.current) {
      // Just came back online - show reconnecting message briefly
      setShowReconnecting(true);
      const timer = setTimeout(() => {
        setShowReconnecting(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline]);

  // Animate banner in/out
  useEffect(() => {
    const shouldShow = (isOffline || showReconnecting) && !isDismissed;

    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : (position === 'top' ? -100 : 100),
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [isOffline, showReconnecting, isDismissed, position, slideAnim]);

  const handleDismiss = () => {
    if (dismissible) {
      setIsDismissed(true);
    }
  };

  // Get status text and color
  const getStatusConfig = () => {
    if (showReconnecting) {
      return {
        text: 'Снова онлайн!',
        backgroundColor: theme.colors.success,
        textColor: '#FFFFFF',
      };
    }
    if (isChecking) {
      return {
        text: 'Проверка соединения...',
        backgroundColor: theme.colors.warning,
        textColor: '#000000',
      };
    }
    return {
      text: 'Нет подключения к интернету',
      backgroundColor: theme.colors.danger,
      textColor: '#FFFFFF',
    };
  };

  const config = getStatusConfig();

  // Don't render if not needed
  if (!isOffline && !showReconnecting) {
    return null;
  }

  const containerStyle = [
    styles.container,
    {
      backgroundColor: config.backgroundColor,
      [position === 'top' ? 'paddingTop' : 'paddingBottom']:
        position === 'top' ? insets.top + 4 : insets.bottom + 4,
    },
    position === 'top' ? styles.top : styles.bottom,
    { transform: [{ translateY: slideAnim }] },
  ];

  return (
    <Animated.View style={containerStyle}>
      <View style={styles.content}>
        <View style={styles.indicator}>
          {!showReconnecting && (
            <View style={[styles.dot, { backgroundColor: config.textColor }]} />
          )}
          <Text style={[styles.text, { color: config.textColor }]}>
            {config.text}
          </Text>
        </View>
        {dismissible && !showReconnecting && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.dismissText, { color: config.textColor }]}>
              Закрыть
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    opacity: 0.9,
  },
  text: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
  },
  dismissButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dismissText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    opacity: 0.9,
  },
});

export default OfflineIndicator;
