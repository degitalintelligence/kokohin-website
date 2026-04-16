/**
 * Subscription Manager untuk Supabase Real-time
 * 
 * Menyediakan utilities untuk mengelola subscriptions dengan:
 * - Debouncing untuk mencegah excessive re-renders
 * - Rate limiting untuk high-frequency events
 * - Proper cleanup untuk mencegah memory leaks
 */

interface SubscriptionConfig {
  debounceMs?: number;
  maxCallsPerSecond?: number;
  maxCallsPerMinute?: number;
}

interface ThrottledFunction<T extends unknown[]> {
  (...args: T): void;
  cancel: () => void;
  flush: () => void;
}

interface GenericThrottledFunction {
  (...args: unknown[]): void;
  cancel: () => void;
  flush: () => void;
}

export class SubscriptionManager {
  private subscriptions = new Map<string, () => void>();
  private throttledFunctions = new Map<string, GenericThrottledFunction>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private rateLimitCounters = new Map<string, { count: number; resetTime: number }>();

  /**
   * Membuat throttled function dengan rate limiting
   */
  createThrottledFunction<T extends unknown[]>(
    func: (...args: T) => void,
    key: string,
    config: SubscriptionConfig = {}
  ): ThrottledFunction<T> {
    const { maxCallsPerSecond = 10, maxCallsPerMinute = 100 } = config;
    
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingArgs: T | null = null;

    const execute = (...args: T) => {
      // Rate limiting check
      const now = Date.now();
      const counterKey = `${key}_minute`;
      let counter = this.rateLimitCounters.get(counterKey);
      
      if (!counter || now >= counter.resetTime) {
        counter = { count: 0, resetTime: now + 60000 }; // Reset every minute
        this.rateLimitCounters.set(counterKey, counter);
      }

      if (counter.count >= maxCallsPerMinute) {
        console.warn(`[SubscriptionManager] Rate limit exceeded for ${key}`);
        return;
      }

      // Per-second rate limiting
      const timeSinceLastCall = now - lastCall;
      if (timeSinceLastCall < 1000 / maxCallsPerSecond) {
        pendingArgs = args;
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          if (pendingArgs) {
            lastCall = Date.now();
            counter!.count++;
            func(...pendingArgs);
            pendingArgs = null;
            timeoutId = null;
          }
        }, 1000 / maxCallsPerSecond - timeSinceLastCall);
        
        return;
      }

      lastCall = now;
      counter.count++;
      func(...args);
    };

    const throttledFunc = execute as ThrottledFunction<T>;
    
    throttledFunc.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        pendingArgs = null;
      }
    };

    throttledFunc.flush = () => {
      if (timeoutId && pendingArgs) {
        throttledFunc.cancel();
        func(...pendingArgs);
      }
    };

    this.throttledFunctions.set(key, throttledFunc as GenericThrottledFunction);
    return throttledFunc as ThrottledFunction<T>;
  }

  /**
   * Membuat debounced function
   */
  createDebouncedFunction<T extends unknown[]>(
    func: (...args: T) => void,
    key: string,
    delayMs: number
  ): (...args: T) => void {
    return (...args: T) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func(...args);
        this.debounceTimers.delete(key);
      }, delayMs);

      this.debounceTimers.set(key, timer);
    };
  }

  /**
   * Register subscription dengan automatic cleanup
   */
  registerSubscription(key: string, unsubscribe: () => void): void {
    // Unsubscribe existing subscription with same key
    const existing = this.subscriptions.get(key);
    if (existing) {
      existing();
    }

    this.subscriptions.set(key, unsubscribe);
  }

  /**
   * Unregister dan cleanup subscription
   */
  unregisterSubscription(key: string): void {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Cleanup semua resources
   */
  cleanup(): void {
    // Cleanup subscriptions
    for (const [key, unsubscribe] of this.subscriptions) {
      try {
        unsubscribe();
      } catch (error) {
        console.error(`[SubscriptionManager] Error unsubscribing ${key}:`, error);
      }
    }
    this.subscriptions.clear();

    // Cleanup throttled functions
    for (const throttledFunc of this.throttledFunctions.values()) {
      throttledFunc.cancel();
    }
    this.throttledFunctions.clear();

    // Cleanup debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Cleanup rate limit counters
    this.rateLimitCounters.clear();
  }

  /**
   * Get stats untuk debugging
   */
  getStats(): {
    activeSubscriptions: number;
    throttledFunctions: number;
    debounceTimers: number;
    rateLimitCounters: number;
  } {
    return {
      activeSubscriptions: this.subscriptions.size,
      throttledFunctions: this.throttledFunctions.size,
      debounceTimers: this.debounceTimers.size,
      rateLimitCounters: this.rateLimitCounters.size,
    };
  }
}

// Global instance untuk ease of use
let globalSubscriptionManager: SubscriptionManager | null = null;

export function getSubscriptionManager(): SubscriptionManager {
  if (!globalSubscriptionManager) {
    globalSubscriptionManager = new SubscriptionManager();
  }
  return globalSubscriptionManager;
}

export function resetSubscriptionManager(): void {
  if (globalSubscriptionManager) {
    globalSubscriptionManager.cleanup();
    globalSubscriptionManager = null;
  }
}