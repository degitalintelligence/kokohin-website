-- Rollback for 013_add_wa_number_to_site_settings and policies

-- Remove policy for updating WA number if exists
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='site_settings' and policyname='admins_update_site_settings') then
    drop policy "admins_update_site_settings" on public.site_settings;
  end if;
end $$;

-- Remove WA number setting (optional, safe no-op if not exists)
delete from public.site_settings where key = 'wa_number';

