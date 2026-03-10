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
import { 
    MoreVertical, 
    Loader2, 
    RefreshCcw, 
    Search, 
    MessageSquarePlus, 
    Filter, 
    Check, 
    CheckCheck, 
    Smile, 
    Plus, 
    Mic, 
    Paperclip, 
    ArrowLeft, 
    Moon, 
    Sun, 
    Send,
    User as UserIcon,
    Menu as MenuIcon,
    X,
    FileText,
    MessageSquareReply,
    Zap,
    CornerUpRight,
    Trash2,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

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

// Types
export type Contact = {
    id: string;
    wa_id: string;
    name: string | null;
    avatar_url: string | null;
    last_message_at: string | null;
    unread_count?: number | null;
    erp_project_status?: string | null;
    erp_project_id?: string | null;
    isGroup?: boolean;
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

type QuickReply = {
    id: string;
    title: string;
    body_template: string;
};

type UploadingMedia = {
    id: string;
    fileName: string;
    mediaType: 'image' | 'document' | 'voice';
    status: 'uploading' | 'failed';
    previewUrl?: string;
    file?: File;
};

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [forwardSourceId, setForwardSourceId] = useState<string | null>(null);
    const [showForwardPicker, setShowForwardPicker] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>([]);
    const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});

    const selectedContactId = selectedContact?.id ?? null;
    const selectedWaId = selectedContact?.wa_id ?? null;

    // Filter contacts
    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim()) return contacts;
        return contacts;
    }, [contacts, searchQuery]);

    const quotedMessage = useMemo(
        () => (quotedMessageId ? messages.find((m) => m.id === quotedMessageId) || null : null),
        [quotedMessageId, messages]
    );

    const handleExportChat = () => {
        if (!selectedContactId || typeof window === 'undefined') return;
        const url = `/api/chats/${selectedContactId}/export`;
        window.open(url, '_blank');
    };

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

    const handleRetryUpload = async (uploadId: string) => {
        const current = uploadingMedia.find((m) => m.id === uploadId);
        if (!current || !current.file || !selectedWaId) return;

        setUploadingMedia((prev) =>
            prev.map((item) =>
                item.id === uploadId ? { ...item, status: 'uploading' } : item
            )
        );

        const idempotencyKey = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        const result = await sendMediaMessageAction(selectedWaId, {
            file: current.file,
            caption: messageInput || undefined,
            idempotencyKey,
        });

        if (!result.success) {
            setUploadingMedia((prev) =>
                prev.map((item) =>
                    item.id === uploadId ? { ...item, status: 'failed' } : item
                )
            );
            toast.error(result.error ?? 'Gagal mengirim media');
        } else {
            setUploadingMedia((prev) => prev.filter((item) => item.id !== uploadId));
            if (messageInput) setMessageInput('');
            toast.success('Media dikirim');
        }
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
                const errorMessage = result.error || 'Terjadi kesalahan saat memuat daftar chat.';
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
                await fetchContacts(1, searchQuery, false);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Gagal mengirim pesan');
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        } finally {
            setIsSending(false);
        }
    };

    // Initial Load
    useEffect(() => {
        fetchContacts(1, searchQuery, true);
        
        // Check local storage for dark mode preference
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                setIsDarkMode(true);
            }
        }
    }, []);

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

    // Scroll to bottom on new messages
    useEffect(() => {
        if (!loadingMessages && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loadingMessages]);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('wa_web_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_chats' },
                () => fetchContacts(1, searchQuery, false)
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
                        fetchContacts(1, searchQuery, false);
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
    }, [fetchContacts, searchQuery, selectedContactId, supabase]);

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        if (isToday(date)) {
            return format(date, 'HH:mm');
        } else if (isYesterday(date)) {
            return 'Kemarin';
        } else {
            return format(date, 'dd/MM/yyyy');
        }
    };

    const formatRelativeStatus = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const now = Date.now();
        const diffMs = now - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        if (diffSec < 60) return 'baru saja';
        if (diffMin < 60) return `${diffMin} menit lalu`;
        if (diffHours < 24 && isToday(date)) return `${diffHours} jam lalu`;
        if (isYesterday(date)) return 'kemarin';
        return format(date, 'dd/MM/yyyy HH:mm');
    };

    const getPresenceStatus = (contact: Contact | null) => {
        if (!contact || !contact.last_message_at) return '';
        const last = new Date(contact.last_message_at);
        if (isNaN(last.getTime())) return '';
        const diffMs = Date.now() - last.getTime();
        if (diffMs < 60_000) return 'online';
        return `last seen ${formatRelativeStatus(contact.last_message_at)}`;
    };

    // Handle Contact Selection
    const handleSelectContact = (contact: Contact) => {
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
    };

    const handleBackToContacts = () => {
        setSelectedContact(null);
        setSidebarVisible(true);
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
                        {/* Sidebar Header */}
                        <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 flex items-center justify-between shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#dfe3e5] dark:bg-[#667781] cursor-pointer" onClick={() => setShowSettings(true)}>
                                <div className="w-full h-full flex items-center justify-center text-white">
                                    <UserIcon size={24} fill="currentColor" className="text-[#cfd3d6] dark:text-[#8696a0]" />
                                </div>
                            </div>
                            <div className="flex gap-2 text-[#54656f] dark:text-[#aebac1]">
                                <button 
                                    onClick={toggleDarkMode}
                                    className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                                    title={isDarkMode ? "Light Mode" : "Dark Mode"}
                                    aria-label="Toggle Dark Mode"
                                >
                                    {isDarkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
                                </button>
                                <button 
                                    onClick={() => setSyncingFromWaha(true)} 
                                    className={`p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors ${syncingFromWaha ? 'animate-spin' : ''}`}
                                    title="Sync Status"
                                    aria-label="Sync Status"
                                >
                                    <RefreshCcw size={20} strokeWidth={2} />
                                </button>
                                <button 
                                    onClick={() => setShowBroadcast(true)}
                                    className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                                    title="Broadcast"
                                    aria-label="Broadcast"
                                >
                                    <MessageSquarePlus size={20} strokeWidth={2} />
                                </button>
                                <button 
                                    onClick={() => setShowSettings(true)}
                                    className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                                    title="Menu"
                                    aria-label="Menu"
                                >
                                    <MoreVertical size={20} strokeWidth={2} />
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="h-[49px] bg-white dark:bg-[#111b21] flex items-center px-3 border-b border-[#e9edef] dark:border-[#202c33]">
                            <div className="flex-1 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg flex items-center px-3 h-[35px] transition-all focus-within:bg-white focus-within:shadow-sm">
                                <button className="text-[#54656f] dark:text-[#aebac1] mr-4 transition-transform duration-300">
                                    {searchQuery ? <ArrowLeft size={20} className="cursor-pointer animate-in spin-in-180" onClick={() => setSearchQuery('')} /> : <Search size={20} />}
                                </button>
                                <input 
                                    type="text" 
                                    placeholder="Search or start new chat"
                                    className="bg-transparent border-none outline-none text-sm w-full text-[#3b4a54] dark:text-[#d1d7db] placeholder:text-[#54656f] dark:placeholder:text-[#aebac1]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label="Search contacts"
                                />
                            </div>
                            <button className="ml-2 p-2 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="Filter chats">
                                <Filter size={20} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111b21] min-h-0">
                            {loading && contactsPage === 1 ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="animate-spin text-[#E30613]" />
                                </div>
                            ) : (
                                filteredContacts.map(contact => {
                                    const isGroup = contact.isGroup;
                                    const hasAvatar = contact.avatar_url && !brokenAvatars[contact.id];
                                    const displayName = contact.name || (contact.wa_id?.split('@')[0] || '');
                                    return (
                                    <div 
                                        key={contact.id}
                                        onClick={() => handleSelectContact(contact)}
                                        className={`
                                            flex items-center px-3 py-3 cursor-pointer transition-colors relative group
                                            ${selectedContactId === contact.id ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'}
                                        `}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Chat with ${contact.name || contact.wa_id}`}
                                    >
                                        <div className="relative w-[49px] h-[49px] rounded-full overflow-hidden shrink-0 mr-3 bg-[#dfe3e5] dark:bg-[#667781]">
                                            {hasAvatar ? (
                                                <img 
                                                    src={contact.avatar_url as string} 
                                                    alt="" 
                                                    className="w-full h-full object-cover" 
                                                    onError={() => setBrokenAvatars(prev => ({ ...prev, [contact.id]: true }))}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white">
                                                    <UserIcon size={28} fill="currentColor" className="text-[#cfd3d6] dark:text-[#8696a0]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-[#e9edef] dark:border-[#222d34] pb-3 -mb-3 h-full group-hover:border-transparent">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-[17px] text-[#111b21] dark:text-[#e9edef] font-normal truncate">
                                                    {displayName}
                                                </h3>
                                                <span className="text-[12px] text-[#667781] dark:text-[#8696a0] shrink-0 font-light">
                                                    {contact.last_message_at ? formatTime(contact.last_message_at) : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center justify-between flex-1 pr-2 gap-2">
                                                    <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate flex items-center gap-1 font-light">
                                                        {isGroup ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#E30613]" />
                                                                <span>Grup WhatsApp</span>
                                                            </span>
                                                        ) : (
                                                            contact.erp_project_status && contact.erp_project_status !== 'No messages yet'
                                                                ? contact.erp_project_status
                                                                : ''
                                                        )}
                                                    </p>
                                                </div>
                                                {/* Unread Badge */}
                                                {(contact.unread_count || 0) > 0 && (
                                                    <span className="bg-[#E30613] text-white text-[12px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-sm">
                                                        {contact.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                            )}
                            {contactsPage < contactsPagination.totalPages && (
                                <button 
                                    onClick={() => fetchContacts(contactsPage + 1, searchQuery, false)}
                                    className="w-full py-4 text-[#E30613] text-sm font-medium hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors border-t border-[#e9edef] dark:border-[#222d34]"
                                >
                                    Load more chats
                                </button>
                            )}
                        </div>
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
                                {/* Chat Header */}
                                <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 flex items-center justify-between shrink-0 border-l border-[#d1d7db] dark:border-[#222d34] z-20 shadow-sm">
                                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer w-full" onClick={() => setShowContactInfo(true)}>
                                        <button 
                                            className="md:hidden mr-1 text-[#54656f] dark:text-[#aebac1]"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBackToContacts();
                                            }}
                                            aria-label="Back to contacts"
                                        >
                                            <ArrowLeft size={24} />
                                        </button>
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#dfe3e5] dark:bg-[#667781] shrink-0">
                                            {selectedContact.avatar_url && !brokenAvatars[selectedContact.id] ? (
                                                <img 
                                                    src={selectedContact.avatar_url} 
                                                    alt="" 
                                                    className="w-full h-full object-cover"
                                                    onError={() => setBrokenAvatars(prev => ({ ...prev, [selectedContact.id]: true }))}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white">
                                                    <UserIcon size={24} fill="currentColor" className="text-[#cfd3d6] dark:text-[#8696a0]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-center overflow-hidden flex-1">
                                            <h2 className="text-[#111b21] dark:text-[#e9edef] font-normal truncate text-base leading-tight">
                                                {selectedContact.name || selectedContact.wa_id}
                                            </h2>
                                            {selectedContact.isGroup ? (
                                                <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate leading-tight mt-0.5 flex items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-semibold uppercase tracking-[0.16em]">
                                                        Grup
                                                    </span>
                                                    <span>Detail anggota di WhatsApp</span>
                                                </p>
                                            ) : (
                                                <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate leading-tight mt-0.5">
                                                    {getPresenceStatus(selectedContact) || 'offline'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-[#54656f] dark:text-[#aebac1]">
                                        <Search size={20} className="cursor-pointer hover:text-black dark:hover:text-white transition-colors" />
                                        {selectedContact && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExportChat();
                                                }}
                                                className="cursor-pointer hover:text-black dark:hover:text-white transition-colors text-xs font-medium"
                                                aria-label="Export riwayat chat"
                                            >
                                                <FileText size={18} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowContactInfo(true)}
                                            className="cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                                            aria-label="Info kontak"
                                        >
                                            <MoreVertical size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div 
                                    className="flex-1 overflow-y-auto relative bg-[#efeae2] dark:bg-[#0b141a] custom-scrollbar min-h-0"
                                    style={{ 
                                        backgroundImage: isDarkMode 
                                            ? "url('https://static.whatsapp.net/rsrc.php/v3/yO/r/FSaypKgWH_e.png')" // Dark doodle placeholder
                                            : "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", // Light doodle
                                        backgroundBlendMode: isDarkMode ? 'overlay' : 'normal',
                                        backgroundOpacity: 0.4
                                    }}
                                >
                                    <div className="px-[5%] py-4 flex flex-col justify-end min-h-full pb-4">
                                        {hasMoreMessages && (
                                            <div className="flex justify-center mb-6">
                                                <button 
                                                    onClick={() => fetchMessages(selectedContactId!, selectedWaId!, messagesPage + 1, true)}
                                                    className="bg-white dark:bg-[#202c33] shadow-md px-4 py-2 rounded-full text-xs text-[#54656f] dark:text-[#aebac1] uppercase font-bold tracking-wide border border-[#e9edef] dark:border-[#222d34] hover:bg-[#f0f2f5] transition-colors"
                                                    disabled={loadingMessages}
                                                >
                                                    {loadingMessages ? 'Loading...' : 'Load older messages'}
                                                </button>
                                            </div>
                                        )}
                                        
                                        {messages.map((msg, index) => {
                                            const isOutbound = msg.direction === 'outbound';
                                            const showTail = !messages[index + 1] || messages[index + 1].direction !== msg.direction;
                                            
                                            return (
                                                <div 
                                                    key={msg.id} 
                                                    className={`
                                                        flex mb-1 w-full relative group
                                                        ${isOutbound ? 'justify-end' : 'justify-start'}
                                                        ${showTail ? 'mb-3' : 'mb-0.5'}
                                                    `}
                                                >
                                                    <div 
                                                        className={`
                                                            relative max-w-[65%] rounded-lg px-2 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-[14.2px] leading-[19px] break-words
                                                            ${isOutbound ? 'bg-[#E30613] text-white dark:bg-[#c0000f] rounded-tr-none' : 'bg-white dark:bg-[#202c33] rounded-tl-none'}
                                                        `}
                                                    >
                                                        {!msg.is_deleted && (
                                                            <div className="absolute -top-2 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    type="button"
                                                                    className={`
                                                                        p-1.5 rounded-lg text-xs
                                                                        ${isOutbound ? 'hover:bg-white/20 text-white/80 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-[#E30613]'}
                                                                    `}
                                                                    aria-label="Balas pesan ini"
                                                                    onClick={() => setQuotedMessageId(msg.id)}
                                                                >
                                                                    <MessageSquareReply size={14} strokeWidth={2} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`
                                                                        p-1.5 rounded-lg text-xs
                                                                        ${isOutbound ? 'hover:bg-white/20 text-white/80 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-[#E30613]'}
                                                                    `}
                                                                    aria-label="Teruskan pesan ini"
                                                                    onClick={() => {
                                                                        setForwardSourceId(msg.id);
                                                                        setShowForwardPicker(true);
                                                                    }}
                                                                >
                                                                    <CornerUpRight size={14} strokeWidth={2} />
                                                                </button>
                                                                {isOutbound && (
                                                                    <button
                                                                        type="button"
                                                                        className="p-1.5 rounded-lg text-xs hover:bg-white/20 text-white/70 hover:text-white"
                                                                        aria-label="Hapus pesan untuk saya"
                                                                        onClick={async () => {
                                                                            const original = msg;
                                                                            setMessages((prev) =>
                                                                                prev.map((m) =>
                                                                                    m.id === msg.id
                                                                                        ? { ...m, is_deleted: true, body: 'message deleted' }
                                                                                        : m
                                                                                )
                                                                            );
                                                                            const result = await deleteMessageForSenderAction(msg.id);
                                                                            if (!result.success) {
                                                                                toast.error('Gagal menghapus pesan');
                                                                                setMessages((prev) =>
                                                                                    prev.map((m) => (m.id === original.id ? original : m))
                                                                                );
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} strokeWidth={2} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* Tail SVG */}
                                                        {showTail && (
                                                            isOutbound ? (
                                                                <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -right-2 text-[#E30613] dark:text-[#c0000f] fill-current">
                                                                    <path d="M5.188,1.507 C5.68,0.518 6.81,0 7.962,0 L7.962,5.318 C7.962,5.318 6.439,5.068 5.188,1.507 Z"></path>
                                                                </svg>
                                                            ) : (
                                                                <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-2 text-white dark:text-[#202c33] fill-current">
                                                                    <path d="M-2.28658283e-13,5.31846111 L-2.28658283e-13,1.13686838e-13 L8.77431526,0 C8.77431526,0 4.90806916,0 3.31533673,0 C1.72260431,0 1.25992015,1.75895788 1.25992015,3.15546111 C1.25992015,4.55196434 -2.28658283e-13,5.31846111 -2.28658283e-13,5.31846111 Z"></path>
                                                                </svg>
                                                            )
                                                        )}
                                                        
                                                        {msg.is_forwarded && !msg.is_deleted && (
                                                            <div className={`mb-0.5 text-[10px] font-semibold tracking-[0.16em] uppercase ${
                                                                isOutbound ? 'text-white/70' : 'text-[#667781]'
                                                            }`}>
                                                                Forwarded
                                                            </div>
                                                        )}

                                                        {/* Media Content */}
                                                        {msg.mediaUrl && !msg.is_deleted && (
                                                            <div className="mb-1 rounded-lg overflow-hidden max-w-[300px]">
                                                                {msg.type === 'image' && <img src={msg.mediaUrl} alt="Media" className="w-full h-auto" />}
                                                                {msg.type === 'document' && (
                                                                    <div className={`flex items-center gap-3 p-3 rounded-lg ${isOutbound ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5'}`}>
                                                                        <FileText size={24} className={isOutbound ? "text-white" : "text-[#54656f] dark:text-[#aebac1]"} />
                                                                        <span className="text-sm truncate max-w-[150px]">Document</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {msg.is_deleted ? (
                                                            <div className="italic text-xs text-white/70 flex items-center gap-2">
                                                                <Trash2 size={14} />
                                                                Pesan ini telah dihapus
                                                            </div>
                                                        ) : (
                                                            <div className={isOutbound ? "text-white whitespace-pre-wrap font-normal" : "text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap font-normal"}>
                                                                {msg.body}
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex justify-end items-center gap-1 mt-1 -mb-1 ml-4 float-right select-none">
                                                            <span className={`text-[11px] min-w-fit font-light ${isOutbound ? 'text-white/80' : 'text-[#667781] dark:text-[#8696a0]'}`}>
                                                                {formatTime(msg.sent_at)}
                                                            </span>
                                                            {isOutbound && (
                                                                <span className={msg.status === 'read' ? 'text-white' : 'text-white/70'}>
                                                                    {msg.status === 'read' ? <CheckCheck size={16} strokeWidth={1.5} /> : <Check size={16} strokeWidth={1.5} />}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {uploadingMedia.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex mb-3 w-full justify-end"
                                            >
                                                <div className={`relative max-w-[65%] rounded-lg px-3 py-2 rounded-tr-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                                                    item.status === 'failed'
                                                        ? 'bg-[#3b3b3b] text-white'
                                                        : 'bg-[#E30613] text-white dark:bg-[#c0000f]'
                                                }`}>
                                                    <div className="mb-1 text-[10px] font-semibold tracking-[0.16em] uppercase text-white/70">
                                                        {item.status === 'failed'
                                                            ? 'Upload failed'
                                                            : `Uploading ${
                                                                  item.mediaType === 'image'
                                                                      ? 'image'
                                                                      : item.mediaType === 'voice'
                                                                      ? 'voice'
                                                                      : 'document'
                                                              }`}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center overflow-hidden">
                                                            {item.mediaType === 'image' && item.previewUrl && (
                                                                <img
                                                                    src={item.previewUrl}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            )}
                                                            {item.mediaType !== 'image' && (
                                                                <>
                                                                    {item.mediaType === 'document' && (
                                                                        <FileText size={18} className="text-white/80" />
                                                                    )}
                                                                    {item.mediaType === 'voice' && (
                                                                        <Mic size={18} className="text-white/80" />
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            {item.status === 'failed' ? (
                                                                <>
                                                                    <p className="text-[11px] text-red-200 truncate">
                                                                        {item.fileName}
                                                                    </p>
                                                                    <p className="text-[10px] text-red-200/80 mt-0.5">
                                                                        Silakan pilih ulang file dan coba lagi.
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                                        <div className="h-full w-1/3 bg-white/70 animate-pulse rounded-full" />
                                                                    </div>
                                                                    <p className="mt-1 text-[11px] text-white/80 truncate">
                                                                        {item.fileName}
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                        {item.status === 'failed' ? (
                                                            <button
                                                                type="button"
                                                                className="p-1.5 rounded-full hover:bg-black/20 text-white/80"
                                                                aria-label="Tutup notifikasi upload gagal"
                                                                onClick={() =>
                                                                    setUploadingMedia(prev =>
                                                                        prev.filter(x => x.id !== item.id)
                                                                    )
                                                                }
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        ) : (
                                                            <Loader2 className="w-4 h-4 animate-spin text-white/80" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                {/* Footer / Input Area */}
                                <footer className="min-h-[62px] bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#d1d7db] dark:border-[#222d34] z-20">
                                    {quotedMessage && (
                                        <div className="px-4 py-2 bg-red-50/40 border-l-4 border-[#E30613] flex items-center justify-between">
                                            <div className="min-w-0 mr-3">
                                                <p className="text-[10px] font-black text-[#E30613] uppercase tracking-[0.2em] mb-1">
                                                    Membalas pesan
                                                </p>
                                                <p className="text-xs text-[#41525d] dark:text-[#e9edef] truncate">
                                                    {quotedMessage.body || 'Media'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setQuotedMessageId(null)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-[#E30613] hover:bg-white transition-colors"
                                                aria-label="Batalkan balasan"
                                            >
                                                <X size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="px-4 py-2 flex items-end gap-3">
                                        <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1] mb-1">
                                            <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors" aria-label="Emoji">
                                                <Smile size={24} strokeWidth={1.5} />
                                            </button>
                                            <div className="relative">
                                                {showQuickReplies && (
                                                    <div className="absolute bottom-12 left-0 w-80 bg-white dark:bg-[#111b21] rounded-3xl shadow-2xl border border-gray-100 dark:border-[#222d34] p-4 z-50">
                                                        <div className="flex items-center justify-between mb-3 px-1">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                                Pesan instan
                                                            </p>
                                                            <Zap size={14} className="text-[#E30613]" />
                                                        </div>
                                                        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                                            {quickReplies.length > 0 ? (
                                                                quickReplies.map((qr) => (
                                                                    <button
                                                                        key={qr.id}
                                                                        type="button"
                                                                        className="w-full text-left p-3 rounded-2xl border border-transparent hover:border-red-100 hover:bg-red-50/60 transition-all"
                                                                        onClick={() => {
                                                                            setMessageInput((prev) =>
                                                                                prev ? `${prev}\n${qr.body_template}` : qr.body_template
                                                                            );
                                                                            setShowQuickReplies(false);
                                                                        }}
                                                                    >
                                                                        <div className="text-xs font-black text-[#1D1D1B] mb-1">
                                                                            {qr.title}
                                                                        </div>
                                                                        <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                                                                            {qr.body_template}
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="py-6 text-center">
                                                                    <p className="text-xs text-gray-400 italic">
                                                                        Belum ada template pesan.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    className={`p-2 rounded-full transition-colors ${
                                                        showQuickReplies
                                                            ? 'bg-[#E30613] text-white shadow-lg'
                                                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#54656f] dark:text-[#aebac1]'
                                                    }`}
                                                    aria-label="Buka pesan instan"
                                                    onClick={() => setShowQuickReplies((prev) => !prev)}
                                                >
                                                    <Zap size={22} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </div>
                                        <form
                                            className="flex-1 flex items-center gap-2"
                                            onSubmit={handleSendMessage}
                                        >
                                            <button
                                                type="button"
                                                className="p-2 mb-1 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                                                aria-label="Lampirkan file"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Paperclip size={22} strokeWidth={1.8} />
                                            </button>
                                            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg min-h-[42px] px-4 py-2 flex items-center shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-[#E30613] transition-colors">
                                                <input
                                                    type="text"
                                                    placeholder="Type a message"
                                                    className="w-full bg-transparent border-none outline-none text-[#111b21] dark:text-[#e9edef] placeholder:text-[#54656f] dark:placeholder:text-[#8696a0] text-[15px] font-normal"
                                                    value={messageInput}
                                                    onChange={(e) => setMessageInput(e.target.value)}
                                                    aria-label="Type a message"
                                                />
                                            </div>
                                            {messageInput.trim() ? (
                                                <button
                                                    type="submit"
                                                    className="p-3 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                                                    disabled={isSending}
                                                    aria-label="Send message"
                                                >
                                                    <Send
                                                        size={24}
                                                        className={isSending ? 'animate-pulse' : ''}
                                                        fill={isSending ? 'currentColor' : 'none'}
                                                    />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="p-3 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                                                    aria-label="Voice message"
                                                >
                                                    <Mic size={24} strokeWidth={1.5} />
                                                </button>
                                            )}
                                        </form>
                                    </div>
                                </footer>
                            </>
                        ) : (
                            // Empty State
                            <div className="flex flex-col items-center justify-center h-full border-b-[6px] border-[#E30613] text-center px-10">
                                <div className="mb-10 animate-in zoom-in duration-500">
                                    <div className="w-[300px] h-[200px] bg-gray-100 dark:bg-[#202c33] rounded-2xl flex items-center justify-center text-[#d1d7db] dark:text-[#374248]">
                                         <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-full bg-[#e9edef] dark:bg-[#2a3942] flex items-center justify-center mb-4">
                                                <UserIcon size={32} className="text-[#aebac1]" />
                                            </div>
                                            <p className="text-sm font-medium">Select a chat to start messaging</p>
                                         </div>
                                    </div>
                                </div>
                                <h1 className="text-[32px] font-light text-[#41525d] dark:text-[#e9edef] mb-5">
                                    Kokohin WhatsApp Center
                                </h1>
                                <p className="text-[#667781] dark:text-[#8696a0] text-sm leading-6 max-w-[560px]">
                                    Send and receive messages without keeping your phone online.<br/>
                                    Use WhatsApp on up to 4 linked devices and 1 phone.
                                </p>
                                <div className="mt-10 flex items-center gap-2 text-[#8696a0] text-xs font-medium">
                                    <div className="w-3 h-3 bg-[#8696a0] rounded-full opacity-30"></div>
                                    End-to-end encrypted
                                </div>
                            </div>
                        )}
                    </div>
                    {showForwardPicker && forwardSourceId && (
                        <div className="absolute inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
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
                                        <X size={18} />
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
                                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                                    {filteredContacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            onClick={() => handleForwardToContact(contact)}
                                            className="w-full flex items-center px-4 py-2 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] text-left"
                                        >
                                            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#dfe3e5] dark:bg-[#667781] mr-3 flex items-center justify-center">
                                                <UserIcon size={20} className="text-[#cfd3d6] dark:text-[#8696a0]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[#111b21] dark:text-[#e9edef] truncate">
                                                    {contact.name || contact.wa_id}
                                                </p>
                                                <p className="text-[11px] text-[#667781] dark:text-[#8696a0] truncate">
                                                    {contact.erp_project_status || contact.wa_id}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/ogg"
                    />
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
