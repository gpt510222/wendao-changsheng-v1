create or replace function public.player_state_claim_elapsed(p_channel text,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=(select auth.uid()); row_data private.player_states; wallet private.player_resource_wallets;
  elapsed_ticks int; granted_seconds int; i int; profile jsonb; reward_data jsonb;
  gain_cultivation numeric:=0; gain_sword numeric:=0; gain_aura numeric:=0;
  food_start numeric; wood_start numeric; iron_start numeric; food_now numeric; wood_now numeric; iron_now numeric;
  food_cap numeric; wood_cap numeric; iron_cap numeric; food_workers int; wood_workers int; iron_workers int; possible int;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request'; end if;
  select * into row_data from private.player_states where user_id=uid and channel=p_channel for update;
  if row_data.user_id is null then raise exception 'player state not initialized'; end if;
  if row_data.revision<>p_expected_revision then raise exception 'state revision conflict'; end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then
    return jsonb_build_object('revision',row_data.revision,'elapsed_seconds',0,'elapsed_ticks',0,'duplicate',true,'rewards','{}'::jsonb,'server_time',now());
  end if;
  select * into wallet from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  if wallet.user_id is null or wallet.earning_profile is null then raise exception 'player resources not initialized'; end if;
  elapsed_ticks:=least(17280,greatest(0,floor(extract(epoch from now()-row_data.last_settled_at)/5)::int));
  if elapsed_ticks=0 then
    return jsonb_build_object('revision',row_data.revision,'wallet_revision',wallet.revision,'elapsed_seconds',0,'elapsed_ticks',0,'duplicate',false,'rewards','{}'::jsonb,'server_time',now());
  end if;
  profile:=wallet.earning_profile;
  gain_cultivation:=elapsed_ticks*coalesce((profile->>'cultivation_rate')::numeric,0);
  gain_sword:=elapsed_ticks*coalesce((profile->>'sword_rate')::numeric,0);
  gain_aura:=least(greatest(0,coalesce((profile->>'aura_capacity')::numeric,0)-wallet.aura),elapsed_ticks*coalesce((profile->>'aura_rate')::numeric,0));
  food_start:=wallet.food;wood_start:=wallet.wood;iron_start:=wallet.meteor_iron;
  food_now:=food_start;wood_now:=wood_start;iron_now:=iron_start;
  food_cap:=coalesce((profile->>'food_capacity')::numeric,0);wood_cap:=coalesce((profile->>'wood_capacity')::numeric,0);iron_cap:=coalesce((profile->>'iron_capacity')::numeric,0);
  food_workers:=coalesce((profile->>'food_workers')::int,0);wood_workers:=coalesce((profile->>'wood_workers')::int,0);iron_workers:=coalesce((profile->>'iron_workers')::int,0);
  for i in 1..elapsed_ticks loop
    food_now:=least(food_cap,food_now+food_workers);
    possible:=least(wood_workers,floor(greatest(0,wood_cap-wood_now)),floor(food_now/2))::int;
    if possible>0 then food_now:=food_now-possible*2;wood_now:=wood_now+possible;end if;
    possible:=least(iron_workers,floor(greatest(0,iron_cap-iron_now)),floor(food_now/4))::int;
    if possible>0 then food_now:=food_now-possible*4;iron_now:=iron_now+possible;end if;
  end loop;
  reward_data:=jsonb_build_object(
    'free',gain_cultivation::text,'swordEssence',gain_sword::text,'aura',gain_aura::text,'spiritStone','0',
    'food',(food_now-food_start)::text,'wood',(wood_now-wood_start)::text,'meteorIron',(iron_now-iron_start)::text
  );
  update private.player_resource_wallets set
    cultivation=cultivation+gain_cultivation,
    sword_essence=sword_essence+gain_sword,
    aura=aura+gain_aura,
    food=food_now,wood=wood_now,meteor_iron=iron_now,
    revision=revision+1,updated_at=now()
  where user_id=uid and channel=p_channel returning * into wallet;
  granted_seconds:=elapsed_ticks*5;
  update private.player_states set revision=revision+1,last_settled_at=last_settled_at+make_interval(secs=>granted_seconds),updated_at=now()
  where user_id=uid and channel=p_channel returning * into row_data;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,row_data.revision,'online_resources_settled',p_request_id,jsonb_build_object('elapsed_seconds',granted_seconds,'elapsed_ticks',elapsed_ticks,'wallet_revision',wallet.revision,'rewards',reward_data));
  return jsonb_build_object('revision',row_data.revision,'wallet_revision',wallet.revision,'elapsed_seconds',granted_seconds,'elapsed_ticks',elapsed_ticks,'duplicate',false,'rewards',reward_data,'server_time',now());
end $$;

revoke execute on function public.player_state_claim_elapsed(text,bigint,uuid) from public,anon;
grant execute on function public.player_state_claim_elapsed(text,bigint,uuid) to authenticated;
