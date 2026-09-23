create or replace function public.player_partner_rename(p_channel text,p_name text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_partner_states;b private.player_mail_item_balances;remaining bigint;
begin
 if uid is null or p_channel not in('formal','test')or p_request_id is null then raise exception '道侶請求不正確';end if;
 if length(trim(coalesce(p_name,'')))not between 1 and 8 or trim(p_name)~'[[:space:][:cntrl:]]'or trim(p_name)!~'^[[:alnum:]·・]+$'then raise exception '姓名格式不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複的更名請求';end if;
 select * into s from private.player_partner_states where user_id=uid and channel=p_channel for update;if s.user_id is null or not s.established then raise exception '尚未結為道侶';end if;if trim(p_name)=s.partner_name then raise exception '新姓名不可與目前姓名相同';end if;
 select * into b from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key='renamePartnerCovenantCount'for update;if coalesce(b.amount,0)<1 then raise exception '同心更名契數量不足';end if;
 update private.player_mail_item_balances set amount=amount-1,updated_at=now()where user_id=uid and channel=p_channel and item_key='renamePartnerCovenantCount'returning amount into remaining;
 update private.player_partner_states set partner_name=trim(p_name),revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,s.revision,'partner_renamed',p_request_id,jsonb_build_object('name',s.partner_name));
 return jsonb_build_object('partner',private.partner_snapshot(s),'itemBalances',jsonb_build_object('renamePartnerCovenantCount',remaining));
end$$;

alter function public.player_identity_profile(text,text,text,uuid)rename to player_identity_profile_partner_base;
create or replace function public.player_identity_profile(p_channel text,p_action text default'get',p_value text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());result jsonb;s private.player_partner_states;
begin
 result:=public.player_identity_profile_partner_base(p_channel,p_action,p_value,p_request_id);
 if p_action='gender'then update private.player_partner_states set partner_gender=case partner_gender when'男'then'女'when'女'then'男'else partner_gender end,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel and established returning * into s;if s.user_id is not null then result:=result||jsonb_build_object('partner',private.partner_snapshot(s));end if;end if;
 return result;
end$$;

revoke all on function public.player_identity_profile_partner_base(text,text,text,uuid)from public,anon,authenticated;
revoke execute on function public.player_partner_rename(text,text,uuid),public.player_identity_profile(text,text,text,uuid)from public,anon;
grant execute on function public.player_partner_rename(text,text,uuid),public.player_identity_profile(text,text,text,uuid)to authenticated;
