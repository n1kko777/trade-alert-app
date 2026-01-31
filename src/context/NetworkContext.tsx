/**
 * Network Context Provider
 * Manages network connectivity state and provides offline detection
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// =============================================================================
// Types
// =============================================================================

export interface NetworkState {
  /** Whether the device has network connectivity */
  isConnected: boolean;
  /** Whether internet is reachable (can be false even when connected to WiFi) */
  isInternetReachable: boolean | null;
  /** Timestamp of last successful internet connection */
  lastOnlineAt: Date | null;
  /** Whether we're currently checking connectivity */
  isChecking: boolean;
  /** Network type (wifi, cellular, etc.) */
  networkType: string | null;
}

export interface NetworkContextValue extends NetworkState {
  /** Manually refresh network status */
  refreshNetworkStatus: () => Promise<void>;
  /** Check if we were recently online (within the specified ms) */
  wasRecentlyOnline: (withinMs?: number) => boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface NetworkProviderProps {
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [networkType, setNetworkType] = useState<string | null>(null);

  // Track previous state to detect transitions
  const prevStateRef = useRef<{ isConnected: boolean; isInternetReachable: boolean | null }>({
    isConnected: true,
    isInternetReachable: null,
  });

  // Handle network state updates
  const handleNetworkStateChange = useCallback((state: NetInfoState) => {
    const wasOnline = prevStateRef.current.isConnected &&
                      prevStateRef.current.isInternetReachable !== false;
    const isNowOnline = state.isConnected && state.isInternetReachable !== false;

    // Update state
    setIsConnected(state.isConnected ?? false);
    setIsInternetReachable(state.isInternetReachable);
    setNetworkType(state.type);
    setIsChecking(false);

    // Update last online timestamp
    if (isNowOnline) {
      setLastOnlineAt(new Date());
    } else if (wasOnline && !isNowOnline) {
      // Just went offline, record the last online time
      setLastOnlineAt(new Date());
    }

    // Update previous state ref
    prevStateRef.current = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
    };

    // Log network changes for debugging
    if (__DEV__) {
      console.log('[Network] State changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    }
  }, []);

  // Subscribe to network state changes
  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then(handleNetworkStateChange);

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener(handleNetworkStateChange);

    return () => {
      unsubscribe();
    };
  }, [handleNetworkStateChange]);

  // Manual refresh function
  const refreshNetworkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      handleNetworkStateChange(state);
    } catch (error) {
      console.error('[Network] Failed to refresh status:', error);
      setIsChecking(false);
    }
  }, [handleNetworkStateChange]);

  // Check if we were recently online
  const wasRecentlyOnline = useCallback((withinMs: number = 30000) => {
    if (!lastOnlineAt) return false;
    const now = new Date();
    return now.getTime() - lastOnlineAt.getTime() < withinMs;
  }, [lastOnlineAt]);

  // Build context value
  const value = useMemo<NetworkContextValue>(
    () => ({
      isConnected,
      isInternetReachable,
      lastOnlineAt,
      isChecking,
      networkType,
      refreshNetworkStatus,
      wasRecentlyOnline,
    }),
    [
      isConnected,
      isInternetReachable,
      lastOnlineAt,
      isChecking,
      networkType,
      refreshNetworkStatus,
      wasRecentlyOnline,
    ]
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access network connectivity state
 * Must be used within NetworkProvider
 */
export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

/**
 * Hook to check if the app is currently offline
 * Convenience hook that returns a simple boolean
 */
export const useIsOffline = (): boolean => {
  const { isConnected, isInternetReachable } = useNetwork();
  // Consider offline if not connected OR if explicitly not reachable
  return !isConnected || isInternetReachable === false;
};

export default NetworkContext;
