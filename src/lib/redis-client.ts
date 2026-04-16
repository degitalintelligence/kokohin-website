/**
 * Redis Client untuk caching strategy WhatsApp
 * 
 * Mengimplementasikan caching layer untuk:
 * - Session data
 * - Contact lists
 * - Message history
 * - Media metadata
 * - Rate limiting
 */

import { WahaSession, WahaGroupMetadata } from './waha';

// Type definitions untuk contact
export interface Contact {
  id: string;
  wa_jid?: string;
  phone?: string | null;
  display_name?: string;
  profile_picture_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string | null;
  // Additional fields for compatibility
  contact_id?: string;
  wa_id?: string;
  name?: string;
  avatar_url?: string | null;
  unread_count?: number | null;
  erp_project_id?: string;
  erp_project_status?: string;
}

export interface Message {
  id: string;
  external_message_id?: string;
  chat_id: string;
  body?: string | null;
  type: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'user' | 'agent' | 'customer' | 'system';
  status: string;
  created_at?: string;
  updated_at?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  quoted_message_id?: string | null;
  is_forwarded?: boolean;
  is_deleted?: boolean;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
  raw_payload?: unknown;
  sender_contact?: Contact | null;
}

// Constant untuk WAHA connection pool
export const WAHA_MAX_CONNECTIONS = 10;

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

interface CachedData<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<'OK'>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  ping(): Promise<string>;
  disconnect(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  decr(key: string): Promise<number>;
}

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientInterface | null = null;
  private isConnected: boolean = false;
  private config: RedisConfig;

  private constructor(config: RedisConfig) {
    this.config = config;
  }

  static getInstance(config?: RedisConfig): RedisClient {
    if (!RedisClient.instance) {
      const redisConfig: RedisConfig = config || {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: Number(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
      };
      RedisClient.instance = new RedisClient(redisConfig);
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Dynamic import untuk menghindari error saat Redis tidak tersedia
      const Redis = await import('ioredis');
      
      const redisInstance = new Redis.default({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        enableReadyCheck: this.config.enableReadyCheck,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          console.warn('[Redis] Reconnecting due to error:', err.message);
          return true;
        },
      });

      // Create wrapper that matches our interface
      this.client = {
        get: (key: string) => redisInstance.get(key),
        set: (key: string, value: string, ttl?: number) => 
          ttl ? redisInstance.set(key, value, 'EX', ttl) : redisInstance.set(key, value, 'EX', 300),
        del: (key: string) => redisInstance.del(key),
        exists: (key: string) => redisInstance.exists(key),
        ping: () => redisInstance.ping(),
        disconnect: async () => redisInstance.disconnect(),
        on: (event: string, listener: (...args: unknown[]) => void) => redisInstance.on(event, listener),
        ttl: (key: string) => redisInstance.ttl(key),
        incr: (key: string) => redisInstance.incr(key),
        expire: (key: string, ttl: number) => redisInstance.expire(key, ttl),
        decr: (key: string) => redisInstance.decr(key),
      };

      if (!this.client) {
        throw new Error('Redis client not initialized');
      }

      this.client.on('connect', () => {
        console.warn('[Redis] Connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err: Error) => {
        console.error('[Redis] Connection error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.warn('[Redis] Connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.client.ping();
      
    } catch (error) {
      console.error('[Redis] Failed to initialize:', error);
      this.isConnected = false;
      // Fallback ke memory cache jika Redis tidak tersedia
      this.setupFallbackCache();
    }
  }

  private setupFallbackCache(): void {
    console.warn('[Redis] Setting up fallback memory cache');
    const memoryCache = new Map<string, CachedData>();
    
    this.client = {
      get: async (key: string): Promise<string | null> => {
        const cached = memoryCache.get(key);
        if (!cached) return null;
        
        const now = Date.now();
        if (now > cached.timestamp + cached.ttl * 1000) {
          memoryCache.delete(key);
          return null;
        }
        
        return JSON.stringify(cached.data);
      },
      
      set: async (key: string, value: string, ttl?: number): Promise<'OK'> => {
        const data: CachedData = {
          data: JSON.parse(value),
          timestamp: Date.now(),
          ttl: ttl || 300, // Default 5 menit
        };
        memoryCache.set(key, data);
        return 'OK';
      },
      
      del: async (key: string): Promise<number> => {
        return memoryCache.delete(key) ? 1 : 0;
      },
      
      exists: async (key: string): Promise<number> => {
        return memoryCache.has(key) ? 1 : 0;
      },
      
      ping: async (): Promise<string> => 'PONG',
      
      disconnect: async (): Promise<void> => {
        memoryCache.clear();
      },
      
      on: (): void => {
        // Event handlers not supported in memory cache
      },
      
      ttl: async (key: string): Promise<number> => {
        const cached = memoryCache.get(key);
        if (!cached) return -2;
        
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((cached.timestamp + cached.ttl * 1000 - now) / 1000));
        return remaining > 0 ? remaining : -2;
      },
      
      incr: async (key: string): Promise<number> => {
        const cached = memoryCache.get(key);
        if (!cached) {
          memoryCache.set(key, { data: '1', timestamp: Date.now(), ttl: 300 });
          return 1;
        }
        
        const current = parseInt(cached.data as string) || 0;
        const newValue = current + 1;
        memoryCache.set(key, { data: String(newValue), timestamp: cached.timestamp, ttl: cached.ttl });
        return newValue;
      },
      
      expire: async (key: string, ttl: number): Promise<number> => {
        const cached = memoryCache.get(key);
        if (!cached) return 0;
        
        cached.ttl = ttl;
        cached.timestamp = Date.now();
        return 1;
      },
      
      decr: async (key: string): Promise<number> => {
        const cached = memoryCache.get(key);
        if (!cached) {
          memoryCache.set(key, { data: '-1', timestamp: Date.now(), ttl: 300 });
          return -1;
        }
        
        const current = parseInt(cached.data as string) || 0;
        const newValue = current - 1;
        memoryCache.set(key, { data: String(newValue), timestamp: cached.timestamp, ttl: cached.ttl });
        return newValue;
      },
    };
    
    this.isConnected = true;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client) return null;
      const value = await this.client.get(key);
      if (!value) return null;
      
      const cached: CachedData<T> = JSON.parse(value);
      const now = Date.now();
      
      // Check if cache is expired
      if (now > cached.timestamp + cached.ttl * 1000) {
        await this.del(key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      console.error('[Redis] Get error:', error);
      return null;
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        ttl: options.ttl || 300, // Default 5 menit
      };
      
      const value = JSON.stringify(cacheData);
      const ttl = options.ttl || 300;
      
      if (!this.client) return false;
      await this.client.set(key, value, ttl);
      return true;
    } catch (error) {
      console.error('[Redis] Set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('[Redis] Del error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error('[Redis] Exists error:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.client) return -2;
      const result = await this.client.ttl(key);
      return result;
    } catch (error) {
      console.error('[Redis] TTL error:', error);
      return -2; // Key doesn't exist
    }
  }

  async increment(key: string, ttl?: number): Promise<number> {
    try {
      if (!this.client) return 0;
      const result = await this.client.incr(key);
      if (ttl && result === 1) {
        if (!this.client) return result;
        await this.client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('[Redis] Increment error:', error);
      return 0;
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      if (!this.client) return 0;
      const result = await this.client.decr(key);
      return result;
    } catch (error) {
      console.error('[Redis] Decrement error:', error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }

  async disconnect(): Promise<void> {
    if (this.client && this.client.disconnect) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// WhatsApp-specific cache keys
export class WhatsAppCache {
  private redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis || RedisClient.getInstance();
  }

  // Session cache
  async getSession(sessionId: string): Promise<WahaSession | null> {
    return this.redis.get<WahaSession>(`wa:session:${sessionId}`);
  }

  async setSession(sessionId: string, session: WahaSession, ttl: number = 180): Promise<boolean> {
    return this.redis.set(`wa:session:${sessionId}`, session, { ttl });
  }

  // Contact cache
  async getContact(contactId: string): Promise<Contact | null> {
    return this.redis.get<Contact>(`wa:contact:${contactId}`);
  }

  async setContact(contactId: string, contact: Contact, ttl: number = 300): Promise<boolean> {
    return this.redis.set(`wa:contact:${contactId}`, contact, { ttl });
  }

  async getContactsList(page: number, search: string): Promise<Contact[] | null> {
    const cacheKey = `wa:contacts:${page}:${search}:${CONTACTS_CACHE_VERSION}`;
    return this.redis.get<Contact[]>(cacheKey);
  }

  async setContactsList(page: number, search: string, contacts: Contact[], ttl: number = 60): Promise<boolean> {
    const cacheKey = `wa:contacts:${page}:${search}:${CONTACTS_CACHE_VERSION}`;
    return this.redis.set(cacheKey, contacts, { ttl });
  }

  // Message cache
  async getMessages(chatId: string, page: number): Promise<Message[] | null> {
    return this.redis.get<Message[]>(`wa:messages:${chatId}:${page}`);
  }

  async setMessages(chatId: string, page: number, messages: Message[], ttl: number = 120): Promise<boolean> {
    return this.redis.set(`wa:messages:${chatId}:${page}`, messages, { ttl });
  }

  // Media metadata cache
  async getMediaMetadata(messageId: string): Promise<Record<string, unknown> | null> {
    return this.redis.get(`wa:media:${messageId}`);
  }

  async setMediaMetadata(messageId: string, metadata: Record<string, unknown>, ttl: number = 3600): Promise<boolean> {
    return this.redis.set(`wa:media:${messageId}`, metadata, { ttl });
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowSeconds: number = 60): Promise<boolean> {
    const current = await this.redis.increment(`wa:ratelimit:${key}`, windowSeconds);
    return current <= limit;
  }

  // Group cache
  async getGroupMetadata(groupId: string): Promise<WahaGroupMetadata | null> {
    return this.redis.get<WahaGroupMetadata>(`wa:group:${groupId}`);
  }

  async setGroupMetadata(groupId: string, metadata: WahaGroupMetadata, ttl: number = 300): Promise<boolean> {
    return this.redis.set(`wa:group:${groupId}`, metadata, { ttl });
  }

  // Clear cache methods
  async clearContact(contactId: string): Promise<void> {
    await this.redis.del(`wa:contact:${contactId}`);
  }

  async clearMessages(chatId: string): Promise<void> {
    // Clear all pages for this chat
    for (let page = 1; page <= 10; page++) { // Assume max 10 pages
      await this.redis.del(`wa:messages:${chatId}:${page}`);
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.redis.del(`wa:session:${sessionId}`);
  }

  async clearAll(): Promise<void> {
    // This would need to be implemented with Redis keys pattern matching
    // For now, we'll just clear specific keys
    console.log('[WhatsAppCache] Clearing all cache - implement pattern matching for full cleanup');
  }
}

// Cache versioning untuk invalidasi
const CONTACTS_CACHE_VERSION = 'v1';
const MESSAGES_CACHE_VERSION = 'v1';

// Export singleton instances
let globalRedisClient: RedisClient | null = null;
let globalWhatsAppCache: WhatsAppCache | null = null;

export function getRedisClient(): RedisClient {
  if (!globalRedisClient) {
    globalRedisClient = RedisClient.getInstance();
  }
  return globalRedisClient;
}

export function getWhatsAppCache(): WhatsAppCache {
  if (!globalWhatsAppCache) {
    globalWhatsAppCache = new WhatsAppCache(getRedisClient());
  }
  return globalWhatsAppCache;
}

export async function initializeRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
}

export async function shutdownRedis(): Promise<void> {
  if (globalRedisClient) {
    await globalRedisClient.disconnect();
    globalRedisClient = null;
    globalWhatsAppCache = null;
  }
}