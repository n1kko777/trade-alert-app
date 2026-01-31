/**
 * Token Refresh Utility
 * Handles token refresh logic on app startup
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, ENDPOINTS } from '../api/config';
import { RefreshResponse } from '../api/types';
import {
  hasStoredTokens,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from './secureStorage';

/**
 * Attempt to refresh tokens on app startup
 * This is called when the app launches to restore the user's authenticated session
 *
 * Flow:
 * 1. Check if a refresh token exists in SecureStore
 * 2. If yes, call the /auth/refresh endpoint
 * 3. If successful, store new tokens and return true
 * 4. If failed, clear tokens and return false
 *
 * @returns true if user is authenticated, false otherwise
 */
export async function refreshTokensOnStartup(): Promise<boolean> {
  try {
    // Check if we have a stored refresh token
    const hasTokens = await hasStoredTokens();
    if (!hasTokens) {
      return false;
    }

    // Get the refresh token
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    // Attempt to refresh the tokens
    const response = await axios.post<RefreshResponse>(
      `${API_BASE_URL}${ENDPOINTS.auth.refresh}`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT,
      }
    );

    // Store the new tokens
    const { tokens } = response.data;
    await saveTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    return true;
  } catch (error) {
    // Log the error but don't expose details
    if (axios.isAxiosError(error)) {
      console.log(
        'Token refresh failed:',
        error.response?.status || 'Network error'
      );
    } else {
      console.log('Token refresh failed:', error);
    }

    // Clear any stored tokens since they're no longer valid
    await clearTokens();
    return false;
  }
}
