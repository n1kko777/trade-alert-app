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

type RiskCalculatorProps = {
  onClose?: () => void;
};

type CalculationResult = {
  positionSize: number;
  positionSizeUSD: number;
  potentialLoss: number;
  riskRewardDisplay: string;
  stopLossPercent: number;
};

export default function RiskCalculator({ onClose }: RiskCalculatorProps) {
  const { theme, styles: globalStyles } = useTheme();

  const [accountBalance, setAccountBalance] = useState('');
  const [riskPercent, setRiskPercent] = useState('2');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const result = useMemo((): CalculationResult | null => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent);
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    if (!balance || !risk || !entry || !stop || balance <= 0 || entry <= 0 || stop <= 0) {
      return null;
    }

    const riskAmount = (balance * risk) / 100;
    const stopLossPercent = Math.abs((entry - stop) / entry) * 100;
    const pricePerUnit = Math.abs(entry - stop);

    if (pricePerUnit === 0) {
      return null;
    }

    const positionSize = riskAmount / pricePerUnit;
    const positionSizeUSD = positionSize * entry;
    const potentialLoss = riskAmount;

    let riskRewardDisplay = '-';
    if (tp && tp > 0) {
      const potentialProfit = Math.abs(tp - entry) * positionSize;
      const rr = potentialProfit / potentialLoss;
      riskRewardDisplay = `1:${rr.toFixed(2)}`;
    }

    return {
      positionSize,
      positionSizeUSD,
      potentialLoss,
      riskRewardDisplay,
      stopLossPercent,
    };
  }, [accountBalance, riskPercent, entryPrice, stopLoss, takeProfit]);

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(decimals);
  };

  const formatCrypto = (num: number): string => {
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
        presetRow: {
          flexDirection: 'row',
          gap: 8,
          marginTop: 8,
        },
        presetButton: {
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: theme.colors.metricCard,
        },
        presetButtonActive: {
          backgroundColor: theme.colors.accent,
        },
        presetText: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 12,
          color: theme.colors.textSecondary,
        },
        presetTextActive: {
          color: theme.colors.buttonText,
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
        resultSubValue: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 12,
          color: theme.colors.textMuted,
          marginTop: 2,
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
        hint: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 11,
          color: theme.colors.textFaint,
          marginTop: 4,
        },
      }),
    [theme]
  );

  const riskPresets = ['0.5', '1', '2', '3', '5'];

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
            <Text style={styles.title}>Калькулятор риска</Text>
            <Text style={styles.subtitle}>Расчет размера позиции</Text>
          </View>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Закрыть</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Параметры счета</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Баланс счета</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={accountBalance}
                onChangeText={setAccountBalance}
                keyboardType="decimal-pad"
                placeholder="10000"
                placeholderTextColor={theme.colors.textPlaceholder}
              />
              <Text style={styles.inputSuffix}>USDT</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Риск на сделку</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={riskPercent}
                onChangeText={setRiskPercent}
                keyboardType="decimal-pad"
                placeholder="2"
                placeholderTextColor={theme.colors.textPlaceholder}
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
            <View style={styles.presetRow}>
              {riskPresets.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetButton,
                    riskPercent === preset && styles.presetButtonActive,
                  ]}
                  onPress={() => setRiskPercent(preset)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      riskPercent === preset && styles.presetTextActive,
                    ]}
                  >
                    {preset}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Рекомендуется 1-2% от депозита</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Параметры сделки</Text>

          <View style={styles.inputRow}>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Стоп-лосс</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={stopLoss}
                  onChangeText={setStopLoss}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textPlaceholder}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Тейк-профит (опционально)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={takeProfit}
                onChangeText={setTakeProfit}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textPlaceholder}
              />
            </View>
            <Text style={styles.hint}>Для расчета соотношения риск/прибыль</Text>
          </View>
        </View>

        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Результаты</Text>

          {result ? (
            <>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Размер позиции</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.resultValue, styles.resultValueHighlight]}>
                    {formatCrypto(result.positionSize)}
                  </Text>
                  <Text style={styles.resultSubValue}>
                    ~${formatNumber(result.positionSizeUSD)} USDT
                  </Text>
                </View>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Потенциальный убыток</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.resultValue, styles.resultValueDanger]}>
                    -${formatNumber(result.potentialLoss)}
                  </Text>
                  <Text style={styles.resultSubValue}>{riskPercent}% от баланса</Text>
                </View>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Стоп-лосс</Text>
                <Text style={styles.resultValue}>
                  {result.stopLossPercent.toFixed(2)}%
                </Text>
              </View>

              <View style={[styles.resultRow, styles.resultRowLast]}>
                <Text style={styles.resultLabel}>Риск/Прибыль</Text>
                <Text
                  style={[
                    styles.resultValue,
                    result.riskRewardDisplay !== '-' && styles.resultValueHighlight,
                  ]}
                >
                  {result.riskRewardDisplay}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyResults}>
              <Text style={styles.emptyText}>
                Введите параметры для расчета{'\n'}размера позиции
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
