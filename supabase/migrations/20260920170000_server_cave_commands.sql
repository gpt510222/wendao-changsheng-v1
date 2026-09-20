create table if not exists private.player_cave_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('formal','test')),
  revision bigint not null default 1 check (revision>0),
  dao_child_total integer not null check (dao_child_total between 0 and 100000),
  dao_child_bought integer not null check (dao_child_bought between 0 and 100000),
  worker_food integer not null check (worker_food between 0 and 100000),
  worker_wood integer not null check (worker_wood between 0 and 100000),
  worker_iron integer not null check (worker_iron between 0 and 100000),
  food_area_level integer not null check (food_area_level between 1 and 100000),
  wood_area_level integer not null check (wood_area_level between 1 and 100000),
  iron_area_level integer not null check (iron_area_level between 1 and 100000),
  spirit_pool_level integer not null check (spirit_pool_level between 1 and 100000),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,channel)
);
alter table private.player_cave_states enable row level security;
revoke all on private.player_cave_states from public,anon,authenticated;

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
    'pool_bonus',least(1e18,greatest(0,coalesce((p_profile->>'pool_bonus')::numeric,0))),
    'sword_rate',least(1e30,greatest(0,coalesce((p_profile->>'sword_rate')::numeric,0))),
    'food_workers',least(100000,greatest(0,coalesce((p_profile->>'food_workers')::int,0))),
    'wood_workers',least(100000,greatest(0,coalesce((p_profile->>'wood_workers')::int,0))),
    'iron_workers',least(100000,greatest(0,coalesce((p_profile->>'iron_workers')::int,0))),
    'food_capacity',least(1e30,greatest(0,coalesce((p_profile->>'food_capacity')::numeric,0))),
    'wood_capacity',least(1e30,greatest(0,coalesce((p_profile->>'wood_capacity')::numeric,0))),
    'iron_capacity',least(1e30,greatest(0,coalesce((p_profile->>'iron_capacity')::numeric,0)))
  );
  update private.player_resource_wallets set earning_profile=profile,updated_at=now() where user_id=uid and channel=p_channel and earning_profile is null;
  select earning_profile into profile from private.player_resource_wallets where user_id=uid and channel=p_channel;
  if profile is null then raise exception 'resource wallet not initialized'; end if;
  return profile;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid earning profile';
end $$;

create or replace function private.cave_snapshot(c private.player_cave_states)
returns jsonb language sql immutable set search_path='' as $$
select jsonb_build_object(
  'revision',c.revision,'daoChildTotal',c.dao_child_total,'daoChildBought',c.dao_child_bought,
  'workerFood',c.worker_food,'workerWood',c.worker_wood,'workerMeteorIron',c.worker_iron,
  'foodAreaLevel',c.food_area_level,'woodAreaLevel',c.wood_area_level,'meteorIronAreaLevel',c.iron_area_level,
  'spiritPoolLevel',c.spirit_pool_level
) $$;

create or replace function private.wallet_snapshot(w private.player_resource_wallets)
returns jsonb language sql immutable set search_path='' as $$
select jsonb_build_object(
  'revision',w.revision,'free',w.cultivation::text,'swordEssence',w.sword_essence::text,'aura',w.aura::text,
  'spiritStone',w.spirit_stone::text,'food',w.food::text,'wood',w.wood::text,'meteorIron',w.meteor_iron::text
) $$;

create or replace function private.refresh_cave_profile(uid uuid,p_channel text,c private.player_cave_states)
returns void language plpgsql security definer set search_path='' as $$
declare profile jsonb; pool_bonus numeric; old_pool_bonus numeric; aura_base numeric;
begin
  select earning_profile into profile from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  if profile is null then return; end if;
  pool_bonus:=least(greatest(c.spirit_pool_level-1,0),9)*2+least(greatest(c.spirit_pool_level-10,0),10)*3+greatest(c.spirit_pool_level-20,0)*4;
  old_pool_bonus:=coalesce((profile->>'pool_bonus')::numeric,pool_bonus);
  aura_base:=greatest(0,coalesce((profile->>'aura_rate')::numeric,0)-old_pool_bonus);
  profile:=profile||jsonb_build_object(
    'food_workers',least(c.worker_food,floor(c.food_area_level*3.5)::int),
    'wood_workers',least(c.worker_wood,c.wood_area_level*2),'iron_workers',least(c.worker_iron,c.iron_area_level),
    'food_capacity',(180::numeric*c.food_area_level*c.food_area_level-180*c.food_area_level+4800)::text,
    'wood_capacity',(120::numeric*c.wood_area_level*c.wood_area_level-120*c.wood_area_level+720)::text,
    'iron_capacity',(60::numeric*c.iron_area_level*c.iron_area_level-60*c.iron_area_level+360)::text,
    'pool_bonus',pool_bonus::text,'aura_rate',(aura_base+pool_bonus)::text,
    'aura_capacity',floor(20000*power(c.spirit_pool_level::numeric,1.35))::text
  );
  update private.player_resource_wallets set earning_profile=profile,updated_at=now() where user_id=uid and channel=p_channel;
end $$;

create or replace function public.player_cave_bootstrap(p_channel text,p_cave jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); c private.player_cave_states;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or jsonb_typeof(p_cave)<>'object' then raise exception 'invalid request'; end if;
  insert into private.player_cave_states(user_id,channel,dao_child_total,dao_child_bought,worker_food,worker_wood,worker_iron,food_area_level,wood_area_level,iron_area_level,spirit_pool_level)
  values(uid,p_channel,
    least(100000,greatest(0,coalesce((p_cave->>'daoChildTotal')::int,1))),
    least(100000,greatest(0,coalesce((p_cave->>'daoChildBought')::int,0))),
    least(100000,greatest(0,coalesce((p_cave->>'workerFood')::int,0))),
    least(100000,greatest(0,coalesce((p_cave->>'workerWood')::int,0))),
    least(100000,greatest(0,coalesce((p_cave->>'workerMeteorIron')::int,0))),
    least(100000,greatest(1,coalesce((p_cave->>'foodAreaLevel')::int,1))),
    least(100000,greatest(1,coalesce((p_cave->>'woodAreaLevel')::int,1))),
    least(100000,greatest(1,coalesce((p_cave->>'meteorIronAreaLevel')::int,1))),
    least(100000,greatest(1,coalesce((p_cave->>'spiritPoolLevel')::int,1)))
  ) on conflict(user_id,channel) do nothing;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel;
  perform private.refresh_cave_profile(uid,p_channel,c);
  return private.cave_snapshot(c);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid cave state';
end $$;

create or replace function public.player_cave_command(p_channel text,p_expected_wallet_revision bigint,p_expected_cave_revision bigint,p_request_id uuid,p_action text,p_key text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); c private.player_cave_states; w private.player_resource_wallets; cost numeric; lvl int; max_workers int; assigned int; next_level int; wood_cost numeric; iron_cost numeric;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request'; end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request'; end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel for update;
  if w.user_id is null or c.user_id is null then raise exception 'player resources not initialized'; end if;
  if w.revision<>p_expected_wallet_revision or c.revision<>p_expected_cave_revision then raise exception 'resource revision conflict'; end if;
  if p_action in ('assign_add','assign_remove') then
    assigned:=c.worker_food+c.worker_wood+c.worker_iron;
    if p_key='food' then max_workers:=floor(c.food_area_level*3.5);elsif p_key='wood' then max_workers:=c.wood_area_level*2;elsif p_key='meteorIron' then max_workers:=c.iron_area_level;else raise exception 'invalid cave area';end if;
    if p_action='assign_add' then
      if assigned>=c.dao_child_total then raise exception 'no available workers';end if;
      if p_key='food' and c.worker_food>=max_workers or p_key='wood' and c.worker_wood>=max_workers or p_key='meteorIron' and c.worker_iron>=max_workers then raise exception 'worker limit reached';end if;
      if p_key='food' then c.worker_food:=c.worker_food+1;elsif p_key='wood' then c.worker_wood:=c.worker_wood+1;else c.worker_iron:=c.worker_iron+1;end if;
    else
      if p_key='food' and c.worker_food<1 or p_key='wood' and c.worker_wood<1 or p_key='meteorIron' and c.worker_iron<1 then raise exception 'no worker assigned';end if;
      if p_key='food' then c.worker_food:=c.worker_food-1;elsif p_key='wood' then c.worker_wood:=c.worker_wood-1;else c.worker_iron:=c.worker_iron-1;end if;
    end if;
  elsif p_action='buy_child' then
    cost:=ceil(100+30*(c.dao_child_bought+1)+3*power(c.dao_child_bought+1,2));
    if w.food<cost then raise exception 'insufficient food';end if;
    w.food:=w.food-cost;c.dao_child_total:=c.dao_child_total+1;c.dao_child_bought:=c.dao_child_bought+1;
  elsif p_action='upgrade_area' then
    if p_key='food' then lvl:=c.food_area_level;elsif p_key='wood' then lvl:=c.wood_area_level;elsif p_key='meteorIron' then lvl:=c.iron_area_level;else raise exception 'invalid cave area';end if;
    cost:=case when p_key='meteorIron' then 40::numeric*lvl*lvl-40*lvl+120 else 60::numeric*lvl*lvl-60*lvl+120 end;
    if w.wood<cost then raise exception 'insufficient wood';end if;
    w.wood:=w.wood-cost;
    if p_key='food' then c.food_area_level:=lvl+1;elsif p_key='wood' then c.wood_area_level:=lvl+1;else c.iron_area_level:=lvl+1;end if;
  elsif p_action='upgrade_pool' then
    next_level:=c.spirit_pool_level+1;cost:=ceil(10*power((next_level+3)::numeric,1.55));wood_cost:=ceil(cost*1.15);iron_cost:=ceil(cost*.55);
    if w.wood<wood_cost or w.meteor_iron<iron_cost then raise exception 'insufficient materials';end if;
    w.wood:=w.wood-wood_cost;w.meteor_iron:=w.meteor_iron-iron_cost;c.spirit_pool_level:=next_level;
  else raise exception 'invalid cave action'; end if;
  update private.player_resource_wallets set food=w.food,wood=w.wood,meteor_iron=w.meteor_iron,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_cave_states set dao_child_total=c.dao_child_total,dao_child_bought=c.dao_child_bought,worker_food=c.worker_food,worker_wood=c.worker_wood,worker_iron=c.worker_iron,food_area_level=c.food_area_level,wood_area_level=c.wood_area_level,iron_area_level=c.iron_area_level,spirit_pool_level=c.spirit_pool_level,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into c;
  perform private.refresh_cave_profile(uid,p_channel,c);
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,w.revision,'cave_command',p_request_id,jsonb_build_object('action',p_action,'key',p_key,'cave_revision',c.revision));
  return jsonb_build_object('wallet',private.wallet_snapshot(w),'cave',private.cave_snapshot(c));
end $$;

revoke execute on function public.player_cave_bootstrap(text,jsonb),public.player_cave_command(text,bigint,bigint,uuid,text,text) from public,anon;
grant execute on function public.player_cave_bootstrap(text,jsonb),public.player_cave_command(text,bigint,bigint,uuid,text,text) to authenticated;
