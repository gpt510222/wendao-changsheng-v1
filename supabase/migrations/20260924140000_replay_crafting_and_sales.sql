-- Make resource-consuming crafting and sale operations safely replayable.
alter function public.player_inventory_sell(text,text,integer,bigint,uuid) rename to player_inventory_sell_base;
alter function public.player_craft_consumable(text,text,text,text,uuid) rename to player_craft_consumable_base;
alter function public.player_equipment_forge(text,text,integer,text,uuid) rename to player_equipment_forge_base;
alter function public.player_equipment_sell(text,text,uuid) rename to player_equipment_sell_base;

revoke all on function public.player_inventory_sell_base(text,text,integer,bigint,uuid),
 public.player_craft_consumable_base(text,text,text,text,uuid),
 public.player_equipment_forge_base(text,text,integer,text,uuid),
 public.player_equipment_sell_base(text,text,uuid) from public,anon,authenticated;

create or replace function public.player_inventory_sell(p_channel text,p_item_key text,p_quantity integer,p_expected_wallet_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;q integer:=greatest(1,least(9999,coalesce(p_quantity,1)));
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_request_id is null or p_item_key is null or length(p_item_key)>120 then raise exception '請求資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-inventory-sell-replay-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'inventory_item_sold'or e.payload->>'itemKey'<>p_item_key or coalesce((e.payload->>'quantity')::integer,-1)<>q then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊出售結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_inventory_sell_base(p_channel,p_item_key,p_quantity,p_expected_wallet_revision,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyProcessed',false);
end$$;

create or replace function public.player_craft_consumable(p_channel text,p_kind text,p_type text,p_variant text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_request_id is null then raise exception '製作資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-craft-replay-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'consumable_crafted'or e.payload->>'kind'<>p_kind or e.payload->>'type'<>p_type or e.payload->>'variant'<>p_variant then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊製作結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_craft_consumable_base(p_channel,p_kind,p_type,p_variant,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyProcessed',false);
end$$;

create or replace function public.player_equipment_forge(p_channel text,p_slot text,p_tier integer,p_quality text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_request_id is null then raise exception '鍛造資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-equipment-forge-replay-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'equipment_forged'or e.payload->>'slot'<>p_slot or coalesce((e.payload->>'tier')::integer,-1)<>p_tier or e.payload->>'quality'<>p_quality then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊鍛造結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_equipment_forge_base(p_channel,p_slot,p_tier,p_quality,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyProcessed',false);
end$$;

create or replace function public.player_equipment_sell(p_channel text,p_item_id text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_request_id is null or p_item_id is null then raise exception '出售資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-equipment-sell-replay-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'equipment_sold'or e.payload->>'itemId'<>p_item_id then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊出售結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_equipment_sell_base(p_channel,p_item_id,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyProcessed',false);
end$$;

revoke all on function public.player_inventory_sell(text,text,integer,bigint,uuid),
 public.player_craft_consumable(text,text,text,text,uuid),
 public.player_equipment_forge(text,text,integer,text,uuid),
 public.player_equipment_sell(text,text,uuid) from public,anon;
grant execute on function public.player_inventory_sell(text,text,integer,bigint,uuid),
 public.player_craft_consumable(text,text,text,text,uuid),
 public.player_equipment_forge(text,text,integer,text,uuid),
 public.player_equipment_sell(text,text,uuid) to authenticated;
