alter function public.arena_sync_profile(text,text,jsonb)rename to arena_sync_profile_untrusted_name;
revoke all on function public.arena_sync_profile_untrusted_name(text,text,jsonb)from public,anon,authenticated;
create or replace function public.arena_sync_profile(p_channel text,p_name text,p_snapshot jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());server_name text;
begin if uid is null then raise exception '需要重新登入';end if;select character_name into server_name from private.player_identity_states where user_id=uid and channel=p_channel;if server_name is null then raise exception '伺服器身分尚未建立';end if;return public.arena_sync_profile_untrusted_name(p_channel,server_name,p_snapshot);end$$;
revoke execute on function public.arena_sync_profile(text,text,jsonb)from public,anon;
grant execute on function public.arena_sync_profile(text,text,jsonb)to authenticated;

alter function public.player_ranking_sync(text,text,text,jsonb)rename to player_ranking_sync_untrusted_name;
revoke all on function public.player_ranking_sync_untrusted_name(text,text,text,jsonb)from public,anon,authenticated;
create or replace function public.player_ranking_sync(p_channel text,p_name text,p_game_version text,p_snapshot jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());server_name text;
begin if uid is null then raise exception '需要重新登入';end if;select character_name into server_name from private.player_identity_states where user_id=uid and channel=p_channel;if server_name is null then raise exception '伺服器身分尚未建立';end if;return public.player_ranking_sync_untrusted_name(p_channel,server_name,p_game_version,p_snapshot);end$$;
revoke execute on function public.player_ranking_sync(text,text,text,jsonb)from public,anon;
grant execute on function public.player_ranking_sync(text,text,text,jsonb)to authenticated;

