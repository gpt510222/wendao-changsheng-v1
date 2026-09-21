create or replace function private.arena_validate_server_progression(p_user uuid,p_channel text,p_snapshot jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare p private.player_progression_states;e private.player_permanent_consumable_effects;core jsonb;level_total integer;cap_value numeric;k text;bonus numeric;
begin
 select * into p from private.player_progression_states where user_id=p_user and channel=p_channel;
 if p.user_id is null then raise exception '伺服器修行進度尚未建立';end if;
 if (p_snapshot->'progression'->>'spirit_level')::integer<>p.spirit_level or (p_snapshot->'progression'->>'sword_level')::integer<>p.sword_level or (p_snapshot->'progression'->>'body_level')::integer<>p.body_level then raise exception '戰鬥快照與伺服器境界不一致';end if;
 select * into e from private.player_permanent_consumable_effects where user_id=p_user and channel=p_channel;core:=p_snapshot->'core';level_total:=p.spirit_level+p.sword_level+p.body_level;
 foreach k in array array['trueQi','rootBone','physique','agility','spiritualPower'] loop
  bonus:=case when k='spiritualPower' then 0 else coalesce((e.attribute_bonuses->>k)::numeric,0) end;cap_value:=100+level_total*15+bonus;
  if coalesce((core->>k)::numeric,-1)>cap_value then raise exception '戰鬥屬性超出伺服器進度上限';end if;
 end loop;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '戰鬥快照包含無效數值';end $$;

create or replace function public.arena_sync_profile(p_channel text,p_name text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());result jsonb;wk date:=private.arena_week_start();
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 perform private.arena_rollover(p_channel);perform private.arena_validate_snapshot(p_snapshot);perform private.arena_validate_server_progression(uid,p_channel,p_snapshot);p_snapshot:=p_snapshot||jsonb_build_object('week_start',wk::text,'captured_at',floor(extract(epoch from now())*1000));
 insert into private.arena_name_owners(channel,normalized_name,user_id) values(p_channel,lower(trim(left(coalesce(nullif(trim(p_name),''),'無名修士'),20))),uid) on conflict(channel,normalized_name) do nothing;
 if exists(select 1 from public.arena_profiles p where p.user_id=uid and p.channel=p_channel and p.snapshot->>'schema_version'='3' and (p.snapshot->>'captured_at')::numeric>extract(epoch from now()-interval '5 minutes')*1000) then select jsonb_build_object('score',p.score,'snapshot',p.snapshot) into result from public.arena_profiles p where p.user_id=uid and p.channel=p_channel;return result;end if;
 insert into public.arena_profiles(user_id,channel,player_name,snapshot) values(uid,p_channel,left(coalesce(nullif(trim(p_name),''),'無名修士'),20),p_snapshot) on conflict(user_id,channel) do update set player_name=excluded.player_name,snapshot=excluded.snapshot,updated_at=now();
 select jsonb_build_object('score',score,'wins',wins,'losses',losses,'snapshot',snapshot) into result from public.arena_profiles where user_id=uid and channel=p_channel;return result;
end $$;

create or replace function public.player_ranking_sync(p_channel text,p_name text,p_game_version text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());profile_result jsonb;p private.player_progression_states;power_value numeric;safe_name text;version_value text;ranking public.player_rankings;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or length(coalesce(p_game_version,'')) not between 1 and 200 then raise exception '排行榜資料不正確';end if;
 profile_result:=public.arena_sync_profile(p_channel,p_name,p_snapshot);select * into p from private.player_progression_states where user_id=uid and channel=p_channel;power_value:=(profile_result->'snapshot'->>'combat_power')::numeric;safe_name:=left(coalesce(nullif(trim(p_name),''),'無名修士'),20);version_value:=p_game_version;
 insert into public.player_rankings(user_id,player_name,combat_power,spirit_level,sword_level,body_level,game_version,updated_at) values(uid,safe_name,power_value,p.spirit_level,p.sword_level,p.body_level,version_value,now()) on conflict(user_id) do update set player_name=excluded.player_name,combat_power=greatest(public.player_rankings.combat_power,excluded.combat_power),spirit_level=excluded.spirit_level,sword_level=excluded.sword_level,body_level=excluded.body_level,game_version=excluded.game_version,updated_at=now() returning * into ranking;
 return jsonb_build_object('combatPower',ranking.combat_power,'playerName',ranking.player_name,'gameVersion',ranking.game_version,'spiritLevel',ranking.spirit_level,'swordLevel',ranking.sword_level,'bodyLevel',ranking.body_level);
end $$;

revoke insert,update,delete on public.player_rankings from anon,authenticated;
revoke all on function private.arena_validate_server_progression(uuid,text,jsonb) from public,anon,authenticated;
revoke execute on function public.player_ranking_sync(text,text,text,jsonb) from public,anon;
grant execute on function public.player_ranking_sync(text,text,text,jsonb) to authenticated;
