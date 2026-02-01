import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme-context';
import { AlertEvent } from '../types';
import { formatClock, formatPrice } from '../utils/format';

type AlertsPanelProps = {
  alerts: AlertEvent[];
  alertLabel: string;
  onClear: () => void;
};

export default function AlertsPanel({
  alerts,
  alertLabel,
  onClear,
}: AlertsPanelProps) {
  const { styles } = useTheme();

  return (
    <>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Алерты</Text>
          <Text style={styles.sectionSub}>{alertLabel}</Text>
        </View>
        <View style={styles.sectionActions}>
          <TouchableOpacity onPress={onClear} disabled={!alerts.length}>
            <Text style={[styles.sectionAction, !alerts.length ? styles.sectionActionMuted : null]}>
              Очистить
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panel}>
        {alerts.length === 0 ? (
          <Text style={styles.emptyText}>
            Скачков пока не обнаружено. Настройте пороги или добавьте больше символов.
          </Text>
        ) : (
          alerts.slice(0, 6).map((alert) => {
            const isUp = alert.changePct > 0;
            return (
              <View key={alert.id} style={styles.alertRow}>
                <View>
                  <Text style={styles.alertSymbol}>{alert.symbol}</Text>
                  <Text style={styles.alertMeta}>{formatClock(alert.ts)}</Text>
                </View>
                <View style={styles.alertRight}>
                  <Text style={[styles.alertChange, isUp ? styles.alertUp : styles.alertDown]}>
                    {alert.changePct >= 0 ? '+' : ''}
                    {alert.changePct.toFixed(2)}%
                  </Text>
                  <Text style={styles.alertPrice}>${formatPrice(alert.price)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </>
  );
}
