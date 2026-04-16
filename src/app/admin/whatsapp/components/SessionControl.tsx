'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { WahaSession } from '@/lib/waha';
import { 
    getSessionStatusAction, 
    startSessionAction, 
    stopSessionAction, 
    logoutSessionAction,
    registerWebhookAction,
    syncChatsFromWahaAction
} from '@/app/actions/whatsapp';
import type { StructuredError } from '@/lib/error-handler';
import { 
    RefreshCcw, 
    Power, 
    LogOut, 
    AlertCircle, 
    CheckCircle2, 
    QrCode, 
    Settings,
    ShieldCheck,
    Webhook,
    User
} from 'lucide-react';

type SessionActionResult = {
    success: boolean;
    error?: string;
    message?: string;
};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return 'Terjadi kesalahan tak terduga';
}

export default function SessionControl() {
    const [session, setSession] = useState<WahaSession | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [startingSince, setStartingSince] = useState<number | null>(null);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const result = await getSessionStatusAction();
            if ('success' in result && result.success) {
                setSession(result.status ?? null);
                setQrCode(result.qrCode ?? null);
                if (result.status?.status === 'STARTING') {
                    setStartingSince((prev) => prev ?? Date.now());
                } else {
                    setStartingSince(null);
                }
                if (result.error) {
                    setError(result.error);
                } else {
                    setError(null);
                }
            } else if ('success' in result && !result.success) {
                setError(result.error || 'Gagal memuat status sesi');
            }
        } catch (error: unknown) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        
        const getInterval = () => {
            if (session?.status === 'WORKING') return 60000; 
            if (session?.status === 'FAILED') return 30000;  
            return 5000; 
        };

        const interval = setInterval(fetchStatus, getInterval());
        return () => clearInterval(interval);
    }, [session?.status]);

    useEffect(() => {
        if (session?.status !== 'STARTING') return;
        if (!startingSince) return;
        const interval = window.setInterval(() => {
            if (Date.now() - startingSince > 45000) {
                setError((prev) => prev || 'Menyiapkan sesi terlalu lama. Kemungkinan WAHA belum merespons.');
            }
        }, 2000);
        return () => window.clearInterval(interval);
    }, [session?.status, startingSince]);

    const isStartingTooLong =
        session?.status === 'STARTING' &&
        startingSince !== null &&
        Date.now() - startingSince > 45000;

    const handleAction = async (action: () => Promise<SessionActionResult | StructuredError>) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const result = await action();
            if ('success' in result && result.success) {
                if (result.message) setSuccess(result.message);
                await fetchStatus();
            } else if ('success' in result && !result.success) {
                setError(result.error || 'Gagal melakukan aksi');
            } else if ('code' in result) {
                // This is a StructuredError
                setError(result.message || 'Gagal melakukan aksi');
            }
        } catch (error: unknown) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6 md:p-10 max-w-5xl mx-auto w-full space-y-10 font-sans antialiased text-[#1D1D1B]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[#1D1D1B] flex items-center gap-4 tracking-tight">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#E30613]">
                            <Settings size={28} strokeWidth={2.5} />
                        </div>
                        Konfigurasi WhatsApp
                    </h2>
                    <p className="text-sm text-gray-400 mt-2 font-medium max-w-md">
                        Kelola koneksi WhatsApp Admin menggunakan gateway WAHA yang terintegrasi dengan Kokohin CRM.
                    </p>
                </div>
                <button 
                    onClick={fetchStatus}
                    disabled={loading}
                    className="self-start md:self-center p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 group"
                    title="Refresh Status"
                >
                    <RefreshCcw size={22} className={`text-gray-400 group-hover:text-[#E30613] ${loading ? 'animate-spin' : 'transition-transform group-hover:rotate-180 duration-500'}`} />
                </button>
            </div>

            {error && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-[2rem] flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#E30613] shrink-0 shadow-sm">
                        <AlertCircle size={22} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-[#E30613] uppercase tracking-wider">Terjadi Kesalahan</p>
                        <p className="text-xs text-[#E30613]/70 font-bold leading-relaxed mt-1">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="p-5 bg-green-50 border border-green-100 rounded-[2rem] flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-600 shrink-0 shadow-sm">
                        <CheckCircle2 size={22} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-green-600 uppercase tracking-wider">Operasi Berhasil</p>
                        <p className="text-xs text-green-700/70 font-bold leading-relaxed mt-1">{success}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Session Status Card */}
                <div className="lg:col-span-5 bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm hover:shadow-md transition-shadow duration-500 flex flex-col items-center text-center space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                    
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center border-4 shadow-xl relative z-10 transition-transform duration-500 group-hover:scale-105
                        ${session?.status === 'WORKING' ? 'bg-green-50 border-white text-green-500 shadow-green-100' : 
                          session?.status === 'SCAN_QR_CODE' ? 'bg-amber-50 border-white text-amber-500 shadow-amber-100' : 
                          session?.status === 'STARTING' ? 'bg-blue-50 border-white text-blue-500 shadow-blue-100' :
                          session?.status === 'FAILED' ? 'bg-red-50 border-white text-red-500 shadow-red-100' :
                          'bg-gray-50 border-white text-gray-200 shadow-gray-100'}`}
                    >
                        {session?.status === 'WORKING' ? <ShieldCheck size={48} strokeWidth={1.5} /> : 
                         session?.status === 'SCAN_QR_CODE' ? <QrCode size={48} strokeWidth={1.5} /> : 
                         session?.status === 'STARTING' ? <RefreshCcw size={48} strokeWidth={1.5} className="animate-spin" /> :
                         <Power size={48} strokeWidth={1.5} />}
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-[#1D1D1B] tracking-tight">Status Koneksi</h3>
                        <div className="mt-3 flex items-center justify-center gap-2">
                             <div className={`w-2 h-2 rounded-full animate-pulse ${session?.status === 'WORKING' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                             <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm
                                ${session?.status === 'WORKING' ? 'bg-green-50 text-green-700 border-green-100' : 
                                  session?.status === 'SCAN_QR_CODE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                  session?.status === 'STARTING' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                  session?.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' :
                                  'bg-gray-100 text-gray-500 border-gray-200'}`}
                            >
                                {session?.status || 'OFFLINE'}
                            </p>
                        </div>
                    </div>

                    <div className="w-full pt-4 space-y-4 relative z-10">
                        {(!session || session.status === 'STOPPED' || session.status === 'FAILED') ? (
                            <button 
                                onClick={() => handleAction(startSessionAction)}
                                disabled={loading}
                                className="w-full py-4 bg-[#E30613] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-[#c0000f] transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(227,6,19,0.3)] active:scale-95"
                            >
                                <Power size={20} strokeWidth={2.5} />
                                Hubungkan WhatsApp
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => handleAction(stopSessionAction)}
                                    disabled={loading}
                                    className="w-full py-4 bg-white border-2 border-gray-100 text-[#1D1D1B] rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    <Power size={20} strokeWidth={2.5} />
                                    Putuskan Koneksi
                                </button>
                                <button 
                                    onClick={() => handleAction(logoutSessionAction)}
                                    disabled={loading}
                                    className="w-full py-4 bg-white border-2 border-red-50 text-[#E30613] rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-red-50 hover:border-red-100 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    <LogOut size={20} strokeWidth={2.5} />
                                    Keluar Sesi (Logout)
                                </button>
                                {session?.status === 'WORKING' && (
                                    <div className="pt-6 grid grid-cols-1 gap-3 border-t border-gray-100 mt-6">
                                        <button 
                                            onClick={() => handleAction(registerWebhookAction)}
                                            disabled={loading}
                                            className="w-full py-3.5 bg-gray-50 text-gray-600 border border-gray-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-gray-100 transition-all disabled:opacity-50"
                                        >
                                            <Webhook size={18} strokeWidth={2.5} />
                                            Update Webhook
                                        </button>
                                        <button 
                                            onClick={() => handleAction(() => syncChatsFromWahaAction(200))}
                                            disabled={loading}
                                            className="w-full py-3.5 bg-red-50 text-[#E30613] border border-red-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-red-100 transition-all disabled:opacity-50"
                                        >
                                            <RefreshCcw size={18} strokeWidth={2.5} />
                                            Sync 200 Chat
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* QR Code / Info Card */}
                <div className="lg:col-span-7 bg-white border border-gray-100 rounded-[2.5rem] p-4 md:p-10 shadow-sm flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden">
                    {session?.status === 'SCAN_QR_CODE' ? (
                        qrCode ? (
                            <div className="space-y-8 text-center animate-in zoom-in-95 duration-700">
                                <div className="bg-white p-8 rounded-[3rem] border-4 border-gray-50 shadow-2xl inline-block relative group">
                                    <div className="absolute inset-0 bg-red-50 opacity-0 group-hover:opacity-20 transition-opacity rounded-[3rem]"></div>
                                    <div className="w-64 h-64 mx-auto relative z-10">
                                        <Image
                                            src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                            alt="Scan me"
                                            fill
                                            className="object-contain"
                                            sizes="256px"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#1D1D1B] tracking-tight">Pindai Kode QR</h3>
                                    <p className="text-sm text-gray-400 mt-3 px-12 font-medium leading-relaxed">
                                        Buka WhatsApp di ponsel Anda, ketuk <span className="text-[#E30613] font-bold">Perangkat Tertaut</span>, lalu arahkan kamera ke kode di atas.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-8 animate-pulse">
                                <div className="w-40 h-40 rounded-[2.5rem] bg-amber-50 flex items-center justify-center mx-auto border-4 border-white shadow-xl">
                                    <QrCode size={80} className="text-amber-500 animate-bounce" strokeWidth={1} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#1D1D1B] tracking-tight">Menyiapkan Barcode...</h3>
                                    <p className="text-sm text-gray-400 mt-3 px-12 font-medium">
                                        Sesi telah siap, sedang mengambil data QR Code dari gateway WAHA.
                                    </p>
                                    <div className="mt-8 p-4 bg-gray-50 rounded-2xl inline-flex flex-col items-center gap-2">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gagal memuat?</p>
                                        <button 
                                            onClick={() => handleAction(stopSessionAction)}
                                            className="text-[10px] font-black text-[#E30613] uppercase tracking-widest hover:underline"
                                        >
                                            Reset Sesi Server
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : session?.status === 'STARTING' ? (
                        <div className="text-center space-y-8 animate-pulse">
                            <div className="w-40 h-40 rounded-[2.5rem] bg-blue-50 flex items-center justify-center mx-auto border-4 border-white shadow-xl">
                                <RefreshCcw size={80} className="text-blue-500 animate-spin" strokeWidth={1} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#1D1D1B] tracking-tight">Inisialisasi Sesi...</h3>
                                <p className="text-sm text-gray-400 mt-3 px-12 font-medium leading-relaxed">
                                    Server sedang menyiapkan mesin WhatsApp Anda. QR Code akan muncul secara otomatis dalam beberapa saat.
                                </p>
                                {isStartingTooLong && (
                                    <div className="mt-8 p-6 bg-red-50 rounded-[2rem] border border-red-100 max-w-sm mx-auto">
                                        <p className="text-xs text-[#E30613] font-bold leading-relaxed mb-4">
                                            Proses memakan waktu lebih lama dari biasanya. Gateway WAHA mungkin sedang sibuk.
                                        </p>
                                        <button
                                            onClick={() => handleAction(stopSessionAction)}
                                            disabled={loading}
                                            className="px-6 py-2.5 bg-white text-[#E30613] border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 shadow-sm"
                                        >
                                            Restart Sesi
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : session?.status === 'WORKING' ? (
                        <div className="space-y-10 text-center animate-in zoom-in-95 duration-700">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 animate-pulse"></div>
                                <div className="w-40 h-40 rounded-[2.5rem] bg-green-50 flex items-center justify-center mx-auto border-4 border-white shadow-2xl relative z-10">
                                    <ShieldCheck size={80} className="text-green-500" strokeWidth={1} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-[#1D1D1B] tracking-tight">Sesi Terhubung</h3>
                                <p className="text-sm text-gray-400 mt-4 px-12 font-medium leading-relaxed">
                                    WhatsApp Admin Kokohin telah aktif. Semua fitur komunikasi dan sinkronisasi CRM sudah siap digunakan.
                                </p>
                                <div className="mt-10 p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 flex flex-col items-center gap-2 shadow-inner">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Terhubung Sebagai</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#E30613] shadow-sm border border-gray-100">
                                            <User size={16} strokeWidth={2.5} />
                                        </div>
                                        <p className="text-lg font-black text-[#1D1D1B] tracking-tight">{session?.me?.pushName || 'Kokohin Admin'}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold tracking-wider mt-1">{session?.me?.id || 'whatsapp-session-01'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 max-w-xs animate-in fade-in duration-700">
                            <div className="w-24 h-24 rounded-[2rem] bg-gray-50 flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
                                <QrCode size={40} className="text-gray-200" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest">Ready to Connect</h3>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                Silakan aktifkan sesi WhatsApp untuk menampilkan kode QR dan menghubungkan perangkat Anda.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Information Card */}
            <div className="bg-[#1D1D1B] text-white rounded-[3rem] p-10 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <ShieldCheck size={200} />
                </div>
                <div className="w-20 h-20 bg-[#E30613] rounded-[2rem] flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-12 transition-transform duration-500">
                    <ShieldCheck size={40} strokeWidth={2} />
                </div>
                <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
                    <h4 className="text-xl font-black tracking-tight flex items-center justify-center md:justify-start gap-3">
                        Keamanan & Kebijakan Platform
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ul className="text-xs text-white/50 space-y-3 font-bold uppercase tracking-wider leading-relaxed">
                            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#E30613] rounded-full"></div> Sesi Aman via WAHA Gateway</li>
                            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#E30613] rounded-full"></div> Enkripsi End-to-End Standard</li>
                        </ul>
                        <ul className="text-xs text-white/50 space-y-3 font-bold uppercase tracking-wider leading-relaxed">
                            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#E30613] rounded-full"></div> Kepatuhan Rate Limiting</li>
                            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#E30613] rounded-full"></div> Monitoring Sesi Real-time</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
