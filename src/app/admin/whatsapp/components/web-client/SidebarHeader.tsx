import React, { memo } from 'react';
import { User as UserIcon, Sun, Moon, RefreshCcw, MessageSquarePlus, MoreVertical, ArrowLeft, Search, Filter } from 'lucide-react';

type SidebarHeaderProps = {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    syncingFromWaha: boolean;
    onSync: () => void;
    onBroadcast: () => void;
    onSettings: () => void;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
};

const SidebarHeader = ({
    isDarkMode,
    toggleDarkMode,
    syncingFromWaha,
    onSync,
    onBroadcast,
    onSettings,
    searchQuery,
    setSearchQuery
}: SidebarHeaderProps) => {
    return (
        <>
            {/* Sidebar Header */}
            <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 flex items-center justify-between shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#dfe3e5] dark:bg-[#667781] cursor-pointer" onClick={onSettings}>
                    <div className="w-full h-full flex items-center justify-center text-white">
                        <UserIcon size={24} fill="currentColor" className="text-[#cfd3d6] dark:text-[#8696a0]" />
                    </div>
                </div>
                <div className="flex gap-2 text-[#54656f] dark:text-[#aebac1]">
                    <button 
                        onClick={toggleDarkMode}
                        className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
                        aria-label="Toggle Dark Mode"
                    >
                        {isDarkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
                    </button>
                    <button 
                        onClick={onSync} 
                        className={`p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors ${syncingFromWaha ? 'animate-spin' : ''}`}
                        title="Sync Status"
                        aria-label="Sync Status"
                    >
                        <RefreshCcw size={20} strokeWidth={2} />
                    </button>
                    <button 
                        onClick={onBroadcast}
                        className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                        title="Broadcast"
                        aria-label="Broadcast"
                    >
                        <MessageSquarePlus size={20} strokeWidth={2} />
                    </button>
                    <button 
                        onClick={onSettings}
                        className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                        title="Menu"
                        aria-label="Menu"
                    >
                        <MoreVertical size={20} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="h-[49px] bg-white dark:bg-[#111b21] flex items-center px-3 border-b border-[#e9edef] dark:border-[#202c33]">
                <div className="flex-1 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg flex items-center px-3 h-[35px] transition-all focus-within:bg-white focus-within:shadow-sm">
                    <button className="text-[#54656f] dark:text-[#aebac1] mr-4 transition-transform duration-300">
                        {searchQuery ? <ArrowLeft size={20} className="cursor-pointer animate-in spin-in-180" onClick={() => setSearchQuery('')} /> : <Search size={20} />}
                    </button>
                    <input 
                        type="text" 
                        placeholder="Search or start new chat"
                        className="bg-transparent border-none outline-none text-sm w-full text-[#3b4a54] dark:text-[#d1d7db] placeholder:text-[#54656f] dark:placeholder:text-[#aebac1]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search contacts"
                    />
                </div>
                <button className="ml-2 p-2 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full" aria-label="Filter chats">
                    <Filter size={20} strokeWidth={2} />
                </button>
            </div>
        </>
    );
};

export default memo(SidebarHeader);
