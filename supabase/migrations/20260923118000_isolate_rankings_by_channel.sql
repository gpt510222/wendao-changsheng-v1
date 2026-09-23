create table if not exists public.player_rankings_v2 (
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 player_name text not null,combat_power numeric not null default 0,
 spirit_level integer not null default 0,sword_level integer not null default 0,body_level integer not null default 0,
 game_version text not null,updated_at timestamptz not null default now(),primary key(user_id,channel));
alter table public.player_rankings_v2 enable row level security;
revoke all on public.player_rankings_v2 from public,anon,authenticated;
grant select on public.player_rankings_v2 to anon,authenticated;
drop policy if exists player_rankings_v2_public_read on public.player_rankings_v2;
create policy player_rankings_v2_public_read on public.player_rankings_v2 for select to anon,authenticated using(true);
insert into public.player_rankings_v2(user_id,channel,player_name,combat_power,spirit_level,sword_level,body_level,game_version,updated_at)
select user_id,case when game_version like '20260902-49%'then'test'else'formal'end,player_name,combat_power,spirit_level,sword_level,body_level,game_version,updated_at from public.player_rankings
on conflict(user_id,channel)do update set player_name=excluded.player_name,combat_power=excluded.combat_power,spirit_level=excluded.spirit_level,sword_level=excluded.sword_level,body_level=excluded.body_level,game_version=excluded.game_version,updated_at=excluded.updated_at;

create or replace function public.player_ranking_sync(p_channel text,p_name text,p_game_version text,p_snapshot jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());profile_result jsonb;p private.player_progression_states;ascn private.player_ascension_states;im private.player_immortal_states;power_value numeric;safe_name text;version_value text;ranking public.player_rankings_v2;exploration integer;wasteland_progress integer;
begin if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or length(coalesce(p_game_version,''))not between 1 and 200 then raise exception '排行榜資料不正確';end if;profile_result:=public.arena_sync_profile(p_channel,p_name,p_snapshot);select * into p from private.player_progression_states where user_id=uid and channel=p_channel;select * into ascn from private.player_ascension_states where user_id=uid and channel=p_channel;select * into im from private.player_immortal_states where user_id=uid and channel=p_channel;power_value:=(profile_result->'snapshot'->>'combat_power')::numeric;safe_name:=left(coalesce(nullif(trim(p_name),''),'無名修士'),20);version_value:=left(split_part(p_game_version,'|',1),40);if p_channel='formal'and version_value!~'^v[0-9]+\.[0-9]+\.[0-9]+$'then raise exception '正式版版本不正確';end if;if p_channel='test'and version_value!~'^[0-9]{8}-[0-9]+$'then raise exception '測試版版本不正確';end if;if ascn.ascended then version_value:=version_value||'|A:'||floor(extract(epoch from ascn.ascended_at)*1000)::bigint||':'||ascn.route;if im.user_id is not null then exploration:=least(100,jsonb_array_length(im.investigated)*15+im.guide_stone_stage*10+case when im.outer_route_cleared then 25 else 0 end);wasteland_progress:=coalesce((im.wasteland_route_progress->>'dryWind')::integer,0)+coalesce((im.wasteland_route_progress->>'sunken')::integer,0)+coalesce((im.wasteland_route_progress->>'kneeling')::integer,0);version_value:=version_value||'|I:'||im.guide_stone_stage||':'||exploration||':'||im.expedition_runs||':'||im.wasteland_outpost_stage||':'||wasteland_progress||':'||im.wasteland_body_stage;end if;end if;insert into public.player_rankings_v2(user_id,channel,player_name,combat_power,spirit_level,sword_level,body_level,game_version,updated_at)values(uid,p_channel,safe_name,power_value,p.spirit_level,p.sword_level,p.body_level,version_value,now())on conflict(user_id,channel)do update set player_name=excluded.player_name,combat_power=excluded.combat_power,spirit_level=excluded.spirit_level,sword_level=excluded.sword_level,body_level=excluded.body_level,game_version=excluded.game_version,updated_at=now()returning * into ranking;return jsonb_build_object('combatPower',ranking.combat_power,'playerName',ranking.player_name,'gameVersion',ranking.game_version,'spiritLevel',ranking.spirit_level,'swordLevel',ranking.sword_level,'bodyLevel',ranking.body_level,'channel',ranking.channel);end$$;
revoke insert,update,delete on public.player_rankings_v2 from public,anon,authenticated;
revoke execute on function public.player_ranking_sync(text,text,text,jsonb)from public,anon;
grant execute on function public.player_ranking_sync(text,text,text,jsonb)to authenticated;

alter table public.player_rankings rename to player_rankings_legacy;
revoke all on public.player_rankings_legacy from public,anon,authenticated;
create view public.player_rankings with (security_invoker=true) as
select user_id,player_name,combat_power,spirit_level,sword_level,body_level,game_version,updated_at
from public.player_rankings_v2;
grant select on public.player_rankings to anon,authenticated;
