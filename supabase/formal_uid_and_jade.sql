-- 問道長生 v1：玩家 UID 與靈玉發放系統
create schema if not exists private;

create table if not exists public.player_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_uid text not null unique,
  player_name text not null default '無名修士',
  release_channel text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_accounts_uid_format check (public_uid = 'WD1-' || upper(user_id::text)),
  constraint player_accounts_release check (release_channel = 'v1')
);

create table if not exists public.jade_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.jade_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_uid text not null,
  amount bigint not null check (amount between 1 and 10000000),
  order_ref text not null unique check (char_length(order_ref) between 1 and 80),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending','claimed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

alter table public.player_accounts enable row level security;
alter table public.jade_admins enable row level security;
alter table public.jade_grants enable row level security;

revoke all on public.player_accounts from anon, authenticated;
revoke all on public.jade_admins from anon, authenticated;
revoke all on public.jade_grants from anon, authenticated;
grant select, insert, update (user_id, public_uid, player_name, release_channel, updated_at) on public.player_accounts to authenticated;
grant select, update (status, claimed_at) on public.jade_grants to authenticated;

drop policy if exists "formal players insert own account" on public.player_accounts;
create policy "formal players insert own account" on public.player_accounts for insert to authenticated with check ((select auth.uid()) = user_id and release_channel = 'v1');
drop policy if exists "formal players read own account" on public.player_accounts;
create policy "formal players read own account" on public.player_accounts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "formal players update own account" on public.player_accounts;
create policy "formal players update own account" on public.player_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and release_channel = 'v1');
drop policy if exists "players read own jade grants" on public.jade_grants;
create policy "players read own jade grants" on public.jade_grants for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "players claim own jade grants" on public.jade_grants;
create policy "players claim own jade grants" on public.jade_grants for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and status = 'claimed');

create or replace function private.is_jade_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.jade_admins where user_id = (select auth.uid())) $$;
revoke execute on function private.is_jade_admin() from public, anon, authenticated;

create or replace function public.admin_issue_jade(p_public_uid text,p_amount bigint,p_order_ref text,p_note text default '')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare target_user uuid; grant_id uuid;
begin
  if not private.is_jade_admin() then raise exception 'not authorized'; end if;
  if p_amount < 1 or p_amount > 10000000 then raise exception 'invalid amount'; end if;
  select user_id into target_user from public.player_accounts where public_uid=upper(trim(p_public_uid)) and release_channel='v1';
  if target_user is null then raise exception 'player UID not found'; end if;
  insert into public.jade_grants(user_id,public_uid,amount,order_ref,note,created_by)
  values(target_user,upper(trim(p_public_uid)),p_amount,trim(p_order_ref),coalesce(p_note,''),(select auth.uid())) returning id into grant_id;
  return grant_id;
end $$;

create or replace function public.admin_recent_jade_grants()
returns table(public_uid text,amount bigint,order_ref text,note text,status text,created_at timestamptz,claimed_at timestamptz)
language plpgsql security definer set search_path = ''
as $$ begin
  if not private.is_jade_admin() then raise exception 'not authorized'; end if;
  return query select g.public_uid,g.amount,g.order_ref,g.note,g.status,g.created_at,g.claimed_at from public.jade_grants g order by g.created_at desc limit 100;
end $$;

revoke execute on function public.admin_issue_jade(text,bigint,text,text) from public, anon;
revoke execute on function public.admin_recent_jade_grants() from public, anon;
grant execute on function public.admin_issue_jade(text,bigint,text,text) to authenticated;
grant execute on function public.admin_recent_jade_grants() to authenticated;

-- 最後一步：先在 Authentication > Users 建立你的 Email 帳號，再將其 UUID 取代下方內容後執行。
-- insert into public.jade_admins(user_id) values ('將你的管理員-USER-UUID-貼在這裡');
