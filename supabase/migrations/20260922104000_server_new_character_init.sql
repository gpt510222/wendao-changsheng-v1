create or replace function public.player_new_character_initialize(p_channel text,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());existing uuid;safe_name text:=trim(coalesce(p_name,''));
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or length(safe_name) not between 1 and 8 or safe_name~'[[:cntrl:]]' then raise exception '角色名稱不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-new-character-'||p_channel));
 select user_id into existing from private.player_states where user_id=uid and channel=p_channel;
 if existing is not null then raise exception '此帳號已有伺服器角色，請重新載入或使用恢復碼';end if;
 perform public.player_state_bootstrap(p_channel,jsonb_build_object('name',safe_name,'lastSave',floor(extract(epoch from now())*1000)));
 perform public.player_resource_wallet_bootstrap(p_channel,'{"free":"0","swordEssence":"0","aura":"0","spiritStone":"0","food":"20","wood":"20","meteorIron":"20"}'::jsonb);
 perform public.player_progression_bootstrap(p_channel,'{"cultivationAwakened":false,"spiritPathOpened":false,"swordPathOpened":false,"bodyPathOpened":false,"spiritLevel":0,"swordLevel":0,"bodyLevel":0,"swordTrialWins":0}'::jsonb);
 perform public.player_body_bootstrap(p_channel,'{"nutrition":0,"foundations":{},"trainingLoad":0}'::jsonb);
 perform public.player_resource_profile_bootstrap(p_channel,'{"cultivation_rate":0,"aura_rate":0,"aura_capacity":20000,"pool_bonus":0,"sword_rate":0,"food_workers":0,"wood_workers":0,"iron_workers":0,"food_capacity":4800,"wood_capacity":720,"iron_capacity":360}'::jsonb);
 perform public.player_cave_bootstrap(p_channel,'{"daoChildTotal":1,"daoChildBought":0,"workerFood":0,"workerWood":0,"workerMeteorIron":0,"foodAreaLevel":1,"woodAreaLevel":1,"meteorIronAreaLevel":1,"spiritPoolLevel":1}'::jsonb);
 perform public.player_cave_security_bootstrap(p_channel,'{"caveCoreLevel":1,"caveCultivationLevel":1,"caveSwordLevel":1,"caveBodyLevel":1,"caveCultivationEnabled":true,"caveSwordEnabled":false,"caveBodyEnabled":false,"spiritPathOpened":false,"swordPathOpened":false,"bodyPathOpened":false,"swordEmbryo":"","metalRoot":0,"woodRoot":0,"waterRoot":0,"fireRoot":0,"earthRoot":0}'::jsonb);
 perform public.player_moral_bootstrap(p_channel,0,0,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb);
 perform public.player_mainline_bootstrap(p_channel,0);
 perform public.player_artifact_bootstrap(p_channel,'[]'::jsonb,'');
 perform public.player_book_arts_bootstrap(p_channel,'[]'::jsonb);
 perform public.player_equipment_bootstrap(p_channel,'[]'::jsonb,'{}'::jsonb);
 perform public.player_weaving_bootstrap(p_channel,1,0);
 perform public.player_sect_bootstrap(p_channel,0,false);
 perform public.player_sect_membership_bootstrap(p_channel,'',0,'');
 perform public.player_sect_progress_bootstrap(p_channel,0,0,0,'');
 perform public.player_ascension_bootstrap(p_channel);
 insert into private.player_state_events(user_id,channel,revision,event_type,payload) values(uid,p_channel,1,'new_character_server_initialized',jsonb_build_object('name',safe_name));
 return jsonb_build_object('initialized',true,'name',safe_name,'channel',p_channel);
end $$;

revoke execute on function public.player_new_character_initialize(text,text) from public,anon;
grant execute on function public.player_new_character_initialize(text,text) to authenticated;
