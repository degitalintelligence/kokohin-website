'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';
import {
    getPaginatedContactsAction,
    getPaginatedMessagesAction,
    syncChatsFromWahaAction,
} from '@/app/actions/whatsapp';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import NavigationRail from './NavigationRail';
import { MoreVertical, Loader2, RefreshCcw, ChevronLeft, User, MessageSquare } from 'lucide-react';

// Lazy load heavy components
const SessionControl = dynamic(() => import('./SessionControl'), { 
    loading: () => (
        <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#E30613] mb-4" />
            <p>Memuat pengaturan...</p>
        </div>
    )
});

const BroadcastModal = dynamic(() => import('./BroadcastModal'), { 
    ssr: false,
    loading: () => null 
});

const ContactInfo = dynamic(() => import('./ContactInfo'), { 
    loading: () => (
        <div className="w-80 h-full border-l border-gray-100 bg-white flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#E30613]" />
        </div>
    )
});

export type Contact = {
    id: string;
    wa_id: string;
    name: string | null;
    avatar_url: string | null;
    last_message_at: string | null;
    unread_count?: number | null;
    erp_project_status?: string | null;
    erp_project_id?: string | null;
    phone?: string | null;
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
    raw_payload?: unknown;
};

const CONTACTS_PER_PAGE = 20;
const MESSAGES_PER_PAGE = 50;

type OptimizedWhatsAppClientProps = {
    onContactsFetchFailure?: (error?: string) => void;
};

export default function OptimizedWhatsAppClient({ onContactsFetchFailure }: OptimizedWhatsAppClientProps) {
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [syncingFromWaha, setSyncingFromWaha] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [headerAvatarBroken, setHeaderAvatarBroken] = useState(false);
    
    // Navigation State
    const [activeTab, setActiveTab] = useState<'chats' | 'broadcast' | 'contacts' | 'settings'>('chats');
    
    const [supabase] = useState(() => createClient());
    const [searchQuery, setSearchQuery] = useState('');
    const [contactsPage, setContactsPage] = useState(1);
    const [messagesPage, setMessagesPage] = useState(1);
    const [contactsPagination, setContactsPagination] = useState({ total: 0, totalPages: 1 });
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [contactsError, setContactsError] = useState<string | null>(null);
    
    const selectedContactId = selectedContact?.id ?? null;
    const selectedWaId = selectedContact?.wa_id ?? null;

    // Filter contacts client-side for immediate feedback, though API handles it too
    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim()) return contacts;
        return contacts;
    }, [contacts, searchQuery]);

    useEffect(() => {
        setHeaderAvatarBroken(false);
    }, [selectedContactId]);

    // Fetch contacts with infinite scroll support
    const fetchContacts = useCallback(async (page = 1, search = '', showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const result = await getPaginatedContactsAction(page, CONTACTS_PER_PAGE, search);
            
            if (result.success && Array.isArray((result as { contacts?: Contact[] }).contacts)) {
                const contactsData = (result as { contacts?: Contact[] }).contacts ?? [];
                setContactsError(result.warning || null);
                if (result.warning) toast.warning(result.warning);
                
                if (page === 1) {
                    setContacts(contactsData);
                } else {
                    setContacts(prev => {
                        const newContacts = contactsData.filter(c => !prev.some(p => p.id === c.id));
                        return [...prev, ...newContacts];
                    });
                }
                
                if (result.pagination) {
                    setContactsPagination({
                        total: result.pagination.total,
                        totalPages: result.pagination.totalPages,
                    });
                }
                setContactsPage(page);
            } else {
                const errorMessage =
                    (result as { error?: string }).error || 'Terjadi kesalahan saat memuat daftar chat.';
                console.error('Failed to fetch contacts:', errorMessage);
                setContactsError(errorMessage);
                onContactsFetchFailure?.(errorMessage);
                toast.error(errorMessage);
                if (page === 1) setContacts([]);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat daftar chat.';
            setContactsError(errorMessage);
            onContactsFetchFailure?.(errorMessage);
            toast.error(errorMessage);
            if (page === 1) setContacts([]);
        } finally {
            if (showLoading) setLoading(false);
            setIsInitialLoading(false);
        }
    }, [onContactsFetchFailure]);

    // Fetch messages
    const fetchMessages = useCallback(async (contactId: string, waId: string, page = 1, append = false) => {
        if (!append) {
            setLoadingMessages(true);
        }
        try {
            const result = await getPaginatedMessagesAction(contactId, page, MESSAGES_PER_PAGE);
            const messagesData = (result as { messages?: Message[] }).messages;
            if (result.success && messagesData) {
                if (append) {
                    setMessages(prev => [...messagesData.reverse(), ...prev]);
                } else {
                    setMessages(messagesData.reverse());
                }
                setMessagesPage(page);
                if (result.pagination) {
                    setHasMoreMessages(page < result.pagination.totalPages);
                }
            } else {
                const errorMessage =
                    (result as { error?: string }).error || 'Terjadi kesalahan saat memuat pesan.';
                console.error('Failed to fetch messages:', errorMessage);
                if (!append) setMessages([]);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            if (!append) setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchContacts(1, '', true);
    }, [fetchContacts]); 

    // Search handler
    useEffect(() => {
        if (isInitialLoading) return;

        const timeoutId = setTimeout(() => {
            fetchContacts(1, searchQuery, false);
        }, 500); 

        return () => clearTimeout(timeoutId);
    }, [searchQuery, fetchContacts, isInitialLoading]);

    // Real-time updates
    useEffect(() => {
        const channel = supabase
            .channel('wa_chats_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_chats' },
                (payload) => {
                    fetchContacts(1, searchQuery, false);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_messages' },
                (payload) => {
                    if (!selectedContactId || !selectedWaId) return;

                    if (payload.eventType === 'INSERT') {
                        const newMessage = payload.new as Message;
                        if (newMessage.chat_id === selectedContactId) {
                            setMessages((prev) => {
                                if (prev.some(m => m.id === newMessage.id)) return prev;
                                return [...prev, newMessage];
                            });
                            fetchContacts(1, searchQuery, false);
                        }
                    } 
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchContacts, searchQuery, selectedContactId, selectedWaId, supabase]);

    const handleSelectContact = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setMessages([]);
        setMessagesPage(1);
        setHasMoreMessages(true);
        fetchMessages(contact.id, contact.wa_id, 1, false);
        // On mobile, automatically hide contact info when switching contacts
        if (window.innerWidth < 768) {
            setShowContactInfo(false);
        }
    }, [fetchMessages]);

    const handleLoadMoreMessages = useCallback(() => {
        if (!selectedContactId || !selectedWaId || loadingMessages || !hasMoreMessages) return;
        fetchMessages(selectedContactId, selectedWaId, messagesPage + 1, true);
    }, [fetchMessages, selectedContactId, selectedWaId, loadingMessages, hasMoreMessages, messagesPage]);

    const handleSyncFromWaha = useCallback(async () => {
        if (syncingFromWaha) return;
        setSyncingFromWaha(true);
        try {
            const result = await syncChatsFromWahaAction(200);
            if (result.success) {
                await fetchContacts(1, searchQuery, true);
                toast.success('Sinkronisasi selesai.');
            } else {
                setContactsError(result.error || 'Gagal sinkronisasi chat.');
                toast.error(result.error || 'Gagal sinkronisasi chat.');
            }
        } catch (error) {
            setContactsError('Gagal sinkronisasi chat.');
            toast.error('Gagal sinkronisasi chat.');
        } finally {
            setSyncingFromWaha(false);
        }
    }, [syncingFromWaha, fetchContacts, searchQuery]);

    if (isInitialLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-[#f4f5f7] animate-in fade-in duration-500">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-[#E30613] border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-[0_0_15px_rgba(227,6,19,0.2)]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[#E30613] font-bold text-xl">K</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-[#1D1D1B] font-bold text-lg font-sans tracking-tight">Memuat WhatsApp...</p>
                        <p className="text-gray-500 text-sm mt-1 font-sans">Menghubungkan ke server WAHA</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#f4f5f7] relative font-sans antialiased text-[#1D1D1B]">
            <Toaster position="top-center" richColors closeButton />
            <div className="flex-1 flex flex-col md:flex-row h-full w-full mx-auto bg-white relative overflow-hidden shadow-2xl">
                
                {/* Navigation Rail */}
                <NavigationRail 
                    activeTab={activeTab} 
                    onTabChange={(tab) => {
                        setActiveTab(tab);
                        if (tab === 'broadcast') setShowBroadcast(true);
                        else if (tab === 'settings') setShowSettings(true);
                        else {
                            setShowBroadcast(false);
                            setShowSettings(false);
                        }
                    }}
                    onLogout={() => {
                        setActiveTab('settings');
                        setShowSettings(true);
                    }}
                />

                {/* Sidebar (Chat List) */}
                {(activeTab === 'chats' || activeTab === 'contacts') && (
                    <div className={`
                        w-full md:w-[380px] lg:w-[420px] flex flex-col border-r border-gray-100 bg-white shrink-0 z-20 transition-all duration-300
                        ${selectedContact ? 'hidden md:flex' : 'flex'}
                    `}>
                        {/* Sidebar Header */}
                        <div className="h-16 bg-white px-5 flex items-center justify-between shrink-0 border-b border-gray-100/80 z-10">
                            <h2 className="text-2xl font-black text-[#1D1D1B] tracking-tight">
                                {activeTab === 'chats' ? 'Percakapan' : 'Kontak'}
                            </h2>
                            <div className="flex gap-1">
                                <button 
                                    onClick={handleSyncFromWaha} 
                                    disabled={syncingFromWaha}
                                    title="Sinkronisasi Pesan"
                                    className={`p-2 rounded-xl transition-all duration-200 hover:bg-gray-100 active:scale-95 ${syncingFromWaha ? 'animate-spin text-[#E30613]' : 'text-gray-500 hover:text-[#E30613]'}`}
                                >
                                    <RefreshCcw size={20} strokeWidth={2.5} />
                                </button>
                                <button 
                                    title="Pengaturan" 
                                    onClick={() => {
                                        setActiveTab('settings');
                                        setShowSettings(true);
                                    }}
                                    className="p-2 rounded-xl transition-all duration-200 hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-[#1D1D1B]"
                                >
                                    <MoreVertical size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        {/* Chat List Component */}
                        <ChatList 
                            contacts={contacts}
                            selectedContactId={selectedContactId ?? undefined}
                            onSelectContact={handleSelectContact}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            isLoading={loading}
                            onLoadMore={() => {
                                if (contactsPage < contactsPagination.totalPages && !loading) {
                                    fetchContacts(contactsPage + 1, searchQuery, false);
                                }
                            }}
                            hasMore={contactsPage < contactsPagination.totalPages}
                        />
                    </div>
                )}

                {/* Main Content Area */}
                <div className={`
                    flex-1 flex flex-col bg-white relative overflow-hidden h-full min-h-0 z-10
                    ${!selectedContact && !showSettings && activeTab !== 'settings' ? 'hidden md:flex' : 'flex'}
                `}>
                    {activeTab === 'settings' || showSettings ? (
                        <div className="h-full w-full overflow-y-auto bg-[#f8f9fa] p-0 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-full">
                                <SessionControl />
                            </div>
                        </div>
                    ) : selectedContact ? (
                        <div className="flex h-full w-full overflow-hidden min-h-0 animate-in fade-in duration-300">
                            <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-gray-50">
                                {/* Chat Header */}
                                <div className="h-16 px-4 py-2 bg-white/80 backdrop-blur-md flex items-center justify-between border-b border-gray-100 shrink-0 z-40">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button 
                                            onClick={() => setSelectedContact(null)}
                                            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-[#E30613] transition-colors"
                                        >
                                            <ChevronLeft size={24} strokeWidth={2.5} />
                                        </button>
                                        <div 
                                            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 pr-4 rounded-2xl transition-all duration-200 group flex-1 min-w-0"
                                            onClick={() => setShowContactInfo(prev => !prev)}
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300 relative">
                                                {selectedContact.avatar_url && !headerAvatarBroken ? (
                                                    <Image
                                                        src={selectedContact.avatar_url}
                                                        alt=""
                                                        fill
                                                        className="object-cover"
                                                        sizes="40px"
                                                        onError={() => setHeaderAvatarBroken(true)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                                        <User size={22} strokeWidth={2} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-[#1D1D1B] text-base font-black leading-tight truncate group-hover:text-[#E30613] transition-colors tracking-tight">
                                                    {(selectedContact.name || '').trim() || (selectedContact.phone || selectedContact.wa_id.split('@')[0])}
                                                </h2>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider truncate group-hover:text-gray-600 transition-colors">
                                                        {selectedContact.erp_project_status ? `Status: ${selectedContact.erp_project_status}` : 'Detail Kontak'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => setShowContactInfo(prev => !prev)} 
                                            className={`p-2 rounded-xl transition-all duration-200 ${showContactInfo ? 'bg-red-50 text-[#E30613]' : 'text-gray-400 hover:bg-gray-50 hover:text-[#E30613]'}`}
                                            title="Info Kontak"
                                        >
                                            <MoreVertical size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                                <ChatWindow 
                                    key={selectedContact.id}
                                    contact={selectedContact}
                                    messages={messages}
                                    onSendMessage={() => fetchMessages(selectedContactId!, selectedWaId!, 1, false)}
                                    onLoadMore={handleLoadMoreMessages}
                                    hasMore={hasMoreMessages}
                                    isLoading={loadingMessages}
                                    hideHeader
                                />
                            </div>
                            {/* Contact Info Panel */}
                            {showContactInfo && (
                                <div className="absolute inset-0 md:static md:w-[340px] lg:w-[380px] z-50 bg-white shadow-2xl md:shadow-none animate-in slide-in-from-right-8 duration-500 ease-out border-l border-gray-100">
                                    <ContactInfo 
                                        contact={selectedContact} 
                                        onClose={() => setShowContactInfo(false)} 
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-[#fdfdfd] p-8 text-center relative overflow-hidden">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-50/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-50/50 rounded-full -ml-48 -mb-48 blur-3xl"></div>
                            
                            <div className="relative z-10 max-w-md animate-in zoom-in-95 duration-700">
                                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(227,6,19,0.1)] flex items-center justify-center mx-auto mb-8 border border-red-50 transform hover:scale-110 transition-transform duration-500">
                                    <MessageSquare size={48} className="text-[#E30613]" strokeWidth={1.5} />
                                </div>
                                <h1 className="text-[#1D1D1B] text-3xl font-black mb-4 font-sans tracking-tight">Kokohin WhatsApp Center</h1>
                                <p className="text-gray-500 text-sm leading-relaxed mb-10 font-medium">
                                    Kelola komunikasi pelanggan secara profesional dan terintegrasi dengan data proyek Kokohin.
                                </p>
                                
                                <div className="grid grid-cols-2 gap-4 text-left">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status Server</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                            <span className="text-xs font-bold text-[#1D1D1B]">WAHA Connected</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sinkronisasi</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <span className="text-xs font-bold text-[#1D1D1B]">Real-time Active</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-12 flex items-center justify-center gap-2 text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">
                                    Enterprise Communication Panel
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showBroadcast && (
                <BroadcastModal 
                    onClose={() => {
                        setShowBroadcast(false);
                        if (activeTab === 'broadcast') setActiveTab('chats');
                    }} 
                />
            )}
        </div>
    );
}
