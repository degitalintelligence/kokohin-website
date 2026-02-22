-- Rollback for 014_update_services_schema_and_bucket

-- Drop storage bucket policies targeting "services" bucket on storage.objects
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname='storage' and tablename='objects' and policyname like 'services_%'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- Attempt to remove bucket "services" (objects will be deleted)
-- Safe no-op if bucket not exists
delete from storage.buckets where id = 'services';

-- Revert added columns on public.services (meta + is_active) if they exist
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='meta_title') then
    alter table public.services drop column if exists meta_title;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='meta_description') then
    alter table public.services drop column if exists meta_description;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='meta_keywords') then
    alter table public.services drop column if exists meta_keywords;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='is_active') then
    alter table public.services drop column if exists is_active;
  end if;
end $$;

