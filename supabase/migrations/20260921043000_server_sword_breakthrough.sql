create or replace function public.player_sword_breakthrough(
  p_channel text,p_expected_wallet_revision bigint,p_expected_progression_revision bigint,p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=(select auth.uid()); w private.player_resource_wallets; p private.player_progression_states;
  current_level integer; next_level integer; cost numeric; profile jsonb; base_rate numeric; old_eff numeric; new_eff numeric;
begin
  if uid is null then raise exception 'authentication required';end if;
  if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request';end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request';end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;
  if w.user_id is null or p.user_id is null then raise exception 'player state not initialized';end if;
  if w.revision<>p_expected_wallet_revision or p.revision<>p_expected_progression_revision then raise exception 'resource revision conflict';end if;
  if not p.sword_path_opened then raise exception 'sword path is not opened';end if;
  current_level:=p.sword_level;next_level:=current_level+1;
  if next_level>89 then raise exception 'mortal sword level limit reached';end if;
  if next_level%10<>0 then raise exception 'not a major sword breakthrough';end if;
  if p.sword_trial_wins<next_level then raise exception 'required sword trial is not complete';end if;
  cost:=private.path_upgrade_cost('sword',current_level);
  if w.sword_essence<cost then raise exception 'insufficient sword essence';end if;
  profile:=coalesce(w.earning_profile,'{}'::jsonb);
  old_eff:=private.path_efficiency(current_level);new_eff:=private.path_efficiency(next_level);
  base_rate:=coalesce((profile->>'base_sword_rate')::numeric,coalesce((profile->>'sword_rate')::numeric,0));
  base_rate:=floor(base_rate*new_eff/old_eff);
  profile:=profile||jsonb_build_object('base_sword_rate',base_rate::text,'sword_rate',floor(base_rate*(1+coalesce((profile->>'cave_sword_bonus')::numeric,0)))::text);
  update private.player_resource_wallets set sword_essence=sword_essence-cost,earning_profile=profile,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_progression_states set sword_level=next_level,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,p.revision,'sword_breakthrough_completed',p_request_id,jsonb_build_object('level',next_level,'cost',cost::text,'wallet_revision',w.revision));
  return jsonb_build_object('cost',cost::text,
    'wallet',jsonb_build_object('revision',w.revision,'resources',jsonb_build_object('free',w.cultivation::text,'swordEssence',w.sword_essence::text,'aura',w.aura::text,'spiritStone',w.spirit_stone::text,'food',w.food::text,'wood',w.wood::text,'meteorIron',w.meteor_iron::text)),
    'progression',private.progression_snapshot(p));
end $$;

revoke execute on function public.player_sword_breakthrough(text,bigint,bigint,uuid) from public,anon;
grant execute on function public.player_sword_breakthrough(text,bigint,bigint,uuid) to authenticated;
