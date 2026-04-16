/**
 * WhatsApp HTTP API (WAHA) Client Library
 * Handles communication with the WAHA server for real-time messaging,
 * session management, and media handling.
 */

const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';
const WAHA_SESSION_ID = process.env.WAHA_SESSION_ID || 'default';
const WAHA_REQUEST_TIMEOUT_MS = Number(process.env.WAHA_REQUEST_TIMEOUT_MS || '10000');
const WAHA_SESSION_CACHE_TTL_MS = Number(process.env.WAHA_SESSION_CACHE_TTL_MS || '180000');

export interface WahaSession {
    name: string;
    status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
    config: Record<string, unknown>;
    me?: {
        id: string;
        pushName: string;
    };
}

export interface WahaMessage {
    id: string;
    body: string;
    from: string;
    to: string;
    type: string;
    timestamp: number;
    fromMe: boolean;
    hasMedia: boolean;
}

type WahaGroupParticipant = {
    id: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
};

export type WahaGroupMetadata = {
    id?: string;
    subject?: string;
    name?: string;
    participants?: WahaGroupParticipant[];
};

// Connection Pool Configuration
export const WAHA_MAX_CONNECTIONS = 10;

interface ConnectionPoolConfig {
    maxConnections: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
}

class WahaConnectionPool {
    private config: ConnectionPoolConfig;
    private activeConnections = 0;
    private waitQueue: Array<() => void> = [];

    constructor(config: ConnectionPoolConfig) {
        this.config = config;
    }

    async acquireConnection(): Promise<void> {
        if (this.activeConnections < this.config.maxConnections) {
            this.activeConnections++;
            return Promise.resolve();
        }

        // Wait for available connection
        return new Promise<void>((resolve) => {
            this.waitQueue.push(resolve);
        });
    }

    releaseConnection(): void {
        this.activeConnections--;
        
        // Process waiting queue
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift();
            if (next) {
                this.activeConnections++;
                next();
            }
        }
    }

    destroy(): void {
        // Clear all waiting connections
        this.waitQueue.forEach(resolve => resolve());
        this.waitQueue = [];
        this.activeConnections = 0;
    }
}

export class WahaClient {
    private baseUrl: string;
    private apiKey: string;
    private sessionId: string;
    private lastKnownSession: WahaSession | null = null;
    private lastKnownSessionAt = 0;
    private groupCache = new Map<string, { metadata: WahaGroupMetadata; expiresAt: number }>();
    private connectionPool: WahaConnectionPool;

    constructor() {
        // Ensure baseUrl doesn't have a trailing slash
        this.baseUrl = WAHA_URL.endsWith('/') ? WAHA_URL.slice(0, -1) : WAHA_URL;
        this.apiKey = WAHA_API_KEY;
        this.sessionId = WAHA_SESSION_ID;
        
        // Initialize connection pool
        this.connectionPool = new WahaConnectionPool({
            maxConnections: WAHA_MAX_CONNECTIONS,
            idleTimeoutMs: 30000,
            connectionTimeoutMs: WAHA_REQUEST_TIMEOUT_MS,
        });
    }

    private async request<T>(path: string, options: RequestInit = {}, retries = 2): Promise<T> {
        const connection = await this.connectionPool.acquireConnection();
        
        try {
            const url = `${this.baseUrl}${path}`;
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (this.apiKey) {
                headers['X-Api-Key'] = this.apiKey;
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            if (options.headers) {
                Object.assign(headers, options.headers);
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), WAHA_REQUEST_TIMEOUT_MS);

            try {
                const response = await fetch(url, { ...options, headers, signal: controller.signal });
                
                if (!response.ok && [502, 503, 504].includes(response.status) && retries > 0) {
                    console.warn(`[WAHA Client] Transient error ${response.status} on ${path}. Retrying... (${retries} left)`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.request<T>(path, options, retries - 1);
                }

                if (!response.ok) {
                    let errorMessage = `WAHA request failed: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } catch {
                        try {
                            const text = await response.text();
                            errorMessage = text || errorMessage;
                        } catch {}
                    }
                    throw new Error(errorMessage);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json() as Promise<T>;
                }
                
                return response.text() as T;
            } catch (error: unknown) {
                const isTimeout = error instanceof DOMException && error.name === 'AbortError';
                const isNetworkError =
                    error instanceof Error &&
                    (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network'));
                if (retries > 0 && (isTimeout || isNetworkError)) {
                    console.warn(`[WAHA Client] Timeout/network error on ${path}. Retrying... (${retries} left)`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    return this.request<T>(path, options, retries - 1);
                }
                throw error;
            } finally {
                clearTimeout(timeout);
            }
        } finally {
            this.connectionPool.releaseConnection();
        }
    }

    private async requestWithCandidates<T>(paths: string[], options: RequestInit = {}, retries = 1): Promise<T> {
        const errors: string[] = [];
        for (const path of paths) {
            try {
                return await this.request<T>(path, options, retries);
            } catch (error: unknown) {
                const message = this.getErrorText(error) || 'unknown error';
                errors.push(`${path}: ${message}`);
            }
        }
        throw new Error(errors.join(' | ') || 'No WAHA endpoint candidates succeeded');
    }

    private normalizeArrayPayload<T>(payload: unknown): T[] {
        if (Array.isArray(payload)) return payload as T[];
        if (payload && typeof payload === 'object') {
            const record = payload as Record<string, unknown>;
            if (Array.isArray(record.data)) return record.data as T[];
            if (Array.isArray(record.chats)) return record.chats as T[];
            if (Array.isArray(record.messages)) return record.messages as T[];
            if (Array.isArray(record.results)) return record.results as T[];
        }
        return [];
    }

    private getErrorText(error: unknown): string {
        if (error instanceof Error) return error.message || '';
        return '';
    }

    private isNotFoundError(error: unknown): boolean {
        const message = this.getErrorText(error);
        return message.includes('404') || message.toLowerCase().includes('not found');
    }

    private isTransientSessionError(error: unknown): boolean {
        const message = this.getErrorText(error).toLowerCase();
        return (
            message.includes('502') ||
            message.includes('503') ||
            message.includes('504') ||
            message.includes('429') ||
            message.includes('fetch') ||
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econn')
        );
    }

    private rememberSession(session: WahaSession | null) {
        if (!session) return;
        this.lastKnownSession = session;
        this.lastKnownSessionAt = Date.now();
    }

    private getCachedSession(): WahaSession | null {
        if (!this.lastKnownSession) return null;
        if (Date.now() - this.lastKnownSessionAt > WAHA_SESSION_CACHE_TTL_MS) return null;
        return this.lastKnownSession;
    }

    // --- Session Management ---

    async getSessions(): Promise<WahaSession[]> {
        const sessions = await this.request<WahaSession[]>('/api/sessions', {}, 1);
        const current = sessions.find((session) => session.name === this.sessionId);
        if (current) this.rememberSession(current);
        return sessions;
    }

    async getSessionStatus(): Promise<WahaSession | null> {
        try {
            const session = await this.request<WahaSession>(`/api/sessions/${this.sessionId}`, {}, 1);
            this.rememberSession(session);
            return session;
        } catch (error: unknown) {
            if (this.isNotFoundError(error)) {
                const stoppedSession = {
                    name: this.sessionId,
                    status: 'STOPPED',
                    config: {}
                } satisfies WahaSession;
                this.rememberSession(stoppedSession);
                return stoppedSession;
            }

            if (this.isTransientSessionError(error)) {
                try {
                    const sessions = await this.getSessions();
                    const current = sessions.find((session) => session.name === this.sessionId);
                    if (current) {
                        this.rememberSession(current);
                        return current;
                    }
                } catch {}

                const cached = this.getCachedSession();
                if (cached) {
                    return {
                        ...cached,
                        config: {
                            ...cached.config,
                            warning: 'WAHA temporary 503 from status endpoint',
                            lastTransientError: this.getErrorText(error),
                        },
                    };
                }

                return {
                    name: this.sessionId,
                    status: 'STARTING',
                    config: {
                        warning: 'WAHA status endpoint temporary unavailable',
                        lastTransientError: this.getErrorText(error),
                    }
                };
            }
            throw error;
        }
    }

    async startSession() {
        return this.request<Record<string, unknown>>(`/api/sessions/${this.sessionId}/start`, { method: 'POST' });
    }

    async stopSession() {
        return this.request<Record<string, unknown>>(`/api/sessions/${this.sessionId}/stop`, { method: 'POST' });
    }

    async logoutSession() {
        return this.request<Record<string, unknown>>(`/api/sessions/${this.sessionId}/logout`, { method: 'POST' });
    }

    private async fetchQrFromEndpoint(path: string, headers: Record<string, string>): Promise<string | null> {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, { headers });
            if (!response.ok) {
                return null;
            }

            const buffer = await response.arrayBuffer();
            const contentType = response.headers.get('content-type') || '';

            if (contentType.startsWith('image/')) {
                return Buffer.from(buffer).toString('base64');
            }

            const text = new TextDecoder().decode(buffer).replace(/["']/g, '').trim();
            if (!text) {
                return null;
            }

            if (contentType.includes('application/json')) {
                try {
                    const json = JSON.parse(text);
                    if (typeof json.qr === 'string' && json.qr.length > 10) return json.qr;
                    if (typeof json.qrCode === 'string' && json.qrCode.length > 10) return json.qrCode;
                    if (typeof json.data === 'string' && json.data.length > 10) return json.data;
                } catch {}
                return null;
            }

            return text.length > 10 ? text : null;
        } catch {
            return null;
        }
    }

    async getScreenshot(): Promise<string | null> {
        const headers: Record<string, string> = {};
        if (this.apiKey) {
            headers['X-Api-Key'] = this.apiKey;
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const endpointCandidates = [
            `/api/${this.sessionId}/auth/qr`,
            `/api/sessions/${this.sessionId}/screenshot`,
            '/api/screenshot',
            `/api/sessions/${this.sessionId}/qr`,
        ];

        for (const path of endpointCandidates) {
            const qr = await this.fetchQrFromEndpoint(path, headers);
            if (qr) {
                return qr;
            }
        }

        return null;
    }

    // --- Messaging ---

    async sendMessage(chatId: string, text: string) {
        return this.requestWithCandidates<{ id?: string; message?: string }>(
            ['/api/sendText', '/api/messages/send-text', '/api/messages/text'],
            {
                method: 'POST',
                body: JSON.stringify({
                    chatId,
                    text,
                    session: this.sessionId
                })
            }
        );
    }

    async sendMedia(chatId: string, file: { url: string; caption?: string; filename?: string }) {
        return this.requestWithCandidates<Record<string, unknown>>(
            ['/api/sendFile', '/api/messages/send-media', '/api/messages/media'],
            {
                method: 'POST',
                body: JSON.stringify({
                    chatId,
                    file,
                    session: this.sessionId
                })
            }
        );
    }

    async sendTemplate(chatId: string, templateName: string, variables: string[] = []) {
        return this.request<{ id?: string }>('/api/sendTemplate', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                template: {
                    name: templateName,
                    language: 'id',
                    components: variables.length > 0 ? [{ type: 'body', parameters: variables.map((text) => ({ type: 'text', text })) }] : [],
                },
                session: this.sessionId,
            }),
        });
    }

    async sendInteractiveButtons(chatId: string, text: string, buttons: { id: string; title: string }[]) {
        return this.request<{ id?: string }>('/api/sendButtons', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                body: text,
                buttons,
                session: this.sessionId,
            }),
        });
    }

    async forwardMessage(chatId: string, messageId: string) {
        return this.request<Record<string, unknown>>('/api/forwardMessage', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                messageId,
                session: this.sessionId
            })
        });
    }

    async deleteMessage(chatId: string, messageId: string) {
        return this.request<Record<string, unknown>>('/api/deleteMessage', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                messageId,
                session: this.sessionId
            })
        });
    }

    async replyMessage(chatId: string, quotedMessageId: string, text: string) {
        return this.request<{ id?: string }>('/api/sendText', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                text,
                reply_to: quotedMessageId,
                session: this.sessionId
            })
        });
    }

    // --- Contacts & Chats ---

    async getChats() {
        const response = await this.requestWithCandidates<unknown>(
            [
                `/api/${this.sessionId}/chats`,
                `/api/chats?session=${this.sessionId}`,
                `/api/sessions/${this.sessionId}/chats`,
            ],
            {},
            1
        );
        return this.normalizeArrayPayload<unknown>(response);
    }

    async getContact(contactId: string) {
        return this.request<Record<string, unknown>>(`/api/${this.sessionId}/contacts/${contactId}`);
    }

    async getMessages(chatId: string, limit = 20) {
        const encodedChatId = encodeURIComponent(chatId);
        const response = await this.requestWithCandidates<unknown>(
            [
                `/api/messages?session=${this.sessionId}&chatId=${encodedChatId}&limit=${limit}`,
                `/api/${this.sessionId}/messages?chatId=${encodedChatId}&limit=${limit}`,
                `/api/chats/${encodedChatId}/messages?session=${this.sessionId}&limit=${limit}`,
            ],
            {},
            1
        );
        return this.normalizeArrayPayload<unknown>(response);
    }

    async getGroupMetadata(chatId: string): Promise<WahaGroupMetadata> {
        const encodedChatId = encodeURIComponent(chatId);
        const candidates = [
            `/api/${this.sessionId}/groups/${encodedChatId}`,
            `/api/groups/${encodedChatId}?session=${this.sessionId}`,
            `/api/${this.sessionId}/chats/${encodedChatId}`,
            `/api/chats/${encodedChatId}?session=${this.sessionId}`,
        ];

        const raw = await this.requestWithCandidates<unknown>(candidates, {}, 1);
        if (!raw || typeof raw !== 'object') {
            return {};
        }

        const record = raw as Record<string, unknown>;
        const metadataSource = (() => {
            if (record.groupMetadata && typeof record.groupMetadata === 'object') {
                return record.groupMetadata as Record<string, unknown>;
            }
            if (record.metadata && typeof record.metadata === 'object') {
                return record.metadata as Record<string, unknown>;
            }
            return record;
        })();

        let rawParticipants: unknown[] = Array.isArray((metadataSource as Record<string, unknown>).participants)
            ? ((metadataSource as Record<string, unknown>).participants as unknown[])
            : Array.isArray(record.participants)
                ? (record.participants as unknown[])
                : [];

        if (rawParticipants.length === 0) {
            try {
                const participantsResponse = await this.requestWithCandidates<unknown>(
                    [
                        `/api/${this.sessionId}/groups/${encodedChatId}/participants`,
                        `/api/groups/${encodedChatId}/participants?session=${this.sessionId}`,
                    ],
                    {},
                    1
                );
                if (Array.isArray(participantsResponse)) {
                    rawParticipants = participantsResponse as unknown[];
                } else if (
                    participantsResponse &&
                    typeof participantsResponse === 'object' &&
                    Array.isArray((participantsResponse as Record<string, unknown>).participants)
                ) {
                    rawParticipants = (participantsResponse as Record<string, unknown>)
                        .participants as unknown[];
                }
            } catch {
                rawParticipants = [];
            }
        }

        const participants: WahaGroupParticipant[] = rawParticipants
            .map((p) => (p && typeof p === 'object' ? (p as Record<string, unknown>) : null))
            .filter((p): p is Record<string, unknown> => Boolean(p))
            .map((p) => {
                const rawId = p.id ?? p.jid;
                let id = '';
                if (typeof rawId === 'string') {
                    id = rawId;
                } else if (rawId && typeof rawId === 'object') {
                    const idObj = rawId as Record<string, unknown>;
                    if (typeof idObj._serialized === 'string') {
                        id = idObj._serialized;
                    } else if (typeof idObj.user === 'string' && typeof idObj.server === 'string') {
                        id = `${idObj.user}@${idObj.server}`;
                    }
                }
                const isAdmin = typeof p.isAdmin === 'boolean' ? p.isAdmin : undefined;
                const isSuperAdmin = typeof p.isSuperAdmin === 'boolean' ? p.isSuperAdmin : undefined;
                if (!id) return null;
                const participant: WahaGroupParticipant = {
                    id,
                };
                if (typeof isAdmin !== 'undefined') {
                    participant.isAdmin = isAdmin;
                }
                if (typeof isSuperAdmin !== 'undefined') {
                    participant.isSuperAdmin = isSuperAdmin;
                }
                return participant;
            })
            .filter((p): p is WahaGroupParticipant => Boolean(p));

        return {
            id:
                typeof (metadataSource as Record<string, unknown>).id === 'string'
                    ? ((metadataSource as Record<string, unknown>).id as string)
                    : typeof record.id === 'string'
                        ? (record.id as string)
                        : undefined,
            subject:
                typeof (metadataSource as Record<string, unknown>).subject === 'string'
                    ? ((metadataSource as Record<string, unknown>).subject as string)
                    : typeof record.subject === 'string'
                        ? (record.subject as string)
                        : undefined,
            name:
                typeof (metadataSource as Record<string, unknown>).name === 'string'
                    ? ((metadataSource as Record<string, unknown>).name as string)
                    : typeof record.name === 'string'
                        ? (record.name as string)
                        : undefined,
            participants,
        };
    }

    async getGroupMetadataCached(chatId: string, ttlMs = 5 * 60 * 1000): Promise<WahaGroupMetadata> {
        const key = `${this.sessionId}:${chatId}`;
        const now = Date.now();
        const cached = this.groupCache.get(key);
        if (cached && cached.expiresAt > now) {
            return cached.metadata;
        }
        const metadata = await this.getGroupMetadata(chatId);
        this.groupCache.set(key, { metadata, expiresAt: now + ttlMs });
        return metadata;
    }

    // --- Presence & Seen ---
    async sendSeen(chatId: string) {
        return this.request<Record<string, unknown>>('/api/sendSeen', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                session: this.sessionId
            })
        });
    }

    async sendTyping(chatId: string) {
        return this.request<Record<string, unknown>>('/api/startTyping', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                session: this.sessionId
            })
        });
    }

    async stopTyping(chatId: string) {
        return this.request<Record<string, unknown>>('/api/stopTyping', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                session: this.sessionId
            })
        });
    }

    // --- Webhooks ---
    async getWebhooks() {
        const response = await this.requestWithCandidates<unknown>(
            ['/api/webhooks', '/api/webhook'],
            {},
            1
        );
        return this.normalizeArrayPayload<{ id?: string; url?: string }>(response);
    }

    async registerWebhook(url: string, secret: string, events: string[] = ['message', 'message.ack', 'session.status']) {
        return this.requestWithCandidates<Record<string, unknown>>(
            ['/api/webhooks', '/api/webhook'],
            {
                method: 'POST',
                body: JSON.stringify({
                    url,
                    events,
                    hmac: secret
                })
            }
        );
    }

    async deleteWebhook(id: string) {
        return this.request<Record<string, unknown>>(`/api/webhooks/${id}`, { method: 'DELETE' });
    }

    /**
     * Cleanup connection pool and resources
     * Should be called when the client is no longer needed
     */
    async destroy(): Promise<void> {
        try {
            await this.connectionPool.destroy();
            this.groupCache.clear();
            this.lastKnownSession = null;
            console.log('[WAHA Client] Connection pool and resources cleaned up');
        } catch (error) {
            console.error('[WAHA Client] Error during cleanup:', error);
        }
    }
}

export const waha = new WahaClient();
