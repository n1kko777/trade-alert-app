/**
 * Offline Queue Utility
 * Queues actions when offline and processes them when back online
 * Uses "last write wins" conflict resolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AddAssetRequest,
  UpdateAssetRequest,
} from '../api/types';
import {
  addAsset,
  updateAsset,
  deleteAsset,
} from '../api/portfolio.api';

// =============================================================================
// Types
// =============================================================================

export type QueueActionType = 'ADD_ASSET' | 'UPDATE_ASSET' | 'DELETE_ASSET';

interface BaseQueueAction {
  id: string;
  type: QueueActionType;
  createdAt: number;
  retries: number;
  lastError?: string;
}

interface AddAssetAction extends BaseQueueAction {
  type: 'ADD_ASSET';
  payload: AddAssetRequest;
}

interface UpdateAssetAction extends BaseQueueAction {
  type: 'UPDATE_ASSET';
  payload: {
    assetId: string;
    updates: UpdateAssetRequest;
  };
}

interface DeleteAssetAction extends BaseQueueAction {
  type: 'DELETE_ASSET';
  payload: {
    assetId: string;
  };
}

export type QueueAction = AddAssetAction | UpdateAssetAction | DeleteAssetAction;

export interface QueueStatus {
  pending: number;
  failed: number;
  processing: boolean;
  lastProcessedAt: Date | null;
  lastError: string | null;
}

type QueueEventHandler = (status: QueueStatus) => void;

// =============================================================================
// Constants
// =============================================================================

const QUEUE_KEY = '@tradepulse_offline_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// =============================================================================
// Queue Manager Class
// =============================================================================

class OfflineQueueManager {
  private queue: QueueAction[] = [];
  private processing = false;
  private lastProcessedAt: Date | null = null;
  private lastError: string | null = null;
  private listeners: Set<QueueEventHandler> = new Set();
  private initialized = false;

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        if (__DEV__) {
          console.log(`[OfflineQueue] Loaded ${this.queue.length} queued actions`);
        }
      }
      this.initialized = true;
    } catch (error) {
      console.error('[OfflineQueue] Failed to initialize:', error);
      this.queue = [];
      this.initialized = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  subscribe(handler: QueueEventHandler): () => void {
    this.listeners.add(handler);
    // Send current status immediately
    handler(this.getStatus());
    return () => {
      this.listeners.delete(handler);
    };
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((handler) => handler(status));
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  getStatus(): QueueStatus {
    const failed = this.queue.filter((a) => a.retries >= MAX_RETRIES).length;
    return {
      pending: this.queue.length - failed,
      failed,
      processing: this.processing,
      lastProcessedAt: this.lastProcessedAt,
      lastError: this.lastError,
    };
  }

  getQueue(): QueueAction[] {
    return [...this.queue];
  }

  // ---------------------------------------------------------------------------
  // Queue Actions
  // ---------------------------------------------------------------------------

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async queueAddAsset(asset: AddAssetRequest): Promise<string> {
    await this.initialize();

    const action: AddAssetAction = {
      id: this.generateId(),
      type: 'ADD_ASSET',
      payload: asset,
      createdAt: Date.now(),
      retries: 0,
    };

    this.queue.push(action);
    await this.persistQueue();
    this.notifyListeners();

    if (__DEV__) {
      console.log(`[OfflineQueue] Queued ADD_ASSET for ${asset.symbol}`);
    }

    return action.id;
  }

  async queueUpdateAsset(assetId: string, updates: UpdateAssetRequest): Promise<string> {
    await this.initialize();

    // Last write wins: remove any existing updates for this asset
    this.queue = this.queue.filter(
      (a) => !(a.type === 'UPDATE_ASSET' && a.payload.assetId === assetId)
    );

    const action: UpdateAssetAction = {
      id: this.generateId(),
      type: 'UPDATE_ASSET',
      payload: { assetId, updates },
      createdAt: Date.now(),
      retries: 0,
    };

    this.queue.push(action);
    await this.persistQueue();
    this.notifyListeners();

    if (__DEV__) {
      console.log(`[OfflineQueue] Queued UPDATE_ASSET for ${assetId}`);
    }

    return action.id;
  }

  async queueDeleteAsset(assetId: string): Promise<string> {
    await this.initialize();

    // Last write wins: remove any pending add/update for this asset
    this.queue = this.queue.filter((a) => {
      if (a.type === 'UPDATE_ASSET' && a.payload.assetId === assetId) {
        return false;
      }
      // Note: We can't easily match ADD_ASSET since it doesn't have an ID yet
      return true;
    });

    const action: DeleteAssetAction = {
      id: this.generateId(),
      type: 'DELETE_ASSET',
      payload: { assetId },
      createdAt: Date.now(),
      retries: 0,
    };

    this.queue.push(action);
    await this.persistQueue();
    this.notifyListeners();

    if (__DEV__) {
      console.log(`[OfflineQueue] Queued DELETE_ASSET for ${assetId}`);
    }

    return action.id;
  }

  // ---------------------------------------------------------------------------
  // Remove Actions
  // ---------------------------------------------------------------------------

  async removeAction(actionId: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.queue.length;
    this.queue = this.queue.filter((a) => a.id !== actionId);

    if (this.queue.length !== initialLength) {
      await this.persistQueue();
      this.notifyListeners();
      return true;
    }

    return false;
  }

  async clearFailedActions(): Promise<number> {
    await this.initialize();

    const failed = this.queue.filter((a) => a.retries >= MAX_RETRIES);
    const count = failed.length;

    this.queue = this.queue.filter((a) => a.retries < MAX_RETRIES);
    await this.persistQueue();
    this.notifyListeners();

    return count;
  }

  async clearAllActions(): Promise<number> {
    await this.initialize();

    const count = this.queue.length;
    this.queue = [];
    await this.persistQueue();
    this.notifyListeners();

    return count;
  }

  // ---------------------------------------------------------------------------
  // Process Queue
  // ---------------------------------------------------------------------------

  async processQueue(): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    await this.initialize();

    if (this.processing) {
      return { processed: 0, failed: 0, errors: ['Queue already processing'] };
    }

    if (this.queue.length === 0) {
      return { processed: 0, failed: 0, errors: [] };
    }

    this.processing = true;
    this.notifyListeners();

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];
    const successfulIds: string[] = [];

    // Process actions in order (FIFO)
    for (const action of this.queue) {
      // Skip actions that have exceeded retries
      if (action.retries >= MAX_RETRIES) {
        failed++;
        continue;
      }

      try {
        await this.executeAction(action);
        successfulIds.push(action.id);
        processed++;

        if (__DEV__) {
          console.log(`[OfflineQueue] Processed ${action.type} (${action.id})`);
        }
      } catch (error) {
        action.retries++;
        action.lastError = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${action.type}: ${action.lastError}`);

        if (action.retries >= MAX_RETRIES) {
          failed++;
          this.lastError = action.lastError;
        }

        if (__DEV__) {
          console.error(
            `[OfflineQueue] Failed ${action.type} (attempt ${action.retries}):`,
            error
          );
        }

        // Add delay between retries
        if (action.retries < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    // Remove successfully processed actions
    this.queue = this.queue.filter((a) => !successfulIds.includes(a.id));
    await this.persistQueue();

    this.processing = false;
    this.lastProcessedAt = new Date();
    this.notifyListeners();

    if (__DEV__) {
      console.log(
        `[OfflineQueue] Processing complete: ${processed} processed, ${failed} failed, ${this.queue.length} remaining`
      );
    }

    return { processed, failed, errors };
  }

  private async executeAction(action: QueueAction): Promise<void> {
    switch (action.type) {
      case 'ADD_ASSET':
        await addAsset(action.payload);
        break;

      case 'UPDATE_ASSET':
        await updateAsset(action.payload.assetId, action.payload.updates);
        break;

      case 'DELETE_ASSET':
        await deleteAsset(action.payload.assetId);
        break;

      default:
        throw new Error(`Unknown action type: ${(action as QueueAction).type}`);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const offlineQueue = new OfflineQueueManager();

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if there are pending actions in the queue
 */
export async function hasPendingActions(): Promise<boolean> {
  await offlineQueue.initialize();
  const status = offlineQueue.getStatus();
  return status.pending > 0;
}

/**
 * Get the number of pending actions
 */
export async function getPendingCount(): Promise<number> {
  await offlineQueue.initialize();
  return offlineQueue.getStatus().pending;
}

/**
 * Subscribe to queue status changes
 */
export function subscribeToQueue(handler: QueueEventHandler): () => void {
  return offlineQueue.subscribe(handler);
}

export default offlineQueue;
