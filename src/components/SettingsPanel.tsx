import React from 'react';
import { Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { ThemeMode } from '../theme';
import { useTheme } from '../theme-context';
import { Settings, SymbolRuleInputs } from '../types';

type SettingsPanelProps = {
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

export default function SettingsPanel({
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
}: SettingsPanelProps) {
  const { theme, styles } = useTheme();
  const placeholderColor = theme.colors.textPlaceholder;
  const switchTrackColor = { false: theme.colors.switchTrackOff, true: theme.colors.accent };
  const switchThumbColor = theme.colors.switchThumb;
  const [openInfo, setOpenInfo] = React.useState<Record<string, boolean>>({});
  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
  const toggleInfo = (key: string) =>
    setOpenInfo((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  const renderFieldLabel = (
    label: string,
    key: string,
    description: string,
    align: 'left' | 'right' = 'left'
  ) => (
    <View style={styles.labelRow}>
      <Text style={[styles.fieldLabel, styles.fieldLabelInline]}>{label}</Text>
      <View style={styles.infoIconWrapper}>
        <TouchableOpacity
          onPress={() => toggleInfo(key)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${label} info`}
        >
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>
        </TouchableOpacity>
        {openInfo[key] ? (
          <View
            style={[
              styles.tooltipBubble,
              align === 'right' ? styles.tooltipBubbleRight : styles.tooltipBubbleLeft,
            ]}
          >
            <Text style={styles.tooltipText}>{description}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.panel}>
      <View style={styles.field}>
          <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            {renderFieldLabel(
              'Track all futures-tradable symbols',
              'trackAll',
              'Pulls the full spot ticker list on each poll and keeps symbols with Bybit futures. Symbol list and per-coin overrides are disabled in this mode.'
            )}
          </View>
          <Switch
            value={trackAllSymbolsInput}
            onValueChange={onTrackAllSymbolsToggle}
            trackColor={switchTrackColor}
            thumbColor={switchThumbColor}
          />
        </View>
      </View>
      <View style={styles.field}>
        {renderFieldLabel('Theme', 'theme', 'Use system, light, or dark appearance.')}
        <View style={styles.themeToggle}>
          {themeOptions.map((option) => {
            const isActive = themeModeInput === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.themeOption, isActive ? styles.themeOptionActive : null]}
                onPress={() => onThemeModeChange(option.value)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    isActive ? styles.themeOptionTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.field}>
        {renderFieldLabel(
          'Symbols (comma separated)',
          'symbols',
          'Comma-separated list of symbols to monitor. Only symbols with active Bybit futures markets are tracked.'
        )}
        <TextInput
          value={symbolInput}
          onChangeText={onSymbolChange}
          style={styles.input}
          placeholder="BTCUSDT, ETHUSDT, SOLUSDT"
          placeholderTextColor={placeholderColor}
          autoCapitalize="characters"
          editable={!trackAllSymbolsInput}
        />
      </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldInline}>
              {renderFieldLabel(
                'Threshold %',
                'threshold',
                'Triggers an alert when price change meets or exceeds this percent.'
              )}
              <TextInput
                value={thresholdInput}
                onChangeText={onThresholdChange}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="7"
                placeholderTextColor={placeholderColor}
              />
            </View>
            <View style={styles.fieldInline}>
              {renderFieldLabel(
                'Window (min)',
                'window',
                'Time window used to measure the percent change.',
                'right'
              )}
              <TextInput
                value={windowInput}
                onChangeText={onWindowChange}
                style={styles.input}
                keyboardType="number-pad"
                placeholder="8"
                placeholderTextColor={placeholderColor}
              />
            </View>
          </View>
          <View style={styles.field}>
            {renderFieldLabel(
              'Cooldown (min)',
              'cooldown',
              'Minimum minutes between alerts for the same symbol.'
            )}
            <TextInput
              value={cooldownInput}
              onChangeText={onCooldownChange}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="4"
              placeholderTextColor={placeholderColor}
            />
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldInline}>
              {renderFieldLabel(
                'Alert retention (days)',
                'retention',
                'How long to keep alert history before pruning.'
              )}
              <TextInput
                value={retentionInput}
                onChangeText={onRetentionChange}
                style={styles.input}
                keyboardType="number-pad"
                placeholder="7"
                placeholderTextColor={placeholderColor}
              />
            </View>
            <View style={styles.fieldInline}>
              {renderFieldLabel(
                'Max stored alerts',
                'maxAlerts',
                'Hard cap on how many alerts are kept.',
                'right'
              )}
              <TextInput
                value={maxAlertsInput}
                onChangeText={onMaxAlertsChange}
                style={styles.input}
                keyboardType="number-pad"
                placeholder="120"
                placeholderTextColor={placeholderColor}
              />
            </View>
          </View>
          <View style={styles.field}>
            {renderFieldLabel(
              'Polling interval (sec)',
              'poll',
              'How often prices are fetched when polling is used.'
            )}
            <TextInput
              value={pollInput}
              onChangeText={onPollChange}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={placeholderColor}
            />
          </View>
      {!trackAllSymbolsInput ? (
        <View style={styles.field}>
          {renderFieldLabel(
            'Symbol overrides',
            'overrides',
            'Override threshold, window, and cooldown per symbol. Leave empty to use global settings.'
          )}
          <View style={styles.overrideList}>
            {settings.symbols.map((symbol) => (
              <View key={symbol} style={styles.overrideRow}>
                <View style={styles.overrideSymbol}>
                  <Text style={styles.overrideSymbolText}>{symbol}</Text>
                </View>
                <TextInput
                  value={symbolRuleInputs[symbol]?.threshold ?? ''}
                  onChangeText={(value) => onRuleChange(symbol, 'threshold', value)}
                  style={[styles.input, styles.overrideInput]}
                  keyboardType="decimal-pad"
                  placeholder={`% (${settings.thresholdPct})`}
                  placeholderTextColor={placeholderColor}
                />
                <TextInput
                  value={symbolRuleInputs[symbol]?.window ?? ''}
                  onChangeText={(value) => onRuleChange(symbol, 'window', value)}
                  style={[styles.input, styles.overrideInput]}
                  keyboardType="number-pad"
                  placeholder={`m (${settings.windowMinutes})`}
                  placeholderTextColor={placeholderColor}
                />
                <TextInput
                  value={symbolRuleInputs[symbol]?.cooldown ?? ''}
                  onChangeText={(value) => onRuleChange(symbol, 'cooldown', value)}
                  style={[styles.input, styles.overrideInput]}
                  keyboardType="number-pad"
                  placeholder={`cd (${settings.cooldownMinutes})`}
                  placeholderTextColor={placeholderColor}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                {renderFieldLabel(
                  'Background monitoring',
                  'background',
                  'Uses OS background tasks. Frequency is limited by iOS/Android.'
                )}
              </View>
              <Switch
                value={backgroundInput}
                onValueChange={onBackgroundToggle}
                trackColor={switchTrackColor}
                thumbColor={switchThumbColor}
              />
            </View>
            {backgroundInput && backgroundStatus === 'unavailable' ? (
              <Text style={styles.helperWarn}>Background fetch is disabled by the system.</Text>
            ) : null}
          </View>
        <View style={styles.field}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              {renderFieldLabel(
                'Realtime stream (WebSocket)',
                'websocket',
                'Faster updates with lower delay. Falls back to polling if the stream drops. Realtime streams are disabled in all-coins mode.'
              )}
            </View>
            <Switch
              value={trackAllSymbolsInput ? false : useWebSocketInput}
              onValueChange={onWebSocketToggle}
              trackColor={switchTrackColor}
              thumbColor={switchThumbColor}
              disabled={trackAllSymbolsInput}
            />
          </View>
        </View>
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                {renderFieldLabel(
                  'Alert notifications',
                  'notifications',
                  'Sends a local notification when an alert is triggered.'
                )}
              </View>
              <Switch
                value={notificationsInput}
                onValueChange={onNotificationsToggle}
                trackColor={switchTrackColor}
                thumbColor={switchThumbColor}
              />
            </View>
            {notificationsInput && isExpoGo ? (
              <Text style={styles.helperWarn}>
                Expo Go on Android doesn't support push notifications on SDK 53+. Use a dev build
                to enable alerts.
              </Text>
            ) : null}
            {notificationsInput && notificationStatus === 'denied' ? (
              <Text style={styles.helperWarn}>Permission denied. Enable in iOS Settings.</Text>
            ) : null}
          </View>
          {notificationsInput ? (
            <View style={styles.field}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  {renderFieldLabel(
                    'Notification sound',
                    'sound',
                    'Disable to keep alerts silent while still logging them.'
                  )}
                </View>
                <Switch
                  value={notificationSoundInput}
                  onValueChange={onNotificationSoundToggle}
                  trackColor={switchTrackColor}
                  thumbColor={switchThumbColor}
                />
              </View>
            </View>
          ) : null}
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                {renderFieldLabel(
                  'Quiet hours',
                  'quietHours',
                  'Suppress notifications between the selected times.'
                )}
              </View>
              <Switch
                value={quietHoursEnabledInput}
                onValueChange={onQuietHoursToggle}
                trackColor={switchTrackColor}
                thumbColor={switchThumbColor}
              />
            </View>
            {quietHoursEnabledInput ? (
              <View style={styles.timeRow}>
                <TextInput
                  value={quietStartInput}
                  onChangeText={onQuietStartChange}
                  style={[styles.input, styles.timeInput]}
                  placeholder="22:00"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.timeSeparator}>to</Text>
                <TextInput
                  value={quietEndInput}
                  onChangeText={onQuietEndChange}
                  style={[styles.input, styles.timeInput]}
                  placeholder="07:00"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={onApply}>
            <Text style={styles.saveButtonText}>Apply settings</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Data source: Bybit public market tickers. Not affiliated with Bybit. Not financial
            advice.
          </Text>
    </View>
  );
}
