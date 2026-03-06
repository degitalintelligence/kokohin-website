do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wa_chats_contact_id_unique'
  ) then
    alter table public.wa_chats
    add constraint wa_chats_contact_id_unique unique (contact_id);
  end if;
end $$;

alter table public.wa_messages
add column if not exists status text not null default 'sent',
add column if not exists idempotency_key text,
add column if not exists retry_count integer not null default 0,
add column if not exists last_retry_at timestamptz;

create unique index if not exists idx_wa_messages_idempotency_key
on public.wa_messages(idempotency_key)
where idempotency_key is not null;

create index if not exists idx_wa_messages_status_sent_at
on public.wa_messages(status, sent_at desc);

create table if not exists public.wa_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  external_event_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received',
  error_message text
);

create unique index if not exists idx_wa_webhook_events_external
on public.wa_webhook_events(event_name, external_event_id)
where external_event_id is not null;

create table if not exists public.wa_delivery_anomalies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.wa_messages(id) on delete cascade,
  anomaly_type text not null,
  severity text not null default 'medium',
  details jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_wa_delivery_anomalies_detected
on public.wa_delivery_anomalies(detected_at desc);

alter table public.wa_webhook_events enable row level security;
alter table public.wa_delivery_anomalies enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wa_webhook_events'
      and policyname = 'Admin can do everything on wa_webhook_events'
  ) then
    create policy "Admin can do everything on wa_webhook_events"
    on public.wa_webhook_events
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('super_admin', 'admin_sales', 'admin_proyek')
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wa_delivery_anomalies'
      and policyname = 'Admin can do everything on wa_delivery_anomalies'
  ) then
    create policy "Admin can do everything on wa_delivery_anomalies"
    on public.wa_delivery_anomalies
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('super_admin', 'admin_sales', 'admin_proyek')
      )
    );
  end if;
end $$;
