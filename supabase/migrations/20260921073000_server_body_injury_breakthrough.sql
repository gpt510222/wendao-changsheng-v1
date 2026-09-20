alter table private.player_body_states add column if not exists breakthrough_value integer not null default 0 check(breakthrough_value between 0 and 100);

create or replace function private.body_snapshot(b private.player_body_states)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('revision',b.revision,'nutrition',b.nutrition,'foundations',jsonb_build_object('bone',b.foundation_bone,'blood',b.foundation_blood,'organs',b.foundation_organs),'trainingMode',b.training_mode,'nextCycleAt',case when b.next_cycle_at is null then 0 else floor(extract(epoch from b.next_cycle_at)*1000) end,'trainingLoad',b.training_load,'injury',case when b.injury_until>now() then b.injury else '' end,'injuryUntil',case when b.injury_until>now() then floor(extract(epoch from b.injury_until)*1000) else 0 end,'breakthroughValue',b.breakthrough_value)
$$;

create or replace function public.player_body_settle(p_channel text,p_expected_wallet_revision bigint,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());w private.player_resource_wallets;p private.player_progression_states;c private.player_cave_states;b private.player_body_states;i integer:=0;need numeric;realm integer;mult numeric;discount numeric;nutrition_cost numeric;wood_cost numeric;iron_cost numeric;bone_gain numeric;blood_gain numeric;organ_gain numeric;duration interval;infused numeric;risk integer;roll numeric;new_injury text;new_severity integer;old_severity integer;injury_seconds integer;
begin
  if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request';end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;select * into c from private.player_cave_states where user_id=uid and channel=p_channel;select * into b from private.player_body_states where user_id=uid and channel=p_channel for update;
  if w.revision<>p_expected_wallet_revision or b.revision<>p_expected_body_revision then raise exception 'resource revision conflict';end if;
  if b.injury_until<=now() then b.injury:='';b.injury_until:=null;end if;
  if b.training_mode='' or b.next_cycle_at is null or b.next_cycle_at>now() then return jsonb_build_object('cycles',0,'wallet',private.wallet_snapshot(w),'body',private.body_snapshot(b));end if;
  need:=(array[3,3,4,4,4,5,5,6,7])[least(9,floor(p.body_level/10.0)::integer+1)];realm:=floor(p.body_level/4.0)::integer+1;mult:=1+.12*(realm-1)+.018*power(realm-1,2);discount:=case when c.body_enabled then greatest(.75,1-c.body_level*.03) else 1 end;
  while b.training_mode<>'' and b.next_cycle_at<=now() and i<200 and (b.foundation_bone<need or b.foundation_blood<need or b.foundation_organs<need) loop
    if b.training_mode='basic' then nutrition_cost:=ceil(120*mult*discount);wood_cost:=0;iron_cost:=0;bone_gain:=1;blood_gain:=1.15;organ_gain:=1.35;duration:=interval '5 minutes';
    elsif b.training_mode='bath' then nutrition_cost:=ceil(360*mult*discount);wood_cost:=ceil(120*mult*discount);iron_cost:=0;bone_gain:=1.8;blood_gain:=1.35;organ_gain:=1.2;duration:=interval '10 minutes';
    else nutrition_cost:=ceil(600*mult*discount);wood_cost:=ceil(120*mult*discount);iron_cost:=ceil(90*mult*discount);bone_gain:=2.4;blood_gain:=2.1;organ_gain:=1.8;duration:=interval '15 minutes';end if;
    if b.training_mode='extreme' and b.injury='tendon' and b.injury_until>b.next_cycle_at or b.nutrition<nutrition_cost or w.wood<wood_cost or w.meteor_iron<iron_cost then b.training_mode:='';b.next_cycle_at:=null;exit;end if;
    infused:=case when c.infusion_path='body' and c.infusion_until>=b.next_cycle_at then 1.12 else 1 end;b.nutrition:=b.nutrition-nutrition_cost;w.wood:=w.wood-wood_cost;w.meteor_iron:=w.meteor_iron-iron_cost;b.foundation_bone:=least(need,b.foundation_bone+bone_gain*infused);b.foundation_blood:=least(need,b.foundation_blood+blood_gain*infused);b.foundation_organs:=least(need,b.foundation_organs+organ_gain*infused);
    if b.training_mode='extreme' then risk:=greatest(5,8+floor(b.training_load*.22)::integer-(case when p.body_level>=12 then 10 else 0 end)-(case when c.body_enabled then c.body_level*2 else 0 end));if random()*100<risk then roll:=random();new_injury:=case when roll<.5 then 'scratch' when roll<.82 then 'internal' else 'tendon' end;new_severity:=case new_injury when 'scratch' then 1 when 'internal' then 2 else 3 end;old_severity:=case b.injury when 'scratch' then 1 when 'internal' then 2 when 'tendon' then 3 else 0 end;if new_severity>=old_severity then injury_seconds:=(case new_injury when 'scratch' then 900 when 'internal' then 1800 else 2700 end)*(case when p.body_level>=16 then .8 else 1 end);b.injury:=new_injury;b.injury_until:=b.next_cycle_at+make_interval(secs=>injury_seconds);end if;end if;end if;
    b.training_load:=least(100,greatest(0,b.training_load+(case b.training_mode when 'basic' then -12 when 'bath' then 14 else 25 end)));b.next_cycle_at:=b.next_cycle_at+duration;i:=i+1;
  end loop;
  if b.foundation_bone>=need and b.foundation_blood>=need and b.foundation_organs>=need then b.training_mode:='';b.next_cycle_at:=null;end if;
  update private.player_resource_wallets set wood=w.wood,meteor_iron=w.meteor_iron,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_body_states set nutrition=b.nutrition,foundation_bone=b.foundation_bone,foundation_blood=b.foundation_blood,foundation_organs=b.foundation_organs,training_mode=b.training_mode,next_cycle_at=b.next_cycle_at,training_load=b.training_load,injury=b.injury,injury_until=b.injury_until,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into b;
  return jsonb_build_object('cycles',i,'wallet',private.wallet_snapshot(w),'body',private.body_snapshot(b));
end $$;

create or replace function public.player_body_heal(p_channel text,p_expected_wallet_revision bigint,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());w private.player_resource_wallets;p private.player_progression_states;b private.player_body_states;food_cost numeric;wood_cost numeric;severity integer;factor numeric;
begin
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;select * into b from private.player_body_states where user_id=uid and channel=p_channel for update;
  if uid is null or w.revision<>p_expected_wallet_revision or b.revision<>p_expected_body_revision then raise exception 'resource revision conflict';end if;if b.injury='' or b.injury_until<=now() then raise exception 'no active injury';end if;
  severity:=case b.injury when 'scratch' then 1 when 'internal' then 2 else 3 end;factor:=case when p.body_level>=40 then .8 else 1 end;food_cost:=ceil((case b.injury when 'scratch' then 140 when 'internal' then 420 else 700 end)*factor);wood_cost:=ceil((case b.injury when 'scratch' then 30 when 'internal' then 90 else 180 end)*factor);if w.food<food_cost or w.wood<wood_cost then raise exception 'insufficient healing materials';end if;
  update private.player_resource_wallets set food=food-food_cost,wood=wood-wood_cost,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;update private.player_body_states set injury='',injury_until=null,breakthrough_value=least(100,breakthrough_value+severity*(case when p.body_level>=60 then 2 else 1 end)),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into b;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,b.revision,'body_injury_healed',p_request_id,jsonb_build_object('food',food_cost,'wood',wood_cost));return jsonb_build_object('wallet',private.wallet_snapshot(w),'body',private.body_snapshot(b));
end $$;

create or replace function public.player_body_breakthrough(p_channel text,p_expected_progression_revision bigint,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());p private.player_progression_states;b private.player_body_states;next_level integer;need numeric;
begin
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;select * into b from private.player_body_states where user_id=uid and channel=p_channel for update;if uid is null or p.revision<>p_expected_progression_revision or b.revision<>p_expected_body_revision then raise exception 'progression revision conflict';end if;next_level:=p.body_level+1;if next_level>91 then raise exception 'body level limit reached';end if;if next_level=any(array[16,36,56,68,88]) then raise exception 'body trial required';end if;need:=(array[3,3,4,4,4,5,5,6,7])[least(9,floor(p.body_level/10.0)::integer+1)];if b.foundation_bone<need or b.foundation_blood<need or b.foundation_organs<need then raise exception 'body foundations incomplete';end if;
  update private.player_progression_states set body_level=next_level,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;update private.player_body_states set foundation_bone=0,foundation_blood=0,foundation_organs=0,training_mode='',next_cycle_at=null,breakthrough_value=0,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into b;insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'body_breakthrough_completed',p_request_id,jsonb_build_object('level',next_level));return jsonb_build_object('progression',private.progression_snapshot(p),'body',private.body_snapshot(b));
end $$;

revoke execute on function public.player_body_heal(text,bigint,bigint,uuid),public.player_body_breakthrough(text,bigint,bigint,uuid) from public,anon;
grant execute on function public.player_body_heal(text,bigint,bigint,uuid),public.player_body_breakthrough(text,bigint,bigint,uuid) to authenticated;
