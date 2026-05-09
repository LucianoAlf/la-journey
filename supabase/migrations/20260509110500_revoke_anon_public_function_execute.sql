-- Follow-up hardening: remove any explicit anon EXECUTE grants that existed
-- before the development RLS relaxation migration.
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
