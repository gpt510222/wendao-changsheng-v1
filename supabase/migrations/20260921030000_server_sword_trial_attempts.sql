create table if not exists private.sword_trial_attempts(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('formal','test')),stage integer not null check(stage between 1 and 90),
  player_power numeric not null check(player_power>=0),enemy_power numeric not null check(enemy_power>0),
  status text not null default 'pending' check(status in ('pending','finished','expired')),won boolean,
  created_at timestamptz not null default now(),finished_at timestamptz
);
alter table private.sword_trial_attempts enable row level security;
revoke all on private.sword_trial_attempts from public,anon,authenticated;

create or replace function private.sword_trial_power(p_stage integer)
returns numeric language plpgsql immutable set search_path='' as $$
declare lvl integer:=greatest(0,least(89,p_stage-1)); i integer; growth integer; root_bone numeric:=5; true_qi numeric:=5; agility numeric:=5; spiritual numeric:=5; physique numeric:=5; power_value numeric; factor numeric;
begin
  if lvl>0 then for i in 1..lvl loop
    growth:=1+floor(floor(i/10.0)/4.0)::integer;
    agility:=agility+1+ceil(growth/2.0)+(case when i%10=0 then 2*growth else 0 end);
    if i%2=0 then true_qi:=true_qi+growth;end if;
    if i%3=0 then spiritual:=spiritual+growth;end if;
    if i%10=0 then spiritual:=spiritual+2*growth;end if;
  end loop;end if;
  power_value:=root_bone*10+true_qi*25+physique*20+agility*15+spiritual*30;
  factor:=(.8+(lvl/89.0)*.15)*power(1.03,lvl)*(case when p_stage%10=0 then 1.1 else 1 end);
  return ceil((power_value*factor)/5)*5;
end $$;

create or replace function public.player_sword_trial_begin(p_channel text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); p private.player_progression_states; profile public.arena_profiles; stage integer; attempt_id uuid; player_power numeric; enemy_power numeric;
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
  if (profile.snapshot->'progression'->>'spirit_level')::integer<>p.spirit_level or (profile.snapshot->'progression'->>'sword_level')::integer<>p.sword_level or (profile.snapshot->'progression'->>'body_level')::integer<>p.body_level then raise exception 'combat snapshot progression is stale';end if;
  player_power:=(profile.snapshot->>'combat_power')::numeric;enemy_power:=private.sword_trial_power(stage);
  update private.sword_trial_attempts set status='expired' where user_id=uid and channel=p_channel and status='pending';
  insert into private.sword_trial_attempts(user_id,channel,stage,player_power,enemy_power) values(uid,p_channel,stage,player_power,enemy_power) returning id into attempt_id;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'sword_trial_started',p_request_id,jsonb_build_object('attempt_id',attempt_id,'stage',stage,'player_power',player_power,'enemy_power',enemy_power));
  return jsonb_build_object('attempt_id',attempt_id,'stage',stage,'enemy_power',enemy_power);
end $$;

create or replace function public.player_sword_trial_finish(p_channel text,p_attempt_id uuid,p_expected_progression_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); a private.sword_trial_attempts; p private.player_progression_states; chance numeric; server_won boolean;
begin
  if uid is null then raise exception 'authentication required';end if;
  if p_channel not in ('formal','test') or p_attempt_id is null or p_request_id is null then raise exception 'invalid request';end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request';end if;
  select * into a from private.sword_trial_attempts where id=p_attempt_id and user_id=uid and channel=p_channel for update;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;
  if a.id is null or a.status<>'pending' or a.created_at<now()-interval '30 minutes' then raise exception 'sword trial attempt expired';end if;
  if a.created_at>now()-interval '3 seconds' then raise exception 'sword trial is not complete';end if;
  if p.revision<>p_expected_progression_revision or a.stage<>p.sword_trial_wins+1 or a.stage>p.sword_level+1 then raise exception 'progression revision conflict';end if;
  chance:=greatest(.1,least(.9,a.player_power/greatest(1,a.player_power+a.enemy_power)));
  server_won:=random()<chance;
  if server_won then update private.player_progression_states set sword_trial_wins=a.stage,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;end if;
  update private.sword_trial_attempts set status='finished',won=server_won,finished_at=now() where id=a.id;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'sword_trial_resolved',p_request_id,jsonb_build_object('attempt_id',a.id,'stage',a.stage,'won',server_won,'chance',chance));
  return jsonb_build_object('won',server_won,'stage',a.stage,'progression',private.progression_snapshot(p));
end $$;

revoke execute on function public.player_sword_trial_begin(text,uuid),public.player_sword_trial_finish(text,uuid,bigint,uuid) from public,anon;
grant execute on function public.player_sword_trial_begin(text,uuid),public.player_sword_trial_finish(text,uuid,bigint,uuid) to authenticated;
