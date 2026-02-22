insert into public.site_settings (key, value, description)
values ('wa_number', '6281234567890', 'Default WhatsApp number')
on conflict (key) do nothing;

