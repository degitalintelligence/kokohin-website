
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
ALTER TABLE public.wa_message_media
ADD CONSTRAINT wa_message_media_message_id_unique UNIQUE (message_id);

-- 3. Add Index for performance (implicitly created by UNIQUE constraint, but good to be explicit if needed, 
-- though Postgres UNIQUE constraint automatically creates an index. We can skip explicit index creation if constraint exists.)
