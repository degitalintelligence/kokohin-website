import { Metadata } from 'next';
import HybridWhatsAppClient from './components/HybridWhatsAppClient';

export const metadata: Metadata = {
    title: 'WhatsApp Chat | Admin Kokohin',
};

export default function WhatsAppPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-gray-50">
            <HybridWhatsAppClient />
        </div>
    );
}
