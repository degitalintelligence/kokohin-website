import React, { memo, useMemo } from 'react';
import { List, RowComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import Image from 'next/image';
import { User as UserIcon, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Contact } from './types';

type ContactListProps = {
    contacts: Contact[];
    selectedContactId: string | null;
    onSelectContact: (contact: Contact) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    loading: boolean;
    brokenAvatars: Record<string, boolean>;
    setBrokenAvatars: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

type ContactRowProps = {
    contacts: Contact[];
    selectedContactId: string | null;
    onSelectContact: (contact: Contact) => void;
    onLoadMore: () => void;
    loading: boolean;
    brokenAvatars: Record<string, boolean>;
    setBrokenAvatars: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

function ContactItem({
    index,
    style,
    contacts,
    selectedContactId,
    onSelectContact,
    onLoadMore,
    loading,
    brokenAvatars,
    setBrokenAvatars
}: RowComponentProps<ContactRowProps>) {
    if (index === contacts.length) {
        return (
            <div style={style} className="flex items-center justify-center p-2">
                {loading ? (
                    <Loader2 className="animate-spin text-[#E30613]" />
                ) : (
                    <button
                        onClick={onLoadMore}
                        className="w-full h-full text-[#E30613] text-sm font-medium hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors rounded-lg flex items-center justify-center"
                    >
                        Load more chats
                    </button>
                )}
            </div>
        );
    }

    const contact = contacts[index];
    if (!contact) return null;

    const isGroup = contact.isGroup;
    const hasAvatar = contact.avatar_url && !brokenAvatars[contact.id];
    const rawLocalId = contact.wa_id?.split('@')[0] || '';
    const phoneNumber = (contact.phone || rawLocalId).trim();
    const displayName = contact.name?.trim() || phoneNumber;
    const isSelected = selectedContactId === contact.id;

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Kemarin';
        return format(date, 'dd/MM/yyyy');
    };

    return (
        <div
            style={style}
            onClick={() => onSelectContact(contact)}
            className={`
                flex items-center px-3 cursor-pointer transition-colors relative group
                ${isSelected ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'}
            `}
            role="button"
            tabIndex={0}
            aria-label={`Chat with ${displayName}`}
        >
            <div className="relative w-[49px] h-[49px] rounded-full overflow-hidden shrink-0 mr-3 bg-[#dfe3e5] dark:bg-[#667781]">
                {hasAvatar ? (
                    <Image
                        src={contact.avatar_url as string}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="49px"
                        onError={() =>
                            setBrokenAvatars((prev: Record<string, boolean>) => ({
                                ...prev,
                                [contact.id]: true
                            }))
                        }
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                        <UserIcon size={28} fill="currentColor" className="text-[#cfd3d6] dark:text-[#8696a0]" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-[#e9edef] dark:border-[#222d34] h-full group-hover:border-transparent py-3">
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
                    {(contact.unread_count || 0) > 0 && (
                        <span className="bg-[#E30613] text-white text-[12px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-sm">
                            {contact.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

const ContactList = ({
    contacts,
    selectedContactId,
    onSelectContact,
    onLoadMore,
    hasMore,
    loading,
    brokenAvatars,
    setBrokenAvatars
}: ContactListProps) => {
    const itemCount = hasMore ? contacts.length + 1 : contacts.length;

    const rowProps = useMemo(() => ({
        contacts,
        selectedContactId,
        onSelectContact,
        onLoadMore,
        loading,
        brokenAvatars,
        setBrokenAvatars
    }), [contacts, selectedContactId, onSelectContact, onLoadMore, loading, brokenAvatars, setBrokenAvatars]);

    return (
        <div className="flex-1 h-full min-h-0 bg-white dark:bg-[#111b21]">
            <AutoSizer
                renderProp={({ height, width }: { height: number | undefined; width: number | undefined }) => {
                    if (!height || !width) {
                        return null;
                    }

                    return (
                        <List
                            rowCount={itemCount}
                            rowHeight={72}
                            rowProps={rowProps}
                            rowComponent={ContactItem}
                            className="custom-scrollbar"
                            style={{ height, width }}
                        />
                    );
                }}
            />
        </div>
    );
};

export default memo(ContactList);
