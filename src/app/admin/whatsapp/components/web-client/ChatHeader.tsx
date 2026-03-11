import React, { memo } from 'react';
import Image from 'next/image';
import { User as UserIcon, Search, FileText, MoreVertical, ArrowLeft } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Contact } from './types';

type ChatHeaderProps = {
    contact: Contact;
    isDarkMode: boolean;
    brokenAvatars: Record<string, boolean>;
    setBrokenAvatars: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onBack: () => void;
    onContactInfo: () => void;
    onExportChat: () => void;
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

const ChatHeader = ({
    contact,
    brokenAvatars,
    setBrokenAvatars,
    onBack,
    onContactInfo,
    onExportChat
}: ChatHeaderProps) => {
    return (
        <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 flex items-center justify-between shrink-0 border-l border-[#d1d7db] dark:border-[#222d34] z-20 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden cursor-pointer w-full" onClick={onContactInfo}>
                <button 
                    className="md:hidden mr-1 text-[#54656f] dark:text-[#aebac1]"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBack();
                    }}
                    aria-label="Back to contacts"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#dfe3e5] dark:bg-[#667781] shrink-0 relative">
                    {contact.avatar_url && !brokenAvatars[contact.id] ? (
                        <Image
                            src={contact.avatar_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                            onError={() => setBrokenAvatars(prev => ({ ...prev, [contact.id]: true }))}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                            <UserIcon size={24} fill="currentColor" className="text-[#cfd3d6] dark:text-[#8696a0]" />
                        </div>
                    )}
                </div>
                <div className="flex flex-col justify-center overflow-hidden flex-1">
                    <h2 className="text-[#111b21] dark:text-[#e9edef] font-normal truncate text-base leading-tight">
                        {contact.name || contact.wa_id}
                    </h2>
                    {contact.isGroup ? (
                        <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate leading-tight mt-0.5 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-semibold uppercase tracking-[0.16em]">
                                Grup
                            </span>
                            <span>Detail anggota di WhatsApp</span>
                        </p>
                    ) : (
                        <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate leading-tight mt-0.5">
                            {getPresenceStatus(contact) || 'offline'}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4 text-[#54656f] dark:text-[#aebac1]">
                <Search size={20} className="cursor-pointer hover:text-black dark:hover:text-white transition-colors" />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onExportChat();
                    }}
                    className="cursor-pointer hover:text-black dark:hover:text-white transition-colors text-xs font-medium"
                    aria-label="Export riwayat chat"
                >
                    <FileText size={18} />
                </button>
                <button
                    type="button"
                    onClick={onContactInfo}
                    className="cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                    aria-label="Info kontak"
                >
                    <MoreVertical size={20} />
                </button>
            </div>
        </div>
    );
};

export default memo(ChatHeader);
