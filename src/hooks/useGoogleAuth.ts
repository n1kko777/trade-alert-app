import { useCallback, useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
// You need to create these in Google Cloud Console
const GOOGLE_CLIENT_IDS = {
  // Web client ID (used for Expo Go and web)
  web: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  // Android client ID
  android: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  // iOS client ID
  ios: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
};

interface UseGoogleAuthResult {
  signIn: () => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export function useGoogleAuth(): UseGoogleAuthResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
  });

  const [pendingResolve, setPendingResolve] = useState<((token: string | null) => void) | null>(null);

  useEffect(() => {
    if (response?.type === 'success' && pendingResolve) {
      const idToken = response.params.id_token;
      pendingResolve(idToken);
      setPendingResolve(null);
      setIsLoading(false);
    } else if (response?.type === 'error' && pendingResolve) {
      setError(response.error?.message || 'Google sign-in failed');
      pendingResolve(null);
      setPendingResolve(null);
      setIsLoading(false);
    } else if (response?.type === 'dismiss' && pendingResolve) {
      pendingResolve(null);
      setPendingResolve(null);
      setIsLoading(false);
    }
  }, [response, pendingResolve]);

  const signIn = useCallback(async (): Promise<string | null> => {
    if (!request) {
      setError('Google auth not ready');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      setPendingResolve(() => resolve);
      promptAsync();
    });
  }, [request, promptAsync]);

  return {
    signIn,
    isLoading,
    error,
  };
}

export default useGoogleAuth;
