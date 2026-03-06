-- Migration: WhatsApp Integration Schema
-- Description: Tables for storing WhatsApp contacts, messages, and session status

-- 1. WhatsApp Contacts Table
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id TEXT UNIQUE NOT NULL, -- WhatsApp ID (e.g., 62812345678@c.us)
    name TEXT,
    pushname TEXT,
    profile_pic_url TEXT,
    last_message_at TIMESTAMPTZ,
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_message_id TEXT UNIQUE NOT NULL, -- WAHA message ID
    contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    body TEXT,
    type TEXT DEFAULT 'chat', -- chat, image, document, audio, video, sticker
    from_me BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
    media_url TEXT,
    media_caption TEXT,
    media_filename TEXT,
    media_mime_type TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id ON public.whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_wa_id ON public.whatsapp_contacts(wa_id);

-- 4. RLS Policies (Admin Only)
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policy for whatsapp_contacts
CREATE POLICY "Admin can do everything on whatsapp_contacts"
ON public.whatsapp_contacts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin_sales', 'admin_proyek')
  )
);

-- Policy for whatsapp_messages
CREATE POLICY "Admin can do everything on whatsapp_messages"
ON public.whatsapp_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin_sales', 'admin_proyek')
  )
);

-- 5. Trigger for updated_at on whatsapp_contacts
CREATE OR REPLACE FUNCTION public.handle_whatsapp_contact_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_contact_updated
BEFORE UPDATE ON public.whatsapp_contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_whatsapp_contact_updated();
