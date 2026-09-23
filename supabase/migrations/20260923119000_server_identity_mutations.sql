alter table private.player_identity_states add column if not exists character_name text;
alter table private.player_identity_states add column if not exists gender text check(gender in('男','女'));
update private.player_identity_states i set character_name=coalesce(nullif(s.authoritative_state->>'name',''),nullif(s.legacy_state->>'name',''),'無名修士'),gender=case when s.legacy_state->>'gender'='男'then'男'else'女'end from private.player_states s where s.user_id=i.user_id and s.channel=i.channel and(i.character_name is null or i.gender is null);
update private.player_identity_states set character_name=coalesce(character_name,'無名修士'),gender=coalesce(gender,'女') where character_name is null or gender is null;
alter table private.player_identity_states alter column character_name set not null;
alter table private.player_identity_states alter column gender set not null;

create or replace function private.identity_profile_snapshot(i private.player_identity_states)returns jsonb language sql stable set search_path=''as $$select jsonb_build_object('revision',i.revision,'origin',i.origin,'name',i.character_name,'gender',i.gender,'baseCore',private.origin_core(i.origin))$$;
revoke all on function private.identity_profile_snapshot(private.player_identity_states)from public,anon,authenticated;

create or replace function public.player_new_character_initialize_v2(p_channel text,p_name text,p_origin text,p_gender text)returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());result jsonb;i private.player_identity_states;
begin if uid is null then raise exception '需要重新登入';end if;if p_gender not in('男','女')then raise exception '性別資料不正確';end if;result:=public.player_new_character_initialize_v2(p_channel,p_name,p_origin);update private.player_identity_states set character_name=left(trim(p_name),8),gender=p_gender,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into i;return result||jsonb_build_object('identity',private.identity_profile_snapshot(i));end$$;
revoke execute on function public.player_new_character_initialize_v2(text,text,text)from authenticated;
revoke execute on function public.player_new_character_initialize_v2(text,text,text,text)from public,anon;
grant execute on function public.player_new_character_initialize_v2(text,text,text,text)to authenticated;

create or replace function public.player_identity_profile(p_channel text,p_action text default'get',p_value text default null,p_request_id uuid default null)returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());i private.player_identity_states;b private.player_mail_item_balances;v_item_key text;remaining bigint;
begin if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_action not in('get','rename','gender')then raise exception '身分請求不正確';end if;select * into i from private.player_identity_states where user_id=uid and channel=p_channel for update;if i.user_id is null then raise exception '伺服器身分尚未建立';end if;if p_action='get'then return private.identity_profile_snapshot(i);end if;if p_request_id is null or exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複或無效的身分請求';end if;
 if p_action='rename'then if length(trim(coalesce(p_value,'')))not between 1 and 8 or trim(p_value)~'[[:space:][:cntrl:]]'or trim(p_value)!~'^[[:alnum:]·・]+$'then raise exception '姓名格式不正確';end if;if trim(p_value)=i.character_name then raise exception '新姓名不可與目前姓名相同';end if;v_item_key:='renameProtagonistJadeCount';
 else if p_value not in('男','女')or p_value=i.gender then raise exception '性別轉換資料不正確';end if;v_item_key:='genderRebirthMirrorCount';end if;
 select * into b from private.player_mail_item_balances x where user_id=uid and channel=p_channel and x.item_key=v_item_key for update;if coalesce(b.amount,0)<1 then raise exception '身分道具數量不足';end if;update private.player_mail_item_balances set amount=amount-1,updated_at=now()where user_id=uid and channel=p_channel and player_mail_item_balances.item_key=v_item_key returning amount into remaining;
 update private.player_identity_states set character_name=case when p_action='rename'then trim(p_value)else character_name end,gender=case when p_action='gender'then p_value else gender end,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into i;
 update private.player_states set authoritative_state=jsonb_set(authoritative_state,'{name}',to_jsonb(i.character_name),true),updated_at=now()where user_id=uid and channel=p_channel;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,i.revision,'identity_'||p_action,p_request_id,jsonb_build_object('value',p_value));
 return jsonb_build_object('identity',private.identity_profile_snapshot(i),'itemBalances',jsonb_build_object(v_item_key,remaining));
end$$;
revoke execute on function public.player_identity_profile(text,text,text,uuid)from public,anon;
grant execute on function public.player_identity_profile(text,text,text,uuid)to authenticated;
