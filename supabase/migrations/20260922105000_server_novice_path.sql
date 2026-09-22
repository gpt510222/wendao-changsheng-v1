alter table private.player_progression_states add column if not exists novice_next_at timestamptz;

create or replace function public.player_novice_cultivate(p_channel text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());p private.player_progression_states;w private.player_resource_wallets;gain integer:=10;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_request_id is null then raise exception '吐納請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的吐納請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-novice-'||p_channel));select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if p.user_id is null or w.user_id is null then raise exception '伺服器角色尚未建立';end if;if p.cultivation_awakened then raise exception '已經踏入修行之路';end if;if p.novice_next_at is not null and now()<p.novice_next_at then raise exception '吐納尚未完成';end if;
 update private.player_resource_wallets set cultivation=least(300,cultivation+gain),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
 update private.player_progression_states set novice_next_at=now()+interval '5 seconds',revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'novice_cultivation',p_request_id,jsonb_build_object('gain',gain));
 return jsonb_build_object('wallet',private.cangji_wallet_json(w),'progression',private.progression_snapshot(p),'gain',gain);
end $$;

create or replace function public.player_novice_awaken(p_channel text,p_path text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());p private.player_progression_states;w private.player_resource_wallets;c private.player_cave_states;profile jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_path not in('spirit','sword','body') or p_request_id is null then raise exception '入道請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的入道請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-novice-'||p_channel));select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;select * into c from private.player_cave_states where user_id=uid and channel=p_channel for update;
 if p.user_id is null or w.user_id is null or c.user_id is null then raise exception '伺服器角色尚未建立';end if;if p.cultivation_awakened then raise exception '已經選定第一條修行道路';end if;if w.cultivation<300 then raise exception '入道修為不足';end if;
 profile:=coalesce(w.earning_profile,'{}'::jsonb);w.cultivation:=w.cultivation-300;p.cultivation_awakened:=true;
 if p_path='spirit' then p.spirit_path_opened:=true;c.spirit_path_opened:=true;profile:=profile||jsonb_build_object('base_cultivation_rate','36','cultivation_rate','36');
 elsif p_path='sword' then p.sword_path_opened:=true;c.sword_path_opened:=true;profile:=profile||jsonb_build_object('base_sword_rate','37','sword_rate','37');
 else p.body_path_opened:=true;c.body_path_opened:=true;end if;
 update private.player_resource_wallets set cultivation=w.cultivation,earning_profile=profile,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
 update private.player_progression_states set cultivation_awakened=true,spirit_path_opened=p.spirit_path_opened,sword_path_opened=p.sword_path_opened,body_path_opened=p.body_path_opened,novice_next_at=null,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;
 update private.player_cave_states set spirit_path_opened=c.spirit_path_opened,sword_path_opened=c.sword_path_opened,body_path_opened=c.body_path_opened,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into c;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'novice_awakened',p_request_id,jsonb_build_object('path',p_path));
 return jsonb_build_object('wallet',private.cangji_wallet_json(w),'progression',private.progression_snapshot(p),'cave_revision',c.revision,'path',p_path);
end $$;

revoke execute on function public.player_novice_cultivate(text,uuid),public.player_novice_awaken(text,text,uuid) from public,anon;
grant execute on function public.player_novice_cultivate(text,uuid),public.player_novice_awaken(text,text,uuid) to authenticated;
