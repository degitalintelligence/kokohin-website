/**
 * WAHA Connection Pool Manager
 * 
 * Manages connection pooling untuk WAHA API calls untuk meningkatkan performa
 * dan mencegah connection exhaustion.
 */

interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

interface PooledConnection {
  id: string;
  inUse: boolean;
  lastUsed: Date;
  requestCount: number;
}

export class WahaConnectionPool {
  private connections: PooledConnection[] = [];
  private config: ConnectionPoolConfig;
  private requestQueue: Array<() => void> = [];

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 20,
      idleTimeoutMs: config.idleTimeoutMs || 30000,
      connectionTimeoutMs: config.connectionTimeoutMs || 5000,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
    };

    // Initialize connection pool
    this.initializePool();
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  private initializePool(): void {
    for (let i = 0; i < this.config.maxConnections; i++) {
      this.connections.push({
        id: `conn-${i}-${Date.now()}`,
        inUse: false,
        lastUsed: new Date(),
        requestCount: 0,
      });
    }
  }

  private startCleanupInterval(): void {
    // Cleanup idle connections every 30 seconds
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 30000);
  }

  private cleanupIdleConnections(): void {
    const now = new Date();
    this.connections.forEach(conn => {
      if (!conn.inUse) {
        const idleTime = now.getTime() - conn.lastUsed.getTime();
        if (idleTime > this.config.idleTimeoutMs) {
          // Reset connection state
          conn.requestCount = 0;
        }
      }
    });
  }

  async acquireConnection(): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const attemptAcquire = () => {
        const availableConn = this.connections.find(conn => !conn.inUse);
        
        if (availableConn) {
          availableConn.inUse = true;
          availableConn.lastUsed = new Date();
          availableConn.requestCount++;
          resolve(availableConn);
        } else {
          // No available connections, queue the request
          this.requestQueue.push(attemptAcquire);
          
          // Set timeout for connection acquisition
          setTimeout(() => {
            const queueIndex = this.requestQueue.indexOf(attemptAcquire);
            if (queueIndex !== -1) {
              this.requestQueue.splice(queueIndex, 1);
              reject(new Error('Connection acquisition timeout'));
            }
          }, this.config.connectionTimeoutMs);
        }
      };

      attemptAcquire();
    });
  }

  releaseConnection(connection: PooledConnection): void {
    const conn = this.connections.find(c => c.id === connection.id);
    if (conn) {
      conn.inUse = false;
      conn.lastUsed = new Date();
    }

    // Process next request in queue
    if (this.requestQueue.length > 0) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        setImmediate(nextRequest);
      }
    }
  }

  async executeWithConnection<T>(
    operation: (connection: PooledConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.acquireConnection();
    
    try {
      const result = await operation(connection);
      return result;
    } finally {
      this.releaseConnection(connection);
    }
  }

  getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    queuedRequests: number;
  } {
    const activeConnections = this.connections.filter(conn => conn.inUse).length;
    
    return {
      totalConnections: this.connections.length,
      activeConnections,
      idleConnections: this.connections.length - activeConnections,
      queuedRequests: this.requestQueue.length,
    };
  }

  async shutdown(): Promise<void> {
    // Wait for all connections to be released
    while (this.connections.some(conn => conn.inUse)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clear request queue
    this.requestQueue = [];
    
    console.log('[WAHA Connection Pool] Shutdown complete');
  }
}

// Global connection pool instance
let globalPool: WahaConnectionPool | null = null;

export function getWahaConnectionPool(): WahaConnectionPool {
  if (!globalPool) {
    globalPool = new WahaConnectionPool({
      maxConnections: 20,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 5000,
      retryAttempts: 3,
      retryDelayMs: 1000,
    });
  }
  return globalPool;
}

export function resetWahaConnectionPool(): void {
  if (globalPool) {
    globalPool.shutdown();
    globalPool = null;
  }
}