import React from 'react';
import { ScrollView, View } from 'react-native';
import SettingsPanel from '../components/SettingsPanel';
import type { ThemeMode } from '../theme';
import { useTheme } from '../theme-context';
import { Settings, SymbolRuleInputs } from '../types';

type SettingsScreenProps = {
  settings: Settings;
  symbolInput: string;
  thresholdInput: string;
  windowInput: string;
  cooldownInput: string;
  retentionInput: string;
  maxAlertsInput: string;
  pollInput: string;
  notificationsInput: boolean;
  notificationSoundInput: boolean;
  quietHoursEnabledInput: boolean;
  quietStartInput: string;
  quietEndInput: string;
  useWebSocketInput: boolean;
  backgroundInput: boolean;
  trackAllSymbolsInput: boolean;
  themeModeInput: ThemeMode;
  symbolRuleInputs: SymbolRuleInputs;
  notificationStatus: 'unknown' | 'granted' | 'denied' | 'unavailable';
  isExpoGo: boolean;
  backgroundStatus: 'off' | 'on' | 'unavailable' | 'error';
  onSymbolChange: (value: string) => void;
  onThresholdChange: (value: string) => void;
  onWindowChange: (value: string) => void;
  onCooldownChange: (value: string) => void;
  onRetentionChange: (value: string) => void;
  onMaxAlertsChange: (value: string) => void;
  onPollChange: (value: string) => void;
  onNotificationsToggle: (value: boolean) => void;
  onNotificationSoundToggle: (value: boolean) => void;
  onQuietHoursToggle: (value: boolean) => void;
  onQuietStartChange: (value: string) => void;
  onQuietEndChange: (value: string) => void;
  onWebSocketToggle: (value: boolean) => void;
  onBackgroundToggle: (value: boolean) => void;
  onTrackAllSymbolsToggle: (value: boolean) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onRuleChange: (symbol: string, field: 'threshold' | 'window' | 'cooldown', value: string) => void;
  onApply: () => void;
};

export default function SettingsScreen({
  settings,
  symbolInput,
  thresholdInput,
  windowInput,
  cooldownInput,
  retentionInput,
  maxAlertsInput,
  pollInput,
  notificationsInput,
  notificationSoundInput,
  quietHoursEnabledInput,
  quietStartInput,
  quietEndInput,
  useWebSocketInput,
  backgroundInput,
  trackAllSymbolsInput,
  themeModeInput,
  symbolRuleInputs,
  notificationStatus,
  isExpoGo,
  backgroundStatus,
  onSymbolChange,
  onThresholdChange,
  onWindowChange,
  onCooldownChange,
  onRetentionChange,
  onMaxAlertsChange,
  onPollChange,
  onNotificationsToggle,
  onNotificationSoundToggle,
  onQuietHoursToggle,
  onQuietStartChange,
  onQuietEndChange,
  onWebSocketToggle,
  onBackgroundToggle,
  onTrackAllSymbolsToggle,
  onThemeModeChange,
  onRuleChange,
  onApply,
}: SettingsScreenProps) {
  const { styles } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <SettingsPanel
        settings={settings}
        symbolInput={symbolInput}
        thresholdInput={thresholdInput}
        windowInput={windowInput}
        cooldownInput={cooldownInput}
        retentionInput={retentionInput}
        maxAlertsInput={maxAlertsInput}
        pollInput={pollInput}
        notificationsInput={notificationsInput}
        notificationSoundInput={notificationSoundInput}
        quietHoursEnabledInput={quietHoursEnabledInput}
        quietStartInput={quietStartInput}
        quietEndInput={quietEndInput}
        useWebSocketInput={useWebSocketInput}
        backgroundInput={backgroundInput}
        trackAllSymbolsInput={trackAllSymbolsInput}
        themeModeInput={themeModeInput}
        symbolRuleInputs={symbolRuleInputs}
        notificationStatus={notificationStatus}
        isExpoGo={isExpoGo}
        backgroundStatus={backgroundStatus}
        onSymbolChange={onSymbolChange}
        onThresholdChange={onThresholdChange}
        onWindowChange={onWindowChange}
        onCooldownChange={onCooldownChange}
        onRetentionChange={onRetentionChange}
        onMaxAlertsChange={onMaxAlertsChange}
        onPollChange={onPollChange}
        onNotificationsToggle={onNotificationsToggle}
        onNotificationSoundToggle={onNotificationSoundToggle}
        onQuietHoursToggle={onQuietHoursToggle}
        onQuietStartChange={onQuietStartChange}
        onQuietEndChange={onQuietEndChange}
        onWebSocketToggle={onWebSocketToggle}
        onBackgroundToggle={onBackgroundToggle}
        onTrackAllSymbolsToggle={onTrackAllSymbolsToggle}
        onThemeModeChange={onThemeModeChange}
        onRuleChange={onRuleChange}
        onApply={onApply}
      />
    </ScrollView>
  );
}
