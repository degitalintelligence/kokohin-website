
-- Fix Upsert Constraints for Webhook and Group Members
-- The previous partial indexes prevented ON CONFLICT clauses from working correctly in Supabase/PostgREST.

-- 1. Fix wa_webhook_events index
-- Drop the partial index
DROP INDEX IF EXISTS public.idx_wa_webhook_events_external;

-- Create a full unique index (allows multiple NULLs in external_event_id, which is fine)
-- This ensures that for non-null IDs, we have uniqueness and upsert works.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_webhook_events_external
ON public.wa_webhook_events(event_name, external_event_id);


-- 2. Fix wa_group_members index
-- Drop the partial index that only covered active members
DROP INDEX IF EXISTS public.wa_group_members_chat_contact_uniq;

-- Handle potential duplicates before creating unique index
-- (Keep the most recent one based on joined_at)
DELETE FROM public.wa_group_members a USING (
    SELECT MIN(ctid) as ctid, chat_id, contact_id
    FROM public.wa_group_members
    GROUP BY chat_id, contact_id
    HAVING COUNT(*) > 1
) b
WHERE a.chat_id = b.chat_id
AND a.contact_id = b.contact_id
AND a.ctid <> b.ctid;

-- Create a full unique index to allow upserting (reactivating members)
CREATE UNIQUE INDEX IF NOT EXISTS wa_group_members_chat_contact_idx
ON public.wa_group_members(chat_id, contact_id);
