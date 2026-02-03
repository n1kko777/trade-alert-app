import { useCallback, useEffect, useState } from 'react';
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '696544902989-m8nor66hssp5g12uco1tifp8b2c2gcbe.apps.googleusercontent.com',
  offlineAccess: true,
});

interface UseGoogleAuthResult {
  signIn: () => Promise<string | null>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useGoogleAuth(): UseGoogleAuthResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        return idToken;
      } else {
        setError('Sign in was cancelled');
        return null;
      }
    } catch (err) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled the sign-in flow
            break;
          case statusCodes.IN_PROGRESS:
            setError('Sign in is already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Google Play Services not available');
            break;
          default:
            setError(err.message || 'Unknown error occurred');
        }
      } else {
        setError('An unexpected error occurred');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }, []);

  return {
    signIn,
    signOut,
    isLoading,
    error,
  };
}

export default useGoogleAuth;
