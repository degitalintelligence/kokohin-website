insert into public.site_settings (key, value, updated_at) values
('contact_address', 'Tangerang, Indonesia', now())
on conflict (key) do nothing;

insert into public.site_settings (key, value, updated_at) values
('contact_hours', 'Senin - Sabtu: 08:00 - 17:00 WIB', now())
on conflict (key) do nothing;

insert into public.site_settings (key, value, updated_at) values
('company_website', 'www.kokohin.com', now())
on conflict (key) do nothing;

