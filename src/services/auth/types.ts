// Authentication and subscription types

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PREMIUM = 'premium',
  VIP = 'vip',
}

export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  priceLabel: string;
  features: string[];
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: SubscriptionTier.FREE,
    name: 'Free',
    price: 0,
    priceLabel: 'Бесплатно',
    features: [
      'Базовые алерты',
      '3 отслеживаемые монеты',
      'Задержка данных 15 мин',
      'Базовые графики',
    ],
  },
  {
    tier: SubscriptionTier.PRO,
    name: 'Pro',
    price: 9.99,
    priceLabel: '$9.99/мес',
    features: [
      'Все из Free',
      '20 отслеживаемых монет',
      'Реальное время данных',
      'Продвинутые алерты',
      'Telegram уведомления',
      'AI анализ (базовый)',
    ],
    isPopular: true,
  },
  {
    tier: SubscriptionTier.PREMIUM,
    name: 'Premium',
    price: 29.99,
    priceLabel: '$29.99/мес',
    features: [
      'Все из Pro',
      'Безлимит монет',
      'Приоритетные алерты',
      'AI анализ (продвинутый)',
      'Кастомные стратегии',
      'API доступ',
      'Приоритетная поддержка',
    ],
  },
  {
    tier: SubscriptionTier.VIP,
    name: 'VIP',
    price: 99.99,
    priceLabel: '$99.99/мес',
    features: [
      'Все из Premium',
      'Персональный менеджер',
      'Ранний доступ к функциям',
      'VIP сигналы',
      'Обучение 1-на-1',
      'Закрытый чат трейдеров',
      'Эксклюзивные стратегии',
    ],
  },
];
