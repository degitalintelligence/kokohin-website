'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    getChatsAction,
    getMessagesAction,
} from '@/app/actions/whatsapp';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import SessionControl from './SessionControl';
import BroadcastModal from './BroadcastModal';
import { MessageSquare, Users, MoreVertical, Loader2, ChevronLeft, User } from 'lucide-react';

// Import types from the optimized component
import type { Contact, Message } from './OptimizedWhatsAppClient';

// Simple fallback component that uses the original implementation
export default function SimpleWhatsAppClient() {
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [contactsError, setContactsError] = useState<string | null>(null);
    const [supabase] = useState(() => createClient());
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch contacts
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const result = await getChatsAction();
                if (result.success && result.contacts) {
                    setContacts(result.contacts);
                } else {
                    setContactsError(result.error || 'Failed to load chats');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setContactsError('An error occurred while loading data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fetch messages when contact selected
    useEffect(() => {
        if (selectedContact) {
            fetchMessages(selectedContact.id, selectedContact.wa_id);
        }
    }, [selectedContact]);

    const fetchMessages = async (contactId: string, waId: string) => {
        try {
            setLoadingMessages(true);
            const result = await getMessagesAction(contactId);
            if (result.success && result.messages) {
                 setMessages(result.messages.reverse());
            } else {
                setMessages([]);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#f4f5f7]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-[#E30613] animate-spin" />
                    <p className="text-[#1D1D1B] font-medium">Memuat WhatsApp (Simple Mode)...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden bg-[#f4f5f7] relative font-sans">
            <div className="flex-1 flex h-full max-w-[1600px] mx-auto bg-white shadow-lg relative overflow-hidden">
                
                {/* Sidebar */}
                <div className="w-[400px] flex flex-col border-r border-gray-200 bg-white shrink-0">
                    {/* Sidebar Header */}
                    <div className="h-16 bg-white px-4 py-2 flex items-center justify-between shrink-0 border-r border-gray-200 shadow-sm z-10">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 cursor-pointer border border-gray-200">
                             <div className="w-full h-full flex items-center justify-center bg-gray-200 text-[#1D1D1B]">
                                 <Users size={20} />
                             </div>
                        </div>
                        <div className="flex gap-4 text-[#1D1D1B]">
                            <button title="Status" className="p-2 rounded-full hover:bg-gray-100 text-[#1D1D1B]">
                                <MessageSquare size={20} />
                            </button>
                            <button 
                                title="Broadcast" 
                                onClick={() => setShowBroadcast(true)}
                                className="p-2 rounded-full hover:bg-gray-100 text-[#1D1D1B]"
                            >
                                <Users size={20} />
                            </button>
                            <button 
                                title="Menu" 
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${showSettings ? 'text-[#E30613] bg-red-50' : 'text-[#1D1D1B]'}`}
                            >
                                <MoreVertical size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Chat List Component */}
                    <ChatList 
                        contacts={contacts} 
                        selectedContactId={selectedContact?.id}
                        onSelectContact={setSelectedContact}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        isLoading={loading}
                    />
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden min-h-0">
                    {showSettings ? (
                        <div className="h-full w-full overflow-y-auto bg-gray-50 p-4">
                            <SessionControl />
                        </div>
                    ) : selectedContact ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="h-16 px-4 py-2 bg-white flex items-center justify-between border-b border-gray-200 shadow-sm z-40">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button 
                                        onClick={() => setSelectedContact(null)}
                                        className="md:hidden p-2 -ml-2 text-gray-600 hover:text-[#1D1D1B]"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div className="flex items-center gap-3 p-2 -ml-2 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                            {selectedContact.avatar_url ? (
                                                <img src={selectedContact.avatar_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                    <User size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-[#1D1D1B] text-base font-bold leading-tight truncate">
                                                {selectedContact.name || selectedContact.wa_id}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-[#E30613]"
                                    title="Contact Info"
                                >
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                            <ChatWindow 
                                key={selectedContact.id}
                                contact={selectedContact} 
                                messages={messages} 
                                onSendMessage={() => fetchMessages(selectedContact.id, selectedContact.wa_id)}
                                onLoadMore={() => {}} 
                                hasMore={false}
                                isLoading={loadingMessages}
                                hideHeader
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 border-b-[6px] border-[#E30613]">
                            <div className="max-w-[560px] text-center px-8">
                                <h1 className="text-[#1D1D1B] text-3xl font-light mb-5 font-sans">Kokohin WhatsApp Center</h1>
                                <p className="text-gray-500 text-sm leading-6 mb-8 font-sans">
                                    Simple Mode Active.<br/>
                                    Some features might be limited.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showBroadcast && (
                <BroadcastModal 
                    isOpen={showBroadcast} 
                    onClose={() => setShowBroadcast(false)} 
                />
            )}
        </div>
    );
}
