import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  SubscriptionTier,
  LoginCredentials,
  RegisterCredentials,
} from '../services/auth';
import { refreshTokensOnStartup } from '../utils/tokenRefresh';
import {
  clearTokens,
  setTokens,
  setLogoutCallback,
  initializeTokenCache,
} from '../api/client';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  verify2FA,
} from '../api/auth.api';
import type { ApiUser, LoginResponse } from '../api/types';

/**
 * User type for the context (mapped from ApiUser)
 */
interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  is2FAEnabled?: boolean;
}

/**
 * Auth state
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * 2FA state for handling 2FA flow
 */
interface TwoFAState {
  required: boolean;
  userId: string | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  upgradeSubscription: (tier: SubscriptionTier) => Promise<void>;
  isPro: () => boolean;
  isPremium: () => boolean;
  isVip: () => boolean;
  hasMinTier: (tier: SubscriptionTier) => boolean;
  // 2FA methods
  twoFAState: TwoFAState;
  submitTwoFACode: (code: string) => Promise<void>;
  cancelTwoFA: () => void;
}

const TIER_ORDER: SubscriptionTier[] = [
  SubscriptionTier.FREE,
  SubscriptionTier.PRO,
  SubscriptionTier.PREMIUM,
  SubscriptionTier.VIP,
];

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Map API user to local user format
 */
function mapApiUserToUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    subscriptionTier: apiUser.subscription as SubscriptionTier,
    createdAt: new Date(apiUser.createdAt),
    is2FAEnabled: apiUser.is2FAEnabled,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFAState, setTwoFAState] = useState<TwoFAState>({
    required: false,
    userId: null,
  });

  // Load stored user and refresh tokens on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize token cache from SecureStore
        await initializeTokenCache();

        // Try to refresh tokens from secure storage
        const isAuthenticated = await refreshTokensOnStartup();

        if (isAuthenticated) {
          // Fetch current user from API
          try {
            const apiUser = await getCurrentUser();
            setUser(mapApiUserToUser(apiUser));
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // Clear invalid session
            await clearTokens();
            setUser(null);
          }
        } else {
          // No valid tokens, user needs to login
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up logout callback for automatic logout on token refresh failure
  useEffect(() => {
    setLogoutCallback(() => {
      setUser(null);
      setTwoFAState({ required: false, userId: null });
    });

    return () => {
      setLogoutCallback(null);
    };
  }, []);

  const handleLoginResponse = useCallback(async (response: LoginResponse) => {
    if (response.requires2FA && response.userId) {
      // 2FA is required
      setTwoFAState({
        required: true,
        userId: response.userId,
      });
      return;
    }

    if (response.tokens && response.user) {
      // Store tokens
      await setTokens(response.tokens);
      // Set user
      setUser(mapApiUserToUser(response.user));
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await apiLogin({
        email: credentials.email,
        password: credentials.password,
      });
      await handleLoginResponse(response);
    } finally {
      setIsLoading(false);
    }
  }, [handleLoginResponse]);

  const submitTwoFACode = useCallback(async (code: string) => {
    if (!twoFAState.userId) {
      throw new Error('No 2FA session');
    }

    setIsLoading(true);
    try {
      const response = await verify2FA(twoFAState.userId, code);

      if (response.tokens && response.user) {
        await setTokens(response.tokens);
        setUser(mapApiUserToUser(response.user));
        setTwoFAState({ required: false, userId: null });
      }
    } finally {
      setIsLoading(false);
    }
  }, [twoFAState.userId]);

  const cancelTwoFA = useCallback(() => {
    setTwoFAState({ required: false, userId: null });
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call logout API (ignore errors - we're logging out anyway)
      try {
        await apiLogout();
      } catch (error) {
        console.log('Logout API call failed:', error);
      }

      // Clear tokens from secure storage
      await clearTokens();
      setUser(null);
      setTwoFAState({ required: false, userId: null });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await apiRegister({
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
      });

      // After registration, user needs to login
      // Some APIs might return tokens directly
      if (response.user) {
        // Auto-login after registration is not typical for security
        // User should login with their new credentials
        console.log('Registration successful, please login');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upgradeSubscription = useCallback(async (tier: SubscriptionTier) => {
    // This would typically call a payment API
    // For now, just update local state if we have a user
    if (user) {
      setUser({
        ...user,
        subscriptionTier: tier,
      });
    }
  }, [user]);

  const getUserTier = useCallback((): SubscriptionTier => {
    return user?.subscriptionTier ?? SubscriptionTier.FREE;
  }, [user]);

  const isPro = useCallback(() => {
    const tier = getUserTier();
    return (
      tier === SubscriptionTier.PRO ||
      tier === SubscriptionTier.PREMIUM ||
      tier === SubscriptionTier.VIP
    );
  }, [getUserTier]);

  const isPremium = useCallback(() => {
    const tier = getUserTier();
    return tier === SubscriptionTier.PREMIUM || tier === SubscriptionTier.VIP;
  }, [getUserTier]);

  const isVip = useCallback(() => {
    return getUserTier() === SubscriptionTier.VIP;
  }, [getUserTier]);

  const hasMinTier = useCallback(
    (requiredTier: SubscriptionTier) => {
      const currentTier = getUserTier();
      const currentIndex = TIER_ORDER.indexOf(currentTier);
      const requiredIndex = TIER_ORDER.indexOf(requiredTier);
      return currentIndex >= requiredIndex;
    },
    [getUserTier]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      register,
      upgradeSubscription,
      isPro,
      isPremium,
      isVip,
      hasMinTier,
      twoFAState,
      submitTwoFACode,
      cancelTwoFA,
    }),
    [
      user,
      isLoading,
      login,
      logout,
      register,
      upgradeSubscription,
      isPro,
      isPremium,
      isVip,
      hasMinTier,
      twoFAState,
      submitTwoFACode,
      cancelTwoFA,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
