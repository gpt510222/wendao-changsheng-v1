create or replace function private.progression_snapshot(p private.player_progression_states)
returns jsonb language sql immutable set search_path='' as $$
select jsonb_build_object(
  'revision',p.revision,'cultivationAwakened',p.cultivation_awakened,
  'spiritPathOpened',p.spirit_path_opened,'swordPathOpened',p.sword_path_opened,'bodyPathOpened',p.body_path_opened,
  'spiritLevel',p.spirit_level,'swordLevel',p.sword_level,'bodyLevel',p.body_level,'swordTrialWins',p.sword_trial_wins
) $$;

create or replace function private.path_efficiency(p_level integer)
returns numeric language plpgsql immutable set search_path='' as $$
declare values numeric[]:=array[3,4.5,6.9,10.5,15.6,22.5,33,48,69,99]; realm integer; layer integer; i integer;
begin
  realm:=greatest(0,floor(p_level/10.0)::integer);layer:=greatest(0,p_level)%10;
  if realm>=array_length(values,1) then
    for i in array_length(values,1)..realm loop values:=array_append(values,round(values[array_length(values,1)]*2.3));end loop;
  end if;
  return values[realm+1]*(1+layer*.035);
end $$;

create or replace function private.path_upgrade_cost(p_path text,p_level integer)
returns numeric language sql immutable set search_path='' as $$
select round(case when p_path='spirit'
  then 1200*power(2000000000000000.0/1200,power(greatest(0,least(228,p_level))/228.0,.839))
  else 18000*power(9000000000000000.0/18000,power(greatest(0,least(228,p_level))/228.0,1.05)) end)::numeric
$$;

create or replace function public.player_progression_command(
  p_channel text,p_expected_wallet_revision bigint,p_expected_progression_revision bigint,p_request_id uuid,p_action text,p_path text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=(select auth.uid()); w private.player_resource_wallets; p private.player_progression_states; c private.player_cave_states;
  current_level integer; next_level integer; cost numeric:=0; profile jsonb; base_rate numeric; old_eff numeric; new_eff numeric;
begin
  if uid is null then raise exception 'authentication required';end if;
  if p_channel not in ('formal','test') or p_request_id is null or p_path not in ('spirit','sword','body') then raise exception 'invalid request';end if;
  if p_action not in ('open_path','upgrade') then raise exception 'invalid progression action';end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request';end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel for update;
  if w.user_id is null or p.user_id is null or c.user_id is null then raise exception 'player state not initialized';end if;
  if w.revision<>p_expected_wallet_revision or p.revision<>p_expected_progression_revision then raise exception 'resource revision conflict';end if;
  if not p.cultivation_awakened then raise exception 'cultivation is not awakened';end if;
  profile:=coalesce(w.earning_profile,'{}'::jsonb);

  if p_action='open_path' then
    if (p_path='spirit' and p.spirit_path_opened) or (p_path='sword' and p.sword_path_opened) or (p_path='body' and p.body_path_opened) then raise exception 'path already opened';end if;
    if p_path='sword' then
      if w.meteor_iron<30 then raise exception 'insufficient meteor iron';end if;
      w.meteor_iron:=w.meteor_iron-30;p.sword_path_opened:=true;c.sword_path_opened:=true;
      base_rate:=greatest(37,coalesce((profile->>'base_sword_rate')::numeric,0));
      profile:=profile||jsonb_build_object('base_sword_rate',base_rate::text,'sword_rate',floor(base_rate*(1+coalesce((profile->>'cave_sword_bonus')::numeric,0)))::text);
    elsif p_path='body' then
      if w.food<120 then raise exception 'insufficient food';end if;
      w.food:=w.food-90;p.body_path_opened:=true;c.body_path_opened:=true;
    else
      p.spirit_path_opened:=true;c.spirit_path_opened:=true;
      base_rate:=greatest(36,coalesce((profile->>'base_cultivation_rate')::numeric,0));
      profile:=profile||jsonb_build_object('base_cultivation_rate',base_rate::text,'cultivation_rate',floor(base_rate*(1+coalesce((profile->>'cave_cultivation_bonus')::numeric,0)))::text);
    end if;
  else
    if p_path='body' then raise exception 'body progression requires server trial verification';end if;
    current_level:=case when p_path='spirit' then p.spirit_level else p.sword_level end;next_level:=current_level+1;
    if (p_path='spirit' and not p.spirit_path_opened) or (p_path='sword' and not p.sword_path_opened) then raise exception 'path is not opened';end if;
    if p_path='spirit' and current_level>=228 then raise exception 'level limit reached';end if;
    if p_path='sword' and current_level>=89 then raise exception 'level limit reached';end if;
    if next_level%10=0 then raise exception 'major breakthrough requires server trial verification';end if;
    cost:=private.path_upgrade_cost(p_path,current_level);
    if p_path='spirit' then
      if w.cultivation<cost then raise exception 'insufficient cultivation';end if;
      w.cultivation:=w.cultivation-cost;p.spirit_level:=next_level;
      old_eff:=private.path_efficiency(current_level);new_eff:=private.path_efficiency(next_level);
      base_rate:=coalesce((profile->>'base_cultivation_rate')::numeric,coalesce((profile->>'cultivation_rate')::numeric,0));
      base_rate:=floor(base_rate*new_eff/old_eff);
      profile:=profile||jsonb_build_object('base_cultivation_rate',base_rate::text,'cultivation_rate',floor(base_rate*(1+coalesce((profile->>'cave_cultivation_bonus')::numeric,0)))::text);
    else
      if w.sword_essence<cost then raise exception 'insufficient sword essence';end if;
      w.sword_essence:=w.sword_essence-cost;p.sword_level:=next_level;
      old_eff:=private.path_efficiency(current_level);new_eff:=private.path_efficiency(next_level);
      base_rate:=coalesce((profile->>'base_sword_rate')::numeric,coalesce((profile->>'sword_rate')::numeric,0));
      base_rate:=floor(base_rate*new_eff/old_eff);
      profile:=profile||jsonb_build_object('base_sword_rate',base_rate::text,'sword_rate',floor(base_rate*(1+coalesce((profile->>'cave_sword_bonus')::numeric,0)))::text);
    end if;
  end if;

  update private.player_resource_wallets set cultivation=w.cultivation,sword_essence=w.sword_essence,food=w.food,meteor_iron=w.meteor_iron,earning_profile=profile,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_progression_states set spirit_path_opened=p.spirit_path_opened,sword_path_opened=p.sword_path_opened,body_path_opened=p.body_path_opened,spirit_level=p.spirit_level,sword_level=p.sword_level,body_level=p.body_level,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;
  update private.player_cave_states set spirit_path_opened=p.spirit_path_opened,sword_path_opened=p.sword_path_opened,body_path_opened=p.body_path_opened,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into c;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'progression_'||p_action,p_request_id,jsonb_build_object('path',p_path,'cost',cost::text,'wallet_revision',w.revision));
  return jsonb_build_object('wallet',jsonb_build_object('revision',w.revision,'resources',jsonb_build_object('free',w.cultivation::text,'swordEssence',w.sword_essence::text,'aura',w.aura::text,'spiritStone',w.spirit_stone::text,'food',w.food::text,'wood',w.wood::text,'meteorIron',w.meteor_iron::text)),'progression',private.progression_snapshot(p),'cave_revision',c.revision,'cost',cost::text);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid progression request';
end $$;

revoke execute on function public.player_progression_command(text,bigint,bigint,uuid,text,text) from public,anon;
grant execute on function public.player_progression_command(text,bigint,bigint,uuid,text,text) to authenticated;
