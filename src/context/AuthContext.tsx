import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  authService,
  AuthState,
  User,
  SubscriptionTier,
  LoginCredentials,
  RegisterCredentials,
} from '../services/auth';
import { refreshTokensOnStartup } from '../utils/tokenRefresh';
import {
  clearTokens,
  setTokens as setSecureTokens,
} from '../api/client';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  upgradeSubscription: (tier: SubscriptionTier) => Promise<void>;
  isPro: () => boolean;
  isPremium: () => boolean;
  isVip: () => boolean;
  hasMinTier: (tier: SubscriptionTier) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored user and refresh tokens on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First, try to refresh tokens from secure storage
        const isAuthenticated = await refreshTokensOnStartup();

        if (isAuthenticated) {
          // If tokens are valid, load the user from the local cache
          // In a full implementation, we would fetch user data from the API
          const storedUser = await authService.loadStoredUser();
          if (storedUser) {
            setUser(storedUser);
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

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(credentials);
      setUser(loggedInUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear tokens from secure storage
      await clearTokens();
      // Clear local auth state
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const newUser = await authService.register(credentials);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upgradeSubscription = useCallback(async (tier: SubscriptionTier) => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.upgradeSubscription(tier);
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isPro = useCallback(() => authService.isPro(), [user]);
  const isPremium = useCallback(() => authService.isPremium(), [user]);
  const isVip = useCallback(() => authService.isVip(), [user]);
  const hasMinTier = useCallback(
    (tier: SubscriptionTier) => authService.hasMinTier(tier),
    [user]
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
    }),
    [user, isLoading, login, logout, register, upgradeSubscription, isPro, isPremium, isVip, hasMinTier]
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
