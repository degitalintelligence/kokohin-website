-- WhatsApp Group Members and Group Metadata

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wa_chats'
          AND column_name = 'type'
    ) THEN
        ALTER TABLE public.wa_chats
        ADD COLUMN type TEXT NOT NULL DEFAULT 'individual';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wa_chats'
          AND column_name = 'group_subject'
    ) THEN
        ALTER TABLE public.wa_chats
        ADD COLUMN group_subject TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wa_chats'
          AND column_name = 'group_owner_jid'
    ) THEN
        ALTER TABLE public.wa_chats
        ADD COLUMN group_owner_jid TEXT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wa_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.wa_chats(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('member','admin','superadmin')) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN GENERATED ALWAYS AS (left_at IS NULL) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_group_members_chat_contact_uniq
    ON public.wa_group_members(chat_id, contact_id)
    WHERE left_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'wa_group_members'
    ) THEN
        ALTER TABLE public.wa_group_members ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

