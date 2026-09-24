-- Make sword and body trial verdicts recoverable without rerolling or paying twice.
alter function public.player_sword_trial_finish(text,uuid,bigint,uuid) rename to player_sword_trial_finish_base;
alter function public.player_body_trial_finish(text,uuid,bigint,bigint,uuid) rename to player_body_trial_finish_base;
revoke all on function public.player_sword_trial_finish_base(text,uuid,bigint,uuid),
 public.player_body_trial_finish_base(text,uuid,bigint,bigint,uuid) from public,anon,authenticated;

create or replace function public.player_sword_trial_finish(p_channel text,p_attempt_id uuid,p_expected_progression_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_attempt_id is null or p_request_id is null then raise exception '試劍結算資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sword-trial-finish-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'sword_trial_resolved'or coalesce(e.payload->>'attempt_id','')<>p_attempt_id::text then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊結算結果無法重播，請重新同步';end if;
  return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_sword_trial_finish_base(p_channel,p_attempt_id,p_expected_progression_revision,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyResolved',false);
end$$;

create or replace function public.player_body_trial_finish(p_channel text,p_attempt_id uuid,p_expected_progression_revision bigint,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_state_events;r jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_attempt_id is null or p_request_id is null then raise exception '煉體試煉結算資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-body-trial-finish-'||p_channel));
 select * into e from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if e.user_id is not null then
  if e.event_type<>'body_trial_resolved'or coalesce(e.payload->>'attempt_id','')<>p_attempt_id::text then raise exception '請求識別碼已用於其他操作';end if;
  r:=e.payload->'response';if r is null then raise exception '舊結算結果無法重播，請重新同步';end if;
  return r||jsonb_build_object('alreadyResolved',true);
 end if;
 r:=public.player_body_trial_finish_base(p_channel,p_attempt_id,p_expected_progression_revision,p_expected_body_revision,p_request_id);
 update private.player_state_events set payload=payload||jsonb_build_object('response',r)where user_id=uid and channel=p_channel and request_id=p_request_id;
 return r||jsonb_build_object('alreadyResolved',false);
end$$;

revoke all on function public.player_sword_trial_finish(text,uuid,bigint,uuid),
 public.player_body_trial_finish(text,uuid,bigint,bigint,uuid) from public,anon;
grant execute on function public.player_sword_trial_finish(text,uuid,bigint,uuid),
 public.player_body_trial_finish(text,uuid,bigint,bigint,uuid) to authenticated;
