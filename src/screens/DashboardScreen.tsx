import React from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import StatusPanel from '../components/StatusPanel';
import WatchlistCard from '../components/WatchlistCard';
import { useTheme } from '../theme-context';
import { PricePoint, Quote, Settings } from '../types';

type Tone = 'good' | 'warn' | 'bad' | 'muted';

type DashboardScreenProps = {
  settings: Settings;
  quotes: Record<string, Quote>;
  prices: Record<string, PricePoint[]>;
  watchSymbols: string[];
  watchlistTitle: string;
  watchlistSubtitle: string;
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
};

export default function DashboardScreen({
  settings,
  quotes,
  prices,
  watchSymbols,
  watchlistTitle,
  watchlistSubtitle,
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
}: DashboardScreenProps) {
  const { styles } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <StatusPanel
        settings={settings}
        healthLabel={healthLabel}
        lastSyncLabel={lastSyncLabel}
        error={error}
        notificationLabel={notificationLabel}
        streamLabel={streamLabel}
        backgroundLabel={backgroundLabel}
        quietLabel={quietLabel}
        healthTone={healthTone}
        notificationTone={notificationTone}
        streamTone={streamTone}
        backgroundTone={backgroundTone}
        quietTone={quietTone}
        pulse={pulse}
        compact
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{watchlistTitle}</Text>
        <Text style={styles.sectionSub}>{watchlistSubtitle}</Text>
      </View>

      {watchSymbols.map((symbol) => (
        <WatchlistCard
          key={symbol}
          symbol={symbol}
          quote={quotes[symbol]}
          history={prices[symbol] ?? []}
          settings={settings}
        />
      ))}
    </ScrollView>
  );
}
