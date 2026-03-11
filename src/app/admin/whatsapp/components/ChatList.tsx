'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Contact } from './OptimizedWhatsAppClient';
import { Search, Filter, User, MoreVertical, Archive, PlusCircle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ChatListProps {
    contacts: Contact[];
    selectedContactId?: string;
    onSelectContact: (contact: Contact) => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    isLoading?: boolean;
    onLoadMore?: () => void;
    hasMore?: boolean;
}

const ITEM_HEIGHT = 72;
const BUFFER_ITEMS = 5;

export default function ChatList({ 
    contacts, 
    selectedContactId, 
    onSelectContact,
    searchQuery,
    onSearchChange,
    isLoading,
    onLoadMore,
    hasMore
}: ChatListProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery || '');
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(800);

    // Sync local search
    useEffect(() => {
        if (searchQuery !== undefined && searchQuery !== localSearch) {
            setLocalSearch(searchQuery);
        }
    }, [searchQuery]);

    // Debounce search
    useEffect(() => {
        if (!onSearchChange) return;
        if (localSearch === searchQuery) return;

        const timeoutId = setTimeout(() => {
            onSearchChange(localSearch);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [localSearch, searchQuery, onSearchChange]);

    // Measure container height
    useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setContainerHeight(entry.contentRect.height);
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    // Virtualization logic
    const totalItems = contacts.length;
    const totalHeight = totalItems * ITEM_HEIGHT;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
    const endIndex = Math.min(
        totalItems - 1,
        Math.floor((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_ITEMS
    );
    
    const visibleItems = [];
    if (totalItems > 0) {
        for (let i = startIndex; i <= endIndex; i++) {
            visibleItems.push({
                index: i,
                contact: contacts[i]
            });
        }
    }

    const paddingTop = startIndex * ITEM_HEIGHT;
    const paddingBottom = Math.max(0, totalHeight - (endIndex + 1) * ITEM_HEIGHT);

    // Handle scroll
    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        setScrollTop(scrollTop);

        // Infinite scroll trigger
        if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !isLoading && onLoadMore) {
            onLoadMore();
        }
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // If today, show time
        if (new Date().toDateString() === date.toDateString()) {
            return format(date, 'HH:mm');
        }
        // If this week, show day name
        if (new Date().getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
            return format(date, 'EEEE', { locale: idLocale });
        }
        return format(date, 'dd/MM/yy');
    };

    return (
        <div className="flex flex-col h-full bg-white relative font-sans antialiased">
            {/* Search Section */}
            <div className="px-4 py-3 bg-white border-b border-gray-100/50 shrink-0 z-10">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search size={16} className={`transition-colors duration-200 ${localSearch ? 'text-[#E30613]' : 'text-gray-400 group-focus-within:text-[#E30613]'}`} strokeWidth={2.5} />
                    </div>
                    <input 
                        className="block w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-11 pr-10 text-sm placeholder-gray-400 text-[#1D1D1B] focus:ring-2 focus:ring-[#E30613]/10 focus:bg-white transition-all duration-300 shadow-sm"
                        placeholder="Cari pesan atau kontak..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                    />
                    {localSearch && (
                        <button 
                            onClick={() => setLocalSearch('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <PlusCircle size={16} className="rotate-45" />
                        </button>
                    )}
                </div>
            </div>

            {/* List Section */}
            <div 
                className="flex-1 overflow-y-auto custom-scrollbar relative bg-white"
                ref={containerRef}
                onScroll={onScroll}
            >
                {/* Virtual Scroll Container */}
                <div style={{ height: totalHeight }} className="relative">
                    <div style={{ transform: `translateY(${paddingTop}px)` }} className="divide-y divide-gray-50">
                         {visibleItems.map(({ index, contact }) => (
                             <div 
                                 key={contact.id}
                                 className={`h-[76px] px-4 flex items-center cursor-pointer transition-all duration-200 group relative
                                    ${selectedContactId === contact.id ? 'bg-red-50/60' : 'hover:bg-gray-50/80 active:bg-gray-100'}`}
                                 onClick={() => onSelectContact(contact)}
                             >
                                 {/* Active Indicator Bar */}
                                 {selectedContactId === contact.id && (
                                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[#E30613] rounded-r-full shadow-[0_0_12px_rgba(227,6,19,0.3)] animate-in slide-in-from-left duration-300"></div>
                                 )}

                                 {/* Avatar Wrapper */}
                                <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden bg-gray-100 mr-4 shrink-0 relative border border-gray-100 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                     {contact.avatar_url ? (
                                         <Image
                                            src={contact.avatar_url}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            sizes="52px"
                                         />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 group-hover:bg-gray-100 transition-colors">
                                             <User size={26} strokeWidth={1.5} />
                                         </div>
                                     )}
                                     
                                     {/* Online Status (Simulated) */}
                                     <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                                 </div>
                                 
                                 {/* Info Content */}
                                 <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                     <div className="flex justify-between items-baseline mb-1">
                                         <span className={`font-black truncate text-[16px] tracking-tight leading-tight transition-colors ${selectedContactId === contact.id ? 'text-[#E30613]' : 'text-[#1D1D1B]'}`}>
                                             {contact.name || contact.wa_id.split('@')[0]}
                                         </span>
                                         <span className={`text-[11px] font-bold shrink-0 ml-2 tracking-tighter uppercase
                                             ${contact.unread_count ? 'text-[#E30613]' : 'text-gray-400'}`}>
                                             {formatTime(contact.last_message_at)}
                                         </span>
                                     </div>
                                     
                                     <div className="flex justify-between items-center">
                                         <div className={`flex items-center text-[13px] truncate leading-tight transition-colors ${contact.unread_count ? 'text-[#1D1D1B] font-bold' : 'text-gray-400 font-medium'}`}>
                                             <span className="truncate">
                                                 {contact.erp_project_status ? (
                                                     <span className="inline-flex items-center gap-1">
                                                         <span className={`w-1.5 h-1.5 rounded-full ${contact.erp_project_status === 'deal' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                                         {contact.erp_project_status}
                                                     </span>
                                                 ) : 'Klik untuk melihat pesan'}
                                             </span>
                                         </div>
                                         
                                         {/* Interaction Badges */}
                                         <div className="flex items-center gap-2 shrink-0 ml-2">
                                             {contact.unread_count ? (
                                                 <span className="bg-[#E30613] text-white text-[10px] font-black min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center leading-none shadow-[0_4px_10px_rgba(227,6,19,0.3)] animate-in zoom-in duration-300">
                                                     {contact.unread_count}
                                                 </span>
                                             ) : (
                                                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <MoreVertical size={14} className="text-gray-300" />
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>

                {/* Loading / Empty States */}
                {isLoading && (
                    <div className="flex items-center justify-center p-6 bg-white border-t border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat...</span>
                        </div>
                    </div>
                )}
                
                {!isLoading && contacts.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                            <Search size={24} className="text-gray-300" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-[#1D1D1B] font-black text-sm mb-1 tracking-tight">Tidak Ada Hasil</h3>
                        <p className="text-gray-400 text-xs font-medium">Coba gunakan kata kunci lain</p>
                    </div>
                )}
                
                {/* Scroll Down Indicator */}
                {hasMore && !isLoading && (
                    <div className="h-1 bg-gradient-to-t from-gray-50 to-transparent absolute bottom-0 left-0 right-0 pointer-events-none"></div>
                )}
            </div>
        </div>
    );
}
