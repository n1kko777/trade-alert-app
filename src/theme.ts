import { ColorSchemeName } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

export type ThemeColors = {
  appBackground: string;
  appBackgroundAlt: string;
  orbLarge: string;
  orbSmall: string;
  panel: string;
  card: string;
  cardBorder: string;
  summaryStrip: string;
  summaryBorder: string;
  metricCard: string;
  metaBadge: string;
  compactChip: string;
  input: string;
  tabBar: string;
  tabBarBorder: string;
  badge: string;
  badgeText: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  textPlaceholder: string;
  accent: string;
  accentMuted: string;
  success: string;
  warning: string;
  danger: string;
  statusMuted: string;
  statusGood: string;
  statusWarn: string;
  statusBad: string;
  changeUp: string;
  changeDown: string;
  changeFlat: string;
  changeText: string;
  changeUpText: string;
  changeDownText: string;
  sparklineSurface: string;
  buttonText: string;
  shadow: string;
  switchTrackOff: string;
  switchThumb: string;
  tabBarActive: string;
  tabBarInactive: string;
  divider: string;
};

export type Theme = {
  mode: ThemeMode;
  scheme: ThemeScheme;
  colors: ThemeColors;
};

export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark';

const lightColors: ThemeColors = {
  appBackground: '#F8F1E7',
  appBackgroundAlt: '#EDE0D4',
  orbLarge: '#F4A261',
  orbSmall: '#2A9D8F',
  panel: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#F1E6D8',
  summaryStrip: '#FFFFFF',
  summaryBorder: '#F1E6D8',
  metricCard: '#F8F1E7',
  metaBadge: '#F8F1E7',
  compactChip: '#F8F1E7',
  input: '#F8F1E7',
  tabBar: '#FDF8F1',
  tabBarBorder: '#EADFCF',
  badge: '#E76F51',
  badgeText: '#FFFFFF',
  textPrimary: '#2B2A28',
  textSecondary: '#6E655D',
  textMuted: '#7C6F63',
  textFaint: '#8A7F73',
  textPlaceholder: '#9C8F82',
  accent: '#2A9D8F',
  accentMuted: '#B9ACA0',
  success: '#2A9D8F',
  warning: '#E9C46A',
  danger: '#C0533A',
  statusMuted: '#B9ACA0',
  statusGood: '#2A9D8F',
  statusWarn: '#E9C46A',
  statusBad: '#E76F51',
  changeUp: '#E3F5F1',
  changeDown: '#FCEAE6',
  changeFlat: '#EFE6DB',
  changeText: '#5C534B',
  changeUpText: '#1E7F73',
  changeDownText: '#C0533A',
  sparklineSurface: '#F8F1E7',
  buttonText: '#FFFFFF',
  shadow: '#000000',
  switchTrackOff: '#E0D4C5',
  switchThumb: '#FFFFFF',
  tabBarActive: '#2A9D8F',
  tabBarInactive: '#9C8F82',
  divider: '#F1E6D8',
};

const darkColors: ThemeColors = {
  appBackground: '#151412',
  appBackgroundAlt: '#1E1B18',
  orbLarge: '#9A5B33',
  orbSmall: '#1C6F66',
  panel: '#1F1D1B',
  card: '#1F1D1B',
  cardBorder: '#2B2622',
  summaryStrip: '#1C1A18',
  summaryBorder: '#2B2622',
  metricCard: '#25221F',
  metaBadge: '#26221F',
  compactChip: '#25211E',
  input: '#2A2521',
  tabBar: '#1A1816',
  tabBarBorder: '#2C2723',
  badge: '#E76F51',
  badgeText: '#FFFFFF',
  textPrimary: '#F5F0E8',
  textSecondary: '#CBBFB2',
  textMuted: '#A99C90',
  textFaint: '#8F8478',
  textPlaceholder: '#82766A',
  accent: '#34B3A5',
  accentMuted: '#6C6056',
  success: '#34B3A5',
  warning: '#D3A94A',
  danger: '#FF8C6A',
  statusMuted: '#6C6056',
  statusGood: '#34B3A5',
  statusWarn: '#D3A94A',
  statusBad: '#FF8C6A',
  changeUp: '#143C36',
  changeDown: '#3A1F19',
  changeFlat: '#2B2521',
  changeText: '#CBBFB2',
  changeUpText: '#5ADBCB',
  changeDownText: '#FF9B7A',
  sparklineSurface: '#24201D',
  buttonText: '#FFFFFF',
  shadow: '#000000',
  switchTrackOff: '#3A342F',
  switchThumb: '#F5F0E8',
  tabBarActive: '#34B3A5',
  tabBarInactive: '#8F8478',
  divider: '#2E2824',
};

const resolveScheme = (mode: ThemeMode, systemScheme: ColorSchemeName): ThemeScheme => {
  if (mode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
};

export const getTheme = (mode: ThemeMode, systemScheme: ColorSchemeName): Theme => {
  const scheme = resolveScheme(mode, systemScheme);
  return {
    mode,
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
  };
};
