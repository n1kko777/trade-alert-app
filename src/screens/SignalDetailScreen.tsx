import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme-context';
import { useSignals } from '../hooks/useWebSocket';
import { formatPrice } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';
import type { Signal, AITrigger } from '../services/signals/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SignalDetailRouteProp = RouteProp<RootStackParamList, 'SignalDetail'>;

function formatTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}д назад`;
  if (hours > 0) return `${hours}ч назад`;
  if (minutes > 0) return `${minutes}м назад`;
  return 'Только что';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SignalDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SignalDetailRouteProp>();
  const { signalId } = route.params;
  const { signals } = useSignals();

  // Find signal by ID
  const signal: Signal | undefined = signals.find((s) => s.id === signalId) as Signal | undefined;

  if (!signal) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.appBackground }]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textMuted} />
          <Text style={[styles.notFoundText, { color: theme.colors.textSecondary }]}>
            Сигнал не найден
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isLong = signal.direction === 'BUY';
  const directionColor = isLong ? theme.colors.changeUpText : theme.colors.changeDownText;
  const directionBgColor = isLong ? theme.colors.changeUp : theme.colors.changeDown;

  const profitValue = signal.status === 'closed' ? signal.profit : signal.unrealizedProfit;
  const isProfitable = (profitValue ?? 0) > 0;
  const profitColor = isProfitable ? theme.colors.changeUpText : theme.colors.changeDownText;

  const statusColor =
    signal.status === 'active'
      ? theme.colors.statusGood
      : signal.status === 'pending'
        ? theme.colors.statusWarn
        : theme.colors.statusMuted;

  const confirmedTriggers = signal.aiTriggers.filter((t) => t.confirmed).length;
  const totalTriggers = signal.aiTriggers.length;
  const confidencePercentage = (confirmedTriggers / totalTriggers) * 100;

  const handleOpenChart = () => {
    navigation.navigate('Charts');
  };

  const handleOpenAI = () => {
    navigation.navigate('AIChat', { initialSymbol: signal.symbol });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.appBackground }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.headerRow}>
          <View style={styles.symbolRow}>
            <Text style={[styles.symbol, { color: theme.colors.textPrimary }]}>
              {signal.symbol.replace('USDT', '')}
            </Text>
            <View style={[styles.exchangeBadge, { backgroundColor: theme.colors.metaBadge }]}>
              <Text style={[styles.exchangeText, { color: theme.colors.textSecondary }]}>
                {signal.exchange.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={[styles.directionBadge, { backgroundColor: directionBgColor }]}>
            <Text style={[styles.directionArrow, { color: directionColor }]}>
              {isLong ? '\u2191' : '\u2193'}
            </Text>
            <Text style={[styles.directionText, { color: directionColor }]}>
              {signal.direction}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
            {signal.status.charAt(0).toUpperCase() + signal.status.slice(1)}
          </Text>
          <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
            {formatTimeSince(signal.createdAt)}
          </Text>
        </View>

        {profitValue !== undefined && (
          <View style={[styles.profitBanner, { backgroundColor: isProfitable ? theme.colors.changeUp : theme.colors.changeDown }]}>
            <Text style={[styles.profitLabel, { color: isProfitable ? theme.colors.changeUpText : theme.colors.changeDownText }]}>
              {signal.status === 'closed' ? 'Итоговая прибыль' : 'Нереализ. P/L'}
            </Text>
            <Text style={[styles.profitValue, { color: isProfitable ? theme.colors.changeUpText : theme.colors.changeDownText }]}>
              {isProfitable ? '+' : ''}{profitValue.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      {/* Price Details */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Детали цены</Text>

        <View style={styles.priceRow}>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, { color: theme.colors.textMuted }]}>Цена входа</Text>
            <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
              ${formatPrice(signal.entryPrice)}
            </Text>
          </View>
          {signal.currentPrice && (
            <View style={styles.priceItem}>
              <Text style={[styles.priceLabel, { color: theme.colors.textMuted }]}>Текущая цена</Text>
              <Text style={[styles.priceValue, { color: theme.colors.textPrimary }]}>
                ${formatPrice(signal.currentPrice)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={[styles.subSectionTitle, { color: theme.colors.textSecondary }]}>Уровни Take Profit</Text>
        <View style={styles.tpLevels}>
          {signal.takeProfit.map((tp, index) => (
            <View
              key={index}
              style={[
                styles.tpLevel,
                { backgroundColor: tp.hit ? theme.colors.changeUp : theme.colors.metaBadge },
              ]}
            >
              <View style={styles.tpHeader}>
                <Text style={[styles.tpLabel, { color: tp.hit ? theme.colors.changeUpText : theme.colors.textSecondary }]}>
                  TP{index + 1}
                </Text>
                {tp.hit && (
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.changeUpText} />
                )}
              </View>
              <Text style={[styles.tpPrice, { color: tp.hit ? theme.colors.changeUpText : theme.colors.textPrimary }]}>
                ${formatPrice(tp.price)}
              </Text>
              <Text style={[styles.tpPct, { color: tp.hit ? theme.colors.changeUpText : theme.colors.textMuted }]}>
                +{tp.percentage.toFixed(1)}%
              </Text>
              {tp.hitAt && (
                <Text style={[styles.tpHitTime, { color: theme.colors.changeUpText }]}>
                  Достигнут {formatTimeSince(tp.hitAt)}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={[styles.subSectionTitle, { color: theme.colors.textSecondary }]}>Stop Loss</Text>
        <View style={[styles.slBadge, { backgroundColor: theme.colors.changeDown }]}>
          <View>
            <Text style={[styles.slPrice, { color: theme.colors.changeDownText }]}>
              ${formatPrice(signal.stopLoss)}
            </Text>
            <Text style={[styles.slPct, { color: theme.colors.changeDownText }]}>
              -{signal.stopLossPercentage.toFixed(1)}% от входа
            </Text>
          </View>
          <Ionicons name="shield-outline" size={24} color={theme.colors.changeDownText} />
        </View>
      </View>

      {/* AI Triggers Analysis */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>AI Анализ</Text>
          <View style={[styles.confidenceBadge, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.confidenceText}>{signal.confidence}%</Text>
          </View>
        </View>

        <View style={styles.triggersSummary}>
          <View style={styles.triggersProgress}>
            <View
              style={[
                styles.triggersProgressFill,
                { width: `${confidencePercentage}%`, backgroundColor: theme.colors.statusGood },
              ]}
            />
          </View>
          <Text style={[styles.triggersCount, { color: theme.colors.textSecondary }]}>
            {confirmedTriggers} из {totalTriggers} триггеров подтверждено
          </Text>
        </View>

        <View style={styles.triggersList}>
          {signal.aiTriggers.map((trigger: AITrigger, index: number) => (
            <View key={index} style={styles.triggerItem}>
              <View
                style={[
                  styles.triggerIcon,
                  { backgroundColor: trigger.confirmed ? theme.colors.changeUp : theme.colors.metaBadge },
                ]}
              >
                <Ionicons
                  name={trigger.confirmed ? 'checkmark' : 'close'}
                  size={14}
                  color={trigger.confirmed ? theme.colors.changeUpText : theme.colors.textMuted}
                />
              </View>
              <View style={styles.triggerContent}>
                <Text style={[styles.triggerName, { color: theme.colors.textPrimary }]}>
                  {trigger.name}
                </Text>
                <Text style={[styles.triggerWeight, { color: theme.colors.textMuted }]}>
                  Вес: {(trigger.weight * 100).toFixed(0)}%
                </Text>
              </View>
              <Text
                style={[
                  styles.triggerStatus,
                  { color: trigger.confirmed ? theme.colors.changeUpText : theme.colors.textMuted },
                ]}
              >
                {trigger.confirmed ? 'Подтверждён' : 'Не выполнен'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Timeline */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Хронология</Text>

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: theme.colors.statusGood }]} />
          <View style={styles.timelineContent}>
            <Text style={[styles.timelineLabel, { color: theme.colors.textPrimary }]}>Сигнал создан</Text>
            <Text style={[styles.timelineDate, { color: theme.colors.textMuted }]}>
              {formatDate(signal.createdAt)}
            </Text>
          </View>
        </View>

        {signal.closedAt && (
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.statusMuted }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineLabel, { color: theme.colors.textPrimary }]}>Сигнал закрыт</Text>
              <Text style={[styles.timelineDate, { color: theme.colors.textMuted }]}>
                {formatDate(signal.closedAt)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
          onPress={handleOpenChart}
        >
          <Ionicons name="stats-chart" size={20} color={theme.colors.accent} />
          <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>Открыть график</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
          onPress={handleOpenAI}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.accent} />
          <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>Спросить AI</Text>
        </TouchableOpacity>
      </View>

      {/* Notes */}
      {signal.notes && (
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Заметки</Text>
          <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>{signal.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  exchangeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  exchangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  directionArrow: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  directionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 13,
  },
  profitBanner: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 16,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    marginVertical: 16,
  },
  tpLevels: {
    flexDirection: 'row',
    gap: 10,
  },
  tpLevel: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  tpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  tpLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tpPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  tpPct: {
    fontSize: 11,
    marginTop: 2,
  },
  tpHitTime: {
    fontSize: 10,
    marginTop: 4,
  },
  slBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  slPrice: {
    fontSize: 18,
    fontWeight: '600',
  },
  slPct: {
    fontSize: 12,
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  triggersSummary: {
    marginBottom: 16,
  },
  triggersProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginBottom: 8,
    overflow: 'hidden',
  },
  triggersProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  triggersCount: {
    fontSize: 13,
  },
  triggersList: {
    gap: 10,
  },
  triggerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  triggerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerContent: {
    flex: 1,
  },
  triggerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  triggerWeight: {
    fontSize: 11,
    marginTop: 2,
  },
  triggerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
