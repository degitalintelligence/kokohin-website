insert into public.site_settings (key, value, updated_at) values
('site_name', 'KOKOHIN', now())
on conflict (key) do nothing;

insert into public.site_settings (key, value, updated_at) values
('support_email', 'support@kokohin.co.id', now())
on conflict (key) do nothing;

insert into public.site_settings (key, value, updated_at) values
('support_phone', '620000000000', now())
on conflict (key) do nothing;

