import type { ExchangeId } from '../exchanges/types';
import type {
  Signal,
  SignalStats,
  SignalFilter,
  SignalDirection,
  SignalStatus,
  TakeProfitLevel,
  AITrigger,
} from './types';
import { DEFAULT_AI_TRIGGERS } from './types';

export * from './types';

// In-memory storage (future: AsyncStorage)
let signals: Signal[] = [];
let listeners: ((signals: Signal[]) => void)[] = [];

const generateId = (): string => {
  return `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const notifyListeners = () => {
  listeners.forEach(listener => listener([...signals]));
};

// Calculate unrealized profit for active signals
const calculateUnrealizedProfit = (signal: Signal): number => {
  if (!signal.currentPrice || signal.status === 'closed') return 0;

  const priceDiff = signal.direction === 'BUY'
    ? signal.currentPrice - signal.entryPrice
    : signal.entryPrice - signal.currentPrice;

  return (priceDiff / signal.entryPrice) * 100;
};

// Signal Service
export const signalService = {
  // Get all signals
  getAllSignals(): Signal[] {
    return [...signals];
  },

  // Get active signals
  getActiveSignals(): Signal[] {
    return signals.filter(s => s.status === 'active' || s.status === 'pending');
  },

  // Get historical (closed) signals
  getHistoricalSignals(): Signal[] {
    return signals.filter(s => s.status === 'closed');
  },

  // Get signal by ID
  getSignalById(id: string): Signal | undefined {
    return signals.find(s => s.id === id);
  },

  // Filter signals
  filterSignals(filter: SignalFilter): Signal[] {
    return signals.filter(signal => {
      if (filter.symbol && !signal.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) {
        return false;
      }
      if (filter.exchange && signal.exchange !== filter.exchange) {
        return false;
      }
      if (filter.direction && signal.direction !== filter.direction) {
        return false;
      }
      if (filter.status && signal.status !== filter.status) {
        return false;
      }
      if (filter.dateFrom && signal.createdAt < filter.dateFrom) {
        return false;
      }
      if (filter.dateTo && signal.createdAt > filter.dateTo) {
        return false;
      }
      if (filter.minProfit !== undefined && (signal.profit ?? 0) < filter.minProfit) {
        return false;
      }
      if (filter.maxProfit !== undefined && (signal.profit ?? 0) > filter.maxProfit) {
        return false;
      }
      return true;
    });
  },

  // Add a new signal
  addSignal(signalData: Omit<Signal, 'id' | 'createdAt' | 'updatedAt'>): Signal {
    const now = Date.now();
    const signal: Signal = {
      ...signalData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      unrealizedProfit: 0,
    };
    signals.unshift(signal);
    notifyListeners();
    return signal;
  },

  // Update signal price and check TP/SL
  updateSignalPrice(id: string, currentPrice: number): Signal | undefined {
    const index = signals.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const signal = { ...signals[index] };
    signal.currentPrice = currentPrice;
    signal.updatedAt = Date.now();
    signal.unrealizedProfit = calculateUnrealizedProfit(signal);

    // Check take profit levels
    signal.takeProfit = signal.takeProfit.map(tp => {
      if (tp.hit) return tp;

      const isHit = signal.direction === 'BUY'
        ? currentPrice >= tp.price
        : currentPrice <= tp.price;

      if (isHit) {
        return { ...tp, hit: true, hitAt: Date.now() };
      }
      return tp;
    });

    // Check stop loss
    const stopLossHit = signal.direction === 'BUY'
      ? currentPrice <= signal.stopLoss
      : currentPrice >= signal.stopLoss;

    if (stopLossHit && signal.status === 'active') {
      signal.status = 'closed';
      signal.closedAt = Date.now();
      signal.closePrice = currentPrice;
      signal.profit = signal.unrealizedProfit;
    }

    // Check if all TPs hit (close signal)
    const allTpsHit = signal.takeProfit.every(tp => tp.hit);
    if (allTpsHit && signal.status === 'active') {
      signal.status = 'closed';
      signal.closedAt = Date.now();
      signal.closePrice = currentPrice;
      signal.profit = signal.unrealizedProfit;
    }

    signals[index] = signal;
    notifyListeners();
    return signal;
  },

  // Close a signal manually
  closeSignal(id: string, closePrice: number): Signal | undefined {
    const index = signals.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const signal = { ...signals[index] };
    signal.status = 'closed';
    signal.closedAt = Date.now();
    signal.updatedAt = Date.now();
    signal.closePrice = closePrice;
    signal.currentPrice = closePrice;
    signal.profit = calculateUnrealizedProfit({ ...signal, currentPrice: closePrice });

    signals[index] = signal;
    notifyListeners();
    return signal;
  },

  // Calculate aggregate stats
  getStats(): SignalStats {
    const closedSignals = signals.filter(s => s.status === 'closed');
    const activeSignals = signals.filter(s => s.status === 'active' || s.status === 'pending');

    const winningSignals = closedSignals.filter(s => (s.profit ?? 0) > 0);
    const losingSignals = closedSignals.filter(s => (s.profit ?? 0) < 0);

    const totalProfit = closedSignals.reduce((sum, s) => sum + (s.profit ?? 0), 0);
    const grossProfit = winningSignals.reduce((sum, s) => sum + (s.profit ?? 0), 0);
    const grossLoss = Math.abs(losingSignals.reduce((sum, s) => sum + (s.profit ?? 0), 0));

    const profits = closedSignals.map(s => s.profit ?? 0);
    const winProfits = winningSignals.map(s => s.profit ?? 0);
    const lossProfits = losingSignals.map(s => s.profit ?? 0);

    const holdingTimes = closedSignals
      .filter(s => s.closedAt)
      .map(s => (s.closedAt ?? 0) - s.createdAt);

    return {
      totalSignals: signals.length,
      activeSignals: activeSignals.length,
      closedSignals: closedSignals.length,
      winningSignals: winningSignals.length,
      losingSignals: losingSignals.length,
      winRate: closedSignals.length > 0
        ? (winningSignals.length / closedSignals.length) * 100
        : 0,
      totalProfit,
      avgProfit: closedSignals.length > 0
        ? totalProfit / closedSignals.length
        : 0,
      avgWin: winningSignals.length > 0
        ? grossProfit / winningSignals.length
        : 0,
      avgLoss: losingSignals.length > 0
        ? grossLoss / losingSignals.length
        : 0,
      bestTrade: profits.length > 0 ? Math.max(...profits) : 0,
      worstTrade: profits.length > 0 ? Math.min(...profits) : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      avgHoldingTime: holdingTimes.length > 0
        ? holdingTimes.reduce((sum, t) => sum + t, 0) / holdingTimes.length
        : 0,
    };
  },

  // Subscribe to signal updates
  subscribe(callback: (signals: Signal[]) => void): () => void {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },

  // Clear all signals
  clearSignals(): void {
    signals = [];
    notifyListeners();
  },

  // Generate demo signals for testing
  generateDemoSignals(count: number = 10): Signal[] {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT'];
    const exchanges: ExchangeId[] = ['binance', 'bybit', 'okx', 'mexc'];
    const directions: SignalDirection[] = ['BUY', 'SELL'];
    const statuses: SignalStatus[] = ['active', 'pending', 'closed'];

    const demoSignals: Signal[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const status = i < 3 ? 'active' : i < 5 ? 'pending' : 'closed';

      // Generate realistic prices based on symbol
      let basePrice = 0;
      switch (symbol) {
        case 'BTCUSDT': basePrice = 95000 + Math.random() * 5000; break;
        case 'ETHUSDT': basePrice = 3200 + Math.random() * 300; break;
        case 'SOLUSDT': basePrice = 180 + Math.random() * 40; break;
        case 'XRPUSDT': basePrice = 2.5 + Math.random() * 0.5; break;
        case 'DOGEUSDT': basePrice = 0.35 + Math.random() * 0.1; break;
        case 'ADAUSDT': basePrice = 0.95 + Math.random() * 0.2; break;
        case 'AVAXUSDT': basePrice = 35 + Math.random() * 10; break;
        case 'LINKUSDT': basePrice = 22 + Math.random() * 5; break;
        default: basePrice = 100;
      }

      const entryPrice = basePrice;
      const tp1Pct = 2 + Math.random() * 3;
      const tp2Pct = 5 + Math.random() * 5;
      const tp3Pct = 10 + Math.random() * 10;
      const slPct = 3 + Math.random() * 4;

      const multiplier = direction === 'BUY' ? 1 : -1;

      const takeProfit: TakeProfitLevel[] = [
        {
          price: entryPrice * (1 + multiplier * tp1Pct / 100),
          percentage: tp1Pct,
          hit: status === 'closed' ? Math.random() > 0.3 : false,
        },
        {
          price: entryPrice * (1 + multiplier * tp2Pct / 100),
          percentage: tp2Pct,
          hit: status === 'closed' ? Math.random() > 0.5 : false,
        },
        {
          price: entryPrice * (1 + multiplier * tp3Pct / 100),
          percentage: tp3Pct,
          hit: status === 'closed' ? Math.random() > 0.7 : false,
        },
      ];

      const stopLoss = entryPrice * (1 - multiplier * slPct / 100);

      // Generate AI triggers
      const aiTriggers: AITrigger[] = DEFAULT_AI_TRIGGERS.map(trigger => ({
        ...trigger,
        confirmed: Math.random() > 0.3,
      }));

      const confidence = aiTriggers.reduce(
        (sum, t) => sum + (t.confirmed ? t.weight * 100 : 0),
        0
      );

      // Calculate profit for closed signals
      let profit: number | undefined;
      let closePrice: number | undefined;
      let closedAt: number | undefined;

      if (status === 'closed') {
        const isWin = Math.random() > 0.35; // 65% win rate
        if (isWin) {
          // Hit one of the TPs
          const hitTp = takeProfit.find(tp => tp.hit) || takeProfit[0];
          profit = hitTp.percentage * (0.7 + Math.random() * 0.6);
          closePrice = entryPrice * (1 + multiplier * profit / 100);
        } else {
          // Hit stop loss
          profit = -slPct * (0.8 + Math.random() * 0.4);
          closePrice = stopLoss;
        }
        closedAt = now - Math.random() * 7 * 24 * 60 * 60 * 1000; // Last 7 days
      }

      const currentPrice = status === 'active'
        ? entryPrice * (1 + multiplier * (Math.random() * 4 - 1) / 100)
        : closePrice || entryPrice;

      const createdAt = now - Math.random() * 14 * 24 * 60 * 60 * 1000; // Last 14 days

      const signal: Signal = {
        id: generateId(),
        symbol,
        exchange,
        direction,
        entryPrice,
        currentPrice,
        takeProfit,
        stopLoss,
        stopLossPercentage: slPct,
        status,
        createdAt,
        updatedAt: closedAt || now - Math.random() * 60 * 60 * 1000,
        closedAt,
        closePrice,
        profit,
        unrealizedProfit: status === 'active' ? calculateUnrealizedProfit({
          direction,
          entryPrice,
          currentPrice,
        } as Signal) : undefined,
        aiTriggers,
        confidence,
      };

      demoSignals.push(signal);
    }

    // Sort by creation date (newest first)
    demoSignals.sort((a, b) => b.createdAt - a.createdAt);

    // Add to signals store
    signals = [...demoSignals, ...signals];
    notifyListeners();

    return demoSignals;
  },

  // Initialize with demo data
  initializeDemo(): void {
    if (signals.length === 0) {
      this.generateDemoSignals(12);
    }
  },
};
