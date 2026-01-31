import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, useColorScheme } from 'react-native';
import { enableScreens } from 'react-native-screens';
import './src/background/task';
import createStyles from './src/styles';
import { ThemeProvider } from './src/theme-context';
import { AuthProvider } from './src/context/AuthContext';
import { WebSocketProvider } from './src/context/WebSocketContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { OfflineIndicator } from './src/components/OfflineIndicator';
import { OfflineSyncManager } from './src/components/OfflineSyncManager';
import { getTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

enableScreens();

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const systemScheme = useColorScheme();
  // Default to system theme mode
  const theme = useMemo(
    () => getTheme('system', systemScheme),
    [systemScheme]
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: 'transparent',
      },
    };
  }, [theme.scheme]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NetworkProvider>
      <OfflineSyncManager>
        <AuthProvider>
          <WebSocketProvider>
            <ThemeProvider theme={theme}>
              <SafeAreaProvider>
                <LinearGradient
                  colors={[theme.colors.appBackground, theme.colors.appBackgroundAlt]}
                  style={styles.app}
                >
                  <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
                  <View style={styles.orbLarge} />
                  <View style={styles.orbSmall} />
                  <OfflineIndicator />
                  <SafeAreaView style={styles.safe} edges={['top']}>
                    <NavigationContainer theme={navTheme}>
                      <AppNavigator />
                    </NavigationContainer>
                  </SafeAreaView>
                </LinearGradient>
              </SafeAreaProvider>
            </ThemeProvider>
          </WebSocketProvider>
        </AuthProvider>
      </OfflineSyncManager>
    </NetworkProvider>
  );
}
