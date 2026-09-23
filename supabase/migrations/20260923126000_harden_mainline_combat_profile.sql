create or replace function public.player_mainline_begin(p_channel text,p_stage integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());s private.player_mainline_states;p private.player_progression_states;profile public.arena_profiles;attempt uuid;power numeric;enemy_powers numeric[]:=array[1500,2000,3800,5200,10000,14500,28000,40000,78000,110000,210000,300000,560000,780000,1400000,2000000,3800000,5500000];
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_stage not between 1 and 18 or p_request_id is null then raise exception '挑戰資料不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複的挑戰請求';end if;perform pg_advisory_xact_lock(hashtext(uid::text||'-mainline-'||p_channel));
 select * into s from private.player_mainline_states where user_id=uid and channel=p_channel;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;select * into profile from public.arena_profiles where user_id=uid and channel=p_channel;
 if s.user_id is null or p.user_id is null or p_stage>s.cleared_stage+1 then raise exception '此主線關卡尚未解鎖';end if;if greatest(p.spirit_level,p.sword_level,p.body_level)/10+1<ceil(p_stage/2.0)then raise exception '目前境界不足';end if;
 if profile.user_id is null or profile.snapshot->>'schema_version'<>'3'then raise exception '戰鬥快照尚未建立';end if;
 perform private.arena_validate_snapshot(profile.snapshot);perform private.arena_validate_server_progression(uid,p_channel,profile.snapshot);
 power:=(profile.snapshot->>'combat_power')::numeric;update private.mainline_attempts set status='expired'where user_id=uid and channel=p_channel and status='pending';insert into private.mainline_attempts(user_id,channel,stage,player_power,enemy_power)values(uid,p_channel,p_stage,power,enemy_powers[p_stage])returning id into attempt;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,s.revision,'mainline_started',p_request_id,jsonb_build_object('attemptId',attempt,'stage',p_stage,'validatedPower',power));return jsonb_build_object('attemptId',attempt,'stage',p_stage,'enemyPower',enemy_powers[p_stage],'mainline',private.mainline_snapshot(s));
end$$;

revoke execute on function public.player_mainline_begin(text,integer,uuid)from public,anon;
grant execute on function public.player_mainline_begin(text,integer,uuid)to authenticated;
