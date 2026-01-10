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
  notificationStatus: 'unknown' | 'granted' | 'denied';
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
  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <View style={styles.panel}>
      <View style={styles.field}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.fieldLabel}>Track all Bybit spot coins</Text>
            <Text style={styles.helperText}>
              Pulls the full spot ticker list on each poll and computes alerts for every symbol.
            </Text>
          </View>
          <Switch
            value={trackAllSymbolsInput}
            onValueChange={onTrackAllSymbolsToggle}
            trackColor={switchTrackColor}
            thumbColor={switchThumbColor}
          />
        </View>
        {trackAllSymbolsInput ? (
          <Text style={styles.helperText}>
            Symbol list and per-coin overrides are disabled in this mode.
          </Text>
        ) : null}
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Theme</Text>
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
        <Text style={styles.helperText}>System follows your device appearance.</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Symbols (comma separated)</Text>
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
              <Text style={styles.fieldLabel}>Threshold %</Text>
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
              <Text style={styles.fieldLabel}>Window (min)</Text>
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
            <Text style={styles.fieldLabel}>Cooldown (min)</Text>
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
              <Text style={styles.fieldLabel}>Alert retention (days)</Text>
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
              <Text style={styles.fieldLabel}>Max stored alerts</Text>
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
            <Text style={styles.fieldLabel}>Polling interval (sec)</Text>
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
          <Text style={styles.fieldLabel}>Symbol overrides</Text>
          <Text style={styles.helperText}>Leave fields empty to use global alert settings.</Text>
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
                <Text style={styles.fieldLabel}>Background monitoring</Text>
                <Text style={styles.helperText}>
                  Uses OS background tasks. Frequency is limited by iOS/Android.
                </Text>
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
              <Text style={styles.fieldLabel}>Realtime stream (WebSocket)</Text>
              <Text style={styles.helperText}>
                Faster updates with lower delay. Falls back to polling if the stream drops.
              </Text>
            </View>
            <Switch
              value={trackAllSymbolsInput ? false : useWebSocketInput}
              onValueChange={onWebSocketToggle}
              trackColor={switchTrackColor}
              thumbColor={switchThumbColor}
              disabled={trackAllSymbolsInput}
            />
          </View>
          {trackAllSymbolsInput ? (
            <Text style={styles.helperText}>Realtime streams are disabled in all-coins mode.</Text>
          ) : null}
        </View>
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.fieldLabel}>Alert notifications</Text>
                <Text style={styles.helperText}>Local alert when threshold is reached.</Text>
              </View>
              <Switch
                value={notificationsInput}
                onValueChange={onNotificationsToggle}
                trackColor={switchTrackColor}
                thumbColor={switchThumbColor}
              />
            </View>
            {notificationsInput && notificationStatus === 'denied' ? (
              <Text style={styles.helperWarn}>Permission denied. Enable in iOS Settings.</Text>
            ) : null}
          </View>
          {notificationsInput ? (
            <View style={styles.field}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.fieldLabel}>Notification sound</Text>
                  <Text style={styles.helperText}>
                    Disable to keep alerts silent while still logging them.
                  </Text>
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
                <Text style={styles.fieldLabel}>Quiet hours</Text>
                <Text style={styles.helperText}>
                  Suppress notifications during the selected window.
                </Text>
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
    </View>
  );
}
