'use client';

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import Image from 'next/image';
import { Contact, Message } from './OptimizedWhatsAppClient';
import { 
    Send, 
    Paperclip, 
    MessageSquareReply, 
    Smile, 
    Check, 
    CheckCheck, 
    Clock, 
    FileText, 
    Mic, 
    User, 
    Trash2,
    Search,
    MoreVertical,
    Phone,
    Video,
    Play,
    Pause,
    Download,
    Zap,
    ChevronLeft,
    X
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    deleteMessageForSenderAction,
    quoteReplyAction,
    sendMessageAction,
    getQuickRepliesAction,
} from '@/app/actions/whatsapp';
import { toast } from 'sonner';

interface ChatWindowProps {
    contact: Contact;
    messages: Message[];
    onSendMessage: () => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading?: boolean;
    onToggleContactInfo?: () => void;
    onBack?: () => void;
    hideHeader?: boolean;
}

// Kokohin branded background
const BACKGROUND_STYLE = {
    backgroundColor: '#f8f9fa', // Lighter background
    backgroundImage: `radial-gradient(#e5e7eb 0.5px, transparent 0.5px)`,
    backgroundSize: '20px 20px',
};

// Quick Reply Type
interface QuickReply {
    id: string;
    title: string;
    body_template: string;
}

const AudioPlayer = ({ src, isOutbound }: { src: string, isOutbound: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (!audio.duration) return;
            const time = audio.currentTime;
            setProgress((time / audio.duration) * 100);
            setCurrentTime(time);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    const formatTime = (time: number) => {
        if (!time) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 min-w-[240px] p-2 rounded-xl ${isOutbound ? 'bg-red-50/50' : 'bg-gray-50'}`}>
            <audio ref={audioRef} src={src} preload="metadata" />
            <button 
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0 shadow-sm ${isOutbound ? 'bg-[#E30613] text-white hover:bg-[#c0000f]' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
                <div className="h-1 bg-gray-200 rounded-full w-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-100 rounded-full ${isOutbound ? 'bg-[#E30613]' : 'bg-gray-600'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-bold tabular-nums">
                        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
                    </span>
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${isOutbound ? 'text-[#E30613]' : 'text-gray-400'}`}>
                        <Mic size={10} strokeWidth={3} /> Voice
                    </div>
                </div>
            </div>
        </div>
    );
};

const MessageItem = memo((
    { 
        msg, 
        quoted, 
        isOutbound, 
        onQuote, 
        onDelete, 
        isDeleting,
        isGroup,
        senderLabel
    }: { 
        msg: Message; 
        quoted: Message | null; 
        isOutbound: boolean;
        onQuote: (id: string) => void;
        onDelete: (id: string) => void;
        isDeleting: boolean;
        isGroup?: boolean;
        senderLabel?: string | null;
    }
) => {
    const isMedia = msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'voice' || msg.type === 'document';
    const isVisualMedia = msg.type === 'image' || msg.type === 'video';
    const [mediaLoading, setMediaLoading] = useState(isVisualMedia && !!msg.mediaUrl);
    const [mediaError, setMediaError] = useState(false);
    const roleLabel =
        msg.sender_type === 'agent'
            ? 'Admin'
            : msg.sender_type === 'customer'
                ? 'Customer'
                : msg.sender_type === 'system'
                    ? 'System'
                    : null;
    
    return (
        <div className={`flex mb-4 ${isOutbound ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-3 duration-500`}>
            <div className={`max-w-[85%] md:max-w-[70%] lg:max-w-[60%] rounded-2xl relative px-4 py-3 shadow-sm transition-all
                ${isOutbound 
                    ? 'bg-[#E30613] text-white rounded-tr-none shadow-[0_4px_15px_rgba(227,6,19,0.15)]' 
                    : 'bg-white text-[#1D1D1B] rounded-tl-none border border-gray-100'}`}
            >
                {isGroup && (
                    <div className="mb-1 flex items-center gap-1.5">
                        <p className={`text-[12px] font-black leading-tight truncate ${isOutbound ? 'text-white' : 'text-[#1D1D1B]'}`}>
                            {isOutbound ? 'Anda' : senderLabel || 'Anggota Grup'}
                        </p>
                        {roleLabel && (
                            <span
                                className={`px-2 py-[2px] rounded-full text-[9px] font-bold tracking-[0.16em] uppercase border
                                    ${isOutbound
                                        ? 'bg-white/10 border-white/40 text-white/80'
                                        : 'bg-[#E30613]/5 border-[#E30613]/40 text-[#E30613]'
                                    }`}
                            >
                                {roleLabel}
                            </span>
                        )}
                    </div>
                )}

                {/* Quoted Message */}
                {quoted && (
                    <div className={`mb-2 rounded-xl overflow-hidden border-l-[4px] p-2.5 cursor-pointer transition-all hover:opacity-90
                        ${isOutbound ? 'bg-black/10 border-white/40' : 'bg-gray-50 border-[#E30613]'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isOutbound ? 'text-white/80' : 'text-[#E30613]'}`}>
                            {isOutbound ? 'Anda' : 'Pengirim'}
                        </p>
                        <p className={`text-xs line-clamp-2 ${isOutbound ? 'text-white/70' : 'text-gray-500'}`}>{quoted.body || 'Media'}</p>
                    </div>
                )}

                {/* Media Content */}
                {msg.mediaUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden shadow-inner relative">
                        {msg.type === 'image' && (
                            <div
                                className="relative w-full max-h-[400px] border border-black/5 cursor-pointer overflow-hidden"
                                onClick={() => window.open(msg.mediaUrl!, '_blank')}
                            >
                                <div className="relative w-full h-[400px]">
                                    {!mediaError ? (
                                        <Image
                                            src={msg.mediaUrl}
                                            alt="Image"
                                            fill
                                            className="object-cover hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 768px) 90vw, 600px"
                                            loading="lazy"
                                            onLoadingComplete={() => setMediaLoading(false)}
                                            onError={() => {
                                                setMediaError(true);
                                                setMediaLoading(false);
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-black/5">
                                            <span className="text-xs font-semibold text-gray-600">
                                                Media gambar gagal dimuat
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {msg.type === 'video' && (
                            <>
                                {!mediaError ? (
                                    <video 
                                        src={msg.mediaUrl} 
                                        controls 
                                        preload="metadata"
                                        className="w-full max-h-[400px] object-cover border border-black/5"
                                        onLoadedData={() => setMediaLoading(false)}
                                        onError={() => {
                                            setMediaError(true);
                                            setMediaLoading(false);
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-[220px] flex items-center justify-center bg-black/5">
                                        <span className="text-xs font-semibold text-gray-600">
                                            Media video gagal dimuat
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                        {(msg.type === 'audio' || msg.type === 'voice' || msg.type === 'ptt') && (
                            <AudioPlayer src={msg.mediaUrl} isOutbound={isOutbound} />
                        )}
                        {msg.type === 'document' && (
                            <a 
                                href={msg.mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all group/doc
                                    ${isOutbound ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                            >
                                <div className={`p-2.5 rounded-xl shadow-sm ${isOutbound ? 'bg-white text-[#E30613]' : 'bg-[#E30613] text-white'}`}>
                                    <FileText size={22} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className={`font-black text-xs truncate ${isOutbound ? 'text-white' : 'text-[#1D1D1B]'}`}>{msg.body || 'Document'}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isOutbound ? 'text-white/60' : 'text-gray-400'}`}>PDF Document</p>
                                </div>
                                <Download size={18} className={`transition-transform group-hover/doc:translate-y-0.5 ${isOutbound ? 'text-white/60' : 'text-gray-400'}`} />
                            </a>
                        )}

                        {isVisualMedia && mediaLoading && !mediaError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                )}

                {/* Message Body (Text) */}
                {(!isMedia || (isMedia && msg.body && msg.type !== 'document' && msg.type !== 'audio' && msg.type !== 'voice' && msg.type !== 'ptt')) && (
                     <div className="pr-12 pb-1 min-w-[100px]">
                         {msg.is_deleted ? (
                             <span className={`italic flex items-center gap-2 text-xs ${isOutbound ? 'text-white/60' : 'text-gray-400'}`}>
                                 <Trash2 size={14} /> Pesan ini telah dihapus
                             </span>
                         ) : (
                             <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium tracking-tight">{msg.body}</p>
                         )}
                    </div>
                )}

                {/* Metadata */}
                <div className="absolute right-3 bottom-2 flex items-center gap-1.5 select-none">
                    <span className={`text-[10px] font-bold ${isOutbound ? 'text-white/70' : 'text-gray-400'}`}>
                        {format(new Date(msg.sent_at), 'HH:mm')}
                    </span>
                    {isOutbound && (
                        <span className={`transition-colors ${msg.status === 'read' ? 'text-white' : 'text-white/50'}`}>
                            {msg.status === 'read' ? <CheckCheck size={14} strokeWidth={3} /> : 
                             msg.status === 'delivered' ? <CheckCheck size={14} strokeWidth={3} /> : 
                             msg.status === 'sent' ? <Check size={14} strokeWidth={3} /> : <Clock size={12} strokeWidth={3} />}
                        </span>
                    )}
                </div>
                
                {/* Interaction Menu (Hover) */}
                {!msg.is_deleted && (
                    <div className={`absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100`}>
                        <button 
                            className={`p-1.5 rounded-lg transition-colors ${isOutbound ? 'hover:bg-white/20 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-[#E30613]'}`}
                            onClick={() => onQuote(msg.id)}
                            title="Balas"
                        >
                            <MessageSquareReply size={16} strokeWidth={2.5} />
                        </button>
                        {isOutbound && (
                            <button
                                className="p-1.5 rounded-lg transition-colors hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => onDelete(msg.id)}
                                title={isDeleting ? 'Menghapus...' : 'Hapus untuk saya'}
                                disabled={isDeleting}
                            >
                                <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default function ChatWindow({ 
    contact, 
    messages, 
    onSendMessage, 
    onLoadMore, 
    hasMore, 
    isLoading,
    onToggleContactInfo,
    onBack,
    hideHeader = false
}: ChatWindowProps) {
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [quotedId, setQuotedId] = useState<string | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const [deletingMessageIds, setDeletingMessageIds] = useState<string[]>([]);
    const [avatarBroken, setAvatarBroken] = useState(false);

    // Load Quick Replies
    useEffect(() => {
        getQuickRepliesAction().then(res => {
            if (res.success && res.replies) {
                setQuickReplies(res.replies as QuickReply[]);
            }
        });
    }, []);

    useEffect(() => {
        setAvatarBroken(false);
    }, [contact.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesPage === 1) {
             endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop === 0 && hasMore && !isLoading) {
             onLoadMore();
        }
    }, [hasMore, isLoading, onLoadMore]);

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            let result;
            if (quotedId) {
                result = await quoteReplyAction(contact.id, quotedId, newMessage);
            } else {
                result = await sendMessageAction(contact.id, newMessage);
            }

            if (!result.success) {
                toast.error('Gagal mengirim pesan');
                return;
            }

            setNewMessage('');
            setQuotedId(null);
            onSendMessage();
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Gagal mengirim pesan');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const quotedMessage = useMemo(() => 
        quotedId ? messages.find(m => m.id === quotedId) || null : null
    , [quotedId, messages]);

    const groupedMessages = useMemo(() => {
        const groups: { [key: string]: Message[] } = {};
        messages.forEach(msg => {
            const date = new Date(msg.sent_at).toDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    }, [messages]);

    const isGroupChat = useMemo(() => {
        const waId = contact.wa_id || '';
        return waId.includes('@g.us');
    }, [contact]);

    const getGroupSenderLabel = useCallback((msg: Message) => {
        const raw = (msg as unknown as { raw_payload?: unknown }).raw_payload;
        if (!raw || typeof raw !== 'object') return null;

        const payload = raw as Record<string, unknown>;

        const notifyName = typeof payload.notifyName === 'string' ? payload.notifyName : null;
        const senderName = typeof payload.senderName === 'string' ? payload.senderName : null;

        const contacts = Array.isArray((payload as { contacts?: unknown }).contacts)
            ? ((payload as { contacts?: unknown }).contacts as unknown[])
            : null;

        const firstContact = contacts && contacts.length > 0 ? (contacts[0] as Record<string, unknown>) : null;
        const contactProfileName =
            firstContact && firstContact.profile && typeof (firstContact.profile as { name?: unknown }).name === 'string'
                ? ((firstContact.profile as { name?: string }).name ?? null)
                : null;
        const contactWaId =
            firstContact && typeof firstContact.wa_id === 'string' ? (firstContact.wa_id as string) : null;

        const author = typeof payload.author === 'string' ? payload.author : null;
        const from = typeof payload.from === 'string' ? payload.from : null;

        const primaryName = notifyName || senderName || contactProfileName || null;
        const jidSource = author || from || contactWaId || null;

        if (primaryName && primaryName.trim()) {
            return primaryName.trim();
        }

        if (jidSource) {
            const localPart = String(jidSource).split('@')[0];
            const digitsOnly = localPart.replace(/\D/g, '');

            if (
                digitsOnly.length >= 8 &&
                digitsOnly.length <= 15 &&
                digitsOnly.startsWith('62')
            ) {
                return digitsOnly;
            }
        }

        return null;
    }, []);

    const handleDeleteMessage = async (id: string) => {
        setDeletingMessageIds((prev) => {
            if (prev.includes(id)) return prev;
            return [...prev, id];
        });
        try {
            const result = await deleteMessageForSenderAction(id);
            if (!result.success) {
                toast.error('Gagal menghapus pesan');
            } else {
                toast.success('Pesan dihapus');
            }
        } catch {
            toast.error('Gagal menghapus pesan');
        } finally {
            setDeletingMessageIds((prev) => prev.filter((messageId) => messageId !== id));
        }
    };

    const formatMessageDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return 'Hari Ini';
        if (isYesterday(date)) return 'Kemarin';
        return format(date, 'EEEE, d MMMM yyyy', { locale: id });
    };

    const messagesPage = 1;

    return (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden font-sans antialiased">
            {/* Header Area */}
            {!hideHeader && (
                <div className="absolute left-0 right-0 top-0 h-16 px-6 bg-white/80 backdrop-blur-md flex items-center justify-between border-b border-gray-100 z-[60] shadow-sm">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button onClick={onBack} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-[#E30613] transition-colors">
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </button>
                        
                        <div className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0" onClick={onToggleContactInfo}>
                            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm transition-transform group-hover:scale-105 relative">
                                {contact.avatar_url && !avatarBroken ? (
                                    <Image
                                        src={contact.avatar_url}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                        onError={() => setAvatarBroken(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                        <User size={22} />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-[#1D1D1B] text-base font-black tracking-tight truncate group-hover:text-[#E30613] transition-colors leading-tight">
                                    {(contact.name || '').trim() || contact.phone || contact.wa_id.split('@')[0]}
                                </h2>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-0.5 group-hover:text-gray-600">
                                    {contact.erp_project_status || 'Info Kontak'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-[#E30613] transition-all" title="Cari Pesan">
                            <Search size={20} strokeWidth={2.5} />
                        </button>
                        <button onClick={onToggleContactInfo} className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-[#E30613] transition-all" title="Opsi Lainnya">
                            <MoreVertical size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}

            {/* Messages Scroll Area */}
            <div 
                className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-6 flex flex-col relative z-10 transition-all ${hideHeader ? 'pt-6' : 'pt-[84px]'}`}
                ref={scrollRef}
                onScroll={handleScroll}
                style={BACKGROUND_STYLE}
            >
                {isLoading && (
                    <div className="flex justify-center py-4 sticky top-0 z-20">
                         <div className="bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 px-4 py-2 rounded-full flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Memuat Pesan...</span>
                         </div>
                    </div>
                )}
                
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <React.Fragment key={date}>
                        <div className="flex justify-center mb-6 mt-4 sticky top-4 z-10">
                            <span className="bg-white/90 backdrop-blur-md shadow-sm px-4 py-1.5 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-[0.1em] border border-gray-100">
                                {formatMessageDate(date)}
                            </span>
                        </div>
                        {msgs.map((msg) => (
                            <MessageItem 
                                key={msg.id} 
                                msg={msg} 
                                quoted={msg.quoted_message_id ? messages.find(m => m.id === msg.quoted_message_id) || null : null}
                                isOutbound={msg.direction === 'outbound'}
                                onQuote={setQuotedId}
                                onDelete={handleDeleteMessage}
                                isDeleting={deletingMessageIds.includes(msg.id)}
                                isGroup={isGroupChat}
                                senderLabel={isGroupChat ? getGroupSenderLabel(msg) : null}
                            />
                        ))}
                    </React.Fragment>
                ))}
                <div ref={endRef} className="h-2 shrink-0" />
            </div>

            {/* Bottom Interaction Bar */}
            <div className="bg-white border-t border-gray-100 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                {/* Quote Preview */}
                {quotedMessage && (
                    <div className="px-6 py-3 bg-red-50/30 border-l-[6px] border-[#E30613] flex justify-between items-center animate-in slide-in-from-bottom-4 duration-300">
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-black text-[#E30613] uppercase tracking-widest mb-1">Membalas Pesan</p>
                            <p className="text-sm text-gray-600 font-medium truncate">{quotedMessage.body || 'Media'}</p>
                        </div>
                        <button onClick={() => setQuotedId(null)} className="p-2 text-gray-400 hover:text-[#E30613] hover:bg-white rounded-xl transition-all shadow-sm">
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>
                )}

                {/* Input Area */}
                <div className="px-4 py-3 flex items-end gap-3 max-w-6xl mx-auto w-full">
                    <div className="flex items-center gap-1 mb-1">
                        <div className="relative">
                            {showQuickReplies && (
                                <div className="absolute bottom-14 left-0 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pesan Instan</p>
                                        <Zap size={14} className="text-[#E30613]" />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                        {quickReplies.length > 0 ? quickReplies.map(qr => (
                                            <button 
                                                key={qr.id}
                                                className="w-full text-left p-4 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 group/qr"
                                                onClick={() => {
                                                    setNewMessage(prev => prev + qr.body_template);
                                                    setShowQuickReplies(false);
                                                }}
                                            >
                                                <div className="font-black text-xs text-[#1D1D1B] mb-1 group-hover/qr:text-[#E30613] transition-colors tracking-tight">{qr.title}</div>
                                                <div className="text-[11px] text-gray-400 line-clamp-2 font-medium leading-relaxed">{qr.body_template}</div>
                                            </button>
                                        )) : (
                                            <div className="text-center py-8">
                                                <p className="text-xs text-gray-400 italic font-medium">Belum ada template pesan.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <button 
                                className={`p-2.5 rounded-xl transition-all duration-300 ${showQuickReplies ? 'bg-[#E30613] text-white shadow-lg' : 'text-gray-400 hover:text-[#E30613] hover:bg-gray-50'}`}
                                onClick={() => setShowQuickReplies(!showQuickReplies)}
                                title="Pesan Instan"
                            >
                                <Zap size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        <button className="p-2.5 rounded-xl text-gray-400 hover:text-[#E30613] hover:bg-gray-50 transition-all"><Smile size={20} strokeWidth={2.5} /></button>
                        <button className="p-2.5 rounded-xl text-gray-400 hover:text-[#E30613] hover:bg-gray-50 transition-all"><Paperclip size={20} strokeWidth={2.5} /></button>
                    </div>
                    
                    <div className="flex-1 bg-gray-50 rounded-[1.5rem] border border-gray-100 focus-within:border-[#E30613]/30 focus-within:ring-4 focus-within:ring-[#E30613]/5 focus-within:bg-white transition-all duration-300 px-5 py-3 flex items-end">
                        <textarea 
                            className="w-full max-h-[150px] outline-none text-[#1D1D1B] text-[15px] font-medium placeholder-gray-400 bg-transparent resize-none leading-relaxed py-1"
                            placeholder="Tulis pesan Anda di sini..."
                            rows={1}
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={handleKeyPress}
                            autoFocus
                        />
                    </div>
                    
                    <div className="mb-1">
                        {newMessage.trim() ? (
                            <button 
                                className="w-12 h-12 flex items-center justify-center text-white bg-[#E30613] rounded-2xl hover:bg-[#c0000f] transition-all shadow-[0_4px_15px_rgba(227,6,19,0.3)] active:scale-90" 
                                onClick={handleSend}
                                disabled={sending}
                            >
                                <Send size={20} strokeWidth={2.5} className={sending ? 'opacity-50' : ''} />
                            </button>
                        ) : (
                            <button className="w-12 h-12 flex items-center justify-center text-gray-400 bg-gray-50 rounded-2xl hover:bg-[#E30613] hover:text-white transition-all active:scale-90 group">
                                <Mic size={20} strokeWidth={2.5} className="group-hover:animate-pulse" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="h-2 shrink-0 md:hidden" />
            </div>
        </div>
    );
}
