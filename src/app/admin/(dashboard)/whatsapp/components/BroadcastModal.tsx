'use client';

import { useState } from 'react';
import { X, Send, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createBroadcastCampaignAction, sendBroadcastAction } from '@/app/actions/whatsapp';

interface BroadcastModalProps {
    onClose: () => void;
}

export default function BroadcastModal({ onClose }: BroadcastModalProps) {
    const [template, setTemplate] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const templates = [
        { id: 'survey_reminder', name: 'Reminder Jadwal Survei', text: 'Halo {{name}}, kami ingin menginformasikan bahwa jadwal survei Anda adalah besok jam {{time}}. Mohon konfirmasinya.' },
        { id: 'quotation_ready', name: 'Penawaran Siap', text: 'Halo {{name}}, penawaran harga untuk proyek Anda sudah siap. Silakan cek di tautan berikut: {{link}}' },
        { id: 'promo_march', name: 'Promo Maret Kokohin', text: 'Dapatkan diskon 10% untuk pemasangan kanopi di bulan Maret! Hubungi kami segera.' }
    ];

    const handleSendBroadcast = async () => {
        if (!campaignName || !template) return;
        setSending(true);
        setError(null);
        try {
            // 1. Create campaign
            const campaignResult = await createBroadcastCampaignAction(campaignName, template);
            if (!campaignResult.success || !campaignResult.campaign) {
                setError(campaignResult.error || 'Gagal membuat kampanye');
                setSending(false);
                return;
            }

            // 2. Send broadcast
            const broadcastResult = await sendBroadcastAction(campaignResult.campaign.id, template);
            if (broadcastResult.success) {
                setResult({ 
                    success: broadcastResult.successCount || 0, 
                    failed: broadcastResult.failedCount || 0 
                });
            } else {
                setError(broadcastResult.error || 'Gagal mengirim broadcast');
            }
        } catch (err) {
            console.error('Broadcast error:', err);
            setError('Terjadi kesalahan saat mengirim broadcast');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E30613]/10 flex items-center justify-center">
                            <Users className="text-[#E30613]" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#1D1D1B]">Broadcast WhatsApp</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Pesan Massal Terintegrasi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                    {result ? (
                        <div className="text-center py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto border-4 border-green-100">
                                <CheckCircle2 className="text-green-500" size={40} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-[#1D1D1B]">Broadcast Selesai!</h4>
                                <p className="text-sm text-gray-500 mt-2">Pesan telah dikirim ke daftar penerima.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                                    <p className="text-2xl font-bold text-green-600">{result.success}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mt-1">Berhasil</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                                    <p className="text-2xl font-bold text-[#E30613]">{result.failed}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#E30613] mt-1">Gagal</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-full py-4 bg-[#1D1D1B] text-white rounded-2xl font-bold hover:bg-black transition-all"
                            >
                                Tutup
                            </button>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                                    <AlertCircle className="text-[#E30613] shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm text-[#E30613] font-medium">{error}</p>
                                </div>
                            )}

                            {/* Campaign Name */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nama Kampanye</label>
                                <input 
                                    type="text"
                                    placeholder="Contoh: Promo Ramadhan 2026"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all"
                                />
                            </div>

                            {/* Template Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Pilih Template</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {templates.map((t) => (
                                        <button 
                                            key={t.id}
                                            onClick={() => {
                                                setTemplate(t.text);
                                                if (!campaignName) setCampaignName(t.name);
                                            }}
                                            className={`p-4 text-left rounded-2xl border transition-all hover:shadow-md
                                                ${template === t.text ? 'border-[#E30613] bg-[#E30613]/5' : 'border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <p className="font-bold text-sm text-[#1D1D1B]">{t.name}</p>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.text}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Preview */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Isi Pesan</label>
                                <textarea 
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all font-sans"
                                    value={template}
                                    onChange={(e) => setTemplate(e.target.value)}
                                    placeholder="Pilih template atau ketik pesan..."
                                />
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                        Gunakan variabel seperti <code className="bg-amber-100 px-1">{"{{name}}"}</code> untuk personalisasi pesan otomatis.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={handleSendBroadcast}
                                disabled={!template || !campaignName || sending}
                                className="w-full py-4 bg-[#E30613] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#ff3a47] transition-all disabled:opacity-50 shadow-[0_4px_15px_rgba(227,6,19,0.2)]"
                            >
                                {sending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                                {sending ? 'Mengirim...' : 'Kirim Broadcast Sekarang'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
