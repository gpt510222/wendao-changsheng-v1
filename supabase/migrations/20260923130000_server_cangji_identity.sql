alter function public.cangji_create_game(text,text,text,integer)rename to cangji_create_game_untrusted_name;
alter function public.cangji_accept_game(uuid,text,text)rename to cangji_accept_game_untrusted_name;
revoke all on function public.cangji_create_game_untrusted_name(text,text,text,integer),public.cangji_accept_game_untrusted_name(uuid,text,text)from public,anon,authenticated;

create function public.cangji_create_game(p_channel text,p_name text,p_choice text,p_wager integer)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());server_name text;
begin
 if uid is null then raise exception '請重新登入後再設局';end if;
 select character_name into server_name from private.player_identity_states where user_id=uid and channel=p_channel;
 if server_name is null then raise exception '伺服器身分尚未建立';end if;
 return public.cangji_create_game_untrusted_name(p_channel,server_name,p_choice,p_wager);
end$$;

create function public.cangji_accept_game(p_game uuid,p_name text,p_choice text)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());server_name text;game_channel text;
begin
 if uid is null then raise exception '請重新登入後再應局';end if;
 select channel into game_channel from public.cangji_games where id=p_game;
 if game_channel is null then raise exception '此局已不存在';end if;
 select character_name into server_name from private.player_identity_states where user_id=uid and channel=game_channel;
 if server_name is null then raise exception '伺服器身分尚未建立';end if;
 return public.cangji_accept_game_untrusted_name(p_game,server_name,p_choice);
end$$;

revoke execute on function public.cangji_create_game(text,text,text,integer),public.cangji_accept_game(uuid,text,text)from public,anon;
grant execute on function public.cangji_create_game(text,text,text,integer),public.cangji_accept_game(uuid,text,text)to authenticated;
