import type { Ticker, ExchangeId } from '../exchanges/types';
import type { PumpConfig, PumpEvent, PumpDetectorState } from './types';
import { DEFAULT_PUMP_CONFIG } from './types';

export class PumpDetector {
  private config: PumpConfig;
  private state: PumpDetectorState;
  private callbacks: ((pump: PumpEvent) => void)[] = [];
  private cleanupTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config: Partial<PumpConfig> = {}) {
    this.config = { ...DEFAULT_PUMP_CONFIG, ...config };
    this.state = {
      pumps: new Map(),
      priceHistory: new Map(),
    };
  }

  onPump(callback: (pump: PumpEvent) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  processTicker(ticker: Ticker, exchange: ExchangeId): PumpEvent | null {
    const key = `${exchange}:${ticker.symbol}`;
    const now = Date.now();
    const windowMs = this.config.windowMinutes * 60 * 1000;
    const cutoff = now - windowMs;

    // Update price history
    let history = this.state.priceHistory.get(key) || [];
    history.push({ ts: now, price: ticker.price, volume: ticker.volume24h });
    history = history.filter(p => p.ts >= cutoff);
    this.state.priceHistory.set(key, history);

    if (history.length < 2) return null;

    // Calculate change from oldest price in window
    const oldestPrice = history[0].price;
    const changePct = ((ticker.price - oldestPrice) / oldestPrice) * 100;

    // Check if this is a pump
    const existingPump = this.state.pumps.get(key);

    if (changePct >= this.config.thresholdPct) {
      if (existingPump) {
        // Update existing pump
        const updated: PumpEvent = {
          ...existingPump,
          currentPrice: ticker.price,
          peakPrice: Math.max(existingPump.peakPrice, ticker.price),
          changePct,
          peakChangePct: Math.max(existingPump.peakChangePct, changePct),
          volume24h: ticker.volume24h,
          lastUpdateTime: now,
          status: changePct >= existingPump.peakChangePct * 0.9 ? 'active' : 'cooling',
        };
        this.state.pumps.set(key, updated);
        this.notifyCallbacks(updated);
        return updated;
      } else {
        // New pump detected
        const newPump: PumpEvent = {
          id: `${key}-${now}`,
          symbol: ticker.symbol,
          exchange,
          startPrice: oldestPrice,
          currentPrice: ticker.price,
          peakPrice: ticker.price,
          changePct,
          peakChangePct: changePct,
          volume24h: ticker.volume24h,
          startTime: now,
          lastUpdateTime: now,
          status: 'active',
        };
        this.state.pumps.set(key, newPump);
        this.notifyCallbacks(newPump);
        return newPump;
      }
    } else if (existingPump && existingPump.status !== 'ended') {
      // Pump ended
      const ended: PumpEvent = {
        ...existingPump,
        currentPrice: ticker.price,
        changePct,
        lastUpdateTime: now,
        status: 'ended',
      };
      this.state.pumps.set(key, ended);
      this.notifyCallbacks(ended);

      // Clean up ended pumps after cooldown
      const timeoutId = setTimeout(() => {
        this.state.pumps.delete(key);
        this.cleanupTimeouts.delete(key);
      }, this.config.cooldownMinutes * 60 * 1000);
      this.cleanupTimeouts.set(key, timeoutId);

      return ended;
    }

    return null;
  }

  getActivePumps(): PumpEvent[] {
    return Array.from(this.state.pumps.values())
      .filter(p => p.status !== 'ended')
      .sort((a, b) => b.changePct - a.changePct);
  }

  getAllPumps(): PumpEvent[] {
    return Array.from(this.state.pumps.values())
      .sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);
  }

  updateConfig(config: Partial<PumpConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private notifyCallbacks(pump: PumpEvent): void {
    this.callbacks.forEach(cb => {
      try {
        cb(pump);
      } catch (error) {
        console.error('Pump callback error:', error);
      }
    });
  }

  cleanupStaleHistory(): void {
    const cutoff = Date.now() - this.config.windowMinutes * 60 * 1000;
    for (const [key, history] of this.state.priceHistory) {
      if (history.length === 0 || history[history.length - 1].ts < cutoff) {
        this.state.priceHistory.delete(key);
      }
    }
  }

  reset(): void {
    this.cleanupTimeouts.forEach(id => clearTimeout(id));
    this.cleanupTimeouts.clear();
    this.state.pumps.clear();
    this.state.priceHistory.clear();
  }
}

// Factory function for creating instances
export function createPumpDetector(config?: Partial<PumpConfig>): PumpDetector {
  return new PumpDetector(config);
}

// Singleton instance for app-wide usage
export const pumpDetector = new PumpDetector();
