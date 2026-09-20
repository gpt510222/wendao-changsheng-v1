alter table private.player_progression_states
  add column if not exists qi_cycle text not null default 'small' check (qi_cycle in ('small','origin','still')),
  add column if not exists qi_mark_small integer not null default 0 check (qi_mark_small between 0 and 99),
  add column if not exists qi_mark_origin integer not null default 0 check (qi_mark_origin between 0 and 99),
  add column if not exists qi_mark_still integer not null default 0 check (qi_mark_still between 0 and 99),
  add column if not exists qi_insight_day date,
  add column if not exists qi_insight_charges integer not null default 3 check (qi_insight_charges between 0 and 3),
  add column if not exists qi_focus integer not null default 0 check (qi_focus between 0 and 6);

create or replace function private.qi_comprehension(p_level integer)
returns integer language plpgsql immutable set search_path='' as $$
declare result integer:=5; level_no integer;
begin
  for level_no in 1..greatest(0,p_level) loop
    if level_no%10=0 then result:=result+1+floor(floor(level_no/10.0)/5.0)::integer; end if;
  end loop;
  return result;
end $$;

create or replace function private.qi_base_rate(p_level integer)
returns numeric language sql immutable set search_path='' as $$
select floor((10+floor(2+3*sqrt(greatest(0,private.qi_comprehension(p_level)-5))))*private.path_efficiency(p_level))
$$;

create or replace function private.refresh_qi_profile(p_uid uuid,p_channel text)
returns numeric language plpgsql security definer set search_path='' as $$
declare p private.player_progression_states; c private.player_cave_states; w private.player_resource_wallets; profile jsonb; base_rate numeric; cycle_bonus numeric; cave_bonus numeric; final_rate numeric;
begin
  select * into p from private.player_progression_states where user_id=p_uid and channel=p_channel;
  select * into c from private.player_cave_states where user_id=p_uid and channel=p_channel;
  select * into w from private.player_resource_wallets where user_id=p_uid and channel=p_channel for update;
  if p.user_id is null or w.user_id is null then return 0; end if;
  profile:=coalesce(w.earning_profile,'{}'::jsonb);
  base_rate:=case when p.cultivation_awakened and p.spirit_path_opened then private.qi_base_rate(p.spirit_level) else 0 end;
  cycle_bonus:=case p.qi_cycle when 'small' then .08+least(8,p.qi_mark_small)*.0075 when 'origin' then .04 else .02 end;
  cave_bonus:=case when c.user_id is not null and c.cultivation_enabled and c.spirit_path_opened then .08+c.cultivation_level*.02 else 0 end;
  final_rate:=floor(base_rate*(1+cycle_bonus)*(1+cave_bonus));
  profile:=profile||jsonb_build_object('base_cultivation_rate',base_rate::text,'qi_cycle_bonus',cycle_bonus::text,'cave_cultivation_bonus',cave_bonus::text,'cultivation_rate',final_rate::text);
  update private.player_resource_wallets set earning_profile=profile,updated_at=now() where user_id=p_uid and channel=p_channel;
  return final_rate;
end $$;

create or replace function private.qi_progression_before_update()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.spirit_level>old.spirit_level and new.spirit_level%10=0 then
    if old.qi_cycle='small' then new.qi_mark_small:=least(99,old.qi_mark_small+1);
    elsif old.qi_cycle='origin' then new.qi_mark_origin:=least(99,old.qi_mark_origin+1);
    else new.qi_mark_still:=least(99,old.qi_mark_still+1); end if;
  end if;
  return new;
end $$;

create or replace function private.qi_progression_after_change()
returns trigger language plpgsql set search_path='' as $$
begin perform private.refresh_qi_profile(new.user_id,new.channel);return new;end $$;

drop trigger if exists qi_progression_before_update on private.player_progression_states;
create trigger qi_progression_before_update before update of spirit_level on private.player_progression_states for each row execute function private.qi_progression_before_update();
drop trigger if exists qi_progression_after_change on private.player_progression_states;
create trigger qi_progression_after_change after insert or update of spirit_level,spirit_path_opened,qi_cycle,qi_mark_small on private.player_progression_states for each row execute function private.qi_progression_after_change();

create or replace function private.qi_runtime_snapshot(p private.player_progression_states,p_rate numeric)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('revision',p.revision,'cycle',p.qi_cycle,'marks',jsonb_build_object('small',p.qi_mark_small,'origin',p.qi_mark_origin,'still',p.qi_mark_still),'insightDay',p.qi_insight_day,'insightCharges',p.qi_insight_charges,'focus',p.qi_focus,'cultivationRate',p_rate::text)
$$;

create or replace function public.player_qi_runtime(p_channel text,p_action text default 'get',p_value text default null,p_expected_wallet_revision bigint default null,p_expected_progression_revision bigint default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); p private.player_progression_states; w private.player_resource_wallets; today date:=(now() at time zone 'Asia/Taipei')::date; rate numeric; gain numeric:=0;
begin
  if uid is null then raise exception 'authentication required';end if;
  if p_channel not in ('formal','test') or p_action not in ('get','set_cycle','claim_insight') then raise exception 'invalid request';end if;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  if p.user_id is null or w.user_id is null then raise exception 'player state not initialized';end if;
  if p.qi_insight_day is distinct from today then p.qi_insight_day:=today;p.qi_insight_charges:=3;end if;
  if p_action<>'get' then
    if p_request_id is null or p_expected_wallet_revision is null or p_expected_progression_revision is null then raise exception 'missing revision';end if;
    if w.revision<>p_expected_wallet_revision or p.revision<>p_expected_progression_revision then raise exception 'resource revision conflict';end if;
    if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception 'duplicate request';end if;
  end if;
  if p_action='set_cycle' then
    if p_value not in ('small','origin','still') then raise exception 'invalid cycle';end if;p.qi_cycle:=p_value;
  elsif p_action='claim_insight' then
    if p_value not in ('cultivation','aura','focus') or p.qi_insight_charges<1 then raise exception 'insight unavailable';end if;
    if p_value='focus' and p.qi_focus>=6 then raise exception 'focus is full';end if;
    rate:=private.refresh_qi_profile(uid,p_channel);p.qi_insight_charges:=p.qi_insight_charges-1;
    if p_value='cultivation' then gain:=greatest(1,rate*180);w.cultivation:=w.cultivation+gain;
    elsif p_value='aura' then gain:=greatest(1,coalesce((w.earning_profile->>'aura_rate')::numeric,1)*180);w.aura:=least(coalesce((w.earning_profile->>'aura_capacity')::numeric,w.aura+gain),w.aura+gain);
    else p.qi_focus:=least(6,p.qi_focus+2);end if;
    update private.player_resource_wallets set cultivation=w.cultivation,aura=w.aura,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  end if;
  update private.player_progression_states set qi_cycle=p.qi_cycle,qi_insight_day=p.qi_insight_day,qi_insight_charges=p.qi_insight_charges,qi_focus=p.qi_focus,revision=case when p_action='get' then revision else revision+1 end,updated_at=now() where user_id=uid and channel=p_channel returning * into p;
  rate:=private.refresh_qi_profile(uid,p_channel);
  if p_action<>'get' then insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'qi_'||p_action,p_request_id,jsonb_build_object('value',p_value,'gain',gain::text));end if;
  return jsonb_build_object('qi',private.qi_runtime_snapshot(p,rate),'wallet',jsonb_build_object('revision',w.revision,'resources',jsonb_build_object('free',w.cultivation::text,'swordEssence',w.sword_essence::text,'aura',w.aura::text,'spiritStone',w.spirit_stone::text,'food',w.food::text,'wood',w.wood::text,'meteorIron',w.meteor_iron::text)));
end $$;

revoke execute on function public.player_qi_runtime(text,text,text,bigint,bigint,uuid) from public,anon;
grant execute on function public.player_qi_runtime(text,text,text,bigint,bigint,uuid) to authenticated;

select private.refresh_qi_profile(user_id,channel) from private.player_progression_states;
