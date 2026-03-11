'use server';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ chatId: string }> }
) {
    const supabase = await createClient();
    const { chatId } = await context.params;

    const { data: messages, error } = await supabase
        .from('wa_messages')
        .select('sent_at,direction,sender_type,status,type,body')
        .eq('chat_id', chatId)
        .order('sent_at', { ascending: true });

    if (error) {
        return NextResponse.json(
            { success: false, error: 'Gagal mengekspor riwayat chat' },
            { status: 500 }
        );
    }

    const header = [
        'sent_at',
        'direction',
        'sender_type',
        'status',
        'type',
        'body',
    ];

    const rows = (messages ?? []).map((m) => [
        escapeCsvValue(m.sent_at),
        escapeCsvValue(m.direction),
        escapeCsvValue(m.sender_type),
        escapeCsvValue(m.status),
        escapeCsvValue(m.type),
        escapeCsvValue(m.body),
    ]);

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const response = new NextResponse(csv);
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set(
        'Content-Disposition',
        `attachment; filename="chat-${chatId}.csv"`
    );

    return response;
}
