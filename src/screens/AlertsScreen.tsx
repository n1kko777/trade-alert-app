import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import AlertsPanel from '../components/AlertsPanel';
import { useTheme } from '../theme-context';
import { AlertEvent } from '../types';

type AlertsScreenProps = {
  alerts: AlertEvent[];
  alertLabel: string;
  onClear: () => void;
};

export default function AlertsScreen({
  alerts,
  alertLabel,
  onClear,
}: AlertsScreenProps) {
  const { styles } = useTheme();
  const upCount = alerts.filter((alert) => alert.changePct > 0).length;
  const downCount = alerts.filter((alert) => alert.changePct < 0).length;
  const displayedCount = Math.min(alerts.length, 6);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryText}>
          Total <Text style={styles.summaryStrong}>{alerts.length}</Text> • Up{' '}
          <Text style={styles.summaryStrong}>{upCount}</Text> • Down{' '}
          <Text style={styles.summaryStrong}>{downCount}</Text> • Showing{' '}
          <Text style={styles.summaryStrong}>{displayedCount}</Text>
        </Text>
      </View>

      <AlertsPanel
        alerts={alerts}
        alertLabel={alertLabel}
        onClear={onClear}
      />
    </ScrollView>
  );
}
