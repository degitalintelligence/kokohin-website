'use client';

import { useState, useEffect } from 'react';
import type { WahaSession } from '@/lib/waha';
import { 
    getSessionStatusAction, 
    startSessionAction, 
    stopSessionAction, 
    logoutSessionAction,
    registerWebhookAction
} from '@/app/actions/whatsapp';
import { 
    RefreshCcw, 
    Power, 
    LogOut, 
    AlertCircle, 
    CheckCircle2, 
    QrCode, 
    Settings,
    ShieldCheck,
    Webhook
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
            if (result.success) {
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
            } else {
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
            if (session?.status === 'WORKING') return 60000; // 1 minute when working
            if (session?.status === 'FAILED') return 30000;  // Slow down to 30s when failed
            return 5000; // 5 seconds when starting or scanning QR
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

    const handleAction = async (action: () => Promise<SessionActionResult>) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const result = await action();
            if (result.success) {
                if (result.message) setSuccess(result.message);
                await fetchStatus();
            } else {
                setError(result.error || 'Gagal melakukan aksi');
            }
        } catch (error: unknown) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full space-y-8 font-sans">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1D1D1B] flex items-center gap-3">
                        <Settings className="text-[#E30613]" size={24} />
                        Konfigurasi WhatsApp
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Kelola koneksi WhatsApp Admin menggunakan WAHA Gateway
                    </p>
                </div>
                <button 
                    onClick={fetchStatus}
                    disabled={loading}
                    className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all disabled:opacity-50"
                    title="Refresh Status"
                >
                    <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="text-[#E30613] shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-[#E30613]">Terjadi Kesalahan</p>
                        <p className="text-xs text-[#E30613]/80 leading-relaxed mt-1">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-green-600">Berhasil</p>
                        <p className="text-xs text-green-700/80 leading-relaxed mt-1">{success}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Session Status Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center space-y-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 
                        ${session?.status === 'WORKING' ? 'bg-green-50 border-green-100 text-green-500' : 
                          session?.status === 'SCAN_QR_CODE' ? 'bg-amber-50 border-amber-100 text-amber-500' : 
                          session?.status === 'STARTING' ? 'bg-blue-50 border-blue-100 text-blue-500' :
                          session?.status === 'FAILED' ? 'bg-red-50 border-red-100 text-red-500' :
                          'bg-gray-50 border-gray-100 text-gray-300'}`}
                    >
                        {session?.status === 'WORKING' ? <CheckCircle2 size={40} /> : 
                         session?.status === 'SCAN_QR_CODE' ? <QrCode size={40} /> : 
                         session?.status === 'STARTING' ? <RefreshCcw size={40} className="animate-spin" /> :
                         <Power size={40} />}
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-[#1D1D1B]">Status Koneksi</h3>
                        <p className={`text-[11px] font-black uppercase tracking-[0.2em] mt-2 inline-block px-3 py-1 rounded-full 
                            ${session?.status === 'WORKING' ? 'bg-green-100 text-green-700' : 
                              session?.status === 'SCAN_QR_CODE' ? 'bg-amber-100 text-amber-700' : 
                              session?.status === 'STARTING' ? 'bg-blue-100 text-blue-700' :
                              session?.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'}`}
                        >
                            {session?.status || 'UNKNOWN'}
                        </p>
                    </div>

                    <div className="w-full pt-4 space-y-3">
                        {(!session || session.status === 'STOPPED' || session.status === 'FAILED') ? (
                            <button 
                                onClick={() => handleAction(startSessionAction)}
                                disabled={loading}
                                className="w-full py-3 bg-[#E30613] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#ff3a47] transition-all disabled:opacity-50 shadow-[0_4px_15px_rgba(227,6,19,0.2)]"
                            >
                                <Power size={18} />
                                Hubungkan WhatsApp
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => handleAction(stopSessionAction)}
                                    disabled={loading}
                                    className="w-full py-3 bg-white border border-gray-100 text-[#1D1D1B] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all disabled:opacity-50"
                                >
                                    <Power size={18} />
                                    Putuskan Koneksi
                                </button>
                                <button 
                                    onClick={() => handleAction(logoutSessionAction)}
                                    disabled={loading}
                                    className="w-full py-3 bg-white border border-red-100 text-[#E30613] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50"
                                >
                                    <LogOut size={18} />
                                    Keluar (Logout)
                                </button>
                                {session?.status === 'WORKING' && (
                                    <button 
                                        onClick={() => handleAction(registerWebhookAction)}
                                        disabled={loading}
                                        className="w-full py-3 bg-[#E30613]/10 text-[#E30613] border border-[#E30613]/20 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E30613]/20 transition-all disabled:opacity-50"
                                    >
                                        <Webhook size={18} />
                                        Sinkronisasi Webhook
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* QR Code Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                    {session?.status === 'SCAN_QR_CODE' ? (
                        qrCode ? (
                            <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
                                <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-100 shadow-xl inline-block">
                                    <img 
                                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                                        alt="Scan me" 
                                        className="w-64 h-64 mx-auto"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1D1D1B]">Scan QR Code</h3>
                                    <p className="text-sm text-gray-500 mt-2 px-8">
                                        Buka WhatsApp di ponsel Anda, pilih Perangkat Tertaut, lalu scan kode di atas.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-6 animate-pulse">
                                <div className="w-32 h-32 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto border-2 border-amber-100">
                                    <QrCode size={64} className="text-amber-500 animate-bounce" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1D1D1B]">Menunggu Barcode...</h3>
                                    <p className="text-sm text-gray-500 mt-2 px-8">
                                        Sesi siap, sedang mengambil gambar QR Code dari server.
                                    </p>
                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <p className="text-[10px] text-gray-400 font-medium">Jika barcode tidak muncul dalam 30 detik:</p>
                                        <button 
                                            onClick={() => handleAction(stopSessionAction)}
                                            className="text-[10px] font-bold text-[#E30613] hover:underline"
                                        >
                                            Reset Sesi di Server
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : session?.status === 'STARTING' ? (
                        <div className="text-center space-y-6 animate-pulse">
                            <div className="w-32 h-32 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto border-2 border-blue-100">
                                <RefreshCcw size={64} className="text-blue-500 animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#1D1D1B]">Menyiapkan Sesi...</h3>
                                <p className="text-sm text-gray-500 mt-2 px-8">
                                    Server sedang menyiapkan sesi WhatsApp Anda. QR Code akan muncul dalam beberapa detik.
                                </p>
                                {isStartingTooLong && (
                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <p className="text-[10px] text-[#E30613] font-semibold">
                                            Proses terlalu lama. WAHA kemungkinan tidak respons.
                                        </p>
                                        <button
                                            onClick={() => handleAction(stopSessionAction)}
                                            disabled={loading}
                                            className="text-[10px] font-bold text-[#E30613] hover:underline disabled:opacity-50"
                                        >
                                            Reset sesi lalu hubungkan ulang
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : session?.status === 'WORKING' ? (
                        <div className="space-y-6 text-center">
                            <div className="w-32 h-32 rounded-3xl bg-green-50 flex items-center justify-center mx-auto border-2 border-green-100">
                                <ShieldCheck size={64} className="text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#1D1D1B]">Sesi Aktif</h3>
                                <p className="text-sm text-gray-500 mt-2 px-8">
                                    WhatsApp Anda sudah terhubung dengan sistem. Anda bisa mulai mengirim dan menerima pesan.
                                </p>
                                <div className="mt-6 flex flex-col items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Terhubung sebagai</p>
                                    <p className="text-sm font-bold text-[#1D1D1B]">{session?.me?.pushName || 'Kokohin Admin'}</p>
                                    <p className="text-xs text-gray-400">{session?.me?.id || 'default'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4 px-12">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                <QrCode size={32} className="text-gray-200" />
                            </div>
                            <p className="text-sm font-bold text-gray-400">QR Code akan muncul di sini</p>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Silakan hubungkan WhatsApp terlebih dahulu untuk menampilkan kode scan.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Information Card */}
            <div className="bg-[#1D1D1B] text-white rounded-3xl p-8 shadow-xl flex items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <ShieldCheck size={120} />
                </div>
                <div className="flex-1 space-y-4 relative z-10">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                        <ShieldCheck className="text-[#E30613]" size={20} />
                        Keamanan & Kebijakan
                    </h4>
                    <ul className="text-sm text-white/70 space-y-2 leading-relaxed">
                        <li>• Sesi WhatsApp dikelola secara aman menggunakan WAHA Gateway.</li>
                        <li>• Pesan terenkripsi end-to-end sesuai standar WhatsApp.</li>
                        <li>• Gunakan template pesan terverifikasi untuk pengiriman massal (broadcast).</li>
                        <li>• Pastikan mematuhi rate limiting untuk menghindari pemblokiran nomor.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
