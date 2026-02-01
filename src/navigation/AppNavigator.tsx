import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme-context';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from './types';

// Navigators
import MainTabNavigator from './MainTabNavigator';

// Detail Screens
import ChartScreen from '../screens/ChartScreen';
import OrderBookScreen from '../screens/OrderBookScreen';
import LiquidationScreen from '../screens/LiquidationScreen';
import AIAnalysisScreen from '../screens/AIAnalysisScreen';
import SignalDetailScreen from '../screens/SignalDetailScreen';
import ToolsScreen from '../screens/ToolsScreen';
import SettingsScreenNav from '../screens/SettingsScreenNav';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SubscriptionScreen from '../screens/auth/SubscriptionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();

function CloseButton() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 18, color: theme.colors.textSecondary, lineHeight: 20 }}>✕</Text>
    </TouchableOpacity>
  );
}

function AuthNavigator() {
  const { theme } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          headerTitle: 'Вход',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          headerTitle: 'Регистрация',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </AuthStack.Navigator>
  );
}

function MainAppNavigator() {
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
          headerShown: true,
          headerTitle: 'График',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          presentation: 'modal',
          headerLeft: () => <CloseButton />,
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
      <Stack.Screen
        name="SignalDetail"
        component={SignalDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Signal Details',
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
          headerRight: () => <CloseButton />,
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
          headerRight: () => <CloseButton />,
        }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          headerShown: true,
          headerTitle: 'Подписка',
          headerStyle: { backgroundColor: theme.colors.appBackground },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          presentation: 'modal',
          headerRight: () => <CloseButton />,
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.appBackground }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Show auth flow if not authenticated
  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  // Show main app if authenticated
  return <MainAppNavigator />;
}
