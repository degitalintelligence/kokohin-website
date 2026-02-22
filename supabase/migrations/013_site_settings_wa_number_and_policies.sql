-- Add WA number setting and tighten update policy

insert into site_settings (key, value, description)
values ('wa_number', '6281234567890', 'Default WhatsApp number for customer service')
on conflict (key) do nothing;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'site_settings' and policyname = 'admin_all_site_settings') then
    drop policy "admin_all_site_settings" on site_settings;
  end if;
end $$;

create policy if not exists "public_read_site_settings" on site_settings for select using (true);

create policy if not exists "admins_update_site_settings" on site_settings
  for update using (get_user_role() in ('super_admin','admin_sales','admin_proyek'))
  with check (get_user_role() in ('super_admin','admin_sales','admin_proyek'));

