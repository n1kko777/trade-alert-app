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
    { value: 'system', label: 'Система' },
    { value: 'light', label: 'Светлая' },
    { value: 'dark', label: 'Тёмная' },
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
              'Отслеживать все фьючерсные символы',
              'trackAll',
              'Получает полный список спотовых тикеров и оставляет только символы с фьючерсами Bybit. Список символов и переопределения отключены в этом режиме.'
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
        {renderFieldLabel('Тема', 'theme', 'Используйте системную, светлую или тёмную тему.')}
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
          'Символы (через запятую)',
          'symbols',
          'Список символов для мониторинга через запятую. Отслеживаются только символы с активными фьючерсными рынками Bybit.'
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
                'Порог %',
                'threshold',
                'Срабатывает алерт при изменении цены на указанный процент или более.'
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
                'Окно (мин)',
                'window',
                'Временное окно для измерения процентного изменения.',
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
              'Кулдаун (мин)',
              'cooldown',
              'Минимальное время между алертами для одного символа.'
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
                'Хранение алертов (дней)',
                'retention',
                'Как долго хранить историю алертов до очистки.'
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
                'Макс. алертов',
                'maxAlerts',
                'Жёсткий лимит на количество хранимых алертов.',
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
              'Интервал опроса (сек)',
              'poll',
              'Как часто получать цены при использовании опроса.'
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
            'Переопределения символов',
            'overrides',
            'Переопределите порог, окно и кулдаун для каждого символа. Оставьте пустым для глобальных настроек.'
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
                  'Фоновый мониторинг',
                  'background',
                  'Использует фоновые задачи ОС. Частота ограничена iOS/Android.'
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
              <Text style={styles.helperWarn}>Фоновое обновление отключено системой.</Text>
            ) : null}
          </View>
        <View style={styles.field}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              {renderFieldLabel(
                'Реалтайм поток (WebSocket)',
                'websocket',
                'Быстрые обновления с низкой задержкой. Переключается на опрос при разрыве. Реалтайм потоки отключены в режиме всех монет.'
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
                  'Уведомления об алертах',
                  'notifications',
                  'Отправляет локальное уведомление при срабатывании алерта.'
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
                Expo Go на Android не поддерживает push-уведомления на SDK 53+. Используйте dev build
                для включения алертов.
              </Text>
            ) : null}
            {notificationsInput && notificationStatus === 'denied' ? (
              <Text style={styles.helperWarn}>Разрешение отклонено. Включите в Настройках iOS.</Text>
            ) : null}
          </View>
          {notificationsInput ? (
            <View style={styles.field}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  {renderFieldLabel(
                    'Звук уведомлений',
                    'sound',
                    'Отключите для тихих алертов с записью в лог.'
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
                  'Тихие часы',
                  'quietHours',
                  'Подавлять уведомления в выбранный период времени.'
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
                <Text style={styles.timeSeparator}>до</Text>
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
            <Text style={styles.saveButtonText}>Применить настройки</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Источник данных: публичные тикеры Bybit. Не связано с Bybit. Не финансовая
            консультация.
          </Text>
    </View>
  );
}
