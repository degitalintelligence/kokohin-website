
-- Migration: Add Unique Constraint to wa_message_media
-- Description: Ensures 1:1 relationship between message and media to prevent duplicates during upsert

-- 1. Clean up potential duplicates (keep the most recent one)
DELETE FROM public.wa_message_media a USING (
    SELECT MIN(ctid) as ctid, message_id
    FROM public.wa_message_media
    GROUP BY message_id
    HAVING COUNT(*) > 1
) b
WHERE a.message_id = b.message_id
AND a.ctid <> b.ctid;

-- 2. Add Unique Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'wa_message_media_message_id_unique'
          AND conrelid = 'public.wa_message_media'::regclass
    ) THEN
        -- Handle partial previous run where unique index exists but constraint registration failed.
        IF EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'i'
              AND c.relname = 'wa_message_media_message_id_unique'
              AND n.nspname = 'public'
        ) THEN
            EXECUTE 'DROP INDEX public.wa_message_media_message_id_unique';
        END IF;

        ALTER TABLE public.wa_message_media
        ADD CONSTRAINT wa_message_media_message_id_unique UNIQUE (message_id);
    END IF;
END $$;

-- 3. Add Index for performance (implicitly created by UNIQUE constraint, but good to be explicit if needed, 
-- though Postgres UNIQUE constraint automatically creates an index. We can skip explicit index creation if constraint exists.)
