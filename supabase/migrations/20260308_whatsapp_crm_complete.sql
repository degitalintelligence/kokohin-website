-- Migration: WhatsApp CRM Complete Schema
-- Description: Comprehensive schema for WhatsApp CRM as per TECH_SPEC_WHATSAPP_CRM_KOKOHIN.md

-- 1. Session Management
CREATE TABLE IF NOT EXISTS public.wa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'STOPPED', -- STOPPED, STARTING, SCAN_QR_CODE, WORKING, FAILED
    qr_state TEXT,
    health_meta JSONB,
    last_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contact Management (Updated from whatsapp_contacts)
CREATE TABLE IF NOT EXISTS public.wa_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_jid TEXT UNIQUE NOT NULL, -- WhatsApp ID (e.g., 62812345678@c.us)
    phone TEXT,
    display_name TEXT,
    avatar_url TEXT,
    region TEXT,
    timezone TEXT DEFAULT 'Asia/Jakarta',
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chat Management
CREATE TABLE IF NOT EXISTS public.wa_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'individual', -- individual, group
    unread_count INTEGER DEFAULT 0,
    pinned BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Message Management (Updated from whatsapp_messages)
CREATE TABLE IF NOT EXISTS public.wa_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.wa_chats(id) ON DELETE CASCADE,
    external_message_id TEXT UNIQUE NOT NULL, -- WAHA message ID
    direction TEXT NOT NULL DEFAULT 'inbound', -- inbound, outbound
    sender_type TEXT DEFAULT 'customer', -- customer, agent, system
    type TEXT DEFAULT 'chat', -- chat, image, document, audio, video, sticker, voice
    body TEXT,
    quoted_message_id UUID REFERENCES public.wa_messages(id) ON DELETE SET NULL,
    is_forwarded BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Message Media
CREATE TABLE IF NOT EXISTS public.wa_message_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.wa_messages(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL, -- image, document, audio, video
    mime_type TEXT,
    size_bytes BIGINT,
    storage_key TEXT, -- S3/Supabase Storage key
    thumbnail_key TEXT,
    checksum_sha256 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Message Status Log
CREATE TABLE IF NOT EXISTS public.wa_message_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.wa_messages(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- sent, delivered, read, failed
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT -- waha, internal
);

-- 7. CRM Entities
CREATE TABLE IF NOT EXISTS public.crm_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
    project_name TEXT,
    contract_value DECIMAL(15, 2),
    project_status TEXT,
    erp_customer_id UUID, -- reference to potential erp_customers table
    erp_project_id UUID REFERENCES public.erp_projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wa_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#E30613',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wa_chat_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.wa_chats(id) ON DELETE CASCADE,
    label_id UUID REFERENCES public.wa_labels(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.wa_quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    body_template TEXT NOT NULL,
    variables_json JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Already exists but renaming/migrating
CREATE TABLE IF NOT EXISTS public.wa_internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.wa_chats(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Broadcast System
CREATE TABLE IF NOT EXISTS public.wa_broadcast_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    segment_filter_json JSONB,
    schedule_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'Asia/Jakarta',
    status TEXT DEFAULT 'draft', -- draft, scheduled, processing, completed, failed
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wa_broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.wa_broadcast_campaigns(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.wa_chats(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, failed
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Assignment Rules
CREATE TABLE IF NOT EXISTS public.wa_assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL, -- round_robin, skill_based
    config_json JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wa_agent_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_code TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, skill_code)
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS public.wa_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    before_json JSONB,
    after_json JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Indexes and Optimization
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat_sent ON public.wa_messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_chats_last_message ON public.wa_chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_wa_jid ON public.wa_contacts(wa_jid);
CREATE INDEX IF NOT EXISTS idx_wa_messages_external_id ON public.wa_messages(external_message_id);

-- 12. RLS Policies
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_message_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_message_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_chat_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_audit_logs ENABLE ROW LEVEL SECURITY;

-- Global Policy for Admins
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename LIKE 'wa_%' OR tablename = 'crm_customers')
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Admin can do everything on %I" ON public.%I;
            CREATE POLICY "Admin can do everything on %I"
            ON public.%I
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN (''super_admin'', ''admin_sales'', ''admin_proyek'')
                )
            );
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;

-- 13. Functions and Triggers
CREATE OR REPLACE FUNCTION public.handle_wa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('wa_sessions', 'wa_contacts', 'wa_chats', 'wa_quick_replies', 'wa_internal_notes', 'wa_broadcast_campaigns', 'wa_assignment_rules')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_%I_updated ON public.%I;
            CREATE TRIGGER trigger_%I_updated
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_wa_updated_at();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;

-- 14. Seed Default Labels
INSERT INTO public.wa_labels (code, name, color, is_system)
VALUES 
    ('hot_prospect', 'Hot Prospect', '#E30613', TRUE),
    ('follow_up', 'Follow Up', '#FDB913', TRUE),
    ('deal', 'Deal', '#00A651', TRUE),
    ('maintenance', 'Maintenance', '#0071BC', TRUE)
ON CONFLICT (code) DO NOTHING;
