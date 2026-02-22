-- Migration: 012_create_project_with_estimation_func.sql
-- Atomic RPC to create project and optional estimation

create or replace function public.create_project_with_estimation(dto jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_project_id uuid;
  v_estimation_id uuid;
  v_status text := coalesce(dto->>'status', 'New');
  v_has_estimation boolean := (dto ? 'estimation') and (dto->'estimation') is not null;
  v_next_version int := 1;
begin
  perform 1;

  begin
    insert into erp_projects (customer_name, phone, address, zone_id, custom_notes, status)
    values (
      coalesce(dto->>'customer_name', ''),
      coalesce(dto->>'phone', ''),
      coalesce(dto->>'address', ''),
      nullif(dto->>'zone_id','')::uuid,
      nullif(dto->>'custom_notes',''),
      v_status
    )
    returning id into v_project_id;

    if v_has_estimation then
      select coalesce(max(version_number),0) + 1 into v_next_version
      from estimations
      where project_id = v_project_id;

      insert into estimations (
        project_id,
        version_number,
        total_hpp,
        margin_percentage,
        total_selling_price,
        status
      ) values (
        v_project_id,
        v_next_version,
        coalesce( (dto->'estimation'->>'total_hpp')::numeric, 0 ),
        coalesce( (dto->'estimation'->>'margin_percentage')::numeric, 0 ),
        coalesce( (dto->'estimation'->>'total_selling_price')::numeric, 0 ),
        coalesce( dto->'estimation'->>'status', 'draft' )
      )
      returning id into v_estimation_id;
    end if;

    return json_build_object('project_id', v_project_id, 'estimation_id', v_estimation_id);
  exception when others then
    raise;
  end;
end;
$$;

