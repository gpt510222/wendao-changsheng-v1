create or replace function public.player_ranking_sync(p_channel text,p_name text,p_game_version text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());profile_result jsonb;p private.player_progression_states;power_value numeric;safe_name text;version_value text;ranking public.player_rankings;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or length(coalesce(p_game_version,''))not between 1 and 200 then raise exception '排行榜資料不正確';end if;
 profile_result:=public.arena_sync_profile(p_channel,p_name,p_snapshot);
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 power_value:=(profile_result->'snapshot'->>'combat_power')::numeric;
 safe_name:=left(coalesce(nullif(trim(p_name),''),'無名修士'),20);
 version_value:=left(split_part(p_game_version,'|',1),40);
 if version_value!~'^v[0-9]+\.[0-9]+\.[0-9]+$'then raise exception '遊戲版本不正確';end if;
 insert into public.player_rankings(user_id,player_name,combat_power,spirit_level,sword_level,body_level,game_version,updated_at)
 values(uid,safe_name,power_value,p.spirit_level,p.sword_level,p.body_level,version_value,now())
 on conflict(user_id)do update set player_name=excluded.player_name,combat_power=greatest(public.player_rankings.combat_power,excluded.combat_power),spirit_level=excluded.spirit_level,sword_level=excluded.sword_level,body_level=excluded.body_level,game_version=excluded.game_version,updated_at=now() returning * into ranking;
 return jsonb_build_object('combatPower',ranking.combat_power,'playerName',ranking.player_name,'gameVersion',ranking.game_version,'spiritLevel',ranking.spirit_level,'swordLevel',ranking.sword_level,'bodyLevel',ranking.body_level);
end$$;
revoke execute on function public.player_ranking_sync(text,text,text,jsonb) from public,anon;
grant execute on function public.player_ranking_sync(text,text,text,jsonb) to authenticated;
