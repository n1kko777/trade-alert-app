/**
 * OfflineSyncManager Component
 * Handles automatic syncing of queued actions when coming back online
 * This component should be placed inside the NetworkProvider
 */

import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNetwork } from '../context/NetworkContext';
import { offlineQueue } from '../utils/offlineQueue';

interface OfflineSyncManagerProps {
  /** Whether to show alerts on sync completion */
  showAlerts?: boolean;
  /** Children to render */
  children: React.ReactNode;
}

export const OfflineSyncManager: React.FC<OfflineSyncManagerProps> = ({
  showAlerts = false,
  children,
}) => {
  const { isConnected, isInternetReachable } = useNetwork();
  const wasOfflineRef = useRef(false);
  const syncInProgressRef = useRef(false);

  // Determine if we're truly online
  const isOnline = isConnected && isInternetReachable !== false;

  // Process queue when coming back online
  useEffect(() => {
    const processQueueIfNeeded = async () => {
      if (syncInProgressRef.current) return;

      await offlineQueue.initialize();
      const status = offlineQueue.getStatus();

      if (status.pending > 0) {
        syncInProgressRef.current = true;

        if (__DEV__) {
          console.log('[OfflineSyncManager] Processing queue after coming back online...');
        }

        try {
          const result = await offlineQueue.processQueue();

          if (__DEV__) {
            console.log('[OfflineSyncManager] Queue processed:', result);
          }

          if (showAlerts && result.processed > 0) {
            Alert.alert(
              'Sync Complete',
              `${result.processed} pending action${result.processed > 1 ? 's' : ''} synced successfully.`,
            );
          }

          if (showAlerts && result.failed > 0) {
            Alert.alert(
              'Sync Issues',
              `${result.failed} action${result.failed > 1 ? 's' : ''} failed to sync. Please check and try again.`,
            );
          }
        } catch (error) {
          console.error('[OfflineSyncManager] Failed to process queue:', error);

          if (showAlerts) {
            Alert.alert(
              'Sync Failed',
              'Some pending actions could not be synced. Please try again later.',
            );
          }
        } finally {
          syncInProgressRef.current = false;
        }
      }
    };

    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      // We just came back online
      wasOfflineRef.current = false;
      processQueueIfNeeded();
    }
  }, [isOnline, showAlerts]);

  // Initialize queue on mount
  useEffect(() => {
    offlineQueue.initialize();
  }, []);

  return <>{children}</>;
};

export default OfflineSyncManager;
