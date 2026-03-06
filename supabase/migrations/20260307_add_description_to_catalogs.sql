-- Add description column to catalogs table
alter table public.catalogs add column if not exists description text;

-- Update existing catalogs with a default description if needed (optional)
-- update public.catalogs set description = 'Solusi kanopi profesional dari Kokohin yang dirancang untuk memberikan perlindungan maksimal dengan estetika modern.' where description is null;
