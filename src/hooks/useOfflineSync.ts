/**
 * useOfflineSync Hook
 * Automatically processes the offline queue when network connectivity is restored
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { offlineQueue, QueueStatus } from '../utils/offlineQueue';

interface OfflineSyncState {
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Number of pending actions in queue */
  pendingCount: number;
  /** Number of failed actions */
  failedCount: number;
  /** Last sync error message */
  lastError: string | null;
  /** Manually trigger sync */
  triggerSync: () => Promise<void>;
  /** Clear all failed actions */
  clearFailed: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const { isConnected, isInternetReachable } = useNetwork();
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    failed: 0,
    processing: false,
    lastProcessedAt: null,
    lastError: null,
  });
  const wasOfflineRef = useRef(false);
  const syncInProgressRef = useRef(false);

  // Determine if we're truly online
  const isOnline = isConnected && isInternetReachable !== false;

  // Subscribe to queue status changes
  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe(setQueueStatus);
    return unsubscribe;
  }, []);

  // Process queue when coming back online
  const processQueueIfNeeded = useCallback(async () => {
    // Only process if we just came back online and have pending actions
    if (syncInProgressRef.current) return;

    const status = offlineQueue.getStatus();
    if (status.pending > 0) {
      syncInProgressRef.current = true;
      try {
        if (__DEV__) {
          console.log('[OfflineSync] Processing queue after coming back online...');
        }
        const result = await offlineQueue.processQueue();
        if (__DEV__) {
          console.log('[OfflineSync] Queue processed:', result);
        }
      } catch (error) {
        console.error('[OfflineSync] Failed to process queue:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    }
  }, []);

  // Watch for network state changes
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      // We just came back online
      wasOfflineRef.current = false;
      processQueueIfNeeded();
    }
  }, [isOnline, processQueueIfNeeded]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await offlineQueue.processQueue();
  }, [isOnline]);

  // Clear failed actions
  const clearFailed = useCallback(async () => {
    await offlineQueue.clearFailedActions();
  }, []);

  return {
    isSyncing: queueStatus.processing,
    pendingCount: queueStatus.pending,
    failedCount: queueStatus.failed,
    lastError: queueStatus.lastError,
    triggerSync,
    clearFailed,
  };
}

export default useOfflineSync;
