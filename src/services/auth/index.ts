// Auth service with mock implementation
// Ready for AsyncStorage integration

import {
  User,
  AuthState,
  SubscriptionTier,
  LoginCredentials,
  RegisterCredentials,
} from './types';

// Mock user data for development
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'demo@tradepulse.com': {
    password: 'demo123',
    user: {
      id: 'user_1',
      email: 'demo@tradepulse.com',
      name: 'Demo User',
      subscriptionTier: SubscriptionTier.FREE,
      createdAt: new Date('2024-01-01'),
    },
  },
  'pro@tradepulse.com': {
    password: 'pro123',
    user: {
      id: 'user_2',
      email: 'pro@tradepulse.com',
      name: 'Pro User',
      subscriptionTier: SubscriptionTier.PRO,
      createdAt: new Date('2024-01-01'),
    },
  },
  'premium@tradepulse.com': {
    password: 'premium123',
    user: {
      id: 'user_3',
      email: 'premium@tradepulse.com',
      name: 'Premium User',
      subscriptionTier: SubscriptionTier.PREMIUM,
      createdAt: new Date('2024-01-01'),
    },
  },
  'vip@tradepulse.com': {
    password: 'vip123',
    user: {
      id: 'user_4',
      email: 'vip@tradepulse.com',
      name: 'VIP User',
      subscriptionTier: SubscriptionTier.VIP,
      createdAt: new Date('2024-01-01'),
    },
  },
};

// Simulated delay for async operations
const simulateDelay = (ms: number = 1000): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Storage key for auth state
const AUTH_STORAGE_KEY = '@tradepulse:auth';

class AuthService {
  private currentUser: User | null = null;

  // Get current auth state
  getAuthState(): AuthState {
    return {
      user: this.currentUser,
      isAuthenticated: this.currentUser !== null,
      isLoading: false,
    };
  }

  // Login with email and password
  async login(credentials: LoginCredentials): Promise<User> {
    await simulateDelay();

    const userEntry = MOCK_USERS[credentials.email.toLowerCase()];
    if (!userEntry || userEntry.password !== credentials.password) {
      throw new Error('Неверный email или пароль');
    }

    this.currentUser = userEntry.user;
    // TODO: Save to AsyncStorage
    // await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));

    return this.currentUser;
  }

  // Register new user
  async register(credentials: RegisterCredentials): Promise<User> {
    await simulateDelay();

    if (credentials.password !== credentials.confirmPassword) {
      throw new Error('Пароли не совпадают');
    }

    if (credentials.password.length < 6) {
      throw new Error('Пароль должен содержать минимум 6 символов');
    }

    if (MOCK_USERS[credentials.email.toLowerCase()]) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Create new user (in real app, this would be an API call)
    const newUser: User = {
      id: `user_${Date.now()}`,
      email: credentials.email.toLowerCase(),
      name: credentials.name,
      subscriptionTier: SubscriptionTier.FREE,
      createdAt: new Date(),
    };

    // Add to mock users
    MOCK_USERS[newUser.email] = {
      password: credentials.password,
      user: newUser,
    };

    this.currentUser = newUser;
    // TODO: Save to AsyncStorage
    // await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));

    return newUser;
  }

  // Logout
  async logout(): Promise<void> {
    await simulateDelay(500);
    this.currentUser = null;
    // TODO: Remove from AsyncStorage
    // await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  // Load user from storage (for app startup)
  async loadStoredUser(): Promise<User | null> {
    await simulateDelay(500);
    // TODO: Load from AsyncStorage
    // const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    // if (stored) {
    //   this.currentUser = JSON.parse(stored);
    //   return this.currentUser;
    // }
    return null;
  }

  // Get current subscription tier
  getSubscriptionTier(): SubscriptionTier {
    return this.currentUser?.subscriptionTier ?? SubscriptionTier.FREE;
  }

  // Check if user has Pro or higher subscription
  isPro(): boolean {
    const tier = this.getSubscriptionTier();
    return (
      tier === SubscriptionTier.PRO ||
      tier === SubscriptionTier.PREMIUM ||
      tier === SubscriptionTier.VIP
    );
  }

  // Check if user has Premium or higher subscription
  isPremium(): boolean {
    const tier = this.getSubscriptionTier();
    return tier === SubscriptionTier.PREMIUM || tier === SubscriptionTier.VIP;
  }

  // Check if user has VIP subscription
  isVip(): boolean {
    return this.getSubscriptionTier() === SubscriptionTier.VIP;
  }

  // Check if user has at least the specified tier
  hasMinTier(requiredTier: SubscriptionTier): boolean {
    const tierOrder = [
      SubscriptionTier.FREE,
      SubscriptionTier.PRO,
      SubscriptionTier.PREMIUM,
      SubscriptionTier.VIP,
    ];
    const currentIndex = tierOrder.indexOf(this.getSubscriptionTier());
    const requiredIndex = tierOrder.indexOf(requiredTier);
    return currentIndex >= requiredIndex;
  }

  // Upgrade subscription (mock implementation)
  async upgradeSubscription(tier: SubscriptionTier): Promise<User> {
    await simulateDelay(1500);

    if (!this.currentUser) {
      throw new Error('Необходимо войти в аккаунт');
    }

    // In real app, this would process payment and update via API
    this.currentUser = {
      ...this.currentUser,
      subscriptionTier: tier,
    };

    // Update in mock storage
    MOCK_USERS[this.currentUser.email] = {
      ...MOCK_USERS[this.currentUser.email],
      user: this.currentUser,
    };

    return this.currentUser;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Re-export types
export * from './types';
