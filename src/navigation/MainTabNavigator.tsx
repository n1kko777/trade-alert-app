import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-context';
import type { MainTabParamList } from './types';

// Screens
import NewDashboardScreen from '../screens/NewDashboardScreen';
import PumpsScreen from '../screens/PumpsScreen';
import SignalsScreen from '../screens/SignalsScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import MoreScreen from '../screens/MoreScreen';

// Services
import { signalService } from '../services/signals';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const getTabIcon = (routeName: string, focused: boolean): IoniconsName => {
  switch (routeName) {
    case 'Dashboard':
      return focused ? 'stats-chart' : 'stats-chart-outline';
    case 'Pumps':
      return focused ? 'flash' : 'flash-outline';
    case 'Signals':
      return focused ? 'pulse' : 'pulse-outline';
    case 'Portfolio':
      return focused ? 'wallet' : 'wallet-outline';
    case 'More':
      return focused ? 'menu' : 'menu-outline';
    default:
      return 'ellipse-outline';
  }
};

export default function MainTabNavigator() {
  const { theme, styles } = useTheme();
  const { isPro } = useAuth();
  const [activeSignalsCount, setActiveSignalsCount] = useState(0);

  useEffect(() => {
    // Initialize signal service with demo data if empty
    const signals = signalService.getAllSignals();
    if (signals.length === 0) {
      signalService.initializeDemo();
    }

    // Get initial active signals count
    const activeSignals = signalService.getActiveSignals();
    setActiveSignalsCount(activeSignals.length);

    // Subscribe to signal updates
    const unsubscribe = signalService.subscribe((updatedSignals) => {
      const activeCount = updatedSignals.filter(
        (s) => s.status === 'active' || s.status === 'pending'
      ).length;
      setActiveSignalsCount(activeCount);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size, focused }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={NewDashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Pumps"
        component={PumpsScreen}
        options={{ tabBarLabel: 'Pumps' }}
      />
      <Tab.Screen
        name="Signals"
        options={{
          tabBarLabel: 'Signals',
          tabBarBadge: activeSignalsCount > 0 ? activeSignalsCount : undefined,
          tabBarBadgeStyle: styles.tabBarBadge,
        }}
      >
        {() => <SignalsScreen isPro={isPro()} />}
      </Tab.Screen>
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{ tabBarLabel: 'Portfolio' }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}
