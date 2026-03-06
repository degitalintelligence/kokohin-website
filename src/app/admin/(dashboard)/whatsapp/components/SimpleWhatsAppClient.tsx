'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    getChatsAction,
    getMessagesAction,
    getChatMetricsAction,
    getWhatsAppMonitoringMetricsAction,
} from '@/app/actions/whatsapp';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import SessionControl from './SessionControl';
import BroadcastModal from './BroadcastModal';
import { MessageSquare, Settings, Users, MessagesSquare, TrendingUp, BarChart3, Activity } from 'lucide-react';

// Import types from the optimized component
import type { Contact, Message } from './OptimizedWhatsAppClient';

function getHealthBadge(status: string) {
    if (status === 'WORKING') return { iconClass: 'text-green-600', label: 'WORKING' };
    if (status === 'UNKNOWN') return { iconClass: 'text-gray-400', label: 'UNKNOWN' };
    return { iconClass: 'text-[#E30613]', label: status };
}

// Simple fallback component that uses the original implementation
export default function SimpleWhatsAppClient() {
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [metrics, setMetrics] = useState({ totalChats: 0, responseRate: 0, conversionRate: 0 });
    const [connectionStatus, setConnectionStatus] = useState('UNKNOWN');
    const [contactsError, setContactsError] = useState<string | null>(null);
    const healthBadge = getHealthBadge(connectionStatus);
    const [supabase] = useState(() => createClient());

    // Simple fetch without pagination
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch contacts and leads in parallel (original implementation)
                const [contactsRes, leadsRes] = await Promise.all([
                    supabase
                        .from('wa_chats')
                        .select(`
                            id, 
                            contact_id, 
                            unread_count, 
                            last_message_at, 
                            wa_contacts (
                                id, 
                                wa_jid, 
                                display_name, 
                                avatar_url, 
                                phone
                            )
                        `)
                        .order('last_message_at', { ascending: false })
                        .limit(50),
                    supabase
                        .from('erp_projects')
                        .select('id, phone, status, customer_name')
                ]);

                const { data: chatsData, error: chatsError } = contactsRes;
                const { data: leadsData } = leadsRes;

                if (!chatsError && chatsData) {
                    setContactsError(null);
                    // Map ERP data to contacts
                    const leadsMap = new Map<string, { id: string, status: string, name: string }>();
                    if (leadsData) {
                        leadsData.forEach(lead => {
                            const cleanPhone = lead.phone.replace(/\D/g, '');
                            if (cleanPhone) {
                                leadsMap.set(cleanPhone, { id: lead.id, status: lead.status, name: lead.customer_name });
                            }
                        });
                    }

                    const mappedContacts: Contact[] = chatsData.map(chat => {
                        const contactSource = (chat.wa_contacts as {
                            wa_jid?: string;
                            display_name?: string | null;
                            avatar_url?: string | null;
                            phone?: string | null;
                        } | {
                            wa_jid?: string;
                            display_name?: string | null;
                            avatar_url?: string | null;
                            phone?: string | null;
                        }[] | null);
                        const contact = Array.isArray(contactSource) ? (contactSource[0] ?? null) : contactSource;
                        const waJid = contact?.wa_jid || '';
                        const cleanPhone = contact?.phone || waJid.split('@')[0].replace(/\D/g, '');
                        const leadInfo = leadsMap.get(cleanPhone);
                        
                        return {
                            id: chat.id,
                            wa_id: waJid,
                            name: contact?.display_name || leadInfo?.name || waJid.split('@')[0],
                            avatar_url: contact?.avatar_url ?? null,
                            last_message_at: chat.last_message_at,
                            unread_count: chat.unread_count || 0,
                            erp_project_id: leadInfo?.id,
                            erp_project_status: leadInfo?.status,
                        };
                    });
                    
                    setContacts(mappedContacts);
                } else {
                    const fallbackError = chatsError?.message || 'Gagal memuat chat dari database.';
                    // Fallback to WAHA API if database fails
                    const fallback = await getChatsAction();
                    if (fallback.success) {
                        setContactsError(null);
                        const mappedContacts: Contact[] = (fallback.chats || []).map(chat => ({
                            id: chat.id,
                            wa_id: chat.id,
                            name: chat.name,
                            avatar_url: null,
                            last_message_at: chat.timestamp,
                            unread_count: 0,
                            erp_project_id: null,
                            erp_project_status: null,
                        }));
                        setContacts(mappedContacts);
                    } else {
                        setContactsError(fallback.error || fallbackError);
                        setContacts([]);
                    }
                }
                
                // Fetch metrics
                const metricsResult = await getChatMetricsAction();
                if (metricsResult.success && metricsResult.metrics) {
                    setMetrics(metricsResult.metrics);
                }
                const monitoringResult = await getWhatsAppMonitoringMetricsAction();
                if (monitoringResult.success && monitoringResult.monitoring) {
                    setConnectionStatus(monitoringResult.monitoring.connectionStatus);
                }
                
            } catch (error) {
                console.error('Error in SimpleWhatsAppClient:', error);
                setContactsError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat daftar chat.');
                // Final fallback - empty state
                setContacts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchData();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    // Simple message fetcher
    const fetchMessages = async (chatId: string, waId: string) => {
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from('wa_messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('sent_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setMessages(data.reverse());
            } else {
                // Fallback to WAHA API
                const fallback = await getMessagesAction(waId);
                if (fallback.success) {
                    const mappedMessages: Message[] = (fallback.messages || []).map(message => ({
                        id: message.id,
                        external_message_id: message.id,
                        chat_id: chatId,
                        body: message.body,
                        type: message.type,
                        direction: message.fromMe ? 'outbound' : 'inbound',
                        sender_type: message.fromMe ? 'agent' : 'customer',
                        status: message.status,
                        sent_at: message.timestamp,
                        quoted_message_id: message.quotedMessageId,
                        is_forwarded: message.isForwarded,
                        is_deleted: message.isDeleted,
                    }));
                    setMessages(mappedMessages);
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    if (loading) {
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
                    contacts={contacts} 
                    selectedContactId={selectedContact?.id}
                    onSelectContact={setSelectedContact}
                    errorMessage={contactsError}
                    onRetry={() => window.location.reload()}
                />
            </div>

            {/* Main Content: Chat Window or Settings */}
            <div className="hidden md:flex flex-1 flex-col bg-[#f0f2f5] relative overflow-hidden">
                <div className="px-3 py-3 bg-[#f8f9fb] border-b border-gray-200">
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
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
                    </div>
                </div>
                {showSettings ? (
                    <SessionControl />
                ) : selectedContact ? (
                    <ChatWindow 
                        contact={selectedContact} 
                        messages={messages} 
                        onSendMessage={() => fetchMessages(selectedContact.id, selectedContact.wa_id)}
                        onLoadMore={() => {}} // No pagination in simple version
                        hasMore={false}
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
