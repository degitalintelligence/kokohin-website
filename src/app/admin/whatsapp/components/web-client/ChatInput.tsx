import React, { memo, useRef, useState } from 'react';
import { Smile, Zap, Paperclip, Send, Mic, X } from 'lucide-react';
import { QuickReply } from './types';

type ChatInputProps = {
    messageInput: string;
    setMessageInput: React.Dispatch<React.SetStateAction<string>>;
    handleSendMessage: (e?: React.FormEvent) => void;
    isSending: boolean;
    showQuickReplies: boolean;
    setShowQuickReplies: React.Dispatch<React.SetStateAction<boolean>>;
    quickReplies: QuickReply[];
    quotedMessage: { id: string; body: string | null } | null;
    onCancelReply: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const ChatInput = ({
    messageInput,
    setMessageInput,
    handleSendMessage,
    isSending,
    showQuickReplies,
    setShowQuickReplies,
    quickReplies,
    quotedMessage,
    onCancelReply,
    onFileSelect
}: ChatInputProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const emojiList = ['😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🤔', '😢', '🙏', '👍', '🔥'];

    const handleEmojiSelect = (emoji: string) => {
        setMessageInput((prev) => (prev ? `${prev}${emoji}` : emoji));
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <footer className="relative min-h-[62px] bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#d1d7db] dark:border-[#222d34] z-20">
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
                        onClick={onCancelReply}
                        className="p-2 rounded-xl text-gray-400 hover:text-[#E30613] hover:bg-white transition-colors"
                        aria-label="Batalkan balasan"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>
            )}
            {showEmoji && (
                <div className="absolute bottom-20 left-4 z-50 bg-white dark:bg-[#111b21] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#222d34] p-3 w-64">
                    <div className="flex flex-wrap gap-2">
                        {emojiList.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] text-xl"
                                onClick={() => handleEmojiSelect(emoji)}
                                aria-label={`Insert emoji ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="px-4 py-2 flex items-end gap-3">
                <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1] mb-1">
                    <button
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        aria-label="Emoji"
                        onClick={() => setShowEmoji((prev) => !prev)}
                    >
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
                    <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg max-h-32 min-h-[42px] px-4 py-2 flex items-center shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-[#E30613] transition-colors">
                        <textarea
                            placeholder="Type a message (Shift+Enter untuk baris baru)..."
                            className="w-full bg-transparent border-none outline-none text-[#111b21] dark:text-[#e9edef] placeholder:text-[#54656f] dark:placeholder:text-[#8696a0] text-[15px] font-normal resize-none leading-relaxed"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            aria-label="Type a message"
                            rows={1}
                            onKeyDown={handleKeyDown}
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
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileSelect}
                accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/ogg"
            />
        </footer>
    );
};

export default memo(ChatInput);
