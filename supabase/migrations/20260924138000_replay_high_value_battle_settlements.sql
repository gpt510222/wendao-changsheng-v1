-- Preserve authoritative battle verdicts so an authentication refresh or a
-- lost HTTP response can safely repeat the same settlement request.
alter function public.player_mainline_finish(text,uuid,uuid) rename to player_mainline_finish_base;
alter function public.player_sect_spar_finish(text,uuid,uuid) rename to player_sect_spar_finish_base;
alter function public.player_sect_master_finish(text,uuid,uuid) rename to player_sect_master_finish_base;
alter function public.player_ascension_battle_finish(text,uuid,uuid) rename to player_ascension_battle_finish_base;
alter function public.player_immortal_battle_finish(text,uuid,uuid) rename to player_immortal_battle_finish_base;

revoke all on function public.player_mainline_finish_base(text,uuid,uuid),
 public.player_sect_spar_finish_base(text,uuid,uuid),
 public.player_sect_master_finish_base(text,uuid,uuid),
 public.player_ascension_battle_finish_base(text,uuid,uuid),
 public.player_immortal_battle_finish_base(text,uuid,uuid) from public,anon,authenticated;

create or replace function public.player_mainline_finish(p_channel text,p_attempt_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_attempt_id is null or p_request_id is null then raise exception '結算資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-mainline-finish-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'mainline_resolved'or coalesce(e.payload->>'attemptId','')<>p_attempt_id::text then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊結算結果無法重播，請重新同步';end if;
  return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_mainline_finish_base(p_channel,p_attempt_id,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyResolved',false);
end$$;

create or replace function public.player_sect_spar_finish(p_channel text,p_attempt_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_attempt_id is null or p_request_id is null then raise exception '切磋結算不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sect-spar-finish-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'sect_spar_resolved'or coalesce(e.payload->>'attempt_id','')<>p_attempt_id::text then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊結算結果無法重播，請重新同步';end if;
  return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_sect_spar_finish_base(p_channel,p_attempt_id,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyResolved',false);
end$$;

create or replace function public.player_sect_master_finish(p_channel text,p_attempt_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_attempt_id is null or p_request_id is null then raise exception '掌門挑戰結算不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sect-master-finish-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'sect_master_resolved'or coalesce(e.payload->>'attempt_id','')<>p_attempt_id::text then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊結算結果無法重播，請重新同步';end if;
  return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_sect_master_finish_base(p_channel,p_attempt_id,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyResolved',false);
end$$;

create or replace function public.player_ascension_battle_finish(p_channel text,p_attempt_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_attempt_id is null or p_request_id is null then raise exception '飛升結算請求不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-ascension-finish-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'ascension_battle_resolved'or coalesce(e.payload->>'attemptId','')<>p_attempt_id::text then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊結算結果無法重播，請重新同步';end if;
  return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_ascension_battle_finish_base(p_channel,p_attempt_id,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyResolved',false);
end$$;

create or replace function public.player_immortal_battle_finish(p_channel text,p_attempt_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_attempt_id is null or p_request_id is null then raise exception '仙界戰鬥結算請求不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-immortal-finish-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'immortal_battle_resolved'or coalesce(e.payload->>'attemptId','')<>p_attempt_id::text then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊結算結果無法重播，請重新同步';end if;
  return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_immortal_battle_finish_base(p_channel,p_attempt_id,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyResolved',false);
end$$;

revoke all on function public.player_mainline_finish(text,uuid,uuid),
 public.player_sect_spar_finish(text,uuid,uuid),
 public.player_sect_master_finish(text,uuid,uuid),
 public.player_ascension_battle_finish(text,uuid,uuid),
 public.player_immortal_battle_finish(text,uuid,uuid) from public,anon;
grant execute on function public.player_mainline_finish(text,uuid,uuid),
 public.player_sect_spar_finish(text,uuid,uuid),
 public.player_sect_master_finish(text,uuid,uuid),
 public.player_ascension_battle_finish(text,uuid,uuid),
 public.player_immortal_battle_finish(text,uuid,uuid) to authenticated;
