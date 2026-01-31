import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme-context';
import type { RootStackParamList } from './types';

// Navigators
import MainTabNavigator from './MainTabNavigator';

// Detail Screens
import ChartScreen from '../screens/ChartScreen';
import OrderBookScreen from '../screens/OrderBookScreen';
import LiquidationScreen from '../screens/LiquidationScreen';
import AIAnalysisScreen from '../screens/AIAnalysisScreen';
import EducationScreen from '../screens/EducationScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import CommunityScreen from '../screens/CommunityScreen';
import NewsScreen from '../screens/NewsScreen';
import ToolsScreen from '../screens/ToolsScreen';
import SettingsScreenNav from '../screens/SettingsScreenNav';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SubscriptionScreen from '../screens/auth/SubscriptionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
      }}
    >
      {/* Main Tab Navigator */}
      <Stack.Screen name="Main" component={MainTabNavigator} />

      {/* Charts & Analysis */}
      <Stack.Screen
        name="Charts"
        component={ChartScreen}
        options={{
          headerShown: true,
          headerTitle: 'Charts',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="ChartFullscreen"
        component={ChartScreen}
        options={{
          animation: 'fade',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="OrderBook"
        component={OrderBookScreen}
        options={{
          headerShown: true,
          headerTitle: 'Order Book',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="LiquidationMap"
        component={LiquidationScreen}
        options={{
          headerShown: true,
          headerTitle: 'Liquidation Map',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="AIChat"
        component={AIAnalysisScreen}
        options={{
          headerShown: true,
          headerTitle: 'AI Analysis',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />

      {/* Tools */}
      <Stack.Screen
        name="Tools"
        component={ToolsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Trading Tools',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />

      {/* Education */}
      <Stack.Screen
        name="Education"
        component={EducationScreen}
        options={{
          headerShown: true,
          headerTitle: 'Education',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Course',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />

      {/* Community & News */}
      <Stack.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          headerShown: true,
          headerTitle: 'Community',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="News"
        component={NewsScreen}
        options={{
          headerShown: true,
          headerTitle: 'News',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />

      {/* Settings */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreenNav}
        options={{
          headerShown: true,
          headerTitle: 'Settings',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />

      {/* Auth */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          headerTitle: 'Login',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          headerTitle: 'Register',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          headerShown: true,
          headerTitle: 'Subscription',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}
