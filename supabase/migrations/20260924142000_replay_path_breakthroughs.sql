-- Preserve irreversible path breakthrough verdicts and resource deductions.
alter function public.player_spirit_tribulation(text,bigint,bigint,uuid,integer,integer,integer) rename to player_spirit_tribulation_base;
alter function public.player_sword_breakthrough(text,bigint,bigint,uuid) rename to player_sword_breakthrough_base;
alter function public.player_body_breakthrough(text,bigint,bigint,uuid) rename to player_body_breakthrough_base;
revoke all on function public.player_spirit_tribulation_base(text,bigint,bigint,uuid,integer,integer,integer),
 public.player_sword_breakthrough_base(text,bigint,bigint,uuid),
 public.player_body_breakthrough_base(text,bigint,bigint,uuid) from public,anon,authenticated;

create or replace function public.player_spirit_tribulation(p_channel text,p_expected_wallet_revision bigint,p_expected_progression_revision bigint,p_request_id uuid,p_foundation_bonus integer default 0,p_guard_level integer default 0,p_used_pills integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null or p_used_pills is null or p_used_pills not between 0 and 20 then raise exception '渡劫資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-spirit-tribulation-replay-'||p_channel));select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'spirit_tribulation_resolved'or coalesce((e.payload->>'used_pills')::integer,-1)<>p_used_pills then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊渡劫結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_spirit_tribulation_base(p_channel,p_expected_wallet_revision,p_expected_progression_revision,p_request_id,p_foundation_bonus,p_guard_level,p_used_pills);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;return r||jsonb_build_object('alreadyResolved',false);
end$$;

create or replace function public.player_sword_breakthrough(p_channel text,p_expected_wallet_revision bigint,p_expected_progression_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '劍道突破資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sword-breakthrough-replay-'||p_channel));select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'sword_breakthrough_completed'then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊突破結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_sword_breakthrough_base(p_channel,p_expected_wallet_revision,p_expected_progression_revision,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;return r||jsonb_build_object('alreadyResolved',false);
end$$;

create or replace function public.player_body_breakthrough(p_channel text,p_expected_progression_revision bigint,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '煉體突破資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-body-breakthrough-replay-'||p_channel));select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'body_breakthrough_completed'then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊突破結果無法重播，請重新同步';end if;return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_body_breakthrough_base(p_channel,p_expected_progression_revision,p_expected_body_revision,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;return r||jsonb_build_object('alreadyResolved',false);
end$$;

revoke all on function public.player_spirit_tribulation(text,bigint,bigint,uuid,integer,integer,integer),
 public.player_sword_breakthrough(text,bigint,bigint,uuid),
 public.player_body_breakthrough(text,bigint,bigint,uuid) from public,anon;
grant execute on function public.player_spirit_tribulation(text,bigint,bigint,uuid,integer,integer,integer),
 public.player_sword_breakthrough(text,bigint,bigint,uuid),
 public.player_body_breakthrough(text,bigint,bigint,uuid) to authenticated;
