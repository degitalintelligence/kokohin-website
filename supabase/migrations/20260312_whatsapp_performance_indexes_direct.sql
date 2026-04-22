-- Migration: WhatsApp Performance Indexes - Direct SQL
-- Description: Add missing indexes for WhatsApp tables to improve query performance
-- Created: 2026-03-12
-- This file should be run manually in Supabase dashboard or psql

-- Index untuk pencarian nomor telepon (mengurangi waktu pencarian kontak)
CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone ON public.wa_contacts(phone);

-- Index untuk idempotency key (mencegah duplikasi pesan)
CREATE INDEX IF NOT EXISTS idx_wa_messages_idempotency_key ON public.wa_messages(idempotency_key);

-- Index untuk foreign key optimization (join operations)
CREATE INDEX IF NOT EXISTS idx_wa_chats_contact_id ON public.wa_chats(contact_id);

-- Index untuk timestamp-based queries (pagination dan sorting)
CREATE INDEX IF NOT EXISTS idx_wa_messages_created_at ON public.wa_messages(created_at DESC);

-- Index untuk display name search (pencarian kontak berdasarkan nama)
CREATE INDEX IF NOT EXISTS idx_wa_contacts_display_name ON public.wa_contacts(display_name);

-- Index untuk status log queries (monitoring dan reporting)
CREATE INDEX IF NOT EXISTS idx_wa_message_status_log_message_id ON public.wa_message_status_log(message_id);
CREATE INDEX IF NOT EXISTS idx_wa_message_status_log_created_at ON public.wa_message_status_log(occurred_at DESC);

-- Index untuk broadcast campaigns (mass messaging performance)
CREATE INDEX IF NOT EXISTS idx_wa_broadcast_recipients_campaign_id ON public.wa_broadcast_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wa_broadcast_recipients_status ON public.wa_broadcast_recipients(status);

-- Index untuk assignment rules (agent routing)
CREATE INDEX IF NOT EXISTS idx_wa_assignment_rules_is_active ON public.wa_assignment_rules(is_active) WHERE is_active = true;

-- Index untuk audit logs (performance monitoring)
CREATE INDEX IF NOT EXISTS idx_wa_audit_logs_entity ON public.wa_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wa_audit_logs_created_at ON public.wa_audit_logs(created_at DESC);

-- Index untuk internal notes (chat history)
CREATE INDEX IF NOT EXISTS idx_wa_internal_notes_chat_id ON public.wa_internal_notes(chat_id);
CREATE INDEX IF NOT EXISTS idx_wa_internal_notes_created_at ON public.wa_internal_notes(created_at DESC);

-- Index untuk quick replies (agent productivity)
CREATE INDEX IF NOT EXISTS idx_wa_quick_replies_is_active ON public.wa_quick_replies(is_active) WHERE is_active = true;

-- Composite indexes untuk complex queries
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat_direction_sent ON public.wa_messages(chat_id, direction, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_chats_contact_last_message ON public.wa_chats(contact_id, last_message_at DESC);

-- Performance comment
COMMENT ON INDEX idx_wa_contacts_phone IS 'Optimizes phone number searches in contact list';
COMMENT ON INDEX idx_wa_messages_idempotency_key IS 'Prevents duplicate message processing';
COMMENT ON INDEX idx_wa_chats_contact_id IS 'Optimizes chat-contact joins';
COMMENT ON INDEX idx_wa_messages_created_at IS 'Optimizes message pagination and sorting';
