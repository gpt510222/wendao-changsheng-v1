create table if not exists private.player_body_states(
  user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in ('formal','test')),
  revision bigint not null default 1 check(revision>0),nutrition numeric not null default 0 check(nutrition>=0),
  foundation_bone numeric not null default 0 check(foundation_bone>=0),foundation_blood numeric not null default 0 check(foundation_blood>=0),foundation_organs numeric not null default 0 check(foundation_organs>=0),
  training_mode text not null default '' check(training_mode in ('','basic','bath','extreme')),next_cycle_at timestamptz,
  training_load integer not null default 0 check(training_load between 0 and 100),injury text not null default '' check(injury in ('','scratch','internal','tendon')),injury_until timestamptz,
  imported_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(user_id,channel)
);
alter table private.player_body_states enable row level security;
revoke all on private.player_body_states from public,anon,authenticated;

create or replace function private.body_snapshot(b private.player_body_states)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('revision',b.revision,'nutrition',b.nutrition,'foundations',jsonb_build_object('bone',b.foundation_bone,'blood',b.foundation_blood,'organs',b.foundation_organs),'trainingMode',b.training_mode,'nextCycleAt',case when b.next_cycle_at is null then 0 else floor(extract(epoch from b.next_cycle_at)*1000) end,'trainingLoad',b.training_load,'injury',case when b.injury_until>now() then b.injury else '' end,'injuryUntil',case when b.injury_until>now() then floor(extract(epoch from b.injury_until)*1000) else 0 end)
$$;

create or replace function public.player_body_bootstrap(p_channel text,p_body jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); b private.player_body_states; f jsonb;
begin
  if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') or jsonb_typeof(p_body)<>'object' then raise exception 'invalid request';end if;
  f:=coalesce(p_body->'foundations','{}'::jsonb);
  insert into private.player_body_states(user_id,channel,nutrition,foundation_bone,foundation_blood,foundation_organs,training_mode,next_cycle_at,training_load,injury,injury_until)
  values(uid,p_channel,least(100000,greatest(0,coalesce((p_body->>'nutrition')::numeric,0))),least(100,greatest(0,coalesce((f->>'bone')::numeric,0))),least(100,greatest(0,coalesce((f->>'blood')::numeric,0))),least(100,greatest(0,coalesce((f->>'organs')::numeric,0))),'',null,least(100,greatest(0,coalesce((p_body->>'trainingLoad')::integer,0))),'',null)
  on conflict(user_id,channel) do nothing;
  select * into b from private.player_body_states where user_id=uid and channel=p_channel;return private.body_snapshot(b);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid body state';end $$;

create or replace function public.player_body_command(p_channel text,p_expected_wallet_revision bigint,p_expected_body_revision bigint,p_request_id uuid,p_action text,p_mode text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); w private.player_resource_wallets;p private.player_progression_states;c private.player_cave_states;b private.player_body_states;capacity numeric;missing numeric;amount numeric;realm integer;mult numeric;discount numeric;duration interval;
begin
  if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') or p_request_id is null or p_action not in ('feed','start','stop') then raise exception 'invalid request';end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request';end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;select * into c from private.player_cave_states where user_id=uid and channel=p_channel;select * into b from private.player_body_states where user_id=uid and channel=p_channel for update;
  if w.revision<>p_expected_wallet_revision or b.revision<>p_expected_body_revision then raise exception 'resource revision conflict';end if;if not p.body_path_opened then raise exception 'body path is not opened';end if;
  realm:=floor(p.body_level/4.0)::integer+1;mult:=1+.12*(realm-1)+.018*power(realm-1,2);discount:=case when c.body_enabled then greatest(.75,1-c.body_level*.03) else 1 end;capacity:=ceil(700*mult)+(case when c.body_enabled then c.body_level*250 else 0 end);
  if p_action='feed' then missing:=greatest(0,capacity-b.nutrition);amount:=least(missing,w.food);if amount<1 then raise exception 'food unavailable or nutrition full';end if;w.food:=w.food-amount;b.nutrition:=b.nutrition+amount;
  elsif p_action='stop' then b.training_mode:='';b.next_cycle_at:=null;
  else
    if p_mode not in ('basic','bath','extreme') then raise exception 'invalid training mode';end if;if b.injury='tendon' and b.injury_until>now() and p_mode='extreme' then raise exception 'tendon injury prevents extreme training';end if;
    if p_mode='basic' then amount:=ceil(120*mult*discount);duration:=interval '5 minutes';elsif p_mode='bath' then amount:=ceil(360*mult*discount);duration:=interval '10 minutes';else amount:=ceil(600*mult*discount);duration:=interval '15 minutes';end if;
    if b.nutrition<amount then raise exception 'insufficient nutrition';end if;b.training_mode:=p_mode;b.next_cycle_at:=now()+duration;
  end if;
  update private.player_resource_wallets set food=w.food,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_body_states set nutrition=b.nutrition,training_mode=b.training_mode,next_cycle_at=b.next_cycle_at,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into b;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,b.revision,'body_'||p_action,p_request_id,jsonb_build_object('mode',p_mode,'wallet_revision',w.revision));
  return jsonb_build_object('wallet',private.wallet_snapshot(w),'body',private.body_snapshot(b));
end $$;

create or replace function public.player_body_settle(p_channel text,p_expected_wallet_revision bigint,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());w private.player_resource_wallets;p private.player_progression_states;c private.player_cave_states;b private.player_body_states;i integer:=0;need numeric;realm integer;mult numeric;discount numeric;nutrition_cost numeric;wood_cost numeric;iron_cost numeric;bone_gain numeric;blood_gain numeric;organ_gain numeric;duration interval;infused numeric;
begin
  if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request';end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;select * into c from private.player_cave_states where user_id=uid and channel=p_channel;select * into b from private.player_body_states where user_id=uid and channel=p_channel for update;
  if w.revision<>p_expected_wallet_revision or b.revision<>p_expected_body_revision then raise exception 'resource revision conflict';end if;
  if b.training_mode='' or b.next_cycle_at is null or b.next_cycle_at>now() then return jsonb_build_object('cycles',0,'wallet',private.wallet_snapshot(w),'body',private.body_snapshot(b));end if;
  need:=(array[3,3,4,4,4,5,5,6,7])[least(9,floor(p.body_level/10.0)::integer+1)];realm:=floor(p.body_level/4.0)::integer+1;mult:=1+.12*(realm-1)+.018*power(realm-1,2);discount:=case when c.body_enabled then greatest(.75,1-c.body_level*.03) else 1 end;
  while b.training_mode<>'' and b.next_cycle_at<=now() and i<200 and (b.foundation_bone<need or b.foundation_blood<need or b.foundation_organs<need) loop
    if b.training_mode='basic' then nutrition_cost:=ceil(120*mult*discount);wood_cost:=0;iron_cost:=0;bone_gain:=1;blood_gain:=1.15;organ_gain:=1.35;duration:=interval '5 minutes';
    elsif b.training_mode='bath' then nutrition_cost:=ceil(360*mult*discount);wood_cost:=ceil(120*mult*discount);iron_cost:=0;bone_gain:=1.8;blood_gain:=1.35;organ_gain:=1.2;duration:=interval '10 minutes';
    else nutrition_cost:=ceil(600*mult*discount);wood_cost:=ceil(120*mult*discount);iron_cost:=ceil(90*mult*discount);bone_gain:=2.4;blood_gain:=2.1;organ_gain:=1.8;duration:=interval '15 minutes';end if;
    if b.nutrition<nutrition_cost or w.wood<wood_cost or w.meteor_iron<iron_cost then b.training_mode:='';b.next_cycle_at:=null;exit;end if;
    infused:=case when c.infusion_path='body' and c.infusion_until>=b.next_cycle_at then 1.12 else 1 end;b.nutrition:=b.nutrition-nutrition_cost;w.wood:=w.wood-wood_cost;w.meteor_iron:=w.meteor_iron-iron_cost;b.foundation_bone:=least(need,b.foundation_bone+bone_gain*infused);b.foundation_blood:=least(need,b.foundation_blood+blood_gain*infused);b.foundation_organs:=least(need,b.foundation_organs+organ_gain*infused);b.training_load:=least(100,greatest(0,b.training_load+(case b.training_mode when 'basic' then -12 when 'bath' then 14 else 25 end)));b.next_cycle_at:=b.next_cycle_at+duration;i:=i+1;
  end loop;
  if b.foundation_bone>=need and b.foundation_blood>=need and b.foundation_organs>=need then b.training_mode:='';b.next_cycle_at:=null;end if;
  update private.player_resource_wallets set wood=w.wood,meteor_iron=w.meteor_iron,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_body_states set nutrition=b.nutrition,foundation_bone=b.foundation_bone,foundation_blood=b.foundation_blood,foundation_organs=b.foundation_organs,training_mode=b.training_mode,next_cycle_at=b.next_cycle_at,training_load=b.training_load,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into b;
  return jsonb_build_object('cycles',i,'wallet',private.wallet_snapshot(w),'body',private.body_snapshot(b));
end $$;

revoke execute on function public.player_body_bootstrap(text,jsonb),public.player_body_command(text,bigint,bigint,uuid,text,text),public.player_body_settle(text,bigint,bigint,uuid) from public,anon;
grant execute on function public.player_body_bootstrap(text,jsonb),public.player_body_command(text,bigint,bigint,uuid,text,text),public.player_body_settle(text,bigint,bigint,uuid) to authenticated;
