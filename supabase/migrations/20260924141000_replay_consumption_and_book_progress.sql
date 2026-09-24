-- Preserve results for irreversible item consumption and book progression.
alter function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid) rename to player_inventory_consume_bundle_base;
alter function public.player_permanent_consumable_use(text,text,integer,uuid) rename to player_permanent_consumable_use_base;
alter function public.player_book_art_learn(text,text,uuid) rename to player_book_art_learn_base;
alter function public.player_book_art_upgrade(text,text,uuid) rename to player_book_art_upgrade_base;
revoke all on function public.player_inventory_consume_bundle_base(text,text,integer,bigint,uuid),
 public.player_permanent_consumable_use_base(text,text,integer,uuid),
 public.player_book_art_learn_base(text,text,uuid),
 public.player_book_art_upgrade_base(text,text,uuid) from public,anon,authenticated;

create or replace function public.player_inventory_consume_bundle(p_channel text,p_item_key text,p_quantity integer,p_expected_wallet_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;q integer:=greatest(1,least(9999,coalesce(p_quantity,1)));
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '請求資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-bundle-replay-'||p_channel));select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'inventory_bundle_consumed'or e.payload->>'itemKey'<>p_item_key or coalesce((e.payload->>'quantity')::integer,-1)<>q then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊使用結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_inventory_consume_bundle_base(p_channel,p_item_key,p_quantity,p_expected_wallet_revision,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;return r||jsonb_build_object('alreadyProcessed',false);
end$$;

create or replace function public.player_permanent_consumable_use(p_channel text,p_item_key text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;q integer;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '請求資料不正確';end if;
 q:=case when p_item_key='xisuiFamaoPillCount'then greatest(1,least(999,coalesce(p_quantity,1)))else 1 end;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-permanent-consumable-replay-'||p_channel));select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'permanent_consumable_used'or e.payload->>'itemKey'<>p_item_key or coalesce((e.payload->>'quantity')::integer,-1)<>q then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊使用結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_permanent_consumable_use_base(p_channel,p_item_key,p_quantity,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;return r||jsonb_build_object('alreadyProcessed',false);
end$$;

create or replace function public.player_book_art_learn(p_channel text,p_item_key text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '功法資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-book-learn-replay-'||p_channel));select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'book_art_learned'or e.payload->>'itemKey'<>p_item_key then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊習得結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_book_art_learn_base(p_channel,p_item_key,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;return r||jsonb_build_object('alreadyProcessed',false);
end$$;

create or replace function public.player_book_art_upgrade(p_channel text,p_art_id text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '功法資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-book-upgrade-replay-'||p_channel));select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'book_art_upgraded'or e.payload->>'artId'<>p_art_id then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊升級結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyProcessed',true);
 end if;
 r:=public.player_book_art_upgrade_base(p_channel,p_art_id,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;return r||jsonb_build_object('alreadyProcessed',false);
end$$;

revoke all on function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid),
 public.player_permanent_consumable_use(text,text,integer,uuid),
 public.player_book_art_learn(text,text,uuid),
 public.player_book_art_upgrade(text,text,uuid) from public,anon;
grant execute on function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid),
 public.player_permanent_consumable_use(text,text,integer,uuid),
 public.player_book_art_learn(text,text,uuid),
 public.player_book_art_upgrade(text,text,uuid) to authenticated;
