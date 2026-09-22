create or replace function public.player_combat_components_get(p_channel text)
returns jsonb language plpgsql stable security definer set search_path='' as $$declare uid uuid:=(select auth.uid());begin if uid is null then raise exception '需要重新登入';end if;return private.server_component_core(uid,p_channel);end $$;
revoke execute on function public.player_combat_components_get(text) from public,anon;grant execute on function public.player_combat_components_get(text) to authenticated;

create or replace function private.arena_validate_server_progression(p_user uuid,p_channel text,p_snapshot jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare expected jsonb;provided jsonb;k text;
begin perform private.arena_validate_server_progression_base(p_user,p_channel,p_snapshot);expected:=private.server_component_core(p_user,p_channel);provided:=p_snapshot->'component_core';if jsonb_typeof(provided)<>'object' then raise exception '戰鬥快照缺少伺服器裝備屬性';end if;foreach k in array array['trueQi','rootBone','physique','agility','spiritualPower'] loop if coalesce((provided->>k)::numeric,-1)<>coalesce((expected->>k)::numeric,0) then raise exception '裝備或本命劍屬性與伺服器紀錄不一致';end if;end loop;end $$;
revoke all on function private.arena_validate_server_progression(uuid,text,jsonb) from public,anon,authenticated;
