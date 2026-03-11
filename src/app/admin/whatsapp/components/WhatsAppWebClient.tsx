'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';
import {
    getPaginatedContactsAction,
    getPaginatedMessagesAction,
    syncChatsFromWahaAction,
    sendMessageAction,
    getQuickRepliesAction,
    quoteReplyAction,
    deleteMessageForSenderAction,
    sendTypingAction,
    sendSeenAction,
    sendMediaMessageAction,
    forwardMessageAction,
} from '@/app/actions/whatsapp';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Contact, Message, QuickReply, UploadingMedia } from './web-client/types';

// Import sub-components
import ContactList from './web-client/ContactList';
import SidebarHeader from './web-client/SidebarHeader';
import ChatHeader from './web-client/ChatHeader';
import MessageList from './web-client/MessageList';
import ChatInput from './web-client/ChatInput';
import EmptyState from './web-client/EmptyState';

// Lazy load heavy components
const SessionControl = dynamic(() => import('./SessionControl'), { 
    loading: () => (
        <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#E30613] mb-4" />
            <p>Memuat pengaturan...</p>
        </div>
    )
});

const ContactInfo = dynamic(() => import('./ContactInfo'), {
    ssr: false,
});

const BroadcastModal = dynamic(() => import('./BroadcastModal'), {
    ssr: false,
});

const CONTACTS_PER_PAGE = 20;
const MESSAGES_PER_PAGE = 50;

type WhatsAppWebClientProps = {
    onContactsFetchFailure?: (error?: string) => void;
};

export default function WhatsAppWebClient({ onContactsFetchFailure }: WhatsAppWebClientProps) {
    // State
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [syncingFromWaha, setSyncingFromWaha] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    
    // Data Fetching State
    const [supabase] = useState(() => createClient());
    const [searchQuery, setSearchQuery] = useState('');
    const [contactsPage, setContactsPage] = useState(1);
    const [messagesPage, setMessagesPage] = useState(1);
    const [contactsPagination, setContactsPagination] = useState({ total: 0, totalPages: 1 });
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [quotedMessageId, setQuotedMessageId] = useState<string | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [showQuickReplies, setShowQuickReplies] = useState(false);

    const [forwardSourceId, setForwardSourceId] = useState<string | null>(null);
    const [showForwardPicker, setShowForwardPicker] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>([]);
    const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});
    const realtimeContactsRefreshRef = useRef(0);

    const selectedContactId = selectedContact?.id ?? null;
    const selectedWaId = selectedContact?.wa_id ?? null;

    // Filter contacts
    const filteredContacts = useMemo(() => {
        // Search is handled by API mostly, but client side filtering can be added if needed
        // For now, we rely on the API search which populates `contacts`
        // But if we want to filter the *loaded* contacts locally while typing before debounce triggers API:
        if (!searchQuery.trim()) return contacts;
        // Simple local filter for immediate feedback on loaded items
        return contacts.filter(c => 
            (c.name?.toLowerCase().includes(searchQuery.toLowerCase())) || 
            (c.wa_id?.includes(searchQuery))
        );
    }, [contacts, searchQuery]);

    const quotedMessage = useMemo(
        () => (quotedMessageId ? messages.find((m) => m.id === quotedMessageId) || null : null),
        [quotedMessageId, messages]
    );

    const handleExportChat = useCallback(() => {
        if (!selectedContactId || typeof window === 'undefined') return;
        const url = `/api/chats/${selectedContactId}/export`;
        window.open(url, '_blank');
    }, [selectedContactId]);

    const handleForwardToContact = async (target: Contact) => {
        if (!forwardSourceId) return;
        const result = await forwardMessageAction(target.wa_id, forwardSourceId);
        if (!result.success) {
            toast.error(result.error ?? 'Gagal meneruskan pesan');
        } else {
            toast.success('Pesan diteruskan');
        }
        setForwardSourceId(null);
        setShowForwardPicker(false);
    };

    const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !selectedWaId) return;

        const mime = file.type.toLowerCase();
        let mediaType: UploadingMedia['mediaType'] = 'document';
        if (mime.startsWith('image/')) mediaType = 'image';
        else if (mime === 'audio/ogg') mediaType = 'voice';

        const tempId = `upload-${Date.now()}-${Math.random()}`;
        const previewUrl =
            mediaType === 'image' && typeof URL !== 'undefined'
                ? URL.createObjectURL(file)
                : undefined;

        setUploadingMedia(prev => [
            ...prev,
            {
                id: tempId,
                fileName: file.name,
                mediaType,
                status: 'uploading',
                previewUrl,
                file,
            },
        ]);

        const idempotencyKey = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        const result = await sendMediaMessageAction(selectedWaId, {
            file,
            caption: messageInput || undefined,
            idempotencyKey,
        });

        if (!result.success) {
            setUploadingMedia(prev =>
                prev.map(item =>
                    item.id === tempId ? { ...item, status: 'failed' } : item
                )
            );
            toast.error(result.error ?? 'Gagal mengirim media');
        } else {
            setUploadingMedia(prev => prev.filter(item => item.id !== tempId));
            if (messageInput) setMessageInput('');
            toast.success('Media dikirim');
        }
    };

    const handleCancelUpload = (id: string) => {
        setUploadingMedia(prev => prev.filter(x => x.id !== id));
    };

    const fetchContacts = useCallback(async (page = 1, search = '', showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const result = await getPaginatedContactsAction(page, CONTACTS_PER_PAGE, search);
            
            if (result.success && result.contacts) {
                if (result.warning) toast.warning(result.warning);
                
                const normalized = (result.contacts as Contact[]).map((c) => ({
                    ...c,
                    isGroup: typeof c.wa_id === 'string' ? c.wa_id.includes('@g.us') : false,
                }));

                if (page === 1) {
                    setContacts(normalized);
                } else {
                    setContacts(prev => {
                        const newContacts = normalized.filter(c => !prev.some(p => p.id === c.id));
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
                if (page === 1) setContacts([]);
                onContactsFetchFailure?.(errorMessage);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
            if (page === 1) setContacts([]);
        } finally {
            if (showLoading) setLoading(false);
            setIsInitialLoading(false);
        }
    }, [onContactsFetchFailure]);

    // Fetch Messages
    const fetchMessages = useCallback(async (contactId: string, waId: string, page = 1, append = false) => {
        if (!append) setLoadingMessages(true);
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
                if (!append) setMessages([]);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            if (!append) setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // Send Message
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageInput.trim() || !selectedWaId || isSending) return;

        setIsSending(true);
        const text = messageInput;

        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            external_message_id: `temp-${Date.now()}`,
            chat_id: selectedContactId ?? 'temp-chat',
            body: text,
            type: 'chat',
            direction: 'outbound',
            sender_type: 'agent',
            status: 'sent',
            sent_at: new Date().toISOString(),
            quoted_message_id: quotedMessageId,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setMessageInput('');

        try {
            let result;
            if (quotedMessageId) {
                result = await quoteReplyAction(selectedWaId, quotedMessageId, text);
            } else {
                result = await sendMessageAction(selectedWaId, text);
            }

            if (!result.success) {
                toast.error('Gagal mengirim pesan');
                setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
            } else {
                setQuotedMessageId(null);
                // Don't refetch contacts immediately to avoid UI jump, maybe update last message locally?
                // For now, keep it simple.
                // await fetchContacts(1, searchQuery, false); 
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Gagal mengirim pesan');
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = useCallback(async (msg: Message) => {
        const original = msg;
        setMessages((prev) =>
            prev.map((m) =>
                m.id === msg.id
                    ? { ...m, is_deleted: true, body: 'message deleted' }
                    : m
            )
        );
        try {
            const result = await deleteMessageForSenderAction(msg.id);
            if (!result.success) {
                toast.error('Gagal menghapus pesan');
                setMessages((prev) =>
                    prev.map((m) => (m.id === original.id ? original : m))
                );
            } else {
                toast.success('Pesan dihapus');
            }
        } catch {
            toast.error('Gagal menghapus pesan');
            setMessages((prev) =>
                prev.map((m) => (m.id === original.id ? original : m))
            );
        }
    }, []);

    // Initial Load
    useEffect(() => {
        fetchContacts(1, '', true);
        
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                setIsDarkMode(true);
            }
        }
    }, [fetchContacts]);

    useEffect(() => {
        if (!selectedWaId || !messageInput.trim()) return;
        const timeoutId = setTimeout(() => {
            sendTypingAction(selectedWaId).catch(() => undefined);
        }, 900);
        return () => clearTimeout(timeoutId);
    }, [messageInput, selectedWaId]);

    useEffect(() => {
        getQuickRepliesAction().then((res) => {
            if (res.success && res.replies) {
                setQuickReplies(res.replies as QuickReply[]);
            }
        });
    }, []);

    // Search Debounce
    useEffect(() => {
        if (isInitialLoading) return;
        const timeoutId = setTimeout(() => {
            fetchContacts(1, searchQuery, false);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, fetchContacts, isInitialLoading]);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('wa_web_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_chats' },
                () => {
                    const now = Date.now();
                    if (now - realtimeContactsRefreshRef.current > 2000) {
                        realtimeContactsRefreshRef.current = now;
                        fetchContacts(1, searchQuery, false);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
                (payload) => {
                    const newMessage = payload.new as Message;
                    if (selectedContactId && newMessage.chat_id === selectedContactId) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;
                            return [...prev, newMessage];
                        });
                        if (selectedContact && selectedContact.wa_id) {
                            sendSeenAction(selectedContact.wa_id).catch(() => undefined);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' },
                (payload) => {
                     const updatedMessage = payload.new as Message;
                     if (selectedContactId && updatedMessage.chat_id === selectedContactId) {
                        setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
                     }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchContacts, searchQuery, selectedContactId, supabase, selectedContact]);

    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
            return newMode;
        });
    }, []);

    // Handle Contact Selection
    const handleSelectContact = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setMessages([]);
        setMessagesPage(1);
        setHasMoreMessages(true);
        fetchMessages(contact.id, contact.wa_id, 1, false);
        // On mobile/tablet, hide sidebar when chat is selected
        if (window.innerWidth <= 768) {
            setSidebarVisible(false);
        }
        sendSeenAction(contact.wa_id).catch(() => undefined);
    }, [fetchMessages]);

    const handleBackToContacts = useCallback(() => {
        setSelectedContact(null);
        setSidebarVisible(true);
    }, []);

    const handleSync = async () => {
        setSyncingFromWaha(true);
        try {
            const result = await syncChatsFromWahaAction();
            if (result.success) {
                toast.success('Sinkronisasi berhasil');
                fetchContacts(1, searchQuery, false);
            } else {
                toast.error(result.error || 'Gagal sinkronisasi');
            }
        } catch (error) {
            console.error(error);
            toast.error('Terjadi kesalahan saat sinkronisasi');
        } finally {
            setSyncingFromWaha(false);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-[#f0f2f5] dark:bg-[#111b21]">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-[#E30613] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="flex items-center gap-2 text-[#41525d] dark:text-[#8696a0] font-medium text-sm font-sans">
                        <div className="w-2 h-2 bg-[#E30613] rounded-full animate-pulse"></div>
                        Connecting to WhatsApp...
                    </div>
                </div>
                <div className="absolute bottom-10 flex flex-col items-center text-[#41525d] dark:text-[#8696a0] font-sans">
                    <span className="text-xs mb-1">from</span>
                    <span className="font-bold text-[#E30613] tracking-widest text-sm">KOKOHIN</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isDarkMode ? 'dark' : ''} w-full h-screen max-h-screen font-sans`}>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.2); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); }
            `}</style>
            
            <div className="h-full w-full overflow-hidden bg-[#d1d7db] dark:bg-[#0c1317] relative text-[#111b21] dark:text-[#e9edef]">
                <Toaster position="top-center" richColors />
                
                {/* Red Header Background for Desktop Look */}
                <div className="absolute top-0 left-0 w-full h-[127px] bg-[#E30613] dark:bg-[#0c1317] z-0 hidden md:block"></div>

                {/* Main App Container */}
                <div className="flex h-full w-full md:h-[calc(100%-38px)] md:w-[calc(100%-38px)] md:max-w-[1600px] md:top-[19px] mx-auto bg-white dark:bg-[#111b21] shadow-lg relative overflow-hidden z-10">
                    
                    {/* Left Sidebar */}
                    <div className={`
                        w-full md:w-[35%] lg:w-[30%] min-w-[300px] max-w-[450px] flex flex-col border-r border-[#e9edef] dark:border-[#202c33] bg-white dark:bg-[#111b21] z-20 transition-transform duration-300 absolute md:relative h-full min-h-0
                        ${sidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    `}>
                        <SidebarHeader
                            isDarkMode={isDarkMode}
                            toggleDarkMode={toggleDarkMode}
                            syncingFromWaha={syncingFromWaha}
                            onSync={handleSync}
                            onBroadcast={() => setShowBroadcast(true)}
                            onSettings={() => setShowSettings(true)}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />

                        {/* Contact List (Virtualized) */}
                        <ContactList
                            contacts={filteredContacts}
                            selectedContactId={selectedContactId}
                            onSelectContact={handleSelectContact}
                            onLoadMore={() => fetchContacts(contactsPage + 1, searchQuery, false)}
                            hasMore={contactsPage < contactsPagination.totalPages}
                            loading={loading}
                            brokenAvatars={brokenAvatars}
                            setBrokenAvatars={setBrokenAvatars}
                        />
                    </div>

                    {/* Right Chat Area */}
                    <div className={`
                        flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative h-full z-10 transition-transform duration-300 absolute md:relative w-full min-h-0
                        ${sidebarVisible ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}
                    `}>
                        {showSettings ? (
                            <div className="h-full w-full bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col animate-in slide-in-from-left duration-300">
                                <div className="h-[108px] bg-[#E30613] px-6 flex items-end pb-4 gap-4 text-white shadow-sm shrink-0">
                                    <button onClick={() => setShowSettings(false)} className="mb-1 mr-2">
                                        <ArrowLeft size={24} strokeWidth={2.5} />
                                    </button>
                                    <h2 className="text-xl font-medium mb-0.5">Settings</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <SessionControl />
                                </div>
                            </div>
                        ) : selectedContact ? (
                            <>
                                <ChatHeader
                                    contact={selectedContact}
                                    isDarkMode={isDarkMode}
                                    brokenAvatars={brokenAvatars}
                                    setBrokenAvatars={setBrokenAvatars}
                                    onBack={handleBackToContacts}
                                    onContactInfo={() => setShowContactInfo(true)}
                                    onExportChat={handleExportChat}
                                />

                                <MessageList
                                    messages={messages}
                                    loadingMessages={loadingMessages}
                                    hasMoreMessages={hasMoreMessages}
                                    onLoadOlder={() => fetchMessages(selectedContactId!, selectedWaId!, messagesPage + 1, true)}
                                    uploadingMedia={uploadingMedia}
                                    onCancelUpload={handleCancelUpload}
                                    onReply={(id) => setQuotedMessageId(id)}
                                    onForward={(id) => {
                                        setForwardSourceId(id);
                                        setShowForwardPicker(true);
                                    }}
                                    onDelete={handleDeleteMessage}
                                    isDarkMode={isDarkMode}
                                    isGroup={Boolean(selectedContact.isGroup)}
                                />

                                <ChatInput
                                    messageInput={messageInput}
                                    setMessageInput={setMessageInput}
                                    handleSendMessage={handleSendMessage}
                                    isSending={isSending}
                                    showQuickReplies={showQuickReplies}
                                    setShowQuickReplies={setShowQuickReplies}
                                    quickReplies={quickReplies}
                                    quotedMessage={quotedMessage}
                                    onCancelReply={() => setQuotedMessageId(null)}
                                    onFileSelect={handleFileChange}
                                />
                            </>
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                    
                    {showForwardPicker && forwardSourceId && (
                        <div className="absolute inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
                            {/* Simple Forward Picker Modal - extracted inline or component? Keeping inline for simplicity as it's small */}
                            <div className="w-full max-w-md bg-white dark:bg-[#111b21] rounded-3xl shadow-2xl border border-gray-100 dark:border-[#222d34] max-h-[70vh] flex flex-col">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222d34] flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                            Teruskan pesan
                                        </p>
                                        <p className="text-sm text-[#1D1D1B] dark:text-[#e9edef]">
                                            Pilih tujuan forward
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForwardPicker(false);
                                            setForwardSourceId(null);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-[#E30613] transition-colors"
                                        aria-label="Tutup forward"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                </div>
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222d34]">
                                    <input
                                        type="text"
                                        className="w-full bg-[#f0f2f5] dark:bg-[#202c33] rounded-full px-4 py-2 text-sm outline-none border border-transparent focus:border-[#E30613] text-[#111b21] dark:text-[#e9edef]"
                                        placeholder="Cari kontak"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {/* Reusing ContactList here would be nice but it's specialized for sidebar. 
                                    Using a simple list for forward picker is acceptable or we can adapt ContactList.
                                    For now, using simple map for forward picker as it is an overlay.
                                */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                                    {filteredContacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            onClick={() => handleForwardToContact(contact)}
                                            className="w-full flex items-center px-4 py-2 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] text-left"
                                        >
                                            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#dfe3e5] dark:bg-[#667781] mr-3 flex items-center justify-center">
                                                <Loader2 size={20} className="text-[#cfd3d6] dark:text-[#8696a0]" /> 
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[#111b21] dark:text-[#e9edef] truncate">
                                                    {contact.name || contact.wa_id}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {showContactInfo && selectedContact && (
                        <div className="absolute inset-y-0 right-0 w-full md:w-[340px] lg:w-[380px] bg-white dark:bg-[#111b21] border-l border-[#e9edef] dark:border-[#202c33] shadow-2xl z-30">
                            <ContactInfo
                                contact={selectedContact}
                                onClose={() => setShowContactInfo(false)}
                            />
                        </div>
                    )}
                </div>
            </div>
            {showBroadcast && (
                <BroadcastModal
                    onClose={() => setShowBroadcast(false)}
                />
            )}
        </div>
    );
}
