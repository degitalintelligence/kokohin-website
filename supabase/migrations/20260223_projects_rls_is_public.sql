-- Enable RLS and restrict public reads to published projects only

alter table if exists public.projects enable row level security;

-- Drop previous policies if any
drop policy if exists "public_read_projects" on public.projects;
drop policy if exists "admin_all_projects" on public.projects;
drop policy if exists "Public can read projects" on public.projects;
drop policy if exists "Admins can manage projects" on public.projects;

-- Public can only read published projects
create policy "Public can read published projects"
  on public.projects
  for select
  to public
  using (coalesce(is_public, true) = true);

-- Admins can manage all projects
-- Reuse helper get_user_role() defined in earlier migrations
create policy "Admins can manage projects"
  on public.projects
  for all
  to authenticated
  using (get_user_role() in ('super_admin', 'admin_proyek'))
  with check (get_user_role() in ('super_admin', 'admin_proyek'));

