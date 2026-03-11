import React, { memo } from 'react';
import Image from 'next/image';
import { Check, CheckCheck, Trash2, MessageSquareReply, CornerUpRight, FileText } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Message } from './types';

type MessageBubbleProps = {
    message: Message;
    isOutbound: boolean;
    showTail: boolean;
    onReply: (id: string) => void;
    onForward: (id: string) => void;
    onDelete: (message: Message) => void;
};

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Kemarin';
    return format(date, 'dd/MM/yyyy HH:mm');
};

const MessageBubble = ({ message: msg, isOutbound, showTail, onReply, onForward, onDelete }: MessageBubbleProps) => {
    return (
        <div 
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
                    <div className="absolute -top-2 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            type="button"
                            className={`
                                p-1.5 rounded-lg text-xs
                                ${isOutbound ? 'hover:bg-white/20 text-white/80 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-[#E30613]'}
                            `}
                            aria-label="Balas pesan ini"
                            onClick={() => onReply(msg.id)}
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
                            onClick={() => onForward(msg.id)}
                        >
                            <CornerUpRight size={14} strokeWidth={2} />
                        </button>
                        {isOutbound && (
                            <button
                                type="button"
                                className="p-1.5 rounded-lg text-xs hover:bg-white/20 text-white/70 hover:text-white"
                                aria-label="Hapus pesan untuk saya"
                                onClick={() => onDelete(msg)}
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
                        {msg.type === 'image' && (
                            <div className="relative w-full h-64 max-w-[300px]">
                                <Image
                                    src={msg.mediaUrl}
                                    alt="Media"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 70vw, 300px"
                                />
                            </div>
                        )}
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
};

export default memo(MessageBubble);
