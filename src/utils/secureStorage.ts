/**
 * Secure Storage Utility
 * Implements secure token storage using expo-secure-store
 * - Refresh tokens are stored encrypted in SecureStore
 * - Access tokens are kept in memory only (never persisted)
 */

import * as SecureStore from 'expo-secure-store';

// =============================================================================
// Constants
// =============================================================================

/**
 * Keys used for secure storage
 */
export const SECURE_STORE_KEYS = {
  REFRESH_TOKEN: 'tradepulse_refresh_token',
} as const;

// =============================================================================
// In-Memory Token Storage
// =============================================================================

/**
 * Access token stored in memory only - never persisted to disk
 * This is cleared when the app is closed or the process terminates
 */
let accessToken: string | null = null;

// =============================================================================
// Token Management Functions
// =============================================================================

/**
 * Save both access and refresh tokens
 * - Access token is stored in memory only
 * - Refresh token is stored in SecureStore (encrypted)
 *
 * @param tokens - Object containing accessToken and refreshToken
 */
export async function saveTokens(
  tokens: { accessToken: string; refreshToken: string }
): Promise<void> {
  // Store access token in memory only (never persisted)
  accessToken = tokens.accessToken;

  // Store refresh token securely using SecureStore
  await SecureStore.setItemAsync(
    SECURE_STORE_KEYS.REFRESH_TOKEN,
    tokens.refreshToken
  );
}

/**
 * Get the current access token from memory
 * Returns null if not set or if app was restarted
 *
 * @returns The access token or null
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Get the refresh token from SecureStore
 *
 * @returns The refresh token or null if not stored
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Failed to get refresh token from SecureStore:', error);
    return null;
  }
}

/**
 * Clear all tokens (both memory and SecureStore)
 * Used during logout
 */
export async function clearTokens(): Promise<void> {
  // Clear in-memory access token
  accessToken = null;

  // Clear refresh token from SecureStore
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Failed to clear refresh token from SecureStore:', error);
  }
}

/**
 * Check if a refresh token exists in SecureStore
 * Used to determine if user might be authenticated on app startup
 *
 * @returns true if a refresh token is stored
 */
export async function hasStoredTokens(): Promise<boolean> {
  try {
    const refreshToken = await SecureStore.getItemAsync(
      SECURE_STORE_KEYS.REFRESH_TOKEN
    );
    return refreshToken !== null;
  } catch (error) {
    console.error('Failed to check for stored tokens:', error);
    return false;
  }
}

/**
 * Set the access token in memory
 * Used internally when refreshing tokens
 *
 * @param token - The new access token
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}
