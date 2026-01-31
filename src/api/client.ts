/**
 * API Client
 * Axios instance with interceptors for authentication and error handling
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { API_BASE_URL, API_TIMEOUT, ENDPOINTS } from './config';
import {
  ApiError,
  ApiErrorResponse,
  TokenPair,
  RefreshResponse,
} from './types';

// =============================================================================
// Token Storage Placeholders
// These will be replaced with secure storage in Task #39
// =============================================================================

let accessToken: string | null = null;
let refreshToken: string | null = null;

/**
 * Get the current access token
 * TODO: Replace with secure storage in Task #39
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Get the current refresh token
 * TODO: Replace with secure storage in Task #39
 */
export function getRefreshToken(): string | null {
  return refreshToken;
}

/**
 * Store tokens
 * TODO: Replace with secure storage in Task #39
 */
export function setTokens(tokens: TokenPair | null): void {
  if (tokens) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  } else {
    accessToken = null;
    refreshToken = null;
  }
}

/**
 * Clear all tokens (logout)
 */
export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
}

// =============================================================================
// Refresh Token Logic
// =============================================================================

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false;

/**
 * Queue of requests waiting for token refresh
 */
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Process the queue of failed requests after token refresh
 */
function processQueue(error: Error | null, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<string> {
  const currentRefreshToken = getRefreshToken();

  if (!currentRefreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // Make refresh request directly with axios to avoid interceptors
    const response = await axios.post<RefreshResponse>(
      `${API_BASE_URL}${ENDPOINTS.auth.refresh}`,
      { refreshToken: currentRefreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT,
      }
    );

    const { tokens } = response.data;
    setTokens(tokens);

    return tokens.accessToken;
  } catch (error) {
    // Clear tokens on refresh failure
    clearTokens();
    throw error;
  }
}

// =============================================================================
// Error Transformation
// =============================================================================

/**
 * Transform axios errors into a consistent ApiError format
 */
function transformError(error: AxiosError<ApiErrorResponse>): ApiError {
  // Network error (no response)
  if (!error.response) {
    return {
      message: error.message || 'Network error. Please check your connection.',
      statusCode: 0,
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      isAuthError: false,
    };
  }

  const { status, data } = error.response;

  // Auth errors (401, 403)
  const isAuthError = status === 401 || status === 403;

  // Extract error message from response
  let message = 'An unexpected error occurred';
  if (data?.message) {
    message = data.message;
  } else if (data?.error) {
    message = data.error;
  } else if (typeof data === 'string') {
    message = data;
  }

  return {
    message,
    statusCode: status,
    code: data?.error,
    details: data?.details,
    isNetworkError: false,
    isAuthError,
  };
}

// =============================================================================
// Axios Instance
// =============================================================================

/**
 * Create the axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// =============================================================================
// Request Interceptor
// =============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add Authorization header if access token exists
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// =============================================================================
// Response Interceptor
// =============================================================================

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return successful responses as-is
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check if this is a 401 error and we haven't already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // Skip refresh for auth endpoints (login, register, refresh itself)
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh');

      if (isAuthEndpoint) {
        return Promise.reject(transformError(error));
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: Error) => {
              reject(err);
            },
          });
        });
      }

      // Mark as refreshing and retry
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);

        // Update the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);

        // Transform and reject with the original 401 error
        return Promise.reject(transformError(error));
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors, transform and reject
    return Promise.reject(transformError(error));
  }
);

// =============================================================================
// Exports
// =============================================================================

export default apiClient;

/**
 * Named export for explicit imports
 */
export { apiClient };

/**
 * Helper to check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Logout callback type
 */
export type LogoutCallback = () => void;

/**
 * Logout callback to be called when token refresh fails
 * Set this from your auth context to handle logout properly
 */
let onLogoutCallback: LogoutCallback | null = null;

/**
 * Set the logout callback
 * This should be called from your AuthContext to handle forced logouts
 */
export function setLogoutCallback(callback: LogoutCallback | null): void {
  onLogoutCallback = callback;
}

/**
 * Trigger logout (clears tokens and calls callback)
 */
export function triggerLogout(): void {
  clearTokens();
  if (onLogoutCallback) {
    onLogoutCallback();
  }
}
