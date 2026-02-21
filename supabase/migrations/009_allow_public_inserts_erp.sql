-- Migration: 009_allow_public_inserts_erp.sql
-- Description: Allow public inserts to erp_projects and estimations for calculator usage

-- 1. Allow public inserts to erp_projects
-- We need to drop existing policy if it conflicts, but since we didn't have one for public insert, we just create new one.
-- However, "authenticated can read erp_projects" exists.
-- We want ANYONE (anon or authenticated) to be able to INSERT.

create policy "public can insert erp_projects" on erp_projects
  for insert with check (true);

-- 2. Allow public inserts to estimations (since server action might run as anon)
create policy "public can insert estimations" on estimations
  for insert with check (true);

-- 3. Allow public inserts to estimation_items (future proofing)
create policy "public can insert estimation_items" on estimation_items
  for insert with check (true);
