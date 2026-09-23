do $$
declare routine record;
begin
  for routine in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and (p.proname like '%\_base' escape '\' or p.proname like '%\_unsealed' escape '\')
  loop
    execute format('revoke all on function %s from public, anon, authenticated',routine.signature);
  end loop;
end $$;
