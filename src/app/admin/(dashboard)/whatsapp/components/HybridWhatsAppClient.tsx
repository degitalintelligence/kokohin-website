'use client';

import { useState, useCallback } from 'react';
import OptimizedWhatsAppClient from './OptimizedWhatsAppClient';
import SimpleWhatsAppClient from './SimpleWhatsAppClient';
import { trackOptimizedFallbackAction } from '@/app/actions/whatsapp';

export default function HybridWhatsAppClient() {
    const [useOptimized, setUseOptimized] = useState(true);
    const [fallbackReason, setFallbackReason] = useState<string | null>(null);

    const switchToFallback = useCallback((reason?: string) => {
        const normalizedReason = reason || 'Gagal memuat chat dari mode optimized.';
        setFallbackReason(normalizedReason);
        setUseOptimized(false);
        trackOptimizedFallbackAction(normalizedReason).catch(() => undefined);
    }, []);

    // If we encountered an error, use the simple version
    if (!useOptimized) {
        return (
            <>
                {fallbackReason && (
                    <div className="px-4 py-2 text-xs font-semibold bg-amber-50 text-amber-700 border-b border-amber-200">
                        Mode ringan aktif: {fallbackReason}
                    </div>
                )}
                <SimpleWhatsAppClient />
            </>
        );
    }

    // Otherwise, try the optimized version
    return <OptimizedWhatsAppClient onContactsFetchFailure={switchToFallback} />;
}
