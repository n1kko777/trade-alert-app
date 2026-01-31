export type NewsCategory = 'all' | 'bitcoin' | 'ethereum' | 'altcoins' | 'defi' | 'nft' | 'regulation';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: number; // timestamp in ms
  category: Exclude<NewsCategory, 'all'>;
}

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'altcoins', label: 'Altcoins' },
  { id: 'defi', label: 'DeFi' },
  { id: 'nft', label: 'NFT' },
  { id: 'regulation', label: 'Регулирование' },
];
