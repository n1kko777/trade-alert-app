import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Text, View } from 'react-native';
import type { ThemeColors } from '../theme';
import type { Styles } from '../styles';
import { useTheme } from '../theme-context';
import { Settings } from '../types';

type Tone = 'good' | 'warn' | 'bad' | 'muted';

type StatusPanelProps = {
  settings: Settings;
  healthLabel: string;
  lastSyncLabel: string;
  error?: string | null;
  notificationLabel: string;
  streamLabel: string;
  backgroundLabel: string;
  quietLabel: string;
  healthTone: Tone;
  notificationTone: Tone;
  streamTone: Tone;
  backgroundTone: Tone;
  quietTone: Tone;
  pulse: Animated.Value;
  compact?: boolean;
};

const toneStyle = (tone: Tone, styles: Styles) => {
  if (tone === 'good') return styles.statusGood;
  if (tone === 'warn') return styles.statusWarn;
  if (tone === 'bad') return styles.statusBad;
  return styles.statusMuted;
};

const toneColor = (tone: Tone, colors: ThemeColors) => {
  if (tone === 'good') return colors.statusGood;
  if (tone === 'warn') return colors.statusWarn;
  if (tone === 'bad') return colors.statusBad;
  return colors.statusMuted;
};

export default function StatusPanel({
  settings,
  healthLabel,
  lastSyncLabel,
  error,
  notificationLabel,
  streamLabel,
  backgroundLabel,
  quietLabel,
  healthTone,
  notificationTone,
  streamTone,
  backgroundTone,
  quietTone,
  pulse,
  compact = false,
}: StatusPanelProps) {
  const { theme, styles } = useTheme();
  const getToneStyle = (tone: Tone) => toneStyle(tone, styles);
  const getToneColor = (tone: Tone) => toneColor(tone, theme.colors);
  const lastSyncShort = lastSyncLabel.replace('Last sync ', '');
  const notificationText = settings.notificationsEnabled
    ? settings.notificationSound
      ? 'Уведомл.'
      : 'Тихо'
    : 'Уведомл. выкл';
  const streamText = settings.trackAllSymbols
    ? 'Все монеты'
    : settings.useWebSocket
    ? streamTone === 'bad'
      ? 'Ошибка потока'
      : streamTone === 'warn'
      ? 'Синхр.'
      : 'Поток'
    : 'Опрос';
  const backgroundText = settings.backgroundEnabled ? 'Фон вкл' : 'Фон выкл';
  const quietText = settings.quietHoursEnabled ? 'Тихо вкл' : 'Тихо выкл';
  const healthIcon =
    healthTone === 'good'
      ? 'checkmark-circle'
      : healthTone === 'warn'
      ? 'time'
      : healthTone === 'bad'
      ? 'alert-circle'
      : 'remove-circle';
  const notificationIcon = settings.notificationsEnabled
    ? settings.notificationSound
      ? 'notifications'
      : 'notifications-outline'
    : 'notifications-off';
  const streamIcon = settings.trackAllSymbols
    ? 'grid'
    : settings.useWebSocket
    ? 'wifi'
    : 'repeat';
  const backgroundIcon = settings.backgroundEnabled ? 'cloud-done' : 'cloud-offline';
  const quietIcon = settings.quietHoursEnabled ? 'moon' : 'moon-outline';

  return (
    <View style={[styles.panel, compact ? styles.panelCompact : null]}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelTitle}>Движок алертов</Text>
        </View>
        <Animated.View
          style={[
            styles.pulseDot,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [
                {
                  scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }),
                },
              ],
            },
          ]}
        />
      </View>

      {compact ? (
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryText}>
            Алерт{' '}
            <Text style={styles.summaryStrong}>{settings.thresholdPct}%</Text> •{' '}
            <Text style={styles.summaryStrong}>{settings.windowMinutes}м</Text> • КД{' '}
            <Text style={styles.summaryStrong}>{settings.cooldownMinutes}м</Text>
          </Text>
          <Text style={styles.summaryText}>
            Хранение <Text style={styles.summaryStrong}>{settings.retentionDays}д</Text> • Макс{' '}
            <Text style={styles.summaryStrong}>{settings.maxAlerts}</Text> • Опрос{' '}
            <Text style={styles.summaryStrong}>{settings.pollIntervalSec}с</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Порог</Text>
            <Text style={styles.metricValue}>{settings.thresholdPct}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Окно</Text>
            <Text style={styles.metricValue}>{settings.windowMinutes}м</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Кулдаун</Text>
            <Text style={styles.metricValue}>{settings.cooldownMinutes}м</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Хранение</Text>
            <Text style={styles.metricValue}>{settings.retentionDays}д</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Макс. алерт.</Text>
            <Text style={styles.metricValue}>{settings.maxAlerts}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Опрос</Text>
            <Text style={styles.metricValue}>{settings.pollIntervalSec}с</Text>
          </View>
        </View>
      )}

      {compact ? (
        <View style={styles.compactStatusGrid}>
          <View style={[styles.compactStatusRow, styles.compactStatusRowFirst]}>
            <View style={styles.compactStatusChip}>
              <Ionicons name={healthIcon} size={14} color={getToneColor(healthTone)} />
              <Text style={styles.compactStatusText} numberOfLines={1}>
                {healthLabel}
              </Text>
            </View>
            <View style={styles.compactStatusChip}>
              <Ionicons name="time" size={14} color={getToneColor('muted')} />
              <Text style={styles.compactStatusText} numberOfLines={1}>
                {lastSyncShort}
              </Text>
            </View>
            <View style={styles.compactStatusChip}>
              <Ionicons name={notificationIcon} size={14} color={getToneColor(notificationTone)} />
              <Text style={styles.compactStatusText} numberOfLines={1}>
                {notificationText}
              </Text>
            </View>
          </View>
          <View style={styles.compactStatusRow}>
            <View style={styles.compactStatusChip}>
              <Ionicons name={streamIcon} size={14} color={getToneColor(streamTone)} />
              <Text style={styles.compactStatusText} numberOfLines={1}>
                {streamText}
              </Text>
            </View>
            <View style={styles.compactStatusChip}>
              <Ionicons name={backgroundIcon} size={14} color={getToneColor(backgroundTone)} />
              <Text style={styles.compactStatusText} numberOfLines={1}>
                {backgroundText}
              </Text>
            </View>
            <View style={styles.compactStatusChip}>
              <Ionicons name={quietIcon} size={14} color={getToneColor(quietTone)} />
              <Text style={styles.compactStatusText} numberOfLines={1}>
                {quietText}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={[styles.metaRow, styles.metaRowFirst]}>
            <View style={styles.metaBadge}>
              <View style={[styles.statusDot, getToneStyle(healthTone)]} />
              <Text style={styles.metaText}>{healthLabel}</Text>
            </View>
            <Text style={styles.metaText}>{lastSyncLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <View style={[styles.statusDot, getToneStyle(notificationTone)]} />
              <Text style={styles.metaText}>{notificationLabel}</Text>
            </View>
            <View style={styles.metaBadge}>
              <View style={[styles.statusDot, getToneStyle(streamTone)]} />
              <Text style={styles.metaText}>{streamLabel}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <View style={[styles.statusDot, getToneStyle(backgroundTone)]} />
              <Text style={styles.metaText}>{backgroundLabel}</Text>
            </View>
            <Text style={styles.metaText}>
              История {settings.retentionDays}д • {settings.maxAlerts} макс.
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <View style={[styles.statusDot, getToneStyle(quietTone)]} />
              <Text style={styles.metaText}>{quietLabel}</Text>
            </View>
            <Text style={styles.metaText}>Источник: Bybit спот тикеры • только фьючерсы</Text>
          </View>
        </>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}
