'use client';

import React, { useEffect, memo, useRef } from 'react';
import Image from 'next/image';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { List, RowComponentProps } from 'react-window';
import type { ListImperativeAPI } from 'react-window';
import { Loader2, X, FileText, Mic } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { Message, UploadingMedia } from './types';

type MessageListProps = {
    messages: Message[];
    loadingMessages: boolean;
    hasMoreMessages: boolean;
    onLoadOlder: () => void;
    uploadingMedia: UploadingMedia[];
    onCancelUpload: (id: string) => void;
    onReply: (id: string) => void;
    onForward: (id: string) => void;
    onDelete: (message: Message) => void;
    isDarkMode: boolean;
};

type RowProps = {
    messages: Message[];
    loadingMessages: boolean;
    hasMoreMessages: boolean;
    onLoadOlder: () => void;
    uploadingMedia: UploadingMedia[];
    onCancelUpload: (id: string) => void;
    onReply: (id: string) => void;
    onForward: (id: string) => void;
    onDelete: (message: Message) => void;
};

const MessageList = ({
    messages,
    loadingMessages,
    hasMoreMessages,
    onLoadOlder,
    uploadingMedia,
    onCancelUpload,
    onReply,
    onForward,
    onDelete,
    isDarkMode
}: MessageListProps) => {
    const listRef = useRef<ListImperativeAPI | null>(null);
    const hasLoadMoreRow = hasMoreMessages;

    const rowCount = (hasLoadMoreRow ? 1 : 0) + messages.length + uploadingMedia.length;
    const lastIndex = rowCount - 1;

    useEffect(() => {
        if (!loadingMessages && lastIndex >= 0) {
            listRef.current?.scrollToRow({
                index: lastIndex,
                align: 'end',
                behavior: 'auto'
            });
        }
    }, [lastIndex, loadingMessages, listRef]);

    const getRowHeight = (index: number, rowProps: RowProps) => {
        const { messages, uploadingMedia, hasMoreMessages } = rowProps;
        if (hasMoreMessages && index === 0) {
            return 64;
        }

        const baseIndex = hasMoreMessages ? index - 1 : index;

        if (baseIndex < messages.length) {
            const msg = messages[baseIndex];
            let height = 72;

            if (msg.mediaUrl) {
                height += 220;
            }

            const bodyLength = msg.body ? msg.body.length : 0;
            const lines = Math.ceil(bodyLength / 40);
            height += Math.min(200, lines * 18);

            if (msg.quoted_message_id) {
                height += 60;
            }

            return height;
        }

        const uploadIndex = baseIndex - messages.length;
        if (uploadIndex >= 0 && uploadIndex < uploadingMedia.length) {
            return 96;
        }

        return 64;
    };

    const Row = ({
        index,
        style,
        messages,
        loadingMessages,
        hasMoreMessages,
        onLoadOlder,
        uploadingMedia,
        onCancelUpload,
        onReply,
        onForward,
        onDelete
    }: RowComponentProps<RowProps>) => {
        if (hasMoreMessages && index === 0) {
            return (
                <div style={style}>
                    <div className="flex justify-center mb-2 mt-4">
                        <button
                            onClick={onLoadOlder}
                            className="bg-white dark:bg-[#202c33] shadow-md px-4 py-2 rounded-full text-xs text-[#54656f] dark:text-[#aebac1] uppercase font-bold tracking-wide border border-[#e9edef] dark:border-[#222d34] hover:bg-[#f0f2f5] transition-colors"
                            disabled={loadingMessages}
                        >
                            {loadingMessages ? 'Loading...' : 'Load older messages'}
                        </button>
                    </div>
                </div>
            );
        }

        const baseIndex = hasMoreMessages ? index - 1 : index;

        if (baseIndex < messages.length) {
            const msg = messages[baseIndex];
            const isOutbound = msg.direction === 'outbound';
            const nextMsg = messages[baseIndex + 1];
            const showTail = !nextMsg || nextMsg.direction !== msg.direction;

            return (
                <div style={style}>
                    <div className="px-[5%] py-1 flex flex-col justify-end">
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOutbound={isOutbound}
                            showTail={showTail}
                            onReply={onReply}
                            onForward={onForward}
                            onDelete={onDelete}
                        />
                    </div>
                </div>
            );
        }

        const uploadIndex = baseIndex - messages.length;
        const item = uploadingMedia[uploadIndex];

        if (!item) {
            return <div style={style} />;
        }

        return (
            <div style={style}>
                <div className="px-[5%] py-1 flex justify-end">
                    <div
                        className={`relative max-w-[65%] rounded-lg px-3 py-2 rounded-tr-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                            item.status === 'failed'
                                ? 'bg-[#3b3b3b] text-white'
                                : 'bg-[#E30613] text-white dark:bg-[#c0000f]'
                        }`}
                    >
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
                            <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center overflow-hidden relative">
                                {item.mediaType === 'image' && item.previewUrl && (
                                    <Image
                                        src={item.previewUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                        sizes="40px"
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
                                    onClick={() => onCancelUpload(item.id)}
                                >
                                    <X size={14} />
                                </button>
                            ) : (
                                <Loader2 className="w-4 h-4 animate-spin text-white/80" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className="flex-1 overflow-hidden relative bg-[#efeae2] dark:bg-[#0b141a] custom-scrollbar min-h-0"
            style={{
                backgroundImage: isDarkMode
                    ? "url('https://static.whatsapp.net/rsrc.php/v3/yO/r/FSaypKgWH_e.png')"
                    : "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                backgroundBlendMode: isDarkMode ? 'overlay' : 'normal'
            }}
        >
            <AutoSizer
                renderProp={({ height, width }: { height: number | undefined; width: number | undefined }) => {
                    if (!height || !width) {
                        return null;
                    }

                    const rowProps: RowProps = {
                        messages,
                        loadingMessages,
                        hasMoreMessages,
                        onLoadOlder,
                        uploadingMedia,
                        onCancelUpload,
                        onReply,
                        onForward,
                        onDelete
                    };

                    return (
                        <List
                            rowCount={rowCount}
                            rowHeight={(index, props) => getRowHeight(index, props as RowProps)}
                            rowProps={rowProps}
                            rowComponent={Row}
                            className="custom-scrollbar"
                            style={{ height, width }}
                            listRef={listRef}
                        />
                    );
                }}
            />
        </div>
    );
};

export default memo(MessageList);
