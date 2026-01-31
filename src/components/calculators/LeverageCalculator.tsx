import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme-context';

type LeverageCalculatorProps = {
  onClose?: () => void;
};

type CalculationResult = {
  marginRequired: number;
  liquidationPriceLong: number;
  liquidationPriceShort: number;
  effectiveValue: number;
  maintenanceMargin: number;
};

const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125];
const MAINTENANCE_MARGIN_RATE = 0.005; // 0.5% typical for most exchanges

export default function LeverageCalculator({ onClose }: LeverageCalculatorProps) {
  const { theme } = useTheme();

  const [positionSize, setPositionSize] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [entryPrice, setEntryPrice] = useState('');
  const [customLeverage, setCustomLeverage] = useState('');

  const activeLeverage = customLeverage ? parseInt(customLeverage, 10) || leverage : leverage;

  const result = useMemo((): CalculationResult | null => {
    const size = parseFloat(positionSize);
    const entry = parseFloat(entryPrice);
    const lev = activeLeverage;

    if (!size || !entry || !lev || size <= 0 || entry <= 0 || lev <= 0) {
      return null;
    }

    const effectiveValue = size * entry;
    const marginRequired = effectiveValue / lev;
    const maintenanceMargin = effectiveValue * MAINTENANCE_MARGIN_RATE;

    // Liquidation price calculation
    // For Long: Liq Price = Entry * (1 - 1/Leverage + MMR)
    // For Short: Liq Price = Entry * (1 + 1/Leverage - MMR)
    const liquidationPriceLong = entry * (1 - 1 / lev + MAINTENANCE_MARGIN_RATE);
    const liquidationPriceShort = entry * (1 + 1 / lev - MAINTENANCE_MARGIN_RATE);

    return {
      marginRequired,
      liquidationPriceLong,
      liquidationPriceShort,
      effectiveValue,
      maintenanceMargin,
    };
  }, [positionSize, entryPrice, activeLeverage]);

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(decimals);
  };

  const formatPrice = (num: number): string => {
    if (num < 0.0001) {
      return num.toExponential(4);
    }
    if (num < 1) {
      return num.toFixed(6);
    }
    if (num < 100) {
      return num.toFixed(4);
    }
    return num.toFixed(2);
  };

  const getLiquidationPercent = (entry: number, liqPrice: number): number => {
    return Math.abs((liqPrice - entry) / entry) * 100;
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        scrollContent: {
          paddingBottom: 20,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        },
        title: {
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 20,
          color: theme.colors.textPrimary,
        },
        subtitle: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginTop: 2,
        },
        closeButton: {
          padding: 8,
        },
        closeText: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 14,
          color: theme.colors.accent,
        },
        section: {
          marginBottom: 16,
        },
        sectionTitle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        inputRow: {
          flexDirection: 'row',
          gap: 12,
        },
        inputGroup: {
          flex: 1,
          marginBottom: 12,
        },
        label: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginBottom: 6,
        },
        inputWrapper: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.input,
          borderRadius: 12,
          paddingHorizontal: 12,
        },
        input: {
          flex: 1,
          paddingVertical: 12,
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 16,
          color: theme.colors.textPrimary,
        },
        inputSuffix: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 14,
          color: theme.colors.textMuted,
          marginLeft: 4,
        },
        leverageGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 8,
        },
        leverageButton: {
          minWidth: 48,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: theme.colors.metricCard,
          alignItems: 'center',
        },
        leverageButtonActive: {
          backgroundColor: theme.colors.accent,
        },
        leverageButtonDanger: {
          backgroundColor: theme.colors.changeDown,
        },
        leverageButtonDangerActive: {
          backgroundColor: theme.colors.danger,
        },
        leverageText: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 13,
          color: theme.colors.textSecondary,
        },
        leverageTextActive: {
          color: theme.colors.buttonText,
        },
        leverageTextDanger: {
          color: theme.colors.changeDownText,
        },
        customLeverageRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
        },
        customLabel: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 12,
          color: theme.colors.textMuted,
        },
        customInput: {
          width: 80,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: theme.colors.input,
          borderRadius: 10,
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 14,
          color: theme.colors.textPrimary,
          textAlign: 'center',
        },
        resultsCard: {
          backgroundColor: theme.colors.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
          marginTop: 8,
        },
        resultsTitle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginBottom: 16,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        resultRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        },
        resultRowLast: {
          borderBottomWidth: 0,
        },
        resultLabel: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 14,
          color: theme.colors.textSecondary,
        },
        resultValue: {
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 16,
          color: theme.colors.textPrimary,
        },
        resultValueHighlight: {
          color: theme.colors.accent,
        },
        resultValueDanger: {
          color: theme.colors.danger,
        },
        resultValueSuccess: {
          color: theme.colors.success,
        },
        resultSubValue: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 12,
          color: theme.colors.textMuted,
          marginTop: 2,
        },
        scenarioCard: {
          backgroundColor: theme.colors.metricCard,
          borderRadius: 12,
          padding: 14,
          marginTop: 12,
        },
        scenarioTitle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 13,
          marginBottom: 10,
        },
        scenarioTitleLong: {
          color: theme.colors.success,
        },
        scenarioTitleShort: {
          color: theme.colors.danger,
        },
        scenarioRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 6,
        },
        scenarioLabel: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 13,
          color: theme.colors.textSecondary,
        },
        scenarioValue: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 14,
          color: theme.colors.textPrimary,
        },
        emptyResults: {
          alignItems: 'center',
          paddingVertical: 24,
        },
        emptyText: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 14,
          color: theme.colors.textMuted,
          textAlign: 'center',
        },
        warningText: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 11,
          color: theme.colors.warning,
          marginTop: 8,
          textAlign: 'center',
        },
        hint: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 11,
          color: theme.colors.textFaint,
          marginTop: 4,
        },
      }),
    [theme]
  );

  const getLeverageButtonStyle = (lev: number) => {
    const isActive = activeLeverage === lev;
    const isDanger = lev >= 50;

    if (isActive) {
      return isDanger ? styles.leverageButtonDangerActive : styles.leverageButtonActive;
    }
    return isDanger ? styles.leverageButtonDanger : styles.leverageButton;
  };

  const getLeverageTextStyle = (lev: number) => {
    const isActive = activeLeverage === lev;
    const isDanger = lev >= 50;

    if (isActive) {
      return styles.leverageTextActive;
    }
    return isDanger ? styles.leverageTextDanger : styles.leverageText;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Калькулятор плеча</Text>
            <Text style={styles.subtitle}>Маржа и ликвидация</Text>
          </View>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Закрыть</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Параметры позиции</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Размер позиции</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={positionSize}
                  onChangeText={setPositionSize}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  placeholderTextColor={theme.colors.textPlaceholder}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Цена входа</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={entryPrice}
                  onChangeText={setEntryPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textPlaceholder}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Кредитное плечо</Text>

          <View style={styles.leverageGrid}>
            {LEVERAGE_OPTIONS.map((lev) => (
              <TouchableOpacity
                key={lev}
                style={[styles.leverageButton, getLeverageButtonStyle(lev)]}
                onPress={() => {
                  setLeverage(lev);
                  setCustomLeverage('');
                }}
              >
                <Text style={[styles.leverageText, getLeverageTextStyle(lev)]}>
                  {lev}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customLeverageRow}>
            <Text style={styles.customLabel}>Или введите:</Text>
            <TextInput
              style={styles.customInput}
              value={customLeverage}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                if (text === '' || (num >= 1 && num <= 125)) {
                  setCustomLeverage(text);
                }
              }}
              keyboardType="number-pad"
              placeholder="1-125"
              placeholderTextColor={theme.colors.textPlaceholder}
              maxLength={3}
            />
            <Text style={styles.customLabel}>x</Text>
          </View>

          {activeLeverage >= 50 && (
            <Text style={styles.warningText}>
              Высокое плечо увеличивает риск ликвидации
            </Text>
          )}
        </View>

        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Результаты</Text>

          {result ? (
            <>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Стоимость позиции</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.resultValue}>
                    ${formatNumber(result.effectiveValue)}
                  </Text>
                </View>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Требуемая маржа</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.resultValue, styles.resultValueHighlight]}>
                    ${formatNumber(result.marginRequired)}
                  </Text>
                  <Text style={styles.resultSubValue}>
                    {(100 / activeLeverage).toFixed(2)}% от позиции
                  </Text>
                </View>
              </View>

              <View style={[styles.resultRow, styles.resultRowLast]}>
                <Text style={styles.resultLabel}>Поддерж. маржа</Text>
                <Text style={styles.resultValue}>
                  ${formatNumber(result.maintenanceMargin)}
                </Text>
              </View>

              <View style={styles.scenarioCard}>
                <Text style={[styles.scenarioTitle, styles.scenarioTitleLong]}>
                  Long (Покупка)
                </Text>
                <View style={styles.scenarioRow}>
                  <Text style={styles.scenarioLabel}>Цена ликвидации</Text>
                  <Text style={styles.scenarioValue}>
                    ${formatPrice(result.liquidationPriceLong)}
                  </Text>
                </View>
                <View style={styles.scenarioRow}>
                  <Text style={styles.scenarioLabel}>До ликвидации</Text>
                  <Text style={[styles.scenarioValue, { color: theme.colors.danger }]}>
                    -
                    {getLiquidationPercent(
                      parseFloat(entryPrice),
                      result.liquidationPriceLong
                    ).toFixed(2)}
                    %
                  </Text>
                </View>
              </View>

              <View style={styles.scenarioCard}>
                <Text style={[styles.scenarioTitle, styles.scenarioTitleShort]}>
                  Short (Продажа)
                </Text>
                <View style={styles.scenarioRow}>
                  <Text style={styles.scenarioLabel}>Цена ликвидации</Text>
                  <Text style={styles.scenarioValue}>
                    ${formatPrice(result.liquidationPriceShort)}
                  </Text>
                </View>
                <View style={styles.scenarioRow}>
                  <Text style={styles.scenarioLabel}>До ликвидации</Text>
                  <Text style={[styles.scenarioValue, { color: theme.colors.danger }]}>
                    +
                    {getLiquidationPercent(
                      parseFloat(entryPrice),
                      result.liquidationPriceShort
                    ).toFixed(2)}
                    %
                  </Text>
                </View>
              </View>

              <Text style={styles.hint}>
                * Расчет приблизительный. Реальная цена ликвидации зависит от биржи.
              </Text>
            </>
          ) : (
            <View style={styles.emptyResults}>
              <Text style={styles.emptyText}>
                Введите размер позиции и цену{'\n'}для расчета маржи
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
