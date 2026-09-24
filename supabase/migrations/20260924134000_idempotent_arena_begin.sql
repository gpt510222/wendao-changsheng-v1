-- Consuming an arena attempt and creating its match must be replay-safe when the
-- HTTP response is lost.  Store the complete first response under the request UUID.
drop function if exists public.arena_begin_challenge(text,uuid);

create or replace function public.arena_begin_challenge(
  p_channel text,
  p_defender uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  prior private.player_state_events;
  result jsonb;
begin
  if uid is null then raise exception '需要重新登入'; end if;
  if p_channel not in ('formal','test') or p_defender is null or p_request_id is null then
    raise exception '問道臺開戰資料不正確';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text||'-arena-begin-'||p_channel));
  select * into prior from private.player_state_events
  where user_id=uid and channel=p_channel and request_id=p_request_id;
  if prior.id is not null then
    if prior.event_type <> 'arena_match_started' then raise exception '請求識別碼已被使用'; end if;
    return prior.payload || jsonb_build_object('alreadyStarted',true);
  end if;

  result := public.arena_begin_challenge_channel_unchecked(p_channel,p_defender);
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,0,'arena_match_started',p_request_id,result);
  return result || jsonb_build_object('alreadyStarted',false);
end $$;

revoke all on function public.arena_begin_challenge(text,uuid,uuid) from public,anon;
grant execute on function public.arena_begin_challenge(text,uuid,uuid) to authenticated;
