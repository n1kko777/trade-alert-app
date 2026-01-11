export type TickerQuote = {
  symbol: string;
  price: number;
};

type BybitTickerEntry = {
  symbol?: string;
  lastPrice?: string;
};

export const fetchTicker = async (symbol: string): Promise<TickerQuote> => {
  const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bybit API error (${response.status})`);
  }
  const data: { result?: { list?: BybitTickerEntry[] } } = await response.json();
  const entry = data?.result?.list?.[0];
  const price = Number(entry?.lastPrice);
  if (!Number.isFinite(price)) {
    throw new Error('Invalid price response');
  }
  return { symbol, price };
};

export const fetchAllTickers = async (): Promise<TickerQuote[]> => {
  const url = 'https://api.bybit.com/v5/market/tickers?category=spot';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bybit API error (${response.status})`);
  }
  const data: { result?: { list?: BybitTickerEntry[] } } = await response.json();
  const list = Array.isArray(data?.result?.list) ? data.result.list : [];
  return list
    .map((entry) => ({
      symbol: entry.symbol ?? '',
      price: Number(entry.lastPrice),
    }))
    .filter((entry) => entry.symbol && Number.isFinite(entry.price));
};

export const fetchFuturesSymbols = async (): Promise<string[]> => {
  const url = 'https://api.bybit.com/v5/market/tickers?category=linear';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bybit API error (${response.status})`);
  }
  const data: { result?: { list?: BybitTickerEntry[] } } = await response.json();
  const list = Array.isArray(data?.result?.list) ? data.result.list : [];
  return list
    .map((entry) => entry.symbol ?? '')
    .filter((symbol) => symbol.length > 0);
};
