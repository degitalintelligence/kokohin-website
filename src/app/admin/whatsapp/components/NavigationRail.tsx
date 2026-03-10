'use client';

import { MessageSquare, Users, Settings, BarChart2, LogOut, ArrowLeft, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

type NavTab = 'chats' | 'broadcast' | 'contacts' | 'settings';

interface NavigationRailProps {
    activeTab: NavTab;
    onTabChange: (tab: NavTab) => void;
    onLogout: () => void;
}

export default function NavigationRail({ activeTab, onTabChange, onLogout }: NavigationRailProps) {
    const navItems = [
        { id: 'chats', icon: MessageSquare, label: 'Percakapan' },
        { id: 'broadcast', icon: Users, label: 'Broadcast' },
        { id: 'contacts', icon: BarChart2, label: 'CRM Kontak' },
        { id: 'settings', icon: Settings, label: 'Pengaturan' },
    ];

    return (
        <>
            {/* Desktop Rail (Left) */}
            <div className="hidden md:flex w-[80px] h-full bg-[#1D1D1B] flex-col items-center py-8 shrink-0 z-30 shadow-[10px_0_30px_rgba(0,0,0,0.1)] border-r border-white/5 relative">
                {/* Logo / Brand Icon */}
                <Link href="/admin" className="mb-12 group relative" title="Kembali ke Dashboard">
                    <div className="w-12 h-12 bg-[#E30613] rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-[0_8px_20px_rgba(227,6,19,0.3)] group-hover:bg-white group-hover:text-[#E30613] transition-all duration-500 transform group-hover:rotate-[360deg]">
                        K
                    </div>
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none z-50 translate-x-[-10px] group-hover:translate-x-0 shadow-xl border border-white/10">
                        Dashboard
                    </div>
                </Link>

                {/* Nav Items */}
                <div className="flex-1 flex flex-col gap-6 w-full px-4">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id as NavTab)}
                                className={`
                                    group relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-500
                                    ${isActive 
                                        ? 'bg-white/10 text-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]' 
                                        : 'text-gray-500 hover:bg-white/5 hover:text-white hover:scale-110'}
                                `}
                                title={item.label}
                            >
                                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-500 group-hover:rotate-3" />
                                
                                {/* Active Indicator */}
                                {isActive && (
                                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#E30613] rounded-r-full shadow-[4px_0_15px_rgba(227,6,19,0.6)] animate-in slide-in-from-left duration-500" />
                                )}
                                
                                {/* Tooltip */}
                                <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none z-50 translate-x-[-10px] group-hover:translate-x-0 shadow-xl border border-white/10">
                                    {item.label}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto px-4 w-full space-y-6">
                    <Link 
                        href="/admin"
                        className="w-full aspect-square rounded-2xl flex items-center justify-center text-gray-500 hover:bg-white/5 hover:text-white transition-all duration-500 group relative"
                        title="Dashboard"
                    >
                        <LayoutDashboard size={24} strokeWidth={2} />
                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none z-50 translate-x-[-10px] group-hover:translate-x-0 shadow-xl border border-white/10">
                            Dashboard
                        </div>
                    </Link>
                    
                    <button
                        onClick={onLogout}
                        className="w-full aspect-square rounded-2xl flex items-center justify-center text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-all duration-500 group relative"
                        title="Keluar / Stop Sesi"
                    >
                        <LogOut size={24} strokeWidth={2} />
                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none z-50 translate-x-[-10px] group-hover:translate-x-0 shadow-xl">
                            Keluar
                        </div>
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-[#1D1D1B] flex items-center justify-around z-[100] px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] border-t border-white/5 safe-area-pb rounded-t-[2rem]">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id as NavTab)}
                            className={`
                                flex flex-col items-center justify-center px-4 py-2 rounded-2xl transition-all duration-300
                                ${isActive ? 'text-white bg-white/10 scale-110 shadow-inner' : 'text-gray-500 active:scale-90'}
                            `}
                        >
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#E30613]' : ''} />
                            <span className={`text-[9px] font-black uppercase tracking-widest mt-1.5 ${isActive ? 'text-white' : 'text-gray-500'}`}>{item.id === 'chats' ? 'Chat' : item.id === 'contacts' ? 'CRM' : item.label.split(' ')[0]}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
