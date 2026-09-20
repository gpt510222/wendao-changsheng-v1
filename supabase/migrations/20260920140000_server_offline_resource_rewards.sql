alter table private.player_resource_wallets add column if not exists earning_profile jsonb;
alter table private.offline_reward_vaults add column if not exists rewards jsonb not null default '{}'::jsonb;
alter table private.offline_reward_vaults add constraint offline_reward_rewards_object check (jsonb_typeof(rewards)='object');

create or replace function public.player_resource_profile_bootstrap(p_channel text,p_profile jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); profile jsonb;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or jsonb_typeof(p_profile)<>'object' then raise exception 'invalid request'; end if;
  profile:=jsonb_build_object(
    'cultivation_rate',least(1e30,greatest(0,coalesce((p_profile->>'cultivation_rate')::numeric,0))),
    'aura_rate',least(1e18,greatest(0,coalesce((p_profile->>'aura_rate')::numeric,0))),
    'aura_capacity',least(1e30,greatest(0,coalesce((p_profile->>'aura_capacity')::numeric,0))),
    'sword_rate',least(1e30,greatest(0,coalesce((p_profile->>'sword_rate')::numeric,0))),
    'food_workers',least(100000,greatest(0,coalesce((p_profile->>'food_workers')::int,0))),
    'wood_workers',least(100000,greatest(0,coalesce((p_profile->>'wood_workers')::int,0))),
    'iron_workers',least(100000,greatest(0,coalesce((p_profile->>'iron_workers')::int,0))),
    'food_capacity',least(1e30,greatest(0,coalesce((p_profile->>'food_capacity')::numeric,0))),
    'wood_capacity',least(1e30,greatest(0,coalesce((p_profile->>'wood_capacity')::numeric,0))),
    'iron_capacity',least(1e30,greatest(0,coalesce((p_profile->>'iron_capacity')::numeric,0)))
  );
  update private.player_resource_wallets set earning_profile=profile,updated_at=now()
  where user_id=uid and channel=p_channel and earning_profile is null;
  select earning_profile into profile from private.player_resource_wallets where user_id=uid and channel=p_channel;
  if profile is null then raise exception 'resource wallet not initialized'; end if;
  return profile;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid earning profile';
end $$;

create or replace function public.offline_reward_prepare(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=(select auth.uid()); row_data private.player_states; wallet private.player_resource_wallets;
  vault private.offline_reward_vaults; new_ticks int; grant_ticks int; i int; profile jsonb; reward_data jsonb;
  cultivation numeric:=0; sword numeric:=0; aura numeric:=0; food numeric:=0; wood numeric:=0; iron numeric:=0;
  food_now numeric; wood_now numeric; iron_now numeric; food_cap numeric; wood_cap numeric; iron_cap numeric;
  food_workers int; wood_workers int; iron_workers int; possible int;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
  select * into row_data from private.player_states where user_id=uid and channel=p_channel for update;
  select * into wallet from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  if row_data.user_id is null or wallet.user_id is null or wallet.earning_profile is null then raise exception 'player resources not initialized'; end if;
  new_ticks:=least(17280,greatest(0,floor(extract(epoch from now()-row_data.last_settled_at)/5)::int));
  select * into vault from private.offline_reward_vaults where user_id=uid and channel=p_channel and status='pending' for update;
  grant_ticks:=least(new_ticks,greatest(0,17280-coalesce(vault.elapsed_ticks,0)));
  reward_data:=coalesce(vault.rewards,'{}'::jsonb);
  cultivation:=coalesce((reward_data->>'free')::numeric,0);
  sword:=coalesce((reward_data->>'swordEssence')::numeric,0);
  aura:=coalesce((reward_data->>'aura')::numeric,0);
  food:=coalesce((reward_data->>'food')::numeric,0);
  wood:=coalesce((reward_data->>'wood')::numeric,0);
  iron:=coalesce((reward_data->>'meteorIron')::numeric,0);
  profile:=wallet.earning_profile;
  cultivation:=cultivation+grant_ticks*coalesce((profile->>'cultivation_rate')::numeric,0);
  sword:=sword+grant_ticks*coalesce((profile->>'sword_rate')::numeric,0);
  aura:=least(greatest(0,coalesce((profile->>'aura_capacity')::numeric,0)-wallet.aura),aura+grant_ticks*coalesce((profile->>'aura_rate')::numeric,0));
  food_now:=wallet.food+food; wood_now:=wallet.wood+wood; iron_now:=wallet.meteor_iron+iron;
  food_cap:=coalesce((profile->>'food_capacity')::numeric,0); wood_cap:=coalesce((profile->>'wood_capacity')::numeric,0); iron_cap:=coalesce((profile->>'iron_capacity')::numeric,0);
  food_workers:=coalesce((profile->>'food_workers')::int,0); wood_workers:=coalesce((profile->>'wood_workers')::int,0); iron_workers:=coalesce((profile->>'iron_workers')::int,0);
  for i in 1..grant_ticks loop
    food_now:=least(food_cap,food_now+food_workers);
    possible:=least(wood_workers,floor(greatest(0,wood_cap-wood_now)),floor(food_now/2))::int;
    if possible>0 then food_now:=food_now-possible*2;wood_now:=wood_now+possible;end if;
    possible:=least(iron_workers,floor(greatest(0,iron_cap-iron_now)),floor(food_now/4))::int;
    if possible>0 then food_now:=food_now-possible*4;iron_now:=iron_now+possible;end if;
  end loop;
  food:=greatest(0,food_now-wallet.food);wood:=greatest(0,wood_now-wallet.wood);iron:=greatest(0,iron_now-wallet.meteor_iron);
  reward_data:=jsonb_build_object('free',cultivation::text,'swordEssence',sword::text,'aura',aura::text,'spiritStone','0','food',food::text,'wood',wood::text,'meteorIron',iron::text);
  if vault.id is null and grant_ticks>0 then
    insert into private.offline_reward_vaults(user_id,channel,elapsed_ticks,rewards) values(uid,p_channel,grant_ticks,reward_data) returning * into vault;
  elsif vault.id is not null and new_ticks>0 then
    update private.offline_reward_vaults set elapsed_ticks=least(17280,elapsed_ticks+grant_ticks),rewards=reward_data,updated_at=now() where id=vault.id returning * into vault;
  end if;
  if new_ticks>0 then update private.player_states set last_settled_at=last_settled_at+make_interval(secs=>new_ticks*5),updated_at=now() where user_id=uid and channel=p_channel; end if;
  if vault.id is null then return jsonb_build_object('elapsed_ticks',0,'rewards','{}'::jsonb); end if;
  return jsonb_build_object('vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'status',vault.status,'rewards',vault.rewards);
end $$;

create or replace function public.offline_reward_claim(p_channel text,p_vault_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); vault private.offline_reward_vaults; wallet private.player_resource_wallets; r jsonb;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_vault_id is null or p_request_id is null then raise exception 'invalid request'; end if;
  select * into vault from private.offline_reward_vaults where id=p_vault_id and user_id=uid and channel=p_channel for update;
  if vault.id is null or vault.status<>'pending' then raise exception 'offline reward is unavailable'; end if;
  r:=vault.rewards;
  update private.player_resource_wallets set
    cultivation=cultivation+coalesce((r->>'free')::numeric,0),
    sword_essence=sword_essence+coalesce((r->>'swordEssence')::numeric,0),
    aura=aura+coalesce((r->>'aura')::numeric,0),
    spirit_stone=spirit_stone+coalesce((r->>'spiritStone')::numeric,0),
    food=food+coalesce((r->>'food')::numeric,0),
    wood=wood+coalesce((r->>'wood')::numeric,0),
    meteor_iron=meteor_iron+coalesce((r->>'meteorIron')::numeric,0),
    revision=revision+1,updated_at=now()
  where user_id=uid and channel=p_channel returning * into wallet;
  if wallet.user_id is null then raise exception 'resource wallet not initialized'; end if;
  update private.offline_reward_vaults set status='claimed',claimed_at=now(),updated_at=now() where id=vault.id;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,wallet.revision,'offline_reward_claimed',p_request_id,jsonb_build_object('vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'rewards',r));
  return jsonb_build_object('vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'status','claimed','wallet_revision',wallet.revision,'rewards',r);
end $$;

revoke execute on function public.player_resource_profile_bootstrap(text,jsonb) from public,anon;
grant execute on function public.player_resource_profile_bootstrap(text,jsonb) to authenticated;
