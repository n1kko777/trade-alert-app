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

  // Load stored user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await authService.loadStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Failed to load stored user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
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
