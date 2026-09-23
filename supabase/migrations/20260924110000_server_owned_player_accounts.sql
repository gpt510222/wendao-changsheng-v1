create or replace function public.player_account_ensure(p_player_name text default null,p_allow_create boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=(select auth.uid());
 account public.player_accounts;
 clean_name text:=left(coalesce(nullif(trim(p_player_name),''),'無名修士'),20);
 was_created boolean:=false;
begin
 if uid is null then raise exception '需要重新登入';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-player-account'));
 select * into account from public.player_accounts where user_id=uid for update;
 if account.user_id is null then
  if not coalesce(p_allow_create,false) then return jsonb_build_object('exists',false,'created',false);end if;
  insert into public.player_accounts(user_id,public_uid,player_name,release_channel,updated_at)
  values(uid,'WD1-'||upper(uid::text),clean_name,'v1',now()) returning * into account;
  was_created:=true;
 elsif account.player_name is distinct from clean_name then
  update public.player_accounts set player_name=clean_name,updated_at=now() where user_id=uid returning * into account;
 end if;
 return jsonb_build_object('exists',true,'created',was_created,'public_uid',account.public_uid,'player_name',account.player_name);
end$$;

alter table public.player_accounts enable row level security;
revoke all on public.player_accounts from public,anon,authenticated;
drop policy if exists "formal players insert own account" on public.player_accounts;
drop policy if exists "formal players read own account" on public.player_accounts;
drop policy if exists "formal players update own account" on public.player_accounts;
revoke all on function public.player_account_ensure(text,boolean) from public,anon;
grant execute on function public.player_account_ensure(text,boolean) to authenticated;
