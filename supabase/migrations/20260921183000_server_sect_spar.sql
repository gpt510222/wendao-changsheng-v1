create table if not exists private.sect_spar_attempts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),sect_name text not null,role integer not null check(role between 1 and 4),
 player_power numeric not null check(player_power>=0),enemy_power numeric not null check(enemy_power>0),
 status text not null default 'pending' check(status in('pending','finished','expired')),won boolean,
 created_at timestamptz not null default now(),finished_at timestamptz
);
create table if not exists private.sect_spar_daily(
 user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in('formal','test')),
 day date not null,role integer not null check(role between 1 and 4),won_at timestamptz not null default now(),
 primary key(user_id,channel,day,role)
);
alter table private.sect_spar_attempts enable row level security;
alter table private.sect_spar_daily enable row level security;
revoke all on private.sect_spar_attempts,private.sect_spar_daily from public,anon,authenticated;

create or replace function private.sect_spar_day() returns date language sql stable set search_path='' as $$select (now() at time zone 'Asia/Taipei')::date$$;
create or replace function private.sect_spar_enemy_power(p_star integer,p_role integer) returns numeric language sql immutable set search_path='' as $$
select round(((array[1200,3000,7500,18000,45000,110000,270000,650000,1500000])[greatest(1,least(9,p_star))]*(array[2.4,1.9,1.65,1.25,.9])[greatest(1,least(5,p_role+1))])/5)*5
$$;
create or replace function private.sect_spar_status_json(p_user uuid,p_channel text) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('day',private.sect_spar_day()::text,'wonRoles',coalesce(jsonb_agg(role order by role) filter(where role is not null),'[]'::jsonb))
from private.sect_spar_daily where user_id=p_user and channel=p_channel and day=private.sect_spar_day()
$$;

create or replace function public.player_sect_spar_status(p_channel text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());begin if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;return private.sect_spar_status_json(uid,p_channel);end $$;

create or replace function public.player_sect_spar_begin(p_channel text,p_role integer,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;profile public.arena_profiles;attempt_id uuid;enemy_power numeric;player_power numeric;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_role not between 1 and 4 or p_request_id is null then raise exception '切磋請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的切磋請求';end if;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel;
 select * into profile from public.arena_profiles where user_id=uid and channel=p_channel;
 if s.user_id is null or s.sect_name='' then raise exception '尚未加入門派';end if;
 if exists(select 1 from private.sect_spar_daily where user_id=uid and channel=p_channel and day=private.sect_spar_day() and role=p_role) then raise exception '今日已切磋勝利';end if;
 if profile.user_id is null then raise exception '戰鬥快照尚未建立';end if;
 perform private.arena_validate_snapshot(profile.snapshot);perform private.arena_validate_server_progression(uid,p_channel,profile.snapshot);
 player_power:=(profile.snapshot->>'combat_power')::numeric;enemy_power:=private.sect_spar_enemy_power(s.sect_star,p_role);
 update private.sect_spar_attempts set status='expired' where user_id=uid and channel=p_channel and status='pending';
 insert into private.sect_spar_attempts(user_id,channel,sect_name,role,player_power,enemy_power) values(uid,p_channel,s.sect_name,p_role,player_power,enemy_power) returning id into attempt_id;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_spar_started',p_request_id,jsonb_build_object('attempt_id',attempt_id,'role',p_role));
 return jsonb_build_object('attemptId',attempt_id,'enemyPower',enemy_power,'role',p_role);
end $$;

create or replace function public.player_sect_spar_finish(p_channel text,p_attempt_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());a private.sect_spar_attempts;s private.player_sect_states;profile private.player_art_profiles;chance numeric;server_won boolean;intent_gain integer:=0;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_attempt_id is null or p_request_id is null then raise exception '切磋結算不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的切磋結算';end if;
 select * into a from private.sect_spar_attempts where id=p_attempt_id and user_id=uid and channel=p_channel for update;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 select * into profile from private.player_art_profiles where user_id=uid and channel=p_channel for update;
 if a.id is null or a.status<>'pending' or a.created_at<now()-interval '30 minutes' or a.sect_name<>s.sect_name then raise exception '切磋已失效';end if;
 if a.created_at>now()-interval '3 seconds' then raise exception '切磋尚未完成';end if;
 chance:=greatest(.1,least(.9,a.player_power/greatest(1,a.player_power+a.enemy_power)));server_won:=random()<chance;
 if server_won then
  insert into private.sect_spar_daily(user_id,channel,day,role) values(uid,p_channel,private.sect_spar_day(),a.role) on conflict do nothing;
  if not found then server_won:=false;else
   intent_gain:=case a.role when 1 then 6 when 2 then 4 when 3 then 2 else 1 end;
   update private.player_sect_states set prestige=prestige+5,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
   if profile.sword_embryo<>'' then update private.player_art_profiles set sword_intent=sword_intent+intent_gain,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into profile;else intent_gain:=0;end if;
  end if;
 end if;
 update private.sect_spar_attempts set status='finished',won=server_won,finished_at=now() where id=a.id;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_spar_resolved',p_request_id,jsonb_build_object('attempt_id',a.id,'role',a.role,'won',server_won,'chance',chance));
 return jsonb_build_object('won',server_won,'prestigeGain',case when server_won then 5 else 0 end,'intentGain',intent_gain,'sect',private.sect_progress_snapshot(s),'sword',private.combat_loadout_snapshot(profile),'status',private.sect_spar_status_json(uid,p_channel));
end $$;

revoke all on function private.sect_spar_day(),private.sect_spar_enemy_power(integer,integer),private.sect_spar_status_json(uuid,text) from public,anon,authenticated;
revoke execute on function public.player_sect_spar_status(text),public.player_sect_spar_begin(text,integer,uuid),public.player_sect_spar_finish(text,uuid,uuid) from public,anon;
grant execute on function public.player_sect_spar_status(text),public.player_sect_spar_begin(text,integer,uuid),public.player_sect_spar_finish(text,uuid,uuid) to authenticated;
