-- Ensure services columns exist
alter table if exists public.services
  add column if not exists is_active boolean not null default true,
  add column if not exists meta_title text null,
  add column if not exists meta_description text null,
  add column if not exists meta_keywords text null;

-- Ensure services bucket exists
insert into storage.buckets (id, name, public)
values ('services', 'services', true)
on conflict (id) do nothing;

-- Ensure RLS policies on storage.objects for services bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='services_public_read'
  ) then
    create policy "services_public_read"
      on storage.objects for select
      using (bucket_id = 'services');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='services_admin_write'
  ) then
    create policy "services_admin_write"
      on storage.objects for all
      to authenticated
      using (
        bucket_id = 'services' and (
          exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('super_admin','admin_sales','admin_proyek')
          )
        )
      )
      with check (
        bucket_id = 'services' and (
          exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('super_admin','admin_sales','admin_proyek')
          )
        )
      );
  end if;
end $$;

