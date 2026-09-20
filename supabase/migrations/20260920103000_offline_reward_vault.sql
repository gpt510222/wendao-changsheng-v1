create table if not exists private.offline_reward_vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('formal','test')),
  elapsed_ticks integer not null default 0 check (elapsed_ticks between 0 and 17280),
  status text not null default 'pending' check (status in ('pending','claimed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz
);
create unique index if not exists offline_reward_one_pending on private.offline_reward_vaults(user_id,channel) where status='pending';
alter table private.offline_reward_vaults enable row level security;
revoke all on private.offline_reward_vaults from public,anon,authenticated;

create or replace function public.offline_reward_prepare(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); row_data private.player_states; vault private.offline_reward_vaults; new_ticks int;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
  select * into row_data from private.player_states where user_id=uid and channel=p_channel for update;
  if row_data.user_id is null then raise exception 'player state not initialized'; end if;
  new_ticks:=least(17280,greatest(0,floor(extract(epoch from now()-row_data.last_settled_at)/5)::int));
  select * into vault from private.offline_reward_vaults where user_id=uid and channel=p_channel and status='pending' for update;
  if vault.id is null and new_ticks>0 then
    insert into private.offline_reward_vaults(user_id,channel,elapsed_ticks) values(uid,p_channel,new_ticks) returning * into vault;
  elsif vault.id is not null and new_ticks>0 then
    update private.offline_reward_vaults set elapsed_ticks=least(17280,elapsed_ticks+new_ticks),updated_at=now() where id=vault.id returning * into vault;
  end if;
  if new_ticks>0 then
    update private.player_states set last_settled_at=last_settled_at+make_interval(secs=>new_ticks*5),updated_at=now() where user_id=uid and channel=p_channel;
  end if;
  if vault.id is null then return jsonb_build_object('elapsed_ticks',0); end if;
  return jsonb_build_object('vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'status',vault.status);
end $$;

create or replace function public.offline_reward_claim(p_channel text,p_vault_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); vault private.offline_reward_vaults;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_vault_id is null or p_request_id is null then raise exception 'invalid request'; end if;
  select * into vault from private.offline_reward_vaults where id=p_vault_id and user_id=uid and channel=p_channel for update;
  if vault.id is null or vault.status<>'pending' then raise exception 'offline reward is unavailable'; end if;
  update private.offline_reward_vaults set status='claimed',claimed_at=now(),updated_at=now() where id=vault.id;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  select uid,p_channel,s.revision,'offline_reward_claimed',p_request_id,jsonb_build_object('vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks)
  from private.player_states s where s.user_id=uid and s.channel=p_channel;
  return jsonb_build_object('vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'status','claimed');
end $$;

revoke execute on function public.offline_reward_prepare(text),public.offline_reward_claim(text,uuid,uuid) from public,anon;
grant execute on function public.offline_reward_prepare(text),public.offline_reward_claim(text,uuid,uuid) to authenticated;
