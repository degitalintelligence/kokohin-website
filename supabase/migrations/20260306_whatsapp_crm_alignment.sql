alter table public.whatsapp_messages
add column if not exists quoted_message_id uuid references public.whatsapp_messages(id) on delete set null,
add column if not exists is_forwarded boolean not null default false,
add column if not exists is_deleted boolean not null default false,
add column if not exists deleted_at timestamptz;

create table if not exists public.whatsapp_internal_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  agent_id uuid references public.profiles(id) on delete set null,
  note text not null check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_internal_notes_contact_created
  on public.whatsapp_internal_notes(contact_id, created_at desc);

alter table public.whatsapp_internal_notes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_internal_notes'
      and policyname = 'Admin can do everything on whatsapp_internal_notes'
  ) then
    create policy "Admin can do everything on whatsapp_internal_notes"
    on public.whatsapp_internal_notes
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('super_admin', 'admin_sales', 'admin_proyek')
      )
    )
    with check (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('super_admin', 'admin_sales', 'admin_proyek')
      )
    );
  end if;
end $$;

create or replace function public.handle_whatsapp_internal_notes_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_whatsapp_internal_notes_updated on public.whatsapp_internal_notes;
create trigger trigger_whatsapp_internal_notes_updated
before update on public.whatsapp_internal_notes
for each row
execute function public.handle_whatsapp_internal_notes_updated();
