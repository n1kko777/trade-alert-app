import { NewsArticle, NewsCategory } from './types';

// CryptoPanic API configuration (free tier)
const CRYPTO_NEWS_API_URL = 'https://cryptopanic.com/api/v1/posts/';
const CRYPTO_NEWS_API_KEY = ''; // Add your API key here for production

// Cache for fetched news
let cachedNews: NewsArticle[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Demo news articles as fallback
const demoArticles: NewsArticle[] = [
  {
    id: '1',
    title: 'Bitcoin преодолел отметку $100,000: новый исторический максимум',
    summary: 'Криптовалюта Bitcoin впервые в истории достигла цены $100,000, что ознаменовало новую эру в развитии цифровых активов. Аналитики прогнозируют дальнейший рост.',
    source: 'CoinDesk',
    url: 'https://coindesk.com/bitcoin-100k',
    publishedAt: Date.now() - 1000 * 60 * 30, // 30 min ago
    category: 'bitcoin',
  },
  {
    id: '2',
    title: 'Ethereum 2.0: успешный переход на Proof-of-Stake',
    summary: 'Сеть Ethereum полностью перешла на механизм консенсуса Proof-of-Stake, что снизило энергопотребление на 99.95% и открыло путь к масштабированию.',
    source: 'CoinTelegraph',
    url: 'https://cointelegraph.com/eth-pos',
    publishedAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    category: 'ethereum',
  },
  {
    id: '3',
    title: 'DeFi протоколы достигли $500 млрд заблокированных средств',
    summary: 'Общая стоимость заблокированных активов в DeFi протоколах превысила $500 миллиардов, демонстрируя рекордный рост интереса к децентрализованным финансам.',
    source: 'DeFi Pulse',
    url: 'https://defipulse.com/tvl-500b',
    publishedAt: Date.now() - 1000 * 60 * 60 * 4, // 4 hours ago
    category: 'defi',
  },
  {
    id: '4',
    title: 'Solana показала рост на 45% за неделю',
    summary: 'Альткоин Solana продемонстрировал впечатляющий рост после анонса новых партнерств и улучшений сети. Инвесторы видят потенциал в экосистеме.',
    source: 'CryptoNews',
    url: 'https://cryptonews.com/solana-45',
    publishedAt: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
    category: 'altcoins',
  },
  {
    id: '5',
    title: 'NFT коллекция продана за рекордные $50 миллионов',
    summary: 'Новая коллекция цифрового искусства установила рекорд продаж на NFT-маркетплейсе. Эксперты отмечают возрождение интереса к невзаимозаменяемым токенам.',
    source: 'NFT News',
    url: 'https://nftnews.com/50m-sale',
    publishedAt: Date.now() - 1000 * 60 * 60 * 8, // 8 hours ago
    category: 'nft',
  },
  {
    id: '6',
    title: 'SEC одобрила первый спотовый Bitcoin ETF',
    summary: 'Комиссия по ценным бумагам США наконец одобрила первый спотовый Bitcoin ETF, что открывает двери для институциональных инвесторов на крипторынок.',
    source: 'Bloomberg',
    url: 'https://bloomberg.com/btc-etf',
    publishedAt: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
    category: 'regulation',
  },
  {
    id: '7',
    title: 'Aave запустил версию V4 с улучшенной эффективностью капитала',
    summary: 'Ведущий DeFi-протокол Aave представил четвертую версию платформы с новыми функциями и значительным улучшением эффективности использования капитала.',
    source: 'DeFi Weekly',
    url: 'https://defiweekly.com/aave-v4',
    publishedAt: Date.now() - 1000 * 60 * 60 * 18, // 18 hours ago
    category: 'defi',
  },
  {
    id: '8',
    title: 'Cardano объявила о масштабном обновлении сети',
    summary: 'Команда Cardano анонсировала крупнейшее обновление, которое повысит пропускную способность сети в 10 раз и снизит комиссии за транзакции.',
    source: 'Cardano Foundation',
    url: 'https://cardano.org/upgrade',
    publishedAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    category: 'altcoins',
  },
  {
    id: '9',
    title: 'Майнеры Bitcoin готовятся к халвингу 2024',
    summary: 'С приближением очередного халвинга Bitcoin майнинговые компании модернизируют оборудование и оптимизируют операции для поддержания прибыльности.',
    source: 'Mining Weekly',
    url: 'https://miningweekly.com/halving',
    publishedAt: Date.now() - 1000 * 60 * 60 * 36, // 1.5 days ago
    category: 'bitcoin',
  },
  {
    id: '10',
    title: 'Uniswap Labs представила новый агрегатор ликвидности',
    summary: 'Разработчики Uniswap выпустили инновационный агрегатор, объединяющий ликвидность с нескольких DEX для получения лучших цен при обмене токенов.',
    source: 'DeFi News',
    url: 'https://definews.com/uniswap-aggregator',
    publishedAt: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    category: 'defi',
  },
  {
    id: '11',
    title: 'Polygon интегрировал zkEVM для масштабирования Ethereum',
    summary: 'Polygon успешно запустил zkEVM решение, позволяющее разработчикам создавать масштабируемые dApps с полной совместимостью с Ethereum.',
    source: 'Polygon Blog',
    url: 'https://polygon.technology/zkevm',
    publishedAt: Date.now() - 1000 * 60 * 60 * 52, // 2+ days ago
    category: 'ethereum',
  },
  {
    id: '12',
    title: 'Банк Японии начал тестирование цифровой иены',
    summary: 'Центральный банк Японии приступил к пилотному тестированию CBDC, что может повлиять на регулирование криптовалют в стране.',
    source: 'Reuters',
    url: 'https://reuters.com/japan-cbdc',
    publishedAt: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    category: 'regulation',
  },
];

/**
 * Map category from API to local categories
 */
function mapCategory(apiCategory?: string): NewsCategory {
  if (!apiCategory) return 'all';

  const categoryMap: Record<string, NewsCategory> = {
    'bitcoin': 'bitcoin',
    'btc': 'bitcoin',
    'ethereum': 'ethereum',
    'eth': 'ethereum',
    'defi': 'defi',
    'nft': 'nft',
    'regulation': 'regulation',
    'government': 'regulation',
    'law': 'regulation',
  };

  const lowerCategory = apiCategory.toLowerCase();
  return categoryMap[lowerCategory] || 'altcoins';
}

/**
 * Fetch news from external API
 */
export async function fetchNewsFromAPI(): Promise<NewsArticle[]> {
  // Return cached news if still valid
  if (cachedNews && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedNews;
  }

  // If no API key, use demo data
  if (!CRYPTO_NEWS_API_KEY) {
    return demoArticles;
  }

  try {
    const response = await fetch(
      `${CRYPTO_NEWS_API_URL}?auth_token=${CRYPTO_NEWS_API_KEY}&filter=hot&public=true`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid API response');
    }

    const articles: NewsArticle[] = data.results.map((item: {
      id: number;
      title: string;
      url: string;
      published_at: string;
      source: { title: string };
      currencies?: Array<{ code: string }>;
    }, index: number) => ({
      id: `api_${item.id || index}`,
      title: item.title,
      summary: item.title, // API doesn't provide summary
      source: item.source?.title || 'CryptoPanic',
      url: item.url,
      publishedAt: new Date(item.published_at).getTime(),
      category: mapCategory(item.currencies?.[0]?.code),
    }));

    // Update cache
    cachedNews = articles;
    lastFetchTime = Date.now();

    return articles;
  } catch (error) {
    console.warn('Failed to fetch news from API, using demo data:', error);
    return demoArticles;
  }
}

/**
 * Get all news articles (async with API fallback)
 */
export async function fetchAllNews(): Promise<NewsArticle[]> {
  const news = await fetchNewsFromAPI();
  return [...news].sort((a, b) => b.publishedAt - a.publishedAt);
}

/**
 * Get all demo news articles (synchronous fallback)
 */
export function getAllNews(): NewsArticle[] {
  if (cachedNews && cachedNews.length > 0) {
    return [...cachedNews].sort((a, b) => b.publishedAt - a.publishedAt);
  }
  return [...demoArticles].sort((a, b) => b.publishedAt - a.publishedAt);
}

/**
 * Filter news by category (async with API)
 */
export async function fetchNewsByCategory(category: NewsCategory): Promise<NewsArticle[]> {
  const allNews = await fetchAllNews();
  if (category === 'all') {
    return allNews;
  }
  return allNews.filter((article) => article.category === category);
}

/**
 * Filter news by category (synchronous fallback)
 */
export function getNewsByCategory(category: NewsCategory): NewsArticle[] {
  const allNews = getAllNews();
  if (category === 'all') {
    return allNews;
  }
  return allNews.filter((article) => article.category === category);
}

/**
 * Get latest N news articles (async with API)
 */
export async function fetchLatestNews(limit: number = 5): Promise<NewsArticle[]> {
  const allNews = await fetchAllNews();
  return allNews.slice(0, limit);
}

/**
 * Get latest N news articles (synchronous fallback)
 */
export function getLatestNews(limit: number = 5): NewsArticle[] {
  return getAllNews().slice(0, limit);
}

/**
 * Get a single article by ID
 */
export function getArticleById(id: string): NewsArticle | undefined {
  return demoArticles.find((article) => article.id === id);
}

/**
 * Format time ago in Russian
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'только что';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} ${pluralize(diffMinutes, 'минуту', 'минуты', 'минут')} назад`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${pluralize(diffHours, 'час', 'часа', 'часов')} назад`;
  }
  if (diffDays < 7) {
    return `${diffDays} ${pluralize(diffDays, 'день', 'дня', 'дней')} назад`;
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Russian pluralization helper
 */
function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return many;
  }
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
}

export * from './types';
