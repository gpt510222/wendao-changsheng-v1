alter table private.player_sect_states add column if not exists last_greeting_day date;
create table if not exists private.sect_master_attempts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),sect_name text not null,
 player_power numeric not null check(player_power>=0),enemy_power numeric not null check(enemy_power>0),
 status text not null default 'pending' check(status in('pending','finished','expired')),won boolean,
 created_at timestamptz not null default now(),finished_at timestamptz
);
alter table private.sect_master_attempts enable row level security;
revoke all on private.sect_master_attempts from public,anon,authenticated;

create or replace function private.sect_snapshot(s private.player_sect_states) returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('revision',s.revision,'sectName',s.sect_name,'sectStar',s.sect_star,'sectFaction',s.sect_faction,'sectRank',s.sect_rank,'actingLeader',s.acting_leader,'lastSalaryDay',s.last_salary_day,'lastPracticeDay',s.last_practice_day,'lastGreetingDay',coalesce(s.last_greeting_day::text,''),'practiceUntil',s.practice_until)$$;

create or replace function public.player_sect_greet(p_channel text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;today date:=private.sect_spar_day();
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_request_id is null then raise exception '請安請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的請安請求';end if;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if s.user_id is null or s.sect_name='' then raise exception '尚未加入門派';end if;if s.last_greeting_day=today then raise exception '今日已向掌門請安';end if;
 update private.player_sect_states set last_greeting_day=today,sect_contribution=sect_contribution+100,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_greet',p_request_id,'{}'::jsonb);
 return private.sect_progress_snapshot(s);
end $$;

create or replace function public.player_sect_master_begin(p_channel text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;profile public.arena_profiles;attempt_id uuid;enemy_power numeric;player_power numeric;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_request_id is null then raise exception '掌門挑戰請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的掌門挑戰';end if;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;select * into profile from public.arena_profiles where user_id=uid and channel=p_channel;
 if s.user_id is null or s.sect_name='' or s.sect_rank<2 or s.acting_leader or s.prestige<200 then raise exception '不符合掌門挑戰條件';end if;
 if profile.user_id is null then raise exception '戰鬥快照尚未建立';end if;perform private.arena_validate_snapshot(profile.snapshot);perform private.arena_validate_server_progression(uid,p_channel,profile.snapshot);
 player_power:=(profile.snapshot->>'combat_power')::numeric;enemy_power:=private.sect_spar_enemy_power(s.sect_star,0);
 update private.player_sect_states set prestige=prestige-200,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 update private.sect_master_attempts set status='expired' where user_id=uid and channel=p_channel and status='pending';
 insert into private.sect_master_attempts(user_id,channel,sect_name,player_power,enemy_power) values(uid,p_channel,s.sect_name,player_power,enemy_power) returning id into attempt_id;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_master_started',p_request_id,jsonb_build_object('attempt_id',attempt_id));
 return jsonb_build_object('attemptId',attempt_id,'enemyPower',enemy_power,'sect',private.sect_progress_snapshot(s));
end $$;

create or replace function public.player_sect_master_finish(p_channel text,p_attempt_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());a private.sect_master_attempts;s private.player_sect_states;chance numeric;server_won boolean;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_attempt_id is null or p_request_id is null then raise exception '掌門挑戰結算不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的掌門結算';end if;
 select * into a from private.sect_master_attempts where id=p_attempt_id and user_id=uid and channel=p_channel for update;select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if a.id is null or a.status<>'pending' or a.created_at<now()-interval '30 minutes' or a.sect_name<>s.sect_name then raise exception '掌門挑戰已失效';end if;if a.created_at>now()-interval '3 seconds' then raise exception '掌門挑戰尚未完成';end if;
 chance:=greatest(.1,least(.9,a.player_power/greatest(1,a.player_power+a.enemy_power)));server_won:=random()<chance;
 if server_won then update private.player_sect_states set acting_leader=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;end if;
 update private.sect_master_attempts set status='finished',won=server_won,finished_at=now() where id=a.id;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_master_resolved',p_request_id,jsonb_build_object('attempt_id',a.id,'won',server_won,'chance',chance));
 return jsonb_build_object('won',server_won,'sect',private.sect_progress_snapshot(s));
end $$;

revoke execute on function public.player_sect_greet(text,uuid),public.player_sect_master_begin(text,uuid),public.player_sect_master_finish(text,uuid,uuid) from public,anon;
grant execute on function public.player_sect_greet(text,uuid),public.player_sect_master_begin(text,uuid),public.player_sect_master_finish(text,uuid,uuid) to authenticated;
