const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function applyWhatsAppIndexes() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const indexes = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_contacts_phone ON public.wa_contacts(phone)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_messages_idempotency_key ON public.wa_messages(idempotency_key)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_chats_contact_id ON public.wa_chats(contact_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_messages_created_at ON public.wa_messages(created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_contacts_display_name ON public.wa_contacts(display_name)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_message_status_log_message_id ON public.wa_message_status_log(message_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_message_status_log_created_at ON public.wa_message_status_log(created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_broadcast_recipients_campaign_id ON public.wa_broadcast_recipients(campaign_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_broadcast_recipients_status ON public.wa_broadcast_recipients(status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_assignment_rules_is_active ON public.wa_assignment_rules(is_active) WHERE is_active = true',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_audit_logs_entity ON public.wa_audit_logs(entity_type, entity_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_audit_logs_created_at ON public.wa_audit_logs(created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_internal_notes_chat_id ON public.wa_internal_notes(chat_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_internal_notes_created_at ON public.wa_internal_notes(created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_quick_replies_is_active ON public.wa_quick_replies(is_active) WHERE is_active = true',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_messages_chat_direction_sent ON public.wa_messages(chat_id, direction, sent_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_chats_contact_last_message ON public.wa_chats(contact_id, last_message_at DESC)'
    ];
    
    console.log('Starting WhatsApp indexes creation...');
    
    for (const indexSQL of indexes) {
        try {
            console.log(`Creating index: ${indexSQL}`);
            const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
            if (error) {
                console.error(`Error creating index: ${error.message}`);
                if (!error.message.includes('already exists')) {
                    throw error;
                }
            } else {
                console.log(`✓ Successfully created index`);
            }
        } catch (err) {
            console.error(`Failed to create index: ${err.message}`);
            if (!err.message.includes('already exists')) {
                process.exit(1);
            }
        }
    }
    
    console.log('✓ All WhatsApp performance indexes created successfully!');
    process.exit(0);
}

applyWhatsAppIndexes().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});