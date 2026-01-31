/**
 * Auth API Module
 * Functions for authentication operations
 */

import apiClient from './client';
import { ENDPOINTS } from './config';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshRequest,
  RefreshResponse,
  TwoFASetupResponse,
  ApiUser,
} from './types';

/**
 * Login with email and password
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    ENDPOINTS.auth.login,
    credentials
  );
  return response.data;
}

/**
 * Register a new user
 */
export async function register(credentials: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>(
    ENDPOINTS.auth.register,
    credentials
  );
  return response.data;
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  await apiClient.post(ENDPOINTS.auth.logout);
}

/**
 * Refresh access token
 */
export async function refreshTokens(request: RefreshRequest): Promise<RefreshResponse> {
  const response = await apiClient.post<RefreshResponse>(
    ENDPOINTS.auth.refresh,
    request
  );
  return response.data;
}

/**
 * Setup 2FA for the current user
 */
export async function setup2FA(): Promise<TwoFASetupResponse> {
  const response = await apiClient.post<TwoFASetupResponse>(
    ENDPOINTS.auth.setup2FA
  );
  return response.data;
}

/**
 * Verify 2FA code during login
 */
export async function verify2FA(
  userId: string,
  totpCode: string
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    ENDPOINTS.auth.verify2FA,
    { userId, totpCode }
  );
  return response.data;
}

/**
 * Disable 2FA for the current user
 */
export async function disable2FA(totpCode: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    ENDPOINTS.auth.disable2FA,
    { totpCode }
  );
  return response.data;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<ApiUser> {
  const response = await apiClient.get<{ user: ApiUser }>(ENDPOINTS.user.me);
  return response.data.user;
}

// Export all functions as named exports
export const authApi = {
  login,
  register,
  logout,
  refreshTokens,
  setup2FA,
  verify2FA,
  disable2FA,
  getCurrentUser,
};

export default authApi;
