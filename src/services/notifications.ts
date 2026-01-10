import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const ensureAndroidChannel = async (soundEnabled: boolean) => {
  if (Platform.OS !== 'android') return undefined;
  const channelId = soundEnabled ? 'alerts' : 'alerts-silent';
  await Notifications.setNotificationChannelAsync(channelId, {
    name: soundEnabled ? 'Alert notifications' : 'Silent alerts',
    importance: soundEnabled
      ? Notifications.AndroidImportance.HIGH
      : Notifications.AndroidImportance.DEFAULT,
    enableVibrate: soundEnabled,
    vibrationPattern: soundEnabled ? [0, 250, 250, 250] : undefined,
    sound: soundEnabled ? 'default' : null,
  });
  return channelId;
};
