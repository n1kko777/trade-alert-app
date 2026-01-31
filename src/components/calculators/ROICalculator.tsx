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
  Switch,
} from 'react-native';
import { useTheme } from '../../theme-context';

type ROICalculatorProps = {
  onClose?: () => void;
};

type CalculationResult = {
  profitLoss: number;
  profitLossPercent: number;
  roi: number;
  breakevenPrice: number;
  totalFees: number;
  effectiveEntry: number;
  effectiveExit: number;
};

type InputMode = 'price' | 'percent';

export default function ROICalculator({ onClose }: ROICalculatorProps) {
  const { theme } = useTheme();

  const [investment, setInvestment] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [targetPercent, setTargetPercent] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('price');
  const [includeFees, setIncludeFees] = useState(true);
  const [feePercent, setFeePercent] = useState('0.1');
  const [isLong, setIsLong] = useState(true);

  const result = useMemo((): CalculationResult | null => {
    const inv = parseFloat(investment);
    const entry = parseFloat(entryPrice);
    const fee = includeFees ? parseFloat(feePercent) || 0 : 0;

    if (!inv || !entry || inv <= 0 || entry <= 0) {
      return null;
    }

    let exit: number;
    if (inputMode === 'price') {
      exit = parseFloat(exitPrice);
      if (!exit || exit <= 0) {
        return null;
      }
    } else {
      const target = parseFloat(targetPercent);
      if (isNaN(target)) {
        return null;
      }
      if (isLong) {
        exit = entry * (1 + target / 100);
      } else {
        exit = entry * (1 - target / 100);
      }
    }

    const quantity = inv / entry;

    // Calculate fees (entry + exit)
    const entryFee = (inv * fee) / 100;
    const exitValue = quantity * exit;
    const exitFee = (exitValue * fee) / 100;
    const totalFees = entryFee + exitFee;

    // Calculate P&L
    let grossPL: number;
    if (isLong) {
      grossPL = exitValue - inv;
    } else {
      grossPL = inv - exitValue;
    }
    const netPL = grossPL - totalFees;
    const profitLossPercent = (netPL / inv) * 100;
    const roi = profitLossPercent;

    // Breakeven calculation (price needed to cover fees)
    let breakevenPrice: number;
    if (isLong) {
      // For long: need exit price that covers entry + fees
      // exitValue - totalFees = inv
      // qty * breakeven - (inv * fee/100) - (qty * breakeven * fee/100) = inv
      // qty * breakeven * (1 - fee/100) = inv * (1 + fee/100)
      breakevenPrice = (entry * (1 + fee / 100)) / (1 - fee / 100);
    } else {
      // For short: need exit price where profit covers fees
      breakevenPrice = (entry * (1 - fee / 100)) / (1 + fee / 100);
    }

    return {
      profitLoss: netPL,
      profitLossPercent,
      roi,
      breakevenPrice,
      totalFees,
      effectiveEntry: entry,
      effectiveExit: exit,
    };
  }, [investment, entryPrice, exitPrice, targetPercent, inputMode, includeFees, feePercent, isLong]);

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (Math.abs(num) >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(num) >= 1000) {
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
        modeToggle: {
          flexDirection: 'row',
          backgroundColor: theme.colors.input,
          borderRadius: 10,
          padding: 4,
          marginBottom: 12,
        },
        modeButton: {
          flex: 1,
          paddingVertical: 8,
          alignItems: 'center',
          borderRadius: 8,
        },
        modeButtonActive: {
          backgroundColor: theme.colors.accent,
        },
        modeText: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 13,
          color: theme.colors.textSecondary,
        },
        modeTextActive: {
          color: theme.colors.buttonText,
        },
        directionToggle: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 12,
        },
        directionButton: {
          flex: 1,
          paddingVertical: 12,
          alignItems: 'center',
          borderRadius: 12,
          backgroundColor: theme.colors.metricCard,
        },
        directionButtonLong: {
          backgroundColor: theme.colors.changeUp,
        },
        directionButtonShort: {
          backgroundColor: theme.colors.changeDown,
        },
        directionButtonLongActive: {
          backgroundColor: theme.colors.success,
        },
        directionButtonShortActive: {
          backgroundColor: theme.colors.danger,
        },
        directionText: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 14,
        },
        directionTextLong: {
          color: theme.colors.changeUpText,
        },
        directionTextShort: {
          color: theme.colors.changeDownText,
        },
        directionTextActive: {
          color: theme.colors.buttonText,
        },
        feeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.metricCard,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        },
        feeLabel: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 14,
          color: theme.colors.textPrimary,
        },
        feeRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        feeInput: {
          width: 60,
          paddingVertical: 6,
          paddingHorizontal: 10,
          backgroundColor: theme.colors.input,
          borderRadius: 8,
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 14,
          color: theme.colors.textPrimary,
          textAlign: 'center',
        },
        feeInputDisabled: {
          opacity: 0.5,
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
        resultHighlight: {
          backgroundColor: theme.colors.metricCard,
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
          marginBottom: 16,
        },
        resultHighlightProfit: {
          backgroundColor: theme.colors.changeUp,
        },
        resultHighlightLoss: {
          backgroundColor: theme.colors.changeDown,
        },
        resultHighlightLabel: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginBottom: 4,
        },
        resultHighlightValue: {
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 28,
          color: theme.colors.textPrimary,
        },
        resultHighlightValueProfit: {
          color: theme.colors.changeUpText,
        },
        resultHighlightValueLoss: {
          color: theme.colors.changeDownText,
        },
        resultHighlightSub: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginTop: 4,
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

  const isProfit = result ? result.profitLoss >= 0 : false;

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
            <Text style={styles.title}>Калькулятор ROI</Text>
            <Text style={styles.subtitle}>Прибыль и рентабельность</Text>
          </View>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Закрыть</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Направление</Text>
          <View style={styles.directionToggle}>
            <TouchableOpacity
              style={[
                styles.directionButton,
                isLong ? styles.directionButtonLongActive : styles.directionButtonLong,
              ]}
              onPress={() => setIsLong(true)}
            >
              <Text
                style={[
                  styles.directionText,
                  isLong ? styles.directionTextActive : styles.directionTextLong,
                ]}
              >
                Long
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionButton,
                !isLong ? styles.directionButtonShortActive : styles.directionButtonShort,
              ]}
              onPress={() => setIsLong(false)}
            >
              <Text
                style={[
                  styles.directionText,
                  !isLong ? styles.directionTextActive : styles.directionTextShort,
                ]}
              >
                Short
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Инвестиция</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Сумма инвестиции</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={investment}
                  onChangeText={setInvestment}
                  keyboardType="decimal-pad"
                  placeholder="1000"
                  placeholderTextColor={theme.colors.textPlaceholder}
                />
                <Text style={styles.inputSuffix}>USDT</Text>
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
          <Text style={styles.sectionTitle}>Цель выхода</Text>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, inputMode === 'price' && styles.modeButtonActive]}
              onPress={() => setInputMode('price')}
            >
              <Text
                style={[styles.modeText, inputMode === 'price' && styles.modeTextActive]}
              >
                По цене
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, inputMode === 'percent' && styles.modeButtonActive]}
              onPress={() => setInputMode('percent')}
            >
              <Text
                style={[styles.modeText, inputMode === 'percent' && styles.modeTextActive]}
              >
                По проценту
              </Text>
            </TouchableOpacity>
          </View>

          {inputMode === 'price' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Цена выхода</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={exitPrice}
                  onChangeText={setExitPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textPlaceholder}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Целевой процент {isLong ? 'роста' : 'падения'}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={targetPercent}
                  onChangeText={setTargetPercent}
                  keyboardType="decimal-pad"
                  placeholder="10"
                  placeholderTextColor={theme.colors.textPlaceholder}
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>
              <Text style={styles.hint}>
                {isLong ? 'Прибыль при росте цены' : 'Прибыль при падении цены'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Комиссии</Text>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Учитывать комиссию</Text>
            <View style={styles.feeRight}>
              <TextInput
                style={[styles.feeInput, !includeFees && styles.feeInputDisabled]}
                value={feePercent}
                onChangeText={setFeePercent}
                keyboardType="decimal-pad"
                editable={includeFees}
                placeholder="0.1"
                placeholderTextColor={theme.colors.textPlaceholder}
              />
              <Text style={styles.inputSuffix}>%</Text>
              <Switch
                value={includeFees}
                onValueChange={setIncludeFees}
                trackColor={{
                  false: theme.colors.switchTrackOff,
                  true: theme.colors.accent,
                }}
                thumbColor={theme.colors.switchThumb}
              />
            </View>
          </View>
          <Text style={styles.hint}>
            Стандартная комиссия Binance: 0.1% (спот), 0.02-0.04% (фьючерсы)
          </Text>
        </View>

        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Результаты</Text>

          {result ? (
            <>
              <View
                style={[
                  styles.resultHighlight,
                  isProfit ? styles.resultHighlightProfit : styles.resultHighlightLoss,
                ]}
              >
                <Text style={styles.resultHighlightLabel}>
                  {isProfit ? 'Прибыль' : 'Убыток'}
                </Text>
                <Text
                  style={[
                    styles.resultHighlightValue,
                    isProfit
                      ? styles.resultHighlightValueProfit
                      : styles.resultHighlightValueLoss,
                  ]}
                >
                  {isProfit ? '+' : ''}
                  {result.profitLossPercent.toFixed(2)}%
                </Text>
                <Text style={styles.resultHighlightSub}>
                  {isProfit ? '+' : ''}${formatNumber(result.profitLoss)} USDT
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>ROI</Text>
                <Text
                  style={[
                    styles.resultValue,
                    isProfit ? { color: theme.colors.success } : { color: theme.colors.danger },
                  ]}
                >
                  {result.roi >= 0 ? '+' : ''}
                  {result.roi.toFixed(2)}%
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Цена безубытка</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.resultValue, styles.resultValueHighlight]}>
                    ${formatPrice(result.breakevenPrice)}
                  </Text>
                  <Text style={styles.resultSubValue}>
                    {isLong ? '+' : '-'}
                    {(
                      (Math.abs(result.breakevenPrice - result.effectiveEntry) /
                        result.effectiveEntry) *
                      100
                    ).toFixed(3)}
                    % от входа
                  </Text>
                </View>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Цена выхода</Text>
                <Text style={styles.resultValue}>${formatPrice(result.effectiveExit)}</Text>
              </View>

              <View style={[styles.resultRow, styles.resultRowLast]}>
                <Text style={styles.resultLabel}>Общие комиссии</Text>
                <Text style={styles.resultValue}>
                  ${formatNumber(result.totalFees, 4)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyResults}>
              <Text style={styles.emptyText}>
                Введите сумму инвестиции и цены{'\n'}для расчета прибыли
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
