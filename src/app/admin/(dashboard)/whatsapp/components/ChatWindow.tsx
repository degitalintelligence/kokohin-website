'use client';

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
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
    StickyNote
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    addInternalNoteAction,
    deleteMessageForSenderAction,
    getInternalNotesAction,
    quoteReplyAction,
    sendMediaMessageAction,
    sendMessageAction,
} from '@/app/actions/whatsapp';

interface ChatWindowProps {
    contact: Contact;
    messages: Message[];
    onSendMessage: () => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading?: boolean;
}

type InternalNote = {
    id: string;
    note: string;
    created_at: string;
    agent_id: string;
};

const quickReplies = [
    { code: 'penawaran', title: 'Penawaran', body: 'Halo Kak, berikut kami kirimkan penawaran untuk kebutuhan proyek Anda. Jika ada revisi spesifikasi, silakan balas pesan ini.' },
    { code: 'kontrak', title: 'Kontrak', body: 'Dokumen kontrak sudah kami siapkan. Mohon ditinjau, lalu konfirmasi agar tim kami lanjut ke tahap eksekusi.' },
    { code: 'progress_update', title: 'Progress Update', body: 'Update progres proyek hari ini: pekerjaan berjalan sesuai jadwal. Kami akan kirim pembaruan berikutnya setelah milestone berikut tercapai.' },
];

const SkeletonChat = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] h-16 w-48 rounded-2xl animate-pulse ${i % 2 === 0 ? 'bg-gray-200' : 'bg-white border border-gray-100'}`} />
            </div>
        ))}
    </div>
);

// Memoized message item to prevent re-renders of the entire list
const MessageItem = memo(({ msg, quoted, isOutbound, onQuote, onDelete }: { 
    msg: Message, 
    quoted: Message | null, 
    isOutbound: boolean,
    onQuote: (id: string) => void,
    onDelete: (id: string) => void
}) => {
    return (
        <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm relative transition-all group-hover:shadow-md
                ${isOutbound 
                    ? 'bg-[#E30613] text-white rounded-tr-none' 
                    : 'bg-white text-[#1D1D1B] rounded-tl-none border border-gray-100'}`}
            >
                {msg.is_forwarded && (
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isOutbound ? 'text-white/70' : 'text-gray-400'}`}>
                        Forwarded
                    </p>
                )}
                {quoted && (
                    <div className={`mb-2 px-2 py-1 rounded-lg border-l-2 ${isOutbound ? 'bg-black/10 border-white/70' : 'bg-gray-50 border-[#E30613]'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isOutbound ? 'text-white/70' : 'text-[#E30613]'}`}>Quote</p>
                        <p className="text-xs line-clamp-2">{quoted.body || 'Lampiran media'}</p>
                    </div>
                )}
                {msg.type === 'chat' ? (
                    <p className={`text-[13px] leading-relaxed font-medium whitespace-pre-wrap ${msg.is_deleted ? 'italic opacity-80' : ''}`}>
                        {msg.is_deleted ? 'message deleted' : msg.body}
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {msg.mediaUrl ? (
                            <div className="rounded-xl overflow-hidden bg-black/5 border border-black/5">
                                {msg.type === 'image' ? (
                                    <img 
                                        src={msg.mediaUrl} 
                                        alt={msg.mediaCaption || 'Media'} 
                                        className="max-w-full h-auto object-contain max-h-64"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="p-3 flex items-center gap-3">
                                        <FileText size={20} className={isOutbound ? 'text-white/70' : 'text-gray-400'} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold truncate">Lampiran Media ({msg.type})</p>
                                            <a 
                                                href={msg.mediaUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`text-[10px] underline ${isOutbound ? 'text-white/70' : 'text-blue-500'}`}
                                            >
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {msg.mediaCaption && (
                                    <p className="p-2 text-[11px] border-t border-black/5">{msg.mediaCaption}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-2 bg-black/5 rounded-xl border border-black/5">
                                <FileText size={20} className={isOutbound ? 'text-white/70' : 'text-gray-400'} />
                                <span className="text-[11px] font-bold">Lampiran Media ({msg.type})</span>
                            </div>
                        )}
                    </div>
                )}
                <div className={`flex items-center gap-1.5 mt-2 justify-end
                    ${isOutbound ? 'text-white/60' : 'text-gray-400'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">
                        {format(new Date(msg.sent_at), 'HH:mm', { locale: id })}
                    </span>
                    {isOutbound && (
                        <div className="flex">
                            {msg.status === 'read' ? (
                                <CheckCheck size={14} className="text-blue-300" />
                            ) : msg.status === 'delivered' ? (
                                <CheckCheck size={14} />
                            ) : msg.status === 'sent' ? (
                                <Check size={14} />
                            ) : (
                                <Clock size={12} />
                            )}
                        </div>
                    )}
                </div>
                <div className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={() => onQuote(msg.id)}
                        className={`p-1.5 rounded-lg ${isOutbound ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'}`}
                        aria-label="Quote pesan"
                    >
                        <MessageSquareReply size={13} />
                    </button>
                    {isOutbound && !msg.is_deleted && (
                        <button
                            type="button"
                            onClick={() => onDelete(msg.id)}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"
                            aria-label="Hapus untuk pengirim"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
                <div className={`absolute top-0 w-2 h-2 
                    ${isOutbound 
                        ? 'left-full -ml-1 border-l-[10px] border-l-[#E30613] border-b-[10px] border-b-transparent' 
                        : 'right-full -mr-1 border-r-[10px] border-r-white border-b-[10px] border-b-transparent'}`} 
                />
            </div>
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default function ChatWindow({ contact, messages, onSendMessage, onLoadMore, hasMore, isLoading }: ChatWindowProps) {
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [quotedMessageId, setQuotedMessageId] = useState<string | null>(null);
    const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevMessagesLength = useRef(messages.length);

    useEffect(() => {
        // Only auto-scroll to bottom if new message arrived (length increased by 1-2)
        // or if it's the first load
        if (scrollRef.current) {
            const isNewMessage = messages.length > prevMessagesLength.current && messages.length - prevMessagesLength.current <= 2;
            const isFirstLoad = prevMessagesLength.current === 0;

            if (isNewMessage || isFirstLoad) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages]);

    useEffect(() => {
        setQuotedMessageId(null);
        setErrorMessage(null);
        setLoadingMore(false);
        getInternalNotesAction(contact.id).then((result) => {
            if (result.success) {
                setInternalNotes((result.notes as InternalNote[]) ?? []);
                return;
            }
            setInternalNotes([]);
        });
    }, [contact.id]);

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        // Store current scroll position to maintain it after loading
        const scrollContainer = scrollRef.current;
        const prevScrollHeight = scrollContainer?.scrollHeight || 0;

        await onLoadMore();

        // Small timeout to allow React to render new messages
        setTimeout(() => {
            if (scrollContainer) {
                const newScrollHeight = scrollContainer.scrollHeight;
                scrollContainer.scrollTop = newScrollHeight - prevScrollHeight;
            }
            setLoadingMore(false);
        }, 50);
    }, [loadingMore, hasMore, onLoadMore]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        setErrorMessage(null);
        try {
            const result = quotedMessageId
                ? await quoteReplyAction(contact.wa_id, quotedMessageId, newMessage.trim())
                : await sendMessageAction(contact.wa_id, newMessage.trim());
            if (!result.success) {
                setErrorMessage(result.error || 'Gagal mengirim pesan');
                return;
            }
            setNewMessage('');
            setQuotedMessageId(null);
            onSendMessage();
        } catch (error) {
            console.error('Failed to send message:', error);
            setErrorMessage('Gagal mengirim pesan. Pastikan sesi WhatsApp aktif.');
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        const result = await deleteMessageForSenderAction(messageId);
        if (!result.success) {
            setErrorMessage(result.error || 'Gagal menghapus pesan');
            return;
        }
        onSendMessage();
    };

    const handleSaveNote = async () => {
        if (!newNote.trim() || savingNote) return;
        setSavingNote(true);
        setErrorMessage(null);
        const result = await addInternalNoteAction(contact.id, newNote);
        if (!result.success) {
            setErrorMessage(result.error || 'Gagal menyimpan catatan internal');
            setSavingNote(false);
            return;
        }
        const refresh = await getInternalNotesAction(contact.id);
        if (refresh.success) {
            setInternalNotes((refresh.notes as InternalNote[]) ?? []);
        }
        setNewNote('');
        setSavingNote(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || sending) return;

        const mimeType = file.type.toLowerCase();
        const isImage = ['image/jpeg', 'image/png'].includes(mimeType);
        const isDocument = [
            'application/pdf',
            'application/msword',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ].includes(mimeType);
        const isVoice = mimeType === 'audio/ogg';
        const maxBytes = isImage || isVoice ? 16 * 1024 * 1024 : isDocument ? 100 * 1024 * 1024 : 0;

        if (!maxBytes) {
            setErrorMessage('Format file tidak didukung. Gunakan JPEG, PNG, PDF, DOC, XLS, atau OGG.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > maxBytes) {
            setErrorMessage('Ukuran file melebihi batas spesifikasi WhatsApp CRM.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSending(true);
        setUploadProgress(10);
        setErrorMessage(null);
        const timer = window.setInterval(() => {
            setUploadProgress((prev) => {
                if (prev === null) return 10;
                return prev < 85 ? prev + 10 : prev;
            });
        }, 120);
        try {
            const result = await sendMediaMessageAction(contact.wa_id, {
                file,
                caption: newMessage.trim() || undefined,
            });
            if (!result.success) {
                setErrorMessage(result.error || 'Gagal mengirim media');
                return;
            }
            setUploadProgress(100);
            setNewMessage('');
            onSendMessage();
        } catch {
            setErrorMessage('Gagal mengirim media. Pastikan koneksi WA aktif.');
        } finally {
            window.clearInterval(timer);
            window.setTimeout(() => setUploadProgress(null), 800);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSending(false);
        }
    };

    const quotedMessage = quotedMessageId ? messages.find((item) => item.id === quotedMessageId) : null;

    const mappedMessages = useMemo(() => messages.map((message) => {
        const quoted = message.quoted_message_id ? messages.find((item) => item.id === message.quoted_message_id) : null;
        return { message, quoted };
    }), [messages]);

    const insertQuickReply = (body: string) => {
        setNewMessage(body);
        setErrorMessage(null);
    };

    const topObserverRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for auto-loading more messages
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !isLoading) {
                    handleLoadMore();
                }
            },
            { threshold: 0.5 }
        );

        if (topObserverRef.current) {
            observer.observe(topObserverRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadingMore, isLoading, handleLoadMore]);

    return (
        <div className="flex-1 flex bg-[#f0f2f5] overflow-hidden relative font-sans">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be5121ca85a1584717.png')] bg-repeat" />
            <div className="flex-1 flex flex-col relative z-10">
                <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                            {contact.avatar_url ? (
                                <img src={contact.avatar_url} alt={contact.name || ''} className="w-full h-full object-cover" />
                            ) : (
                                <User className="text-gray-300" size={24} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-[#1D1D1B] text-base leading-tight">
                                {contact.name || contact.wa_id.split('@')[0]}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-gray-500 font-bold">
                                    {contact.wa_id}
                                </p>
                                {contact.erp_project_status && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest
                                        ${contact.erp_project_status === 'Deal' ? 'bg-green-100 text-green-700' : 
                                          contact.erp_project_status === 'Lost' ? 'bg-gray-100 text-gray-500' :
                                          'bg-[#E30613]/10 text-[#E30613]'}`}>
                                        {contact.erp_project_status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setQuotedMessageId(null)}
                            className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-[#E30613] hover:bg-[#E30613]/5 rounded-xl transition-all"
                        >
                            Reset Quote
                        </button>
                    </div>
                </div>
                {isLoading ? (
                    <SkeletonChat />
                ) : (
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-3"
                    >
                        {/* Sentinel element for auto-loading more messages */}
                        <div ref={topObserverRef} className="h-4 w-full" />
                        
                        {hasMore && (
                            <div className="flex justify-center mb-4">
                                <div className="px-4 py-2 bg-white/50 border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {loadingMore ? 'Memuat pesan lama...' : 'Scroll ke atas untuk muat lebih banyak'}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-center mb-6">
                            <span className="px-3 py-1 bg-white text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 rounded-lg shadow-sm border border-gray-100">
                                Hari Ini
                            </span>
                        </div>
                        {mappedMessages.map(({ message: msg, quoted }, idx) => {
                            const isOutbound = msg.direction === 'outbound';
                            return (
                            <div 
                                key={msg.id || idx}
                                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group`}
                            >
                                <div className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm relative transition-all group-hover:shadow-md
                                    ${isOutbound 
                                        ? 'bg-[#E30613] text-white rounded-tr-none' 
                                        : 'bg-white text-[#1D1D1B] rounded-tl-none border border-gray-100'}`}
                                >
                                    {msg.is_forwarded && (
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isOutbound ? 'text-white/70' : 'text-gray-400'}`}>
                                            Forwarded
                                        </p>
                                    )}
                                    {quoted && (
                                        <div className={`mb-2 px-2 py-1 rounded-lg border-l-2 ${isOutbound ? 'bg-black/10 border-white/70' : 'bg-gray-50 border-[#E30613]'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isOutbound ? 'text-white/70' : 'text-[#E30613]'}`}>Quote</p>
                                            <p className="text-xs line-clamp-2">{quoted.body || 'Lampiran media'}</p>
                                        </div>
                                    )}
                                    {msg.type === 'chat' ? (
                                        <p className={`text-[13px] leading-relaxed font-medium whitespace-pre-wrap ${msg.is_deleted ? 'italic opacity-80' : ''}`}>
                                            {msg.is_deleted ? 'message deleted' : msg.body}
                                        </p>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2 bg-black/5 rounded-xl border border-black/5">
                                            <FileText size={20} className={isOutbound ? 'text-white/70' : 'text-gray-400'} />
                                            <span className="text-[11px] font-bold">Lampiran Media ({msg.type})</span>
                                        </div>
                                    )}
                                    <div className={`flex items-center gap-1.5 mt-2 justify-end
                                        ${isOutbound ? 'text-white/60' : 'text-gray-400'}`}>
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            {format(new Date(msg.sent_at), 'HH:mm', { locale: id })}
                                        </span>
                                        {isOutbound && (
                                            <div className="flex">
                                                {msg.status === 'read' ? (
                                                    <CheckCheck size={14} className="text-blue-300" />
                                                ) : msg.status === 'delivered' ? (
                                                    <CheckCheck size={14} />
                                                ) : msg.status === 'sent' ? (
                                                    <Check size={14} />
                                                ) : (
                                                    <Clock size={12} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => setQuotedMessageId(msg.id)}
                                            className={`p-1.5 rounded-lg ${isOutbound ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'}`}
                                            aria-label="Quote pesan"
                                        >
                                            <MessageSquareReply size={13} />
                                        </button>
                                        {isOutbound && !msg.is_deleted && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"
                                                aria-label="Hapus untuk pengirim"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <div className={`absolute top-0 w-2 h-2 
                                        ${isOutbound 
                                            ? 'left-full -ml-1 border-l-[10px] border-l-[#E30613] border-b-[10px] border-b-transparent' 
                                            : 'right-full -mr-1 border-r-[10px] border-r-white border-b-[10px] border-b-transparent'}`} 
                                    />
                                </div>
                            </div>
                        )})}
                    </div>
                )}
                <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="mb-3 flex items-center gap-2 overflow-x-auto">
                        {quickReplies.map((reply) => (
                            <button
                                key={reply.code}
                                type="button"
                                onClick={() => insertQuickReply(reply.body)}
                                className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100 hover:border-[#E30613]/20 hover:text-[#E30613] transition-all whitespace-nowrap"
                            >
                                {reply.title}
                            </button>
                        ))}
                    </div>
                    {quotedMessage && (
                        <div className="mb-3 p-2 rounded-xl bg-[#E30613]/5 border border-[#E30613]/10 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#E30613]">Quote Reply</p>
                                <p className="text-xs text-[#1D1D1B] line-clamp-2">{quotedMessage.body || 'Lampiran media'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuotedMessageId(null)}
                                className="text-xs font-bold text-[#E30613] hover:underline"
                            >
                                Batal
                            </button>
                        </div>
                    )}
                    {uploadProgress !== null && (
                        <div className="mb-3">
                            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full bg-[#E30613] transition-all" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}
                    {errorMessage && (
                        <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-xs text-[#E30613] font-medium">
                            {errorMessage}
                        </div>
                    )}
                    <form 
                        onSubmit={handleSendMessage}
                        className="flex items-center gap-3 max-w-6xl mx-auto"
                    >
                        <div className="flex gap-1">
                            <button type="button" className="p-2.5 text-gray-400 hover:text-[#E30613] hover:bg-[#E30613]/5 rounded-xl transition-all">
                                <Smile size={22} />
                            </button>
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-gray-400 hover:text-[#E30613] hover:bg-[#E30613]/5 rounded-xl transition-all"
                            >
                                <Paperclip size={22} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                className="hidden" 
                                accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/ogg"
                            />
                        </div>
                        <div className="flex-1 relative">
                            <textarea 
                                rows={1}
                                placeholder="Ketik pesan di sini..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all resize-none max-h-32"
                            />
                        </div>
                        <div className="flex gap-2">
                            {newMessage.trim() ? (
                                <button 
                                    type="submit"
                                    disabled={sending}
                                    className="w-12 h-12 bg-[#E30613] text-white rounded-2xl flex items-center justify-center shadow-[0_4px_15px_rgba(227,6,19,0.3)] hover:shadow-[0_6px_20px_rgba(227,6,19,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                                >
                                    <Send size={20} className={sending ? 'animate-pulse' : ''} />
                                </button>
                            ) : (
                                <button type="button" className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100">
                                    <Mic size={20} />
                                </button>
                            )}
                        </div>
                    </form>
                    <p className="text-center text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-3 opacity-50">
                        Kokohin Secure WhatsApp Gateway
                    </p>
                </div>
            </div>
            <aside className="hidden xl:flex w-80 bg-white border-l border-gray-100 flex-col relative z-10">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <StickyNote size={16} className="text-[#E30613]" />
                    <h4 className="text-sm font-bold text-[#1D1D1B]">Internal Notes</h4>
                </div>
                <div className="p-4 border-b border-gray-100 space-y-2">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Tambah catatan internal untuk tim..."
                        className="w-full min-h-[90px] text-sm bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] resize-none"
                    />
                    <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={!newNote.trim() || savingNote}
                        className="w-full py-2.5 bg-[#E30613] text-white rounded-xl text-xs font-bold hover:bg-[#ff3a47] transition-all disabled:opacity-50"
                    >
                        {savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {internalNotes.length > 0 ? (
                        internalNotes.map((note) => (
                            <div key={note.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                                <p className="text-xs text-[#1D1D1B] whitespace-pre-wrap">{note.note}</p>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">
                                    {format(new Date(note.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
                            <p className="text-xs text-gray-400">Belum ada catatan internal</p>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
