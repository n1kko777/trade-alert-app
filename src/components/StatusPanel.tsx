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
      ? 'Notify'
      : 'Silent'
    : 'Notify off';
  const streamText = settings.trackAllSymbols
    ? 'All coins'
    : settings.useWebSocket
    ? streamTone === 'bad'
      ? 'Stream err'
      : streamTone === 'warn'
      ? 'Syncing'
      : 'Stream'
    : 'Polling';
  const backgroundText = settings.backgroundEnabled ? 'BG on' : 'BG off';
  const quietText = settings.quietHoursEnabled ? 'Quiet on' : 'Quiet off';
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
          <Text style={styles.panelTitle}>Alert Engine</Text>
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
            Alert{' '}
            <Text style={styles.summaryStrong}>{settings.thresholdPct}%</Text> •{' '}
            <Text style={styles.summaryStrong}>{settings.windowMinutes}m</Text> • CD{' '}
            <Text style={styles.summaryStrong}>{settings.cooldownMinutes}m</Text>
          </Text>
          <Text style={styles.summaryText}>
            Retention <Text style={styles.summaryStrong}>{settings.retentionDays}d</Text> • Max{' '}
            <Text style={styles.summaryStrong}>{settings.maxAlerts}</Text> • Poll{' '}
            <Text style={styles.summaryStrong}>{settings.pollIntervalSec}s</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Threshold</Text>
            <Text style={styles.metricValue}>{settings.thresholdPct}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Window</Text>
            <Text style={styles.metricValue}>{settings.windowMinutes}m</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Cooldown</Text>
            <Text style={styles.metricValue}>{settings.cooldownMinutes}m</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Retention</Text>
            <Text style={styles.metricValue}>{settings.retentionDays}d</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Max alerts</Text>
            <Text style={styles.metricValue}>{settings.maxAlerts}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Polling</Text>
            <Text style={styles.metricValue}>{settings.pollIntervalSec}s</Text>
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
              History {settings.retentionDays}d • {settings.maxAlerts} max
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <View style={[styles.statusDot, getToneStyle(quietTone)]} />
              <Text style={styles.metaText}>{quietLabel}</Text>
            </View>
            <Text style={styles.metaText}>Source Bybit spot tickers • futures only</Text>
          </View>
        </>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}
