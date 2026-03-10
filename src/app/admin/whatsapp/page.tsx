import { Metadata } from 'next';
import { Suspense } from 'react';
import HybridWhatsAppClient from './components/HybridWhatsAppClient';

export const metadata: Metadata = {
    title: 'WhatsApp Chat | Admin Kokohin',
};

export default function WhatsAppPage() {
    return (
        <div className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-[#f4f5f7]">
            <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full bg-[#f4f5f7]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-[#E30613] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[#1D1D1B] font-medium text-sm font-sans">Memuat WhatsApp...</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-sans">
                            <span className="w-3 h-3 bg-[#E30613] rounded-full animate-pulse"></span>
                            Terhubung dengan WAHA
                        </div>
                    </div>
                </div>
            }>
                <HybridWhatsAppClient />
            </Suspense>
        </div>
    );
}
