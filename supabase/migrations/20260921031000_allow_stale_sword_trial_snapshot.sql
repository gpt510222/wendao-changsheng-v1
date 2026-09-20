create or replace function public.player_sword_trial_begin(p_channel text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); p private.player_progression_states; profile public.arena_profiles; stage integer; attempt_id uuid; player_power numeric; enemy_power numeric; snap_spirit integer; snap_sword integer; snap_body integer;
begin
  if uid is null then raise exception 'authentication required';end if;
  if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request';end if;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
  select * into profile from public.arena_profiles where user_id=uid and channel=p_channel;
  if p.user_id is null or not p.sword_path_opened then raise exception 'sword path is not initialized';end if;
  stage:=p.sword_trial_wins+1;
  if stage>90 or stage>p.sword_level+1 then raise exception 'sword trial stage is locked';end if;
  if profile.user_id is null or profile.snapshot->>'schema_version'<>'3' then raise exception 'combat snapshot is unavailable';end if;
  perform private.arena_validate_snapshot(profile.snapshot);
  snap_spirit:=(profile.snapshot->'progression'->>'spirit_level')::integer;snap_sword:=(profile.snapshot->'progression'->>'sword_level')::integer;snap_body:=(profile.snapshot->'progression'->>'body_level')::integer;
  if snap_spirit>p.spirit_level or snap_sword>p.sword_level or snap_body>p.body_level then raise exception 'combat snapshot exceeds server progression';end if;
  player_power:=(profile.snapshot->>'combat_power')::numeric;enemy_power:=private.sword_trial_power(stage);
  update private.sword_trial_attempts set status='expired' where user_id=uid and channel=p_channel and status='pending';
  insert into private.sword_trial_attempts(user_id,channel,stage,player_power,enemy_power) values(uid,p_channel,stage,player_power,enemy_power) returning id into attempt_id;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'sword_trial_started',p_request_id,jsonb_build_object('attempt_id',attempt_id,'stage',stage,'player_power',player_power,'enemy_power',enemy_power));
  return jsonb_build_object('attempt_id',attempt_id,'stage',stage,'enemy_power',enemy_power);
end $$;
