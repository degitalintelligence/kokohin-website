create unique index if not exists unique_estimations_project_version
on public.estimations (project_id, version_number);
