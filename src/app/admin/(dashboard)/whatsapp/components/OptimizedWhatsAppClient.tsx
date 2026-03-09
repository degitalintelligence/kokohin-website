'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    getPaginatedContactsAction,
    getPaginatedMessagesAction,
    getChatMetricsAction,
    getWhatsAppMonitoringMetricsAction,
    syncChatsFromWahaAction,
} from '@/app/actions/whatsapp';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import SessionControl from './SessionControl';
import BroadcastModal from './BroadcastModal';
import { MessageSquare, Settings, Users, MessagesSquare, TrendingUp, BarChart3, Activity, AlertTriangle, RefreshCcw } from 'lucide-react';

export type Contact = {
    id: string;
    wa_id: string;
    name: string | null;
    avatar_url: string | null;
    last_message_at: string | null;
    unread_count?: number | null;
    erp_project_status?: string | null;
    erp_project_id?: string | null;
};

export type Message = {
    id: string;
    external_message_id: string;
    chat_id: string;
    body: string | null;
    type: string;
    direction: 'inbound' | 'outbound';
    sender_type: 'customer' | 'agent' | 'system';
    status: string;
    sent_at: string;
    quoted_message_id?: string | null;
    is_forwarded?: boolean | null;
    is_deleted?: boolean | null;
    mediaUrl?: string | null;
    mediaCaption?: string | null;
};

const CONTACTS_PER_PAGE = 20;
const MESSAGES_PER_PAGE = 50;

type OptimizedWhatsAppClientProps = {
    onContactsFetchFailure?: (error?: string) => void;
};

function getHealthBadge(status: string, isHealthy: boolean) {
    if (status === 'WORKING' && isHealthy) {
        return { iconClass: 'text-green-600', label: 'WORKING' };
    }
    if (status === 'UNKNOWN') {
        return { iconClass: 'text-gray-400', label: 'UNKNOWN' };
    }
    return { iconClass: 'text-[#E30613]', label: status };
}

export default function OptimizedWhatsAppClient({ onContactsFetchFailure }: OptimizedWhatsAppClientProps) {
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false); // Default to false, let useEffect handle it
    const [isInitialLoading, setIsInitialLoading] = useState(true); // Track initial load separately
    const [syncingFromWaha, setSyncingFromWaha] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [metrics, setMetrics] = useState({ totalChats: 0, responseRate: 0, conversionRate: 0 });
    const [monitoring, setMonitoring] = useState({
        connectionStatus: 'UNKNOWN',
        isHealthy: false,
        sentCount: 0,
        failedCount: 0,
        delayedCount: 0,
        errorRate: 0,
        alerts: [] as { id: string; anomaly_type: string; severity: string }[],
        fallbackCount24h: 0,
        fallbackTopReasons: [] as { reason: string; count: number }[],
    });
    const [supabase] = useState(() => createClient());
    const [searchQuery, setSearchQuery] = useState('');
    const [contactsPage, setContactsPage] = useState(1);
    const [messagesPage, setMessagesPage] = useState(1);
    const [contactsPagination, setContactsPagination] = useState({ total: 0, totalPages: 1 });
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [contactsError, setContactsError] = useState<string | null>(null);
    const healthBadge = getHealthBadge(monitoring.connectionStatus, monitoring.isHealthy);
    
    const selectedContactId = selectedContact?.id ?? null;
    const selectedWaId = selectedContact?.wa_id ?? null;

    // Memoized contact filtering
    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim()) return contacts;
        return contacts.filter(contact => {
            const name = contact.name || contact.wa_id;
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [contacts, searchQuery]);

    // Fetch contacts with pagination
    const fetchContacts = useCallback(async (page = 1, search = '', showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const result = await getPaginatedContactsAction(page, CONTACTS_PER_PAGE, search);
            
            if (result.success && result.contacts) {
                setContactsError(result.warning || null);
                setContacts(result.contacts);
                if (result.pagination) {
                    setContactsPagination({
                        total: result.pagination.total,
                        totalPages: result.pagination.totalPages,
                    });
                }
                setContactsPage(page);
            } else {
                console.error('Failed to fetch contacts:', result.error);
                const errorMessage = result.error || 'Terjadi kesalahan saat memuat daftar chat.';
                setContactsError(errorMessage);
                onContactsFetchFailure?.(errorMessage);
                setContacts([]);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat daftar chat.';
            setContactsError(errorMessage);
            onContactsFetchFailure?.(errorMessage);
            setContacts([]);
        } finally {
            if (showLoading) setLoading(false);
            setIsInitialLoading(false);
        }
    }, [onContactsFetchFailure]);

    // Fetch messages with pagination
    const fetchMessages = useCallback(async (contactId: string, waId: string, page = 1, append = false) => {
        if (!append) {
            setLoadingMessages(true);
        }
        try {
            const result = await getPaginatedMessagesAction(contactId, page, MESSAGES_PER_PAGE);
            if (result.success && result.messages) {
                if (append) {
                    setMessages(prev => [...result.messages.reverse(), ...prev]);
                } else {
                    setMessages(result.messages.reverse());
                }
                setMessagesPage(page);
                if (result.pagination) {
                    setHasMoreMessages(page < result.pagination.totalPages);
                }
            } else {
                console.error('Failed to fetch messages:', result.error);
                setMessages([]);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchContacts(1, searchQuery, true); // Use initial loading
        getChatMetricsAction().then((result) => {
            if (result.success && result.metrics) {
                setMetrics(result.metrics);
            }
        });
        getWhatsAppMonitoringMetricsAction().then((result) => {
            if (result.success && result.monitoring) {
                setMonitoring(result.monitoring);
            }
        });
    }, [fetchContacts]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            getWhatsAppMonitoringMetricsAction().then((result) => {
                if (result.success && result.monitoring) {
                    setMonitoring(result.monitoring);
                }
            });
        }, 10000);
        return () => window.clearInterval(interval);
    }, []);

    // Subscribe to real-time updates for chats
    useEffect(() => {
        const channel = supabase
            .channel('wa_chats_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wa_chats',
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        setContacts((prev) => 
                            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
                        );
                    } else if (payload.eventType === 'INSERT') {
                        // For simplicity, re-fetch page 1 on new chat to maintain order
                        fetchContacts(1, searchQuery, false);
                    } else if (payload.eventType === 'DELETE') {
                        setContacts((prev) => prev.filter(c => c.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) {
                    console.error('Subscription error:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, fetchContacts, searchQuery]);

    // Fetch messages when contact is selected
    useEffect(() => {
        if (!selectedContactId) return;

        fetchMessages(selectedContactId, selectedWaId || '', 1, false);

        // Subscribe to real-time message updates
        const channel = supabase
            .channel(`wa_messages_${selectedContactId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wa_messages',
                    filter: `chat_id=eq.${selectedContactId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMessages((prev) => {
                            const newMessage = payload.new as Message;
                            // Prevent duplicates
                            if (prev.some(m => m.external_message_id === newMessage.external_message_id)) {
                                return prev;
                            }
                            return [...prev, newMessage];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages((prev) => 
                            prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchMessages, selectedContactId, selectedWaId, supabase]);

    // Handle contact selection
    const handleSelectContact = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setMessages([]);
        setMessagesPage(1);
        setHasMoreMessages(true);
    }, []);

    // Handle load more messages
    const handleLoadMoreMessages = useCallback(() => {
        if (!selectedContactId || !selectedWaId || loadingMessages || !hasMoreMessages) return;
        fetchMessages(selectedContactId, selectedWaId, messagesPage + 1, true);
    }, [fetchMessages, selectedContactId, selectedWaId, loadingMessages, hasMoreMessages, messagesPage]);

    // Handle search with debouncing
    useEffect(() => {
        if (!searchQuery.trim() && contacts.length > 0) return; // Skip if empty search and already have contacts

        const timeoutId = setTimeout(() => {
            fetchContacts(1, searchQuery, false);
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, fetchContacts]);

    // Refresh messages callback
    const refreshMessages = useCallback(() => {
        if (selectedContactId && selectedWaId) {
            fetchMessages(selectedContactId, selectedWaId, 1, false);
        }
    }, [fetchMessages, selectedContactId, selectedWaId]);

    const handleSyncFromWaha = useCallback(async () => {
        if (syncingFromWaha) return;
        setSyncingFromWaha(true);
        try {
            const result = await syncChatsFromWahaAction(200);
            if (result.success) {
                await fetchContacts(1, searchQuery, true);
            } else {
                const message = result.error || 'Gagal sinkronisasi chat dari WAHA.';
                setContactsError(message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal sinkronisasi chat dari WAHA.';
            setContactsError(message);
        } finally {
            setSyncingFromWaha(false);
        }
    }, [syncingFromWaha, fetchContacts, searchQuery]);

    if (isInitialLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E30613]"></div>
            </div>
        );
    }

    return (
        <div className="flex h-full relative overflow-hidden font-sans">
            {/* Left Sidebar: Contacts */}
            <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#1D1D1B] flex items-center gap-2">
                        <MessageSquare className="text-[#E30613]" size={20} />
                        WhatsApp
                    </h2>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleSyncFromWaha}
                            disabled={syncingFromWaha}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-[#E30613] transition-all disabled:opacity-50"
                            title="Sync ulang dari WAHA"
                        >
                            <RefreshCcw size={18} className={syncingFromWaha ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={() => setShowBroadcast(true)}
                            className="p-2 hover:bg-[#E30613]/5 rounded-full text-gray-500 hover:text-[#E30613] transition-all"
                            title="Broadcast"
                        >
                            <Users size={20} />
                        </button>
                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            title="Pengaturan"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                <ChatList 
                    contacts={filteredContacts} 
                    selectedContactId={selectedContact?.id}
                    onSelectContact={handleSelectContact}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    pagination={contactsPagination}
                    currentPage={contactsPage}
                    onPageChange={fetchContacts}
                    errorMessage={contactsError}
                    onRetry={() => fetchContacts(contactsPage, searchQuery, true)}
                    isLoading={loading}
                />
            </div>

            {/* Main Content: Chat Window or Settings */}
            <div className="hidden md:flex flex-1 flex-col bg-[#f0f2f5] relative overflow-hidden">
                <div className="px-3 py-3 bg-[#f8f9fb] border-b border-gray-200">
                    <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-2">
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                            <MessagesSquare size={16} className="text-[#E30613]" />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Total Chat</p>
                                <p className="text-sm font-bold text-[#1D1D1B]">{metrics.totalChats}</p>
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                            <TrendingUp size={16} className="text-[#E30613]" />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Response Rate</p>
                                <p className="text-sm font-bold text-[#1D1D1B]">{metrics.responseRate}%</p>
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                            <BarChart3 size={16} className="text-[#E30613]" />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Conversion</p>
                                <p className="text-sm font-bold text-[#1D1D1B]">{metrics.conversionRate}%</p>
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                            <Activity size={16} className={healthBadge.iconClass} />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">WA Health</p>
                                <p className="text-sm font-bold text-[#1D1D1B]">{healthBadge.label}</p>
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-600" />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Sent 15m</p>
                                <p className="text-sm font-bold text-[#1D1D1B]">{monitoring.sentCount}</p>
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                            <AlertTriangle size={16} className={(monitoring.failedCount > 0 || monitoring.delayedCount > 0) ? 'text-[#E30613]' : 'text-gray-400'} />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Alert</p>
                                <p className="text-sm font-bold text-[#1D1D1B]">
                                    {monitoring.failedCount}/{monitoring.delayedCount} ({monitoring.errorRate}%)
                                </p>
                                <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[160px]">
                                    FB24h {monitoring.fallbackCount24h} · {(monitoring.fallbackTopReasons[0]?.reason ?? 'none')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {showSettings ? (
                    <SessionControl />
                ) : selectedContact ? (
                    <ChatWindow 
                        contact={selectedContact} 
                        messages={messages} 
                        onSendMessage={refreshMessages}
                        onLoadMore={handleLoadMoreMessages}
                        hasMore={hasMoreMessages}
                        isLoading={loadingMessages}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm">
                            <MessageSquare size={48} className="text-gray-200" />
                        </div>
                        <p className="text-lg font-medium text-gray-500">Pilih chat untuk memulai pesan</p>
                        <p className="text-sm mt-2">Terintegrasi dengan WAHA (WhatsApp HTTP API)</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
        </div>
    );
}
