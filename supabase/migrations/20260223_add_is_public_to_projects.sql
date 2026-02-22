do $$ begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'is_public'
  ) then
    alter table public.projects
      add column is_public boolean not null default true;
  end if;
end $$;

update public.projects
set is_public = true
where is_public is null;

create index if not exists projects_is_public_idx
on public.projects(is_public);
