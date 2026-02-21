-- Create site_settings table
create table if not exists site_settings (
  key         text primary key,
  value       text,
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Enable RLS
alter table site_settings enable row level security;

-- Policies
create policy "public_read_site_settings" on site_settings for select using (true);
create policy "admin_all_site_settings" on site_settings for all using (auth.role() = 'authenticated');

-- Create storage bucket for settings
insert into storage.buckets (id, name, public)
values ('settings', 'settings', true)
on conflict (id) do nothing;

-- Storage policies
create policy "public_read_settings_bucket" on storage.objects for select
using ( bucket_id = 'settings' );

create policy "admin_all_settings_bucket" on storage.objects for all
using ( bucket_id = 'settings' )
with check ( bucket_id = 'settings' );

-- Seed default logo key
insert into site_settings (key, value, description)
values ('logo_url', null, 'URL of the main website logo')
on conflict (key) do nothing;
