-- 問道長生 v1：永久帳號恢復碼、雲端備份與帳號移轉
create table if not exists public.account_recovery_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recovery_hash text not null unique check (recovery_hash ~ '^[0-9a-f]{64}$'),
  save_data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.account_recovery_backups enable row level security;
revoke all on public.account_recovery_backups from anon, authenticated;

alter table public.player_accounts drop constraint if exists player_accounts_uid_format;

create or replace function public.save_recovery_backup(p_recovery_hash text,p_save_data jsonb)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  if p_recovery_hash !~ '^[0-9a-f]{64}$' or p_save_data is null or jsonb_typeof(p_save_data) <> 'object' then raise exception 'invalid recovery backup'; end if;
  insert into public.account_recovery_backups(user_id,recovery_hash,save_data,updated_at)
  values ((select auth.uid()),p_recovery_hash,p_save_data,now())
  on conflict (user_id) do update set recovery_hash=excluded.recovery_hash,save_data=excluded.save_data,updated_at=now();
  return true;
end $$;

create or replace function public.recover_formal_account(p_recovery_hash text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare old_user uuid; new_user uuid := (select auth.uid()); recovered_save jsonb;
begin
  if new_user is null then raise exception 'authentication required'; end if;
  select user_id,save_data into old_user,recovered_save from public.account_recovery_backups where recovery_hash=p_recovery_hash for update;
  if old_user is null then raise exception 'recovery code not found'; end if;
  if old_user = new_user then
    return recovered_save;
  end if;
  delete from public.jade_grants where user_id=new_user;
  delete from public.player_rankings where user_id=new_user;
  delete from public.player_accounts where user_id=new_user;
  delete from public.account_recovery_backups where user_id=new_user;
  update public.player_accounts set user_id=new_user,updated_at=now() where user_id=old_user;
  update public.player_rankings set user_id=new_user where user_id=old_user;
  update public.jade_grants set user_id=new_user where user_id=old_user;
  update public.account_recovery_backups set user_id=new_user,updated_at=now() where user_id=old_user;
  return recovered_save;
end $$;

create or replace function public.delete_recovery_backup()
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  delete from public.account_recovery_backups where user_id=(select auth.uid());
  return true;
end $$;

revoke execute on function public.save_recovery_backup(text,jsonb) from public,anon;
revoke execute on function public.recover_formal_account(text) from public,anon;
revoke execute on function public.delete_recovery_backup() from public,anon;
grant execute on function public.save_recovery_backup(text,jsonb) to authenticated;
grant execute on function public.recover_formal_account(text) to authenticated;
grant execute on function public.delete_recovery_backup() to authenticated;
