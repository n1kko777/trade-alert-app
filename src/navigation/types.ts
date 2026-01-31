import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  CoinDetail: { symbol: string; exchange: string };
  ChartFullscreen: { symbol: string; exchange: string; timeframe: string };
  Charts: undefined;
  OrderBook: { symbol?: string; exchange?: string };
  LiquidationMap: { symbol?: string };
  AIChat: { initialSymbol?: string };
  SignalDetail: { signalId: string };
  PortfolioDetail: undefined;
  TradeHistory: undefined;
  Education: undefined;
  CourseDetail: { courseId: string };
  Community: undefined;
  News: undefined;
  Tools: undefined;
  Profile: undefined;
  Settings: undefined;
  Login: undefined;
  Register: undefined;
  Subscription: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Pumps: undefined;
  Signals: undefined;
  Portfolio: undefined;
  More: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
