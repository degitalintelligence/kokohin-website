'use client';

import { useState, useEffect } from 'react';
import { X, Send, Users, AlertCircle, CheckCircle2, Calendar, Filter, Tag, Loader2 } from 'lucide-react';
import { 
    createBroadcastCampaignAction, 
    sendBroadcastAction, 
    getLabelsAction, 
    countBroadcastRecipientsAction,
    type SegmentFilter 
} from '@/app/actions/whatsapp';
import { format } from 'date-fns';

interface BroadcastModalProps {
    onClose: () => void;
}

interface Label {
    id: string;
    name: string;
    code: string;
    color: string;
}

export default function BroadcastModal({ onClose }: BroadcastModalProps) {
    // Campaign State
    const [template, setTemplate] = useState('');
    const [campaignName, setCampaignName] = useState('');
    
    // Audience State
    const [labels, setLabels] = useState<Label[]>([]);
    const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
    const [region, setRegion] = useState('');
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [loadingCount, setLoadingCount] = useState(false);
    
    // Schedule State
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    // Process State
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
    const [scheduledResult, setScheduledResult] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Labels on mount
    useEffect(() => {
        getLabelsAction().then(res => {
            if (res.success && res.labels) {
                setLabels(res.labels);
            }
        });
    }, []);

    // Calculate Recipients when filters change
    useEffect(() => {
        const fetchCount = async () => {
            setLoadingCount(true);
            const filter: SegmentFilter = {
                labelIds: selectedLabelIds,
                region: region || undefined
            };
            const res = await countBroadcastRecipientsAction(filter);
            setRecipientCount(res.count);
            setLoadingCount(false);
        };
        
        // Debounce slightly or just run
        const timer = setTimeout(fetchCount, 500);
        return () => clearTimeout(timer);
    }, [selectedLabelIds, region]);

    const templates = [
        { id: 'survey_reminder', name: 'Reminder Jadwal Survei', text: 'Halo {{name}}, kami ingin menginformasikan bahwa jadwal survei Anda adalah besok jam {{time}}. Mohon konfirmasinya.' },
        { id: 'quotation_ready', name: 'Penawaran Siap', text: 'Halo {{name}}, penawaran harga untuk proyek Anda sudah siap. Silakan cek di tautan berikut: {{link}}' },
        { id: 'promo_march', name: 'Promo Maret Kokohin', text: 'Dapatkan diskon 10% untuk pemasangan kanopi di bulan Maret! Hubungi kami segera.' }
    ];

    const toggleLabel = (id: string) => {
        setSelectedLabelIds(prev => 
            prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
        );
    };

    const handleSendBroadcast = async () => {
        if (!campaignName || !template) return;
        setSending(true);
        setError(null);
        try {
            const filter: SegmentFilter = {
                labelIds: selectedLabelIds,
                region: region || undefined
            };

            let scheduleAt: string | undefined = undefined;
            if (isScheduled && scheduleDate && scheduleTime) {
                scheduleAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
            }

            // 1. Create campaign
            const campaignResult = await createBroadcastCampaignAction(campaignName, template, filter, scheduleAt);
            if (!campaignResult.success || !campaignResult.campaign) {
                setError(campaignResult.error || 'Gagal membuat kampanye');
                setSending(false);
                return;
            }

            if (isScheduled) {
                setScheduledResult(true);
                setSending(false);
                return;
            }

            const broadcastResult = await sendBroadcastAction(campaignResult.campaign.id, template);
            if (broadcastResult.success) {
                setResult({
                    success: recipientCount || 0,
                    failed: 0,
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

    // Render Success View
    if (result || scheduledResult) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                     <div className="p-8 space-y-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto border-4 border-green-100">
                            <CheckCircle2 className="text-green-500" size={40} />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-[#1D1D1B]">
                                {scheduledResult ? 'Broadcast Dijadwalkan!' : 'Broadcast Selesai!'}
                            </h4>
                            <p className="text-sm text-gray-500 mt-2">
                                {scheduledResult 
                                    ? `Pesan akan dikirim pada ${format(new Date(`${scheduleDate}T${scheduleTime}`), 'dd MMMM yyyy HH:mm')}`
                                    : 'Pesan telah dikirim ke daftar penerima.'}
                            </p>
                        </div>
                        
                        {!scheduledResult && result && (
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
                        )}

                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-[#1D1D1B] text-white rounded-2xl font-bold hover:bg-black transition-all"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E30613]/10 flex items-center justify-center">
                            <Users className="text-[#E30613]" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#1D1D1B]">Broadcast WhatsApp</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Kirim Pesan Massal</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="text-[#E30613] shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-[#E30613] font-medium">{error}</p>
                        </div>
                    )}

                    {/* Section 1: Campaign Info */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-[#1D1D1B] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-xs flex items-center justify-center">1</span>
                            Detail Kampanye
                        </h4>
                        <div className="grid grid-cols-1 gap-4 pl-8">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nama Kampanye</label>
                                <input 
                                    type="text"
                                    placeholder="Contoh: Promo Ramadhan 2026"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Audience / Segmentation */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-[#1D1D1B] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-xs flex items-center justify-center">2</span>
                            Target Penerima
                        </h4>
                        <div className="pl-8 space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                                {/* Label Filter */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <Tag size={12} /> Filter Label
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {labels.length > 0 ? labels.map(label => (
                                            <button
                                                key={label.id}
                                                onClick={() => toggleLabel(label.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                                                    ${selectedLabelIds.includes(label.id) 
                                                        ? 'bg-[#E30613] text-white border-[#E30613]' 
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                            >
                                                {label.name}
                                            </button>
                                        )) : (
                                            <p className="text-xs text-gray-400 italic">Belum ada label tersedia.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Region Filter */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <Filter size={12} /> Filter Wilayah (Region)
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="Contoh: Jakarta Selatan (Kosongkan untuk semua)"
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#E30613] transition-all"
                                    />
                                </div>
                            </div>
                            
                            {/* Count Display */}
                            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <Users className="text-blue-500" size={20} />
                                    <div>
                                        <p className="text-xs font-bold text-blue-800">Estimasi Penerima</p>
                                        <p className="text-[10px] text-blue-600">Berdasarkan filter yang dipilih</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {loadingCount ? (
                                        <Loader2 className="animate-spin text-blue-500" size={24} />
                                    ) : (
                                        <p className="text-2xl font-bold text-blue-600">{recipientCount ?? '-'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Content */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-[#1D1D1B] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-xs flex items-center justify-center">3</span>
                            Konten Pesan
                        </h4>
                        <div className="pl-8 space-y-4">
                            {/* Templates */}
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {templates.map((t) => (
                                    <button 
                                        key={t.id}
                                        onClick={() => {
                                            setTemplate(t.text);
                                            if (!campaignName) setCampaignName(t.name);
                                        }}
                                        className="shrink-0 px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 whitespace-nowrap transition-colors"
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>

                            <textarea 
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all font-sans"
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                placeholder="Tulis pesan broadcast Anda di sini..."
                            />
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                    Gunakan <code className="bg-amber-100 px-1 font-bold">{"{{name}}"}</code> untuk nama pelanggan.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Schedule */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-[#1D1D1B] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-xs flex items-center justify-center">4</span>
                            Jadwal Pengiriman
                        </h4>
                        <div className="pl-8">
                            <div className="flex items-center gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={!isScheduled} 
                                        onChange={() => setIsScheduled(false)}
                                        className="w-4 h-4 text-[#E30613] focus:ring-[#E30613]"
                                    />
                                    <span className="text-sm font-medium text-[#1D1D1B]">Kirim Sekarang</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={isScheduled} 
                                        onChange={() => setIsScheduled(true)}
                                        className="w-4 h-4 text-[#E30613] focus:ring-[#E30613]"
                                    />
                                    <span className="text-sm font-medium text-[#1D1D1B]">Jadwalkan Nanti</span>
                                </label>
                            </div>

                            {isScheduled && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tanggal</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input 
                                                type="date" 
                                                value={scheduleDate}
                                                onChange={(e) => setScheduleDate(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-[#E30613]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jam</label>
                                        <input 
                                            type="time" 
                                            value={scheduleTime}
                                            onChange={(e) => setScheduleTime(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-[#E30613]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
                    <button 
                        onClick={handleSendBroadcast}
                        disabled={!template || !campaignName || sending || (isScheduled && (!scheduleDate || !scheduleTime))}
                        className="w-full py-4 bg-[#E30613] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#ff3a47] transition-all disabled:opacity-50 shadow-[0_4px_15px_rgba(227,6,19,0.2)]"
                    >
                        {sending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                        {sending 
                            ? 'Memproses...' 
                            : isScheduled 
                                ? 'Jadwalkan Broadcast' 
                                : `Kirim ke ${recipientCount ?? '...'} Penerima`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
