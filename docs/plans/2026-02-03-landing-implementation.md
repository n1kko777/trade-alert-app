# Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a production-ready landing page for TradePulse Alerts at tradealert.ru with all required pages for App Store/Google Play/RuStore submission.

**Architecture:** Next.js 14 App Router with Tailwind CSS, deployed on Vercel. Static pages with SEO optimization. Separate `landing/` folder within the monorepo.

**Tech Stack:** Next.js 14, Tailwind CSS, TypeScript, Vercel

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `landing/package.json`
- Create: `landing/tsconfig.json`
- Create: `landing/next.config.js`
- Create: `landing/tailwind.config.js`
- Create: `landing/postcss.config.js`
- Create: `landing/.gitignore`

**Step 1: Create landing directory and initialize Next.js**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
mkdir -p landing
cd landing
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select options:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: @/*

**Step 2: Verify installation**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app/landing
npm run dev
```

Expected: Server starts on http://localhost:3000

**Step 3: Stop dev server and commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): initialize Next.js 14 project with Tailwind"
```

---

## Task 2: Configure Design System

**Files:**
- Modify: `landing/tailwind.config.ts`
- Modify: `landing/app/globals.css`
- Create: `landing/lib/constants.ts`

**Step 1: Update Tailwind config with custom colors**

Replace `landing/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0e17',
        card: '#141923',
        accent: '#3b82f6',
        success: '#22c55e',
        error: '#ef4444',
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        border: '#1e293b',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #3b82f6, 0 0 10px #3b82f6' },
          '100%': { boxShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6' },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

**Step 2: Update global styles**

Replace `landing/app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-text-primary font-body antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-heading;
  }
}

@layer components {
  .btn-primary {
    @apply bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/25;
  }

  .btn-secondary {
    @apply bg-card hover:bg-card/80 text-text-primary font-semibold py-3 px-6 rounded-xl border border-border transition-all duration-200;
  }

  .card {
    @apply bg-card rounded-2xl border border-border p-6;
  }

  .gradient-border {
    @apply relative before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:bg-gradient-to-r before:from-accent before:to-success before:-z-10;
  }
}

@layer utilities {
  .text-gradient {
    @apply bg-gradient-to-r from-accent to-success bg-clip-text text-transparent;
  }
}
```

**Step 3: Create constants file**

Create `landing/lib/constants.ts`:

```typescript
export const SITE_NAME = 'TradePulse Alerts'
export const SITE_DESCRIPTION = 'Мгновенные алерты на изменения цен криптовалют Bybit. Настрой порог — получай уведомления в реальном времени.'
export const SITE_URL = 'https://tradealert.ru'

export const STORE_LINKS = {
  appStore: 'https://apps.apple.com/app/tradepulse-alerts/id0000000000', // TODO: Update after publish
  googlePlay: 'https://play.google.com/store/apps/details?id=com.niktar.tradepulsealerts',
  ruStore: 'https://apps.rustore.ru/app/com.niktar.tradepulsealerts',
}

export const CONTACT_EMAIL = 'support@tradealert.ru'

export const FEATURES = [
  {
    icon: '⚡',
    title: 'Реалтайм данные',
    description: 'WebSocket-стрим напрямую с Bybit',
  },
  {
    icon: '🔔',
    title: 'Smart-алерты',
    description: 'Кулдаун, тихие часы, кастомные правила',
  },
  {
    icon: '📊',
    title: 'Графики',
    description: 'Свечи, глубина рынка, история цен',
  },
  {
    icon: '🤖',
    title: 'AI-анализ',
    description: 'Автоматический разбор движений',
    badge: 'Pro',
  },
  {
    icon: '📱',
    title: 'Фоновый режим',
    description: 'Мониторинг при закрытом приложении',
  },
  {
    icon: '🌙',
    title: 'Тихие часы',
    description: 'Не беспокоить ночью',
  },
]

export const PRICING_PLANS = [
  {
    name: 'Free',
    price: 'Бесплатно',
    priceValue: 0,
    features: [
      'Базовые алерты',
      '3 отслеживаемые монеты',
      'Задержка данных 15 мин',
      'Базовые графики',
    ],
  },
  {
    name: 'Pro',
    price: '$9.99/мес',
    priceValue: 9.99,
    isPopular: true,
    features: [
      'Всё из Free',
      '20 отслеживаемых монет',
      'Реальное время данных',
      'Продвинутые алерты',
      'Telegram уведомления',
      'AI анализ (базовый)',
    ],
  },
  {
    name: 'Premium',
    price: '$29.99/мес',
    priceValue: 29.99,
    features: [
      'Всё из Pro',
      'Безлимит монет',
      'Приоритетные алерты',
      'AI анализ (продвинутый)',
      'Кастомные стратегии',
      'API доступ',
      'Приоритетная поддержка',
    ],
  },
  {
    name: 'VIP',
    price: '$99.99/мес',
    priceValue: 99.99,
    features: [
      'Всё из Premium',
      'Персональный менеджер',
      'Ранний доступ к функциям',
      'VIP сигналы',
      'Обучение 1-на-1',
      'Закрытый чат трейдеров',
      'Эксклюзивные стратегии',
    ],
  },
]

export const FAQ_ITEMS = [
  {
    question: 'Как работают процентные алерты?',
    answer: 'Вы устанавливаете порог (например, 5%) и временное окно (например, 1 час). Когда цена монеты изменится на 5% или более за последний час, вы получите push-уведомление.',
  },
  {
    question: 'Работает ли приложение в фоновом режиме?',
    answer: 'Да, приложение продолжает мониторить цены даже когда свернуто или экран заблокирован. Вы получите уведомление в любое время.',
  },
  {
    question: 'Какие биржи поддерживаются?',
    answer: 'Сейчас мы поддерживаем Bybit (спотовый рынок). Поддержка других бирж планируется в будущих обновлениях.',
  },
  {
    question: 'Можно ли отменить подписку?',
    answer: 'Да, подписку можно отменить в любой момент через App Store, Google Play или RuStore. Доступ сохранится до конца оплаченного периода.',
  },
  {
    question: 'Безопасно ли приложение?',
    answer: 'Да. Мы не храним ваши API ключи и не имеем доступа к вашим средствам на бирже. Приложение использует только публичные данные о ценах.',
  },
]

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Выбери монеты',
    description: 'Добавь до 20 криптовалют в список отслеживания',
  },
  {
    step: 2,
    title: 'Настрой порог',
    description: 'Укажи процент изменения для срабатывания алерта',
  },
  {
    step: 3,
    title: 'Получай алерты',
    description: 'Push-уведомления даже при закрытом приложении',
  },
]
```

**Step 4: Commit changes**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): configure design system and constants"
```

---

## Task 3: Create Layout Components (Header & Footer)

**Files:**
- Create: `landing/components/Header.tsx`
- Create: `landing/components/Footer.tsx`
- Modify: `landing/app/layout.tsx`

**Step 1: Create Header component**

Create `landing/components/Header.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SITE_NAME, STORE_LINKS } from '@/lib/constants'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { href: '/#features', label: 'Возможности' },
    { href: '/pricing', label: 'Тарифы' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contacts', label: 'Контакты' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <span className="font-heading font-bold text-xl text-text-primary">
              {SITE_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <a
              href={STORE_LINKS.appStore}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm"
            >
              Скачать
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={STORE_LINKS.appStore}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm text-center mt-2"
              >
                Скачать
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
```

**Step 2: Create Footer component**

Create `landing/components/Footer.tsx`:

```typescript
import Link from 'next/link'
import { SITE_NAME, STORE_LINKS, CONTACT_EMAIL } from '@/lib/constants'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <span className="font-heading font-bold text-xl text-text-primary">
                {SITE_NAME}
              </span>
            </div>
            <p className="text-text-secondary text-sm max-w-md">
              Мгновенные алерты на изменения цен криптовалют.
              Не пропусти важное движение рынка.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading font-semibold text-text-primary mb-4">
              Продукт
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-heading font-semibold text-text-primary mb-4">
              Документы
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  Пользовательское соглашение
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Download Badges */}
        <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-border">
          <a
            href={STORE_LINKS.appStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background hover:bg-background/80 border border-border rounded-lg px-4 py-2 transition-colors"
          >
            <span className="text-xl">🍎</span>
            <div className="text-left">
              <div className="text-[10px] text-text-muted">Загрузите в</div>
              <div className="text-sm font-semibold text-text-primary">App Store</div>
            </div>
          </a>
          <a
            href={STORE_LINKS.googlePlay}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background hover:bg-background/80 border border-border rounded-lg px-4 py-2 transition-colors"
          >
            <span className="text-xl">▶️</span>
            <div className="text-left">
              <div className="text-[10px] text-text-muted">Доступно в</div>
              <div className="text-sm font-semibold text-text-primary">Google Play</div>
            </div>
          </a>
          <a
            href={STORE_LINKS.ruStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background hover:bg-background/80 border border-border rounded-lg px-4 py-2 transition-colors"
          >
            <span className="text-xl">🇷🇺</span>
            <div className="text-left">
              <div className="text-[10px] text-text-muted">Скачать из</div>
              <div className="text-sm font-semibold text-text-primary">RuStore</div>
            </div>
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-text-muted text-sm">
            © {currentYear} {SITE_NAME}. Все права защищены.
          </p>
          <p className="text-text-muted text-sm">
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-text-secondary transition-colors">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
```

**Step 3: Update root layout**

Replace `landing/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Крипто алерты на изменение цены`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'крипто алерты',
    'криптовалюта уведомления',
    'bybit алерты',
    'процентные алерты',
    'мониторинг цен криптовалют',
    'push уведомления крипта',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Крипто алерты на изменение цены`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Крипто алерты на изменение цены`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <Header />
        <main className="pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

**Step 4: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add Header and Footer components with layout"
```

---

## Task 4: Create Hero Section

**Files:**
- Create: `landing/components/Hero.tsx`
- Create: `landing/components/PhoneMockup.tsx`

**Step 1: Create PhoneMockup component**

Create `landing/components/PhoneMockup.tsx`:

```typescript
export default function PhoneMockup() {
  return (
    <div className="relative w-[280px] h-[580px] mx-auto">
      {/* Phone Frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] shadow-2xl border-4 border-gray-700">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl" />

        {/* Screen */}
        <div className="absolute top-2 left-2 right-2 bottom-2 bg-background rounded-[2.5rem] overflow-hidden">
          {/* App Content Preview */}
          <div className="p-4 pt-8">
            {/* Status bar placeholder */}
            <div className="flex justify-between items-center mb-6 px-2">
              <span className="text-xs text-text-muted">9:41</span>
              <div className="flex gap-1">
                <span className="text-xs text-text-muted">📶</span>
                <span className="text-xs text-text-muted">🔋</span>
              </div>
            </div>

            {/* Alert cards */}
            <div className="space-y-3">
              <AlertCard
                symbol="BTC"
                change="+5.2%"
                isUp={true}
                delay={0}
              />
              <AlertCard
                symbol="ETH"
                change="-3.8%"
                isUp={false}
                delay={0.5}
              />
              <AlertCard
                symbol="SOL"
                change="+12.4%"
                isUp={true}
                delay={1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-4 bg-accent/20 rounded-[4rem] blur-3xl -z-10 animate-pulse-slow" />
    </div>
  )
}

function AlertCard({
  symbol,
  change,
  isUp,
  delay
}: {
  symbol: string
  change: string
  isUp: boolean
  delay: number
}) {
  return (
    <div
      className="bg-card rounded-xl p-3 border border-border animate-pulse"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-accent">{symbol.slice(0, 2)}</span>
          </div>
          <div>
            <div className="font-semibold text-sm text-text-primary">{symbol}/USDT</div>
            <div className="text-xs text-text-muted">Bybit Spot</div>
          </div>
        </div>
        <div className={`font-bold text-sm ${isUp ? 'text-success' : 'text-error'}`}>
          {change}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create Hero component**

Create `landing/components/Hero.tsx`:

```typescript
import Link from 'next/link'
import { STORE_LINKS } from '@/lib/constants'
import PhoneMockup from './PhoneMockup'

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-sm text-text-secondary">Реалтайм мониторинг Bybit</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-text-primary mb-6 leading-tight">
              Не пропусти{' '}
              <span className="text-gradient">движение рынка</span>
            </h1>

            <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-xl mx-auto lg:mx-0">
              Мгновенные алерты на изменения цен криптовалют Bybit.
              Настрой порог — получай уведомления в реальном времени.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href={STORE_LINKS.appStore}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-center"
              >
                Скачать бесплатно
              </a>
              <Link href="/pricing" className="btn-secondary text-center">
                Посмотреть тарифы
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-6 justify-center lg:justify-start text-text-muted text-sm">
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Бесплатный старт</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Без карты</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Отмена в любой момент</span>
              </div>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="hidden lg:flex justify-center">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 3: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add Hero section with phone mockup"
```

---

## Task 5: Create HowItWorks Section

**Files:**
- Create: `landing/components/HowItWorks.tsx`

**Step 1: Create HowItWorks component**

Create `landing/components/HowItWorks.tsx`:

```typescript
import { HOW_IT_WORKS } from '@/lib/constants'

export default function HowItWorks() {
  return (
    <section className="py-20 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Как это работает
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Три простых шага до первого алерта
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item, index) => (
            <div key={item.step} className="relative">
              {/* Connector line */}
              {index < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-accent to-transparent" />
              )}

              <div className="card text-center relative">
                {/* Step number */}
                <div className="w-16 h-16 bg-accent/10 border-2 border-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-heading font-bold text-accent">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-xl font-heading font-semibold text-text-primary mb-3">
                  {item.title}
                </h3>

                <p className="text-text-secondary">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add HowItWorks section"
```

---

## Task 6: Create Features Section

**Files:**
- Create: `landing/components/Features.tsx`

**Step 1: Create Features component**

Create `landing/components/Features.tsx`:

```typescript
import { FEATURES } from '@/lib/constants'

export default function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Возможности
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Всё что нужно для мониторинга криптовалютного рынка
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="card hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-heading font-semibold text-text-primary">
                      {feature.title}
                    </h3>
                    {feature.badge && (
                      <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add Features section"
```

---

## Task 7: Create Pricing Section

**Files:**
- Create: `landing/components/Pricing.tsx`

**Step 1: Create Pricing component**

Create `landing/components/Pricing.tsx`:

```typescript
import Link from 'next/link'
import { PRICING_PLANS, STORE_LINKS } from '@/lib/constants'

interface PricingProps {
  showFullDetails?: boolean
}

export default function Pricing({ showFullDetails = false }: PricingProps) {
  return (
    <section id="pricing" className="py-20 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Тарифы
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Выберите план, который подходит именно вам
          </p>

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 bg-success/10 border border-success/20 rounded-full px-4 py-2 mt-6">
            <span className="text-success">✨</span>
            <span className="text-sm text-success">7 дней бесплатный пробный период</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card relative ${
                plan.isPopular
                  ? 'border-accent ring-2 ring-accent/20'
                  : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Популярный
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
                  {plan.name}
                </h3>
                <div className="text-2xl font-bold text-accent">
                  {plan.price}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5">✓</span>
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={STORE_LINKS.appStore}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center py-3 px-4 rounded-xl font-semibold transition-colors ${
                  plan.isPopular
                    ? 'bg-accent hover:bg-accent/90 text-white'
                    : 'bg-background hover:bg-background/80 text-text-primary border border-border'
                }`}
              >
                {plan.priceValue === 0 ? 'Начать бесплатно' : 'Выбрать'}
              </a>
            </div>
          ))}
        </div>

        {!showFullDetails && (
          <div className="text-center mt-8">
            <Link
              href="/pricing"
              className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
            >
              Подробное сравнение тарифов
              <span>→</span>
            </Link>
          </div>
        )}

        <p className="text-center text-text-muted text-sm mt-8">
          Подписку можно отменить в любое время. Оплата через App Store / Google Play / RuStore.
        </p>
      </div>
    </section>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add Pricing section"
```

---

## Task 8: Create FAQ Section

**Files:**
- Create: `landing/components/FAQ.tsx`

**Step 1: Create FAQ component**

Create `landing/components/FAQ.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FAQ_ITEMS } from '@/lib/constants'

interface FAQProps {
  limit?: number
  showViewAll?: boolean
}

export default function FAQ({ limit, showViewAll = true }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const items = limit ? FAQ_ITEMS.slice(0, limit) : FAQ_ITEMS

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Часто задаваемые вопросы
          </h2>
          <p className="text-text-secondary text-lg">
            Ответы на популярные вопросы о приложении
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="card cursor-pointer"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-heading font-semibold text-text-primary">
                  {item.question}
                </h3>
                <span
                  className={`text-accent transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </div>

              {openIndex === index && (
                <p className="mt-4 text-text-secondary">
                  {item.answer}
                </p>
              )}
            </div>
          ))}
        </div>

        {showViewAll && limit && (
          <div className="text-center mt-8">
            <Link
              href="/faq"
              className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
            >
              Все вопросы
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add FAQ accordion section"
```

---

## Task 9: Create Download Banner Section

**Files:**
- Create: `landing/components/DownloadBanner.tsx`

**Step 1: Create DownloadBanner component**

Create `landing/components/DownloadBanner.tsx`:

```typescript
import { STORE_LINKS } from '@/lib/constants'

export default function DownloadBanner() {
  return (
    <section className="py-20 bg-gradient-to-r from-accent/10 via-card to-success/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
          Готовы начать?
        </h2>
        <p className="text-text-secondary text-lg mb-8 max-w-2xl mx-auto">
          Скачайте приложение бесплатно и настройте первый алерт за 30 секунд
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href={STORE_LINKS.appStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-3 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Загрузите в</div>
              <div className="text-lg font-semibold">App Store</div>
            </div>
          </a>

          <a
            href={STORE_LINKS.googlePlay}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-3 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.54.68.54 1.19 0 .51-.2.92-.54 1.19l-2.01 1.15-2.5-2.5 2.5-2.5 2.01 1.15v.32zm-13.12-8.5l10.76 6.22-2.27 2.27-8.49-8.49z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Доступно в</div>
              <div className="text-lg font-semibold">Google Play</div>
            </div>
          </a>

          <a
            href={STORE_LINKS.ruStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-3 transition-colors"
          >
            <span className="text-3xl">🇷🇺</span>
            <div className="text-left">
              <div className="text-xs opacity-80">Скачать из</div>
              <div className="text-lg font-semibold">RuStore</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add DownloadBanner section"
```

---

## Task 10: Assemble Homepage

**Files:**
- Modify: `landing/app/page.tsx`

**Step 1: Update homepage**

Replace `landing/app/page.tsx`:

```typescript
import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import Features from '@/components/Features'
import Pricing from '@/components/Pricing'
import FAQ from '@/components/FAQ'
import DownloadBanner from '@/components/DownloadBanner'

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ limit={5} />
      <DownloadBanner />
    </>
  )
}
```

**Step 2: Run dev server and verify visually**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app/landing
npm run dev
```

Open http://localhost:3000 and verify all sections render correctly.

**Step 3: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): assemble homepage with all sections"
```

---

## Task 11: Create Pricing Page

**Files:**
- Create: `landing/app/pricing/page.tsx`

**Step 1: Create pricing page**

Create `landing/app/pricing/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Pricing from '@/components/Pricing'
import DownloadBanner from '@/components/DownloadBanner'

export const metadata: Metadata = {
  title: 'Тарифы',
  description: 'Выберите подходящий тариф TradePulse Alerts: Free, Pro, Premium или VIP. 7 дней бесплатный пробный период.',
}

export default function PricingPage() {
  return (
    <>
      <div className="pt-8">
        <Pricing showFullDetails />
      </div>
      <DownloadBanner />
    </>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add pricing page"
```

---

## Task 12: Create FAQ Page

**Files:**
- Create: `landing/app/faq/page.tsx`

**Step 1: Create FAQ page**

Create `landing/app/faq/page.tsx`:

```typescript
import type { Metadata } from 'next'
import FAQ from '@/components/FAQ'
import DownloadBanner from '@/components/DownloadBanner'

export const metadata: Metadata = {
  title: 'FAQ — Часто задаваемые вопросы',
  description: 'Ответы на популярные вопросы о TradePulse Alerts: как работают алерты, подписки, безопасность и многое другое.',
}

export default function FAQPage() {
  return (
    <>
      <div className="pt-8">
        <FAQ showViewAll={false} />
      </div>
      <DownloadBanner />
    </>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add FAQ page"
```

---

## Task 13: Create Privacy Policy Page

**Files:**
- Create: `landing/app/privacy/page.tsx`

**Step 1: Create privacy policy page**

Create `landing/app/privacy/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description: `Политика конфиденциальности ${SITE_NAME}. Узнайте, как мы собираем, используем и защищаем ваши данные.`,
}

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-8">
          Политика конфиденциальности
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-text-secondary mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              1. Какие данные мы собираем
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>При использовании {SITE_NAME} мы можем собирать следующие данные:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Данные аккаунта:</strong> email, имя (при регистрации)</li>
                <li><strong>Данные устройства:</strong> идентификатор устройства для push-уведомлений, модель устройства, версия ОС</li>
                <li><strong>Настройки приложения:</strong> выбранные монеты, пороги алертов, предпочтения уведомлений</li>
                <li><strong>Данные об использовании:</strong> статистика использования функций приложения (опционально)</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              2. Как мы используем данные
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Собранные данные используются для:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Авторизации и персонализации вашего опыта</li>
                <li>Отправки push-уведомлений об изменениях цен</li>
                <li>Синхронизации настроек между устройствами</li>
                <li>Улучшения качества сервиса</li>
                <li>Технической поддержки</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              3. Кому мы передаём данные
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Мы можем передавать данные следующим третьим сторонам:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Bybit API:</strong> для получения данных о ценах (передаются только публичные запросы)</li>
                <li><strong>Apple APNs / Google FCM:</strong> для доставки push-уведомлений</li>
                <li><strong>Платёжные провайдеры:</strong> App Store, Google Play, RuStore для обработки подписок</li>
              </ul>
              <p>Мы не продаём ваши персональные данные третьим лицам.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              4. Хранение и защита данных
            </h2>
            <div className="text-text-secondary space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>Токены авторизации хранятся в зашифрованном виде (SecureStore)</li>
                <li>Данные передаются по защищённому соединению (HTTPS)</li>
                <li>Мы храним данные только столько, сколько необходимо для предоставления сервиса</li>
                <li>При удалении аккаунта все персональные данные удаляются в течение 30 дней</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              5. Ваши права
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Вы имеете право:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Запросить доступ к своим персональным данным</li>
                <li>Исправить неточные данные</li>
                <li>Удалить свой аккаунт и все связанные данные</li>
                <li>Отозвать согласие на обработку данных</li>
                <li>Отказаться от маркетинговых рассылок</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              6. Файлы cookie
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Веб-версия сайта может использовать файлы cookie для обеспечения работы сайта
                и сбора аналитики. Вы можете отключить cookie в настройках браузера.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              7. Изменения политики
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Мы можем обновлять эту политику конфиденциальности. О существенных изменениях
                мы уведомим через приложение или по email.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              8. Контакты
            </h2>
            <div className="text-text-secondary">
              <p>
                По вопросам конфиденциальности обращайтесь:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add Privacy Policy page"
```

---

## Task 14: Create Terms of Service Page

**Files:**
- Create: `landing/app/terms/page.tsx`

**Step 1: Create terms page**

Create `landing/app/terms/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Пользовательское соглашение',
  description: `Пользовательское соглашение ${SITE_NAME}. Условия использования приложения и сервиса.`,
}

export default function TermsPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-8">
          Пользовательское соглашение
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-text-secondary mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              1. Описание сервиса
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                {SITE_NAME} — это мобильное приложение для мониторинга цен криптовалют
                и получения уведомлений об их изменении.
              </p>
              <p className="font-semibold">
                ВАЖНО: Приложение предоставляет исключительно информационные услуги и
                НЕ является финансовым советом. Мы не рекомендуем совершать какие-либо
                торговые операции на основе данных приложения.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              2. Условия использования
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Используя приложение, вы подтверждаете, что:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Вам исполнилось 18 лет</li>
                <li>Вы используете только один аккаунт</li>
                <li>Вы не будете использовать приложение в незаконных целях</li>
                <li>Вы понимаете риски, связанные с торговлей криптовалютой</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              3. Подписки и платежи
            </h2>
            <div className="text-text-secondary space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>Подписка продлевается автоматически, если не отменена за 24 часа до окончания периода</li>
                <li>Оплата производится через App Store, Google Play или RuStore</li>
                <li>Возврат средств осуществляется согласно политике соответствующего магазина приложений</li>
                <li>Цены могут изменяться, о чём мы уведомим заранее</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              4. Отказ от ответственности
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Мы не несём ответственности за:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Финансовые потери, связанные с торговыми решениями</li>
                <li>Задержки или пропуски уведомлений по техническим причинам</li>
                <li>Неточности в данных, полученных от биржи</li>
                <li>Недоступность сервиса по причинам, не зависящим от нас</li>
              </ul>
              <p>
                Приложение предоставляется «как есть» без каких-либо гарантий.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              5. Ограничения
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>Запрещается:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Декомпилировать, дизассемблировать или реверс-инжинирить приложение</li>
                <li>Использовать автоматизированные средства для доступа к сервису</li>
                <li>Распространять приложение или его части без разрешения</li>
                <li>Использовать сервис для нарушения законодательства</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              6. Изменение условий
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Мы оставляем за собой право изменять условия использования.
                О существенных изменениях мы уведомим через приложение или по email
                не менее чем за 14 дней до вступления изменений в силу.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              7. Применимое право
            </h2>
            <div className="text-text-secondary space-y-3">
              <p>
                Настоящее соглашение регулируется законодательством Российской Федерации.
                Все споры разрешаются в соответствии с законодательством РФ.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">
              8. Контакты
            </h2>
            <div className="text-text-secondary">
              <p>
                По вопросам, связанным с данным соглашением:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add Terms of Service page"
```

---

## Task 15: Create Contacts Page

**Files:**
- Create: `landing/app/contacts/page.tsx`

**Step 1: Create contacts page**

Create `landing/app/contacts/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Контакты',
  description: `Свяжитесь с командой ${SITE_NAME}. Техническая поддержка, вопросы и предложения.`,
}

export default function ContactsPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Контакты
          </h1>
          <p className="text-text-secondary text-lg">
            Мы всегда рады помочь и ответить на ваши вопросы
          </p>
        </div>

        <div className="grid gap-6">
          {/* Email */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Email
                </h2>
                <p className="text-text-secondary mb-3">
                  Основной канал связи для вопросов и поддержки
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-accent hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>

          {/* Response time */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⏱️</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Время ответа
                </h2>
                <p className="text-text-secondary">
                  Мы стараемся отвечать на все обращения в течение 24 часов в рабочие дни.
                  VIP-пользователи получают приоритетную поддержку.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">❓</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Часто задаваемые вопросы
                </h2>
                <p className="text-text-secondary mb-3">
                  Возможно, ответ на ваш вопрос уже есть в нашем FAQ
                </p>
                <a
                  href="/faq"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  Перейти в FAQ
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bug reports */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🐛</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Сообщить об ошибке
                </h2>
                <p className="text-text-secondary">
                  Нашли баг? Напишите нам на{' '}
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Bug Report`}
                    className="text-accent hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  {' '}с темой «Bug Report» и подробным описанием проблемы.
                </p>
              </div>
            </div>
          </div>

          {/* Feature requests */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <h2 className="font-heading font-semibold text-text-primary mb-2">
                  Предложить идею
                </h2>
                <p className="text-text-secondary">
                  Есть идея для улучшения? Мы всегда открыты к предложениям!
                  Пишите на{' '}
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Feature Request`}
                    className="text-accent hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add Contacts page"
```

---

## Task 16: Create Smart App Redirect Page

**Files:**
- Create: `landing/app/app/page.tsx`

**Step 1: Create smart redirect page**

Create `landing/app/app/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { STORE_LINKS, SITE_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Скачать приложение',
  description: `Скачайте ${SITE_NAME} для iOS, Android или из RuStore`,
}

export default function AppPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="text-6xl mb-6">📲</div>

        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-4">
          Скачать {SITE_NAME}
        </h1>

        <p className="text-text-secondary mb-8">
          Выберите ваш магазин приложений
        </p>

        <div className="flex flex-col gap-4">
          <a
            href={STORE_LINKS.appStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-4 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Загрузите в</div>
              <div className="text-lg font-semibold">App Store</div>
            </div>
          </a>

          <a
            href={STORE_LINKS.googlePlay}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-4 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.54.68.54 1.19 0 .51-.2.92-.54 1.19l-2.01 1.15-2.5-2.5 2.5-2.5 2.01 1.15v.32zm-13.12-8.5l10.76 6.22-2.27 2.27-8.49-8.49z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Доступно в</div>
              <div className="text-lg font-semibold">Google Play</div>
            </div>
          </a>

          <a
            href={STORE_LINKS.ruStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-4 transition-colors"
          >
            <span className="text-3xl">🇷🇺</span>
            <div className="text-left">
              <div className="text-xs opacity-80">Скачать из</div>
              <div className="text-lg font-semibold">RuStore</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add smart app redirect page"
```

---

## Task 17: Add SEO Files (sitemap, robots)

**Files:**
- Create: `landing/app/sitemap.ts`
- Create: `landing/app/robots.ts`

**Step 1: Create sitemap**

Create `landing/app/sitemap.ts`:

```typescript
import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contacts`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/app`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
```

**Step 2: Create robots.txt**

Create `landing/app/robots.ts`:

```typescript
import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

**Step 3: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): add sitemap and robots.txt generation"
```

---

## Task 18: Configure Vercel Deployment

**Files:**
- Create: `landing/vercel.json`
- Modify: `landing/next.config.js`

**Step 1: Create vercel.json**

Create `landing/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["fra1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Step 2: Update next.config.js**

Replace `landing/next.config.ts` (or create if not exists):

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: [],
  },
}

export default nextConfig
```

**Step 3: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "feat(landing): configure Vercel deployment"
```

---

## Task 19: Create Placeholder OG Image

**Files:**
- Create: `landing/public/og-image.png` (placeholder)

**Step 1: Create a simple placeholder (to be replaced with real design)**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app/landing
mkdir -p public
# Create a simple placeholder text file as reminder
echo "Replace with actual 1200x630 OG image" > public/og-image-placeholder.txt
```

Note: Real OG image (1200x630px) should be designed and added later.

**Step 2: Commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add landing/
git commit -m "chore(landing): add OG image placeholder"
```

---

## Task 20: Final Build Test

**Step 1: Install dependencies and build**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app/landing
npm install
npm run build
```

Expected: Build completes without errors.

**Step 2: Test production build locally**

```bash
npm run start
```

Open http://localhost:3000 and verify:
- [ ] Homepage loads with all sections
- [ ] Navigation works
- [ ] All pages accessible (/pricing, /faq, /privacy, /terms, /contacts, /app)
- [ ] Mobile responsive layout
- [ ] Dark theme renders correctly

**Step 3: Final commit**

```bash
cd /Users/niktar/Documents/Code/trade-alert-app
git add .
git commit -m "feat(landing): complete landing page implementation

- Homepage with Hero, HowItWorks, Features, Pricing, FAQ, Download sections
- Pricing page with detailed plan comparison
- FAQ page with accordion
- Privacy Policy (Russian, App Store/Google Play compliant)
- Terms of Service (Russian)
- Contacts page
- Smart app redirect page
- SEO: sitemap, robots.txt, Open Graph meta
- Vercel deployment config
- Dark crypto theme with Space Grotesk / Inter fonts"
```

---

## Deployment Checklist

After implementation, deploy to Vercel:

1. Push to GitHub
2. Connect repo to Vercel
3. Set root directory to `landing`
4. Add custom domain `tradealert.ru`
5. Verify all pages work on production
6. Test mobile responsiveness
7. Run Lighthouse audit

---

## Post-Implementation Tasks (Manual)

- [ ] Design and add real OG image (1200x630)
- [ ] Add Yandex.Metrica / Google Analytics
- [ ] Update store links with real App Store / Google Play URLs after publish
- [ ] Add app screenshots to landing page
- [ ] Consider adding testimonials section after getting user feedback
