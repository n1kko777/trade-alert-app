import { StyleSheet } from 'react-native';
import { Theme } from './theme';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    app: {
      flex: 1,
      backgroundColor: theme.colors.appBackground,
    },
    safe: {
      flex: 1,
    },
    scroll: {
      padding: 20,
      paddingBottom: 140,
    },
    orbLarge: {
      position: 'absolute',
      width: 320,
      height: 320,
      backgroundColor: theme.colors.orbLarge,
      borderRadius: 200,
      opacity: 0.12,
      top: -80,
      right: -120,
    },
    orbSmall: {
      position: 'absolute',
      width: 220,
      height: 220,
      backgroundColor: theme.colors.orbSmall,
      borderRadius: 150,
      opacity: 0.12,
      bottom: -60,
      left: -80,
    },
    panel: {
      backgroundColor: theme.colors.panel,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    panelCompact: {
      padding: 14,
    },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    panelTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      color: theme.colors.textPrimary,
    },
    panelSub: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
      maxWidth: 220,
    },
    pulseDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.colors.accent,
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    summaryBlock: {
      marginBottom: 12,
    },
    summaryStrip: {
      backgroundColor: theme.colors.summaryStrip,
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.summaryBorder,
    },
    summaryText: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    summaryStrong: {
      fontFamily: 'SpaceGrotesk_700Bold',
      color: theme.colors.textPrimary,
    },
    metricCard: {
      width: '48%',
      backgroundColor: theme.colors.metricCard,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: 10,
    },
    metricLabel: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    metricValue: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
      color: theme.colors.textPrimary,
      marginTop: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    metaRowFirst: {
      marginTop: 0,
    },
    metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.metaBadge,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      flexShrink: 1,
      maxWidth: '100%',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    statusGood: {
      backgroundColor: theme.colors.statusGood,
    },
    statusWarn: {
      backgroundColor: theme.colors.statusWarn,
    },
    statusBad: {
      backgroundColor: theme.colors.statusBad,
    },
    statusMuted: {
      backgroundColor: theme.colors.statusMuted,
    },
    metaText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    compactStatusGrid: {
      marginTop: 10,
    },
    compactStatusRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    compactStatusRowFirst: {
      marginTop: 0,
    },
    compactStatusChip: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.compactChip,
    },
    compactStatusText: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginLeft: 6,
      flexShrink: 1,
    },
    errorText: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.danger,
      marginTop: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 20,
      color: theme.colors.textPrimary,
    },
    sectionSub: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    sectionAction: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.accent,
    },
    sectionActionMuted: {
      color: theme.colors.accentMuted,
    },
    sectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    symbol: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      color: theme.colors.textPrimary,
    },
    cardSub: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    changePill: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
    },
    changeUp: {
      backgroundColor: theme.colors.changeUp,
    },
    changeDown: {
      backgroundColor: theme.colors.changeDown,
    },
    changeFlat: {
      backgroundColor: theme.colors.changeFlat,
    },
    changeText: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.changeText,
    },
    changeUpText: {
      color: theme.colors.changeUpText,
    },
    changeDownText: {
      color: theme.colors.changeDownText,
    },
    cardBody: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    price: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 20,
      color: theme.colors.textPrimary,
    },
    cardMeta: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    cardRange: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 11,
      color: theme.colors.textPlaceholder,
      marginTop: 4,
    },
    cardConfig: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    sparklineWrap: {
      alignItems: 'flex-end',
    },
    sparklineSurface: {
      backgroundColor: theme.colors.sparklineSurface,
      borderRadius: 10,
      padding: 6,
    },
    sparklineLabel: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 11,
      color: theme.colors.textFaint,
      marginTop: 4,
    },
    emptyText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    alertRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    alertSymbol: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    alertMeta: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    alertRight: {
      alignItems: 'flex-end',
    },
    alertChange: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
    },
    alertUp: {
      color: theme.colors.changeUpText,
    },
    alertDown: {
      color: theme.colors.changeDownText,
    },
    alertPrice: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    field: {
      marginBottom: 14,
    },
    fieldRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    fieldInline: {
      flex: 1,
      marginRight: 12,
    },
    fieldLabel: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    helperText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 12,
      color: theme.colors.textFaint,
    },
    helperWarn: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.danger,
      marginTop: 6,
    },
    themeToggle: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.input,
      borderWidth: 1,
      borderColor: theme.colors.summaryBorder,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      borderRadius: 999,
    },
    themeOptionActive: {
      backgroundColor: theme.colors.accent,
    },
    themeOptionText: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    themeOptionTextActive: {
      color: theme.colors.buttonText,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleCopy: {
      flex: 1,
      paddingRight: 12,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    timeInput: {
      flex: 1,
      textAlign: 'center',
    },
    timeSeparator: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 12,
      color: theme.colors.textMuted,
      paddingHorizontal: 10,
    },
    input: {
      backgroundColor: theme.colors.input,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    saveButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 6,
    },
    saveButtonText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      color: theme.colors.buttonText,
    },
    overrideList: {
      marginTop: 10,
    },
    overrideRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 10,
    },
    overrideSymbol: {
      backgroundColor: theme.colors.input,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginRight: 8,
    },
    overrideSymbolText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
      color: theme.colors.textPrimary,
    },
    overrideInput: {
      flex: 1,
      marginRight: 8,
      paddingVertical: 8,
      minWidth: 70,
    },
    tabBar: {
      backgroundColor: theme.colors.tabBar,
      borderTopColor: theme.colors.tabBarBorder,
      borderTopWidth: 1,
      minHeight: 64,
      paddingTop: 6,
      paddingBottom: 10,
    },
    tabBarLabel: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 11,
    },
    tabBarBadge: {
      backgroundColor: theme.colors.badge,
      color: theme.colors.badgeText,
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 10,
    },
  });

export type Styles = ReturnType<typeof createStyles>;

export default createStyles;
