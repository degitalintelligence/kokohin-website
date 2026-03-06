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

export class WahaClient {
    private baseUrl: string;
    private apiKey: string;
    private sessionId: string;
    private lastKnownSession: WahaSession | null = null;
    private lastKnownSessionAt = 0;

    constructor() {
        // Ensure baseUrl doesn't have a trailing slash
        this.baseUrl = WAHA_URL.endsWith('/') ? WAHA_URL.slice(0, -1) : WAHA_URL;
        this.apiKey = WAHA_API_KEY;
        this.sessionId = WAHA_SESSION_ID;
    }

    private async request<T>(path: string, options: RequestInit = {}, retries = 2): Promise<T> {
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
        return this.request<{ id?: string; message?: string }>('/api/sendText', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                text,
                session: this.sessionId
            })
        });
    }

    async sendMedia(chatId: string, file: { url: string; caption?: string; filename?: string }) {
        return this.request<Record<string, unknown>>('/api/sendFile', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                file,
                session: this.sessionId
            })
        });
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
        return this.request<unknown[]>(`/api/${this.sessionId}/chats`);
    }

    async getContact(contactId: string) {
        return this.request<Record<string, unknown>>(`/api/${this.sessionId}/contacts/${contactId}`);
    }

    async getMessages(chatId: string, limit = 20) {
        const encodedChatId = encodeURIComponent(chatId);
        return this.request<unknown[]>(`/api/messages?session=${this.sessionId}&chatId=${encodedChatId}&limit=${limit}`);
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
        return this.request<Array<{ id?: string; url?: string }>>('/api/webhooks');
    }

    async registerWebhook(url: string, secret: string, events: string[] = ['message', 'message.ack', 'session.status']) {
        return this.request<Record<string, unknown>>('/api/webhooks', {
            method: 'POST',
            body: JSON.stringify({
                url,
                events,
                hmac: secret
            })
        });
    }

    async deleteWebhook(id: string) {
        return this.request<Record<string, unknown>>(`/api/webhooks/${id}`, { method: 'DELETE' });
    }
}

export const waha = new WahaClient();
