revoke update on public.jade_grants from authenticated;
drop policy if exists "players claim own jade grants" on public.jade_grants;
