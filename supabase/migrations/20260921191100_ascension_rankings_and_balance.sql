drop function if exists public.player_ascension_rankings(text);
create or replace function public.player_ascension_rankings(p_channel text)
returns table(rank bigint,player_name text,route text,ascended_at timestamptz,title_id text,spirit_level integer,sword_level integer,body_level integer)
language sql stable security definer set search_path='' as $$
 select s.ascension_rank,coalesce(r.player_name,a.player_name,'無名修士'),s.route,s.ascended_at,s.title_id,p.spirit_level,p.sword_level,p.body_level
 from private.player_ascension_states s
 join private.player_progression_states p on p.user_id=s.user_id and p.channel=s.channel
 left join public.player_rankings r on r.user_id=s.user_id
 left join public.arena_profiles a on a.user_id=s.user_id and a.channel=s.channel
 where s.channel=p_channel and s.ascended order by s.ascension_rank limit 50
$$;

create or replace function public.player_ascension_battle_begin(p_channel text,p_stage text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_ascension_states;profile public.arena_profiles;attempt uuid;power numeric;enemy numeric;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_stage not in('delusion','roadEnd')or p_request_id is null then raise exception '飛升戰鬥請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複的飛升戰鬥請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-ascension-'||p_channel));
 select * into s from private.player_ascension_states where user_id=uid and channel=p_channel for update;
 if s.user_id is null or s.ascended then raise exception '飛升戰鬥狀態不正確';end if;
 if(p_stage='delusion'and(not s.heart_allocated or s.delusion_cleared))or(p_stage='roadEnd'and(not s.delusion_allocated or s.road_cleared))then raise exception '飛升關卡尚未解鎖';end if;
 select * into profile from public.arena_profiles where user_id=uid and channel=p_channel;
 if profile.user_id is null then raise exception '請先同步戰鬥屬性';end if;
 perform private.arena_validate_snapshot(profile.snapshot);perform private.arena_validate_server_progression(uid,p_channel,profile.snapshot);
 power:=(profile.snapshot->>'combat_power')::numeric;
 enemy:=greatest(1,round(power*case when p_stage='delusion'then .80 else 1.05 end));
 update private.ascension_attempts set status='expired'where user_id=uid and channel=p_channel and status='pending';
 insert into private.ascension_attempts(user_id,channel,stage,player_power,enemy_power)values(uid,p_channel,p_stage,power,enemy)returning id into attempt;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,s.revision,'ascension_battle_started',p_request_id,jsonb_build_object('attemptId',attempt,'stage',p_stage));
 return jsonb_build_object('attemptId',attempt,'enemyPower',enemy,'ascension',private.ascension_snapshot(s));
end$$;
revoke execute on function public.player_ascension_rankings(text),public.player_ascension_battle_begin(text,text,uuid) from public,anon;
grant execute on function public.player_ascension_rankings(text),public.player_ascension_battle_begin(text,text,uuid) to authenticated;
