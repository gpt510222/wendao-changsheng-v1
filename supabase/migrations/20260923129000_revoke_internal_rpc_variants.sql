do $$
declare f record;
begin
 for f in
  select p.oid::regprocedure as signature
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'and(
   p.proname like '%\_unsealed'escape'\'
   or p.proname like '%\_base'escape'\'
   or p.proname like '%\_untrusted\_%'escape'\'
   or p.proname like '%\_without\_%'escape'\'
  )
 loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end$$;
