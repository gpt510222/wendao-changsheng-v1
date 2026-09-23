update private.player_states s
set trust_status='verified',updated_at=now()
where trust_status<>'verified'
  and exists (
    select 1 from private.player_state_events e
    where e.user_id=s.user_id and e.channel=s.channel
      and e.event_type='new_character_server_initialized'
  );

create or replace function public.player_new_character_initialize_v2(p_channel text,p_name text,p_origin text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());result jsonb;identity jsonb;preseed boolean;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 if p_origin not in('家族子弟','流浪孤兒','亡命草寇','深山獵戶','寒窗學子')then raise exception '出身資料不正確';end if;
 select exists(select 1 from private.player_resource_wallets where user_id=uid and channel=p_channel)
   or exists(select 1 from private.player_progression_states where user_id=uid and channel=p_channel)
   or exists(select 1 from private.player_body_states where user_id=uid and channel=p_channel)
   or exists(select 1 from private.player_cave_states where user_id=uid and channel=p_channel)
   or exists(select 1 from private.player_identity_states where user_id=uid and channel=p_channel)
   or exists(select 1 from private.player_permanent_consumable_effects where user_id=uid and channel=p_channel)
   or exists(select 1 from private.player_art_profiles where user_id=uid and channel=p_channel)
   or exists(select 1 from private.player_equipment_profiles where user_id=uid and channel=p_channel)
 into preseed;
 if preseed and not exists(select 1 from private.player_states where user_id=uid and channel=p_channel)then raise exception '偵測到不完整的預載角色資料，請建立新的登入工作階段';end if;
 perform set_config('app.server_character_initialize','1',true);
 result:=public.player_new_character_initialize(p_channel,p_name);
 identity:=public.player_identity_bootstrap(p_channel,p_origin);
 perform private.refresh_resource_profile_authoritative(uid,p_channel);
 update private.player_states set trust_status='verified',updated_at=now()
 where user_id=uid and channel=p_channel;
 return result||jsonb_build_object('identity',identity,'trust_status','verified');
end $$;

revoke execute on function public.player_new_character_initialize_v2(text,text,text) from public,anon;
grant execute on function public.player_new_character_initialize_v2(text,text,text) to authenticated;
