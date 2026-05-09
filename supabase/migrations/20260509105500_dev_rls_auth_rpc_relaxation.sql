-- Development-only access relaxation for LA Journey.
--
-- Context:
-- - The project is still in single-school development.
-- - Auth users may exist before the matching public.users profile.
-- - The app should remain usable during development without disabling RLS globally.
--
-- Production hardening TODO:
-- - Replace dev_admin_all policies with strict school-scoped policies only.
-- - Keep RPC EXECUTE revoked from anon.
-- - Keep internal RPC guards, but narrow dev admin bypass rules.

-- 1) Make existing Auth users usable in the seeded development school.
do $$
declare
  v_school_id uuid;
begin
  select id
    into v_school_id
  from public.schools
  order by created_at nulls last, id
  limit 1;

  if v_school_id is null then
    raise exception 'No school found to attach development Auth users';
  end if;

  insert into public.users (
    id,
    school_id,
    name,
    email,
    role,
    is_active
  )
  select
    au.id,
    v_school_id,
    coalesce(
      nullif(au.raw_user_meta_data->>'name', ''),
      nullif(au.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(au.email, '@', 1), ''),
      'Dev User'
    ) as name,
    coalesce(au.email, au.id::text || '@local.dev') as email,
    'owner'::public.user_role as role,
    true as is_active
  from auth.users au
  where not exists (
    select 1
    from public.users pu
    where pu.id = au.id
  );

  update auth.users au
     set raw_user_meta_data =
       coalesce(au.raw_user_meta_data, '{}'::jsonb)
       || jsonb_build_object(
         'school_id', pu.school_id::text,
         'role', pu.role::text,
         'name', coalesce(
           nullif(pu.name, ''),
           nullif(au.raw_user_meta_data->>'name', ''),
           nullif(au.raw_user_meta_data->>'full_name', ''),
           nullif(split_part(au.email, '@', 1), ''),
           'Dev User'
         )
       )
  from public.users pu
  where pu.id = au.id
    and pu.school_id is not null
    and pu.is_active = true;
end $$;

-- 2) Dev admin helper used by temporary development policies and RPC guards.
create or replace function public.is_dev_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('owner'::public.user_role, 'coordinator'::public.user_role)
  );
$$;

revoke all on function public.is_dev_admin() from public;
grant execute on function public.is_dev_admin() to authenticated, service_role;

-- 3) Add a temporary dev-admin policy to every public table.
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  loop
    execute format('drop policy if exists dev_admin_all on public.%I', r.tablename);
    execute format(
      'create policy dev_admin_all on public.%I as permissive for all to authenticated using (public.is_dev_admin()) with check (public.is_dev_admin())',
      r.tablename
    );
  end loop;
end $$;

-- 4) Guard sensitive RPCs while keeping dev workflow flexible.
create or replace function public.list_materials(p_school_id uuid default null::uuid)
returns table(
  id uuid,
  title text,
  type public.material_type,
  status public.material_status,
  is_draft boolean,
  journey_name text,
  station_name text,
  block_count bigint,
  generated_at timestamp with time zone,
  version integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    gm.id,
    gm.title,
    gm.type,
    gm.status,
    gm.is_draft,
    j.name as journey_name,
    jst.name as station_name,
    (select count(*) from public.material_blocks mb where mb.material_id = gm.id) as block_count,
    gm.generated_at,
    gm.version
  from public.generated_materials gm
  left join public.journeys j on j.id = gm.journey_id
  left join public.journey_stations jst on jst.id = gm.station_id
  where (p_school_id is null or gm.school_id = p_school_id)
    and (public.is_dev_admin() or gm.school_id = public.get_my_school_id())
  order by gm.generated_at desc;
end;
$$;

create or replace function public.get_material_with_blocks(p_material_id uuid)
returns table(
  material_id uuid,
  material_title text,
  material_type text,
  material_status text,
  is_draft boolean,
  journey_name text,
  stage_name text,
  station_name text,
  school_name text,
  generation_config jsonb,
  generated_at timestamp with time zone,
  version integer,
  page_config jsonb,
  block_id uuid,
  block_type text,
  block_title text,
  block_content jsonb,
  block_render_data jsonb,
  block_sort_order integer,
  block_is_edited boolean,
  block_original_content jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    gm.id as material_id,
    gm.title as material_title,
    gm.type::text as material_type,
    gm.status::text as material_status,
    gm.is_draft,
    j.name as journey_name,
    js.name as stage_name,
    jst.name as station_name,
    s.name as school_name,
    gm.generation_config,
    gm.generated_at,
    gm.version,
    gm.page_config,
    mb.id as block_id,
    mb.block_type::text as block_type,
    mb.title as block_title,
    mb.content as block_content,
    mb.render_data as block_render_data,
    mb.sort_order as block_sort_order,
    mb.is_edited as block_is_edited,
    mb.original_content as block_original_content
  from public.generated_materials gm
  join public.schools s on s.id = gm.school_id
  left join public.journeys j on j.id = gm.journey_id
  left join public.journey_stages js on js.id = gm.stage_id
  left join public.journey_stations jst on jst.id = gm.station_id
  left join public.material_blocks mb on mb.material_id = gm.id
  where gm.id = p_material_id
    and (public.is_dev_admin() or gm.school_id = public.get_my_school_id())
  order by mb.sort_order;
end;
$$;

create or replace function public.save_generated_material(
  p_school_id uuid,
  p_journey_id uuid,
  p_stage_id uuid,
  p_station_id uuid,
  p_title text,
  p_type public.material_type default 'full_module'::public.material_type,
  p_generation_config jsonb default '{}'::jsonb,
  p_blocks jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material_id uuid;
  v_block jsonb;
  v_index integer := 0;
begin
  if not public.is_dev_admin() and p_school_id is distinct from public.get_my_school_id() then
    raise exception 'Not authorized to create material for this school' using errcode = '42501';
  end if;

  insert into public.generated_materials (
    school_id,
    journey_id,
    stage_id,
    station_id,
    title,
    type,
    generation_config,
    status,
    is_draft,
    page_count
  ) values (
    p_school_id,
    p_journey_id,
    p_stage_id,
    p_station_id,
    p_title,
    p_type,
    p_generation_config,
    'ready',
    true,
    jsonb_array_length(p_blocks)
  )
  returning id into v_material_id;

  for v_block in select * from jsonb_array_elements(p_blocks)
  loop
    v_index := v_index + 1;
    insert into public.material_blocks (
      material_id,
      block_type,
      title,
      content,
      render_data,
      sort_order,
      original_content
    ) values (
      v_material_id,
      (v_block->>'block_type')::public.material_block_type,
      v_block->>'title',
      coalesce(v_block->'content', '{}'::jsonb),
      coalesce(v_block->'render_data', '{}'::jsonb),
      coalesce((v_block->>'sort_order')::integer, v_index),
      coalesce(v_block->'content', '{}'::jsonb)
    );
  end loop;

  return v_material_id;
end;
$$;

create or replace function public.add_material_block(
  p_material_id uuid,
  p_block_type public.material_block_type,
  p_title text default ''::text,
  p_content jsonb default '{}'::jsonb,
  p_render_data jsonb default '{}'::jsonb,
  p_after_order integer default 999
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block_id uuid;
begin
  if not public.is_dev_admin()
     and not exists (
       select 1
       from public.generated_materials gm
       where gm.id = p_material_id
         and gm.school_id = public.get_my_school_id()
     )
  then
    raise exception 'Not authorized to add block to this material' using errcode = '42501';
  end if;

  update public.material_blocks
     set sort_order = sort_order + 1
   where material_id = p_material_id
     and sort_order > p_after_order;

  insert into public.material_blocks (material_id, block_type, title, content, render_data, sort_order)
  values (p_material_id, p_block_type, p_title, p_content, p_render_data, p_after_order + 1)
  returning id into v_block_id;

  return v_block_id;
end;
$$;

create or replace function public.update_material_block(
  p_block_id uuid,
  p_title text default null::text,
  p_content jsonb default null::jsonb,
  p_render_data jsonb default null::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_dev_admin()
     and not exists (
       select 1
       from public.material_blocks mb
       join public.generated_materials gm on gm.id = mb.material_id
       where mb.id = p_block_id
         and gm.school_id = public.get_my_school_id()
     )
  then
    raise exception 'Not authorized to update this material block' using errcode = '42501';
  end if;

  update public.material_blocks
     set title = coalesce(p_title, title),
         content = coalesce(p_content, content),
         render_data = coalesce(p_render_data, render_data),
         is_edited = true,
         updated_at = now()
   where id = p_block_id;

  return found;
end;
$$;

create or replace function public.delete_material_block(p_block_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_dev_admin()
     and not exists (
       select 1
       from public.material_blocks mb
       join public.generated_materials gm on gm.id = mb.material_id
       where mb.id = p_block_id
         and gm.school_id = public.get_my_school_id()
     )
  then
    raise exception 'Not authorized to delete this material block' using errcode = '42501';
  end if;

  delete from public.material_blocks
   where id = p_block_id;

  return found;
end;
$$;

create or replace function public.reorder_material_blocks(p_material_id uuid, p_block_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_order integer := 0;
begin
  if not public.is_dev_admin()
     and not exists (
       select 1
       from public.generated_materials gm
       where gm.id = p_material_id
         and gm.school_id = public.get_my_school_id()
     )
  then
    raise exception 'Not authorized to reorder this material' using errcode = '42501';
  end if;

  foreach v_id in array p_block_ids
  loop
    v_order := v_order + 1;
    update public.material_blocks
       set sort_order = v_order,
           updated_at = now()
     where id = v_id
       and material_id = p_material_id;
  end loop;

  return true;
end;
$$;

create or replace function public.update_embeddings_batch(target_table text, updates jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rec jsonb;
  cnt integer := 0;
  emb_array float8[];
begin
  if not public.is_dev_admin() then
    raise exception 'Not authorized to update embeddings' using errcode = '42501';
  end if;

  for rec in select * from jsonb_array_elements(updates)
  loop
    select array_agg(val::float8)
      into emb_array
    from jsonb_array_elements_text(rec->'embedding') as val;

    if target_table = 'content_topics' then
      update public.content_topics
         set embedding = emb_array::vector
       where id = (rec->>'id')::uuid;
    elsif target_table = 'content_blocks' then
      update public.content_blocks
         set embedding = emb_array::vector
       where id = (rec->>'id')::uuid;
    else
      raise exception 'Unsupported embeddings target table: %', target_table using errcode = '22023';
    end if;

    cnt := cnt + 1;
  end loop;

  return cnt;
end;
$$;

-- 5) Remove anonymous RPC execution from public functions.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname
  loop
    execute format('revoke all on function %s from public', r.function_signature);
    execute format('revoke all on function %s from anon', r.function_signature);
    execute format('grant execute on function %s to authenticated, service_role', r.function_signature);
  end loop;
end $$;
