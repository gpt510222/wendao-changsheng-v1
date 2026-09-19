-- Grant settlement time in indivisible five-second ticks.  The database keeps
-- sub-tick remainder and advances the cursor only for time actually granted.
create or replace function public.player_state_claim_elapsed(p_channel text,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=(select auth.uid());
  row_data private.player_states;
  elapsed_ticks int;
  granted_seconds int;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request'; end if;
  select * into row_data from private.player_states where user_id=uid and channel=p_channel for update;
  if row_data.user_id is null then raise exception 'player state not initialized'; end if;
  if row_data.revision<>p_expected_revision then raise exception 'state revision conflict'; end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then
    return jsonb_build_object('revision',row_data.revision,'elapsed_seconds',0,'elapsed_ticks',0,'duplicate',true,'server_time',now());
  end if;
  elapsed_ticks:=least(17280,greatest(0,floor(extract(epoch from now()-row_data.last_settled_at)/5)::int));
  if elapsed_ticks=0 then
    return jsonb_build_object('revision',row_data.revision,'elapsed_seconds',0,'elapsed_ticks',0,'duplicate',false,'server_time',now());
  end if;
  granted_seconds:=elapsed_ticks*5;
  update private.player_states
  set revision=revision+1,last_settled_at=last_settled_at+make_interval(secs=>granted_seconds),updated_at=now()
  where user_id=uid and channel=p_channel returning * into row_data;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,row_data.revision,'settlement_ticks_granted',p_request_id,jsonb_build_object('elapsed_seconds',granted_seconds,'elapsed_ticks',elapsed_ticks));
  return jsonb_build_object('revision',row_data.revision,'elapsed_seconds',granted_seconds,'elapsed_ticks',elapsed_ticks,'duplicate',false,'server_time',now());
end $$;

revoke execute on function public.player_state_claim_elapsed(text,bigint,uuid) from public,anon;
grant execute on function public.player_state_claim_elapsed(text,bigint,uuid) to authenticated;
