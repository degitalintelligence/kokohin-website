'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Contact } from './OptimizedWhatsAppClient';
import { Search, Filter, User, Users, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface ChatListProps {
    contacts: Contact[];
    selectedContactId?: string;
    onSelectContact: (contact: Contact) => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    pagination?: {
        total: number;
        totalPages: number;
    };
    currentPage?: number;
    onPageChange?: (page: number, search?: string) => void;
    errorMessage?: string | null;
    onRetry?: () => void;
    isLoading?: boolean;
}

// Fixed height for virtual scrolling
const ITEM_HEIGHT = 88;
const VIEWPORT_BUFFER = 5;

export default function ChatList({ 
    contacts, 
    selectedContactId, 
    onSelectContact,
    searchQuery,
    onSearchChange,
    pagination,
    currentPage,
    onPageChange,
    errorMessage,
    onRetry,
    isLoading
}: ChatListProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery || '');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600);

    // Sync local search with parent search query
    useEffect(() => {
        if (searchQuery !== undefined && searchQuery !== localSearch) {
            setLocalSearch(searchQuery);
        }
    }, [searchQuery, localSearch]);

    // Update viewport height on mount and resize
    useEffect(() => {
        const updateHeight = () => {
            if (scrollContainerRef.current) {
                const height = scrollContainerRef.current.clientHeight;
                if (height > 0) {
                    setViewportHeight(height);
                }
            }
        };

        updateHeight();
        
        // Use a small timeout to ensure layout is complete
        const timer = setTimeout(updateHeight, 100);

        window.addEventListener('resize', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
            clearTimeout(timer);
        };
    }, []);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Virtual scrolling calculations
    const { startIndex, endIndex, translateY } = useMemo(() => {
        const vHeight = viewportHeight > 0 ? viewportHeight : 1000;
        const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - VIEWPORT_BUFFER);
        const visibleCount = Math.ceil(vHeight / ITEM_HEIGHT);
        const end = Math.min(contacts.length, start + visibleCount + 2 * VIEWPORT_BUFFER);
        
        return {
            startIndex: start,
            endIndex: Math.max(start + 1, end), // Ensure at least one item
            translateY: start * ITEM_HEIGHT
        };
    }, [scrollTop, viewportHeight, contacts.length]);

    const visibleContacts = useMemo(() => {
        return contacts.slice(startIndex, endIndex);
    }, [contacts, startIndex, endIndex]);

    const totalHeight = contacts.length * ITEM_HEIGHT;

    // Debounce search input
    useEffect(() => {
        if (!onSearchChange) return;
        if (localSearch === searchQuery) return;

        const timeoutId = setTimeout(() => {
            onSearchChange(localSearch);
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [localSearch, searchQuery, onSearchChange]);

    const handlePageChange = (newPage: number) => {
        if (onPageChange && pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            onPageChange(newPage, localSearch);
            // Reset scroll to top on page change
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden font-sans">
            {/* Search & Filter */}
            <div className="p-4 border-b border-gray-100 space-y-3">
                <div className="relative group">
                    <Search 
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E30613] transition-colors" 
                        size={18} 
                    />
                    <input 
                        type="text" 
                        placeholder="Cari chat atau pesan..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all"
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#E30613]"></div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button className="flex-1 py-1.5 px-3 rounded-lg bg-[#E30613]/5 text-[#E30613] text-xs font-bold border border-[#E30613]/10 hover:bg-[#E30613]/10 transition-all flex items-center justify-center gap-1.5">
                        <Filter size={14} />
                        Semua
                    </button>
                    <button className="flex-1 py-1.5 px-3 rounded-lg bg-gray-50 text-gray-500 text-xs font-bold border border-gray-100 hover:bg-gray-100 transition-all">
                        Belum Dibaca
                    </button>
                </div>
            </div>

            {/* List with Virtual Scrolling */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto"
            >
                {contacts.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {contacts.map((contact: Contact) => {
                            const unreadCount = contact.unread_count ?? 0;
                            return (
                            <button 
                                key={contact.id}
                                onClick={() => onSelectContact(contact)}
                                style={{ height: `${ITEM_HEIGHT}px` }}
                                className={`w-full flex items-center gap-4 px-4 py-4 transition-all hover:bg-gray-50 text-left relative group
                                    ${selectedContactId === contact.id ? 'bg-gray-50 ring-inset' : ''}`}
                            >
                                {/* Selected Indicator */}
                                {selectedContactId === contact.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E30613]" />
                                )}

                                {/* Avatar */}
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200 relative">
                                    {contact.avatar_url ? (
                                        <img 
                                            src={contact.avatar_url} 
                                            alt={contact.name || 'Avatar'} 
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <User className="text-gray-300" size={28} />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="font-bold text-[#1D1D1B] text-sm truncate pr-2 group-hover:text-[#E30613] transition-colors">
                                                {contact.name || contact.wa_id.split('@')[0]}
                                            </h3>
                                            {contact.erp_project_status && (
                                                <span className={`inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-0.5
                                                    ${contact.erp_project_status === 'Deal' ? 'bg-green-100 text-green-700' : 
                                                      contact.erp_project_status === 'Lost' ? 'bg-gray-100 text-gray-500' :
                                                      'bg-[#E30613]/10 text-[#E30613]'}`}>
                                                    {contact.erp_project_status}
                                                </span>
                                            )}
                                        </div>
                                        {contact.last_message_at && (
                                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                                {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: false, locale: id })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 truncate font-medium">
                                            {contact.wa_id}
                                        </p>
                                        {/* Unread Badge (Mock) */}
                                        {unreadCount > 0 && (
                                            <div className="min-w-[18px] h-[18px] rounded-full bg-[#E30613] text-[10px] font-black text-white flex items-center justify-center px-1">
                                                {unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )})}
                    </div>
                ) : (
                    <div className="p-8 text-center space-y-3">
                        {errorMessage ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
                                    <AlertTriangle size={28} className="text-[#E30613]" />
                                </div>
                                <p className="text-sm font-bold text-[#E30613]">Gagal memuat daftar chat</p>
                                <p className="text-xs text-gray-500 leading-relaxed px-4">{errorMessage}</p>
                                {onRetry && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="mt-2 inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-[#E30613] text-white text-xs font-bold hover:bg-[#bf0813] transition-colors"
                                    >
                                        Coba lagi
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                    <Users size={28} className="text-gray-200" />
                                </div>
                                <p className="text-sm font-bold text-gray-400">Tidak ada kontak ditemukan</p>
                                <p className="text-xs text-gray-400 leading-relaxed px-4">
                                    Pastikan WhatsApp Anda sudah terhubung di menu Pengaturan.
                                </p>
                                <div className="pt-2">
                                    <p className="text-[10px] text-gray-300">Debug: {contacts.length} total, {visibleContacts.length} visible</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
             {pagination && pagination.totalPages > 1 && currentPage && (
                 <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                     <button
                         onClick={() => handlePageChange(currentPage - 1)}
                         disabled={currentPage <= 1}
                         className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-[#E30613] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                         <ChevronLeft size={14} />
                         Sebelumnya
                     </button>
                     <span className="text-xs text-gray-500 font-medium">
                         Halaman {currentPage} dari {pagination.totalPages}
                     </span>
                     <button
                         onClick={() => handlePageChange(currentPage + 1)}
                         disabled={currentPage >= pagination.totalPages}
                         className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-[#E30613] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                         Selanjutnya
                         <ChevronRight size={14} />
                     </button>
                 </div>
             )}
        </div>
    );
}
