alter table private.player_cave_states
  add column if not exists security_v2_initialized boolean not null default false,
  add column if not exists cave_core_level integer not null default 1 check (cave_core_level between 1 and 7),
  add column if not exists cultivation_level integer not null default 1 check (cultivation_level between 1 and 7),
  add column if not exists sword_level integer not null default 1 check (sword_level between 1 and 7),
  add column if not exists body_level integer not null default 1 check (body_level between 1 and 7),
  add column if not exists cultivation_enabled boolean not null default false,
  add column if not exists sword_enabled boolean not null default false,
  add column if not exists body_enabled boolean not null default false,
  add column if not exists spirit_path_opened boolean not null default false,
  add column if not exists sword_path_opened boolean not null default false,
  add column if not exists body_path_opened boolean not null default false,
  add column if not exists has_sword_embryo boolean not null default false,
  add column if not exists metal_root integer not null default 0 check (metal_root between 0 and 200),
  add column if not exists wood_root integer not null default 0 check (wood_root between 0 and 200),
  add column if not exists water_root integer not null default 0 check (water_root between 0 and 200),
  add column if not exists fire_root integer not null default 0 check (fire_root between 0 and 200),
  add column if not exists earth_root integer not null default 0 check (earth_root between 0 and 200);

create or replace function private.cave_snapshot(c private.player_cave_states)
returns jsonb language sql immutable set search_path='' as $$
select jsonb_build_object(
  'revision',c.revision,'daoChildTotal',c.dao_child_total,'daoChildBought',c.dao_child_bought,
  'workerFood',c.worker_food,'workerWood',c.worker_wood,'workerMeteorIron',c.worker_iron,
  'foodAreaLevel',c.food_area_level,'woodAreaLevel',c.wood_area_level,'meteorIronAreaLevel',c.iron_area_level,'spiritPoolLevel',c.spirit_pool_level,
  'caveCoreLevel',c.cave_core_level,'caveCultivationLevel',c.cultivation_level,'caveSwordLevel',c.sword_level,'caveBodyLevel',c.body_level,
  'caveCultivationEnabled',c.cultivation_enabled,'caveSwordEnabled',c.sword_enabled,'caveBodyEnabled',c.body_enabled,
  'metalRoot',c.metal_root,'woodRoot',c.wood_root,'waterRoot',c.water_root,'fireRoot',c.fire_root,'earthRoot',c.earth_root
) $$;

create or replace function private.refresh_facility_profile(uid uuid,p_channel text,c private.player_cave_states)
returns void language plpgsql security definer set search_path='' as $$
declare profile jsonb; cultivation_bonus numeric; sword_bonus numeric; base_cultivation numeric; base_sword numeric; old_cultivation_bonus numeric; old_sword_bonus numeric;
begin
  select earning_profile into profile from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  if profile is null then return; end if;
  cultivation_bonus:=case when c.cultivation_enabled and c.spirit_path_opened then .08+c.cultivation_level*.02 else 0 end;
  sword_bonus:=case when c.sword_enabled and c.sword_path_opened and c.has_sword_embryo then .08+c.sword_level*.02 else 0 end;
  old_cultivation_bonus:=coalesce((profile->>'cave_cultivation_bonus')::numeric,cultivation_bonus);
  old_sword_bonus:=coalesce((profile->>'cave_sword_bonus')::numeric,sword_bonus);
  base_cultivation:=coalesce((profile->>'base_cultivation_rate')::numeric,coalesce((profile->>'cultivation_rate')::numeric,0)/(1+old_cultivation_bonus));
  base_sword:=coalesce((profile->>'base_sword_rate')::numeric,coalesce((profile->>'sword_rate')::numeric,0)/(1+old_sword_bonus));
  profile:=profile||jsonb_build_object(
    'base_cultivation_rate',base_cultivation::text,'base_sword_rate',base_sword::text,
    'cave_cultivation_bonus',cultivation_bonus::text,'cave_sword_bonus',sword_bonus::text,
    'cultivation_rate',floor(base_cultivation*(1+cultivation_bonus))::text,
    'sword_rate',floor(base_sword*(1+sword_bonus))::text
  );
  update private.player_resource_wallets set earning_profile=profile,updated_at=now() where user_id=uid and channel=p_channel;
end $$;

create or replace function public.player_cave_security_bootstrap(p_channel text,p_config jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); c private.player_cave_states;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or jsonb_typeof(p_config)<>'object' then raise exception 'invalid request'; end if;
  update private.player_cave_states set
    security_v2_initialized=true,
    cave_core_level=least(7,greatest(1,coalesce((p_config->>'caveCoreLevel')::int,1))),
    cultivation_level=least(7,greatest(1,coalesce((p_config->>'caveCultivationLevel')::int,1))),
    sword_level=least(7,greatest(1,coalesce((p_config->>'caveSwordLevel')::int,1))),
    body_level=least(7,greatest(1,coalesce((p_config->>'caveBodyLevel')::int,1))),
    cultivation_enabled=coalesce((p_config->>'caveCultivationEnabled')::boolean,false),
    sword_enabled=coalesce((p_config->>'caveSwordEnabled')::boolean,false),
    body_enabled=coalesce((p_config->>'caveBodyEnabled')::boolean,false),
    spirit_path_opened=coalesce((p_config->>'spiritPathOpened')::boolean,false),
    sword_path_opened=coalesce((p_config->>'swordPathOpened')::boolean,false),
    body_path_opened=coalesce((p_config->>'bodyPathOpened')::boolean,false),
    has_sword_embryo=coalesce(length(p_config->>'swordEmbryo')>0,false),
    metal_root=least(200,greatest(0,coalesce((p_config->>'metalRoot')::int,0))),
    wood_root=least(200,greatest(0,coalesce((p_config->>'woodRoot')::int,0))),
    water_root=least(200,greatest(0,coalesce((p_config->>'waterRoot')::int,0))),
    fire_root=least(200,greatest(0,coalesce((p_config->>'fireRoot')::int,0))),
    earth_root=least(200,greatest(0,coalesce((p_config->>'earthRoot')::int,0))),
    updated_at=now()
  where user_id=uid and channel=p_channel and security_v2_initialized=false;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel;
  if c.user_id is null then raise exception 'cave state not initialized'; end if;
  perform private.refresh_facility_profile(uid,p_channel,c);
  return private.cave_snapshot(c);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid cave configuration';
end $$;

create or replace function public.player_cave_control(p_channel text,p_expected_wallet_revision bigint,p_expected_cave_revision bigint,p_request_id uuid,p_action text,p_key text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); c private.player_cave_states; w private.player_resource_wallets; lvl int; cost_stone numeric;cost_wood numeric;cost_iron numeric;weight numeric;capacity int;used int;draw int;root_level int;aura_cost numeric;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request'; end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request'; end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel for update;
  if w.revision<>p_expected_wallet_revision or c.revision<>p_expected_cave_revision then raise exception 'resource revision conflict'; end if;
  capacity:=4+(c.cave_core_level-1)*2;
  used:=(case when c.cultivation_enabled then 3+floor((c.cultivation_level-1)/2) else 0 end)+(case when c.sword_enabled then 3+floor((c.sword_level-1)/2) else 0 end)+(case when c.body_enabled then 3+floor((c.body_level-1)/2) else 0 end);
  if p_action='upgrade_core' then
    if c.cave_core_level>=7 then raise exception 'core level limit reached';end if;lvl:=c.cave_core_level;
    cost_stone:=floor(780*power(lvl::numeric,1.7));cost_wood:=floor(420*power(lvl::numeric,1.5));cost_iron:=floor(180*power(lvl::numeric,1.45));
    if w.spirit_stone<cost_stone or w.wood<cost_wood or w.meteor_iron<cost_iron then raise exception 'insufficient materials';end if;
    w.spirit_stone:=w.spirit_stone-cost_stone;w.wood:=w.wood-cost_wood;w.meteor_iron:=w.meteor_iron-cost_iron;c.cave_core_level:=c.cave_core_level+1;
  elsif p_action in ('toggle_facility','upgrade_facility') then
    if p_key='cultivation' then lvl:=c.cultivation_level;draw:=3+floor((lvl-1)/2);
    elsif p_key='sword' then if not c.has_sword_embryo then raise exception 'sword facility locked';end if;lvl:=c.sword_level;draw:=3+floor((lvl-1)/2);
    elsif p_key='body' then if not c.body_path_opened then raise exception 'body facility locked';end if;lvl:=c.body_level;draw:=3+floor((lvl-1)/2);
    else raise exception 'invalid facility';end if;
    if p_action='toggle_facility' then
      if p_key='cultivation' and not c.cultivation_enabled or p_key='sword' and not c.sword_enabled or p_key='body' and not c.body_enabled then if used+draw>capacity then raise exception 'insufficient cave power';end if;end if;
      if p_key='cultivation' then c.cultivation_enabled:=not c.cultivation_enabled;elsif p_key='sword' then c.sword_enabled:=not c.sword_enabled;else c.body_enabled:=not c.body_enabled;end if;
    else
      if lvl>=7 then raise exception 'facility level limit reached';end if;weight:=case p_key when 'cultivation' then 1 when 'sword' then 1.15 else 1.1 end;
      cost_stone:=floor(520*weight*power(lvl::numeric,1.65));cost_wood:=floor(240*weight*power(lvl::numeric,1.5));cost_iron:=floor(100*weight*power(lvl::numeric,1.45));
      if w.spirit_stone<cost_stone or w.wood<cost_wood or w.meteor_iron<cost_iron then raise exception 'insufficient materials';end if;
      if (p_key='cultivation' and c.cultivation_enabled or p_key='sword' and c.sword_enabled or p_key='body' and c.body_enabled) and used-draw+(3+floor(lvl/2))>capacity then raise exception 'insufficient cave power';end if;
      w.spirit_stone:=w.spirit_stone-cost_stone;w.wood:=w.wood-cost_wood;w.meteor_iron:=w.meteor_iron-cost_iron;
      if p_key='cultivation' then c.cultivation_level:=lvl+1;elsif p_key='sword' then c.sword_level:=lvl+1;else c.body_level:=lvl+1;end if;
    end if;
  elsif p_action='upgrade_root' then
    if p_key='metal' then root_level:=c.metal_root;elsif p_key='wood' then root_level:=c.wood_root;elsif p_key='water' then root_level:=c.water_root;elsif p_key='fire' then root_level:=c.fire_root;elsif p_key='earth' then root_level:=c.earth_root;else raise exception 'invalid spirit root';end if;
    if root_level>=200 then raise exception 'spirit root level limit reached';end if;aura_cost:=500+250::numeric*root_level*root_level;
    if w.aura<aura_cost then raise exception 'insufficient aura';end if;w.aura:=w.aura-aura_cost;
    if p_key='metal' then c.metal_root:=root_level+1;elsif p_key='wood' then c.wood_root:=root_level+1;elsif p_key='water' then c.water_root:=root_level+1;elsif p_key='fire' then c.fire_root:=root_level+1;else c.earth_root:=root_level+1;end if;
  else raise exception 'invalid cave control';end if;
  update private.player_resource_wallets set aura=w.aura,spirit_stone=w.spirit_stone,wood=w.wood,meteor_iron=w.meteor_iron,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_cave_states set cave_core_level=c.cave_core_level,cultivation_level=c.cultivation_level,sword_level=c.sword_level,body_level=c.body_level,cultivation_enabled=c.cultivation_enabled,sword_enabled=c.sword_enabled,body_enabled=c.body_enabled,metal_root=c.metal_root,wood_root=c.wood_root,water_root=c.water_root,fire_root=c.fire_root,earth_root=c.earth_root,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into c;
  perform private.refresh_facility_profile(uid,p_channel,c);
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,w.revision,'cave_control',p_request_id,jsonb_build_object('action',p_action,'key',p_key,'cave_revision',c.revision));
  return jsonb_build_object('wallet',private.wallet_snapshot(w),'cave',private.cave_snapshot(c));
end $$;

revoke execute on function public.player_cave_security_bootstrap(text,jsonb),public.player_cave_control(text,bigint,bigint,uuid,text,text) from public,anon;
grant execute on function public.player_cave_security_bootstrap(text,jsonb),public.player_cave_control(text,bigint,bigint,uuid,text,text) to authenticated;
