-- Migration: 021_relax_rpc_requirements.sql
-- Purpose: Relax RPC required fields. Require name & phone only; default address.

set check_function_bodies = off;

drop function if exists public.create_project_with_estimation(jsonb);

create or replace function public.create_project_with_estimation(dto jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
  v_estimation_id uuid;
  v_status text := coalesce((dto->>'status')::text, 'New');
  v_customer_name text := trim(coalesce(dto->>'customer_name', ''));
  v_phone text := trim(coalesce(dto->>'phone', ''));
  v_address text := trim(coalesce(dto->>'address', ''));
  v_zone_id uuid := nullif(dto->>'zone_id','')::uuid;
  v_custom_notes text := nullif(dto->>'custom_notes','');
  v_estimation jsonb := dto->'estimation';
  v_next_version int := 1;
begin
  if length(v_customer_name) = 0 or length(v_phone) = 0 then
    raise exception 'Missing required fields';
  end if;
  if length(v_address) = 0 then
    v_address := 'Alamat belum diisi';
  end if;

  insert into public.erp_projects(customer_name, phone, address, zone_id, custom_notes, status)
  values (v_customer_name, v_phone, v_address, v_zone_id, v_custom_notes, v_status)
  returning id into v_project_id;

  if v_estimation is not null then
    select coalesce(max(e.version_number), 0) + 1
      into v_next_version
      from public.estimations e
     where e.project_id = v_project_id;

    insert into public.estimations(
      project_id,
      version_number,
      total_hpp,
      margin_percentage,
      total_selling_price,
      status
    )
    values (
      v_project_id,
      v_next_version,
      coalesce((v_estimation->>'total_hpp')::numeric, 0),
      coalesce((v_estimation->>'margin_percentage')::numeric, 30.00),
      coalesce((v_estimation->>'total_selling_price')::numeric, 0),
      coalesce((v_estimation->>'status')::text, 'draft')
    )
    returning id into v_estimation_id;
  end if;

  return json_build_object('project_id', v_project_id, 'estimation_id', v_estimation_id);
end;
$$;

grant execute on function public.create_project_with_estimation(jsonb) to anon, authenticated;

