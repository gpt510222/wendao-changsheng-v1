create or replace function public.player_qi_heart_submit(p_channel text,p_milestone integer,p_answers integer[],p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_moral_states;p private.player_progression_states;r integer:=0;e integer:=0;b integer:=0;g integer:=0;n integer:=0;f integer:=0;answer integer;nature text;entry_aspect text;aspect text;trial jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_milestone not in(30,60,90) or array_length(p_answers,1)<>3 or p_request_id is null then raise exception '問心答案不正確';end if;
 if exists(select 1 from unnest(p_answers) x where x not between 0 and 2) then raise exception '問心答案不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的問心請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-moral-'||p_channel));
 select * into s from private.player_moral_states where user_id=uid and channel=p_channel for update;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if s.user_id is null or p.user_id is null or not s.imported then raise exception '伺服器角色狀態尚未建立';end if;
 if p.spirit_level+1<>p_milestone then raise exception '目前未達此問心里程';end if;
 if s.qi_heart_trials?(p_milestone::text) then raise exception '此重問心已完成';end if;
 entry_aspect:=case when s.righteousness>=s.evil_qi*1.25 and s.righteousness>s.evil_qi+1 then 'righteous' when s.evil_qi>=s.righteousness*1.25 and s.evil_qi>s.righteousness+1 then 'evil' else 'balance' end;
 foreach answer in array p_answers loop if answer=0 then b:=b+1;r:=r+1;e:=e+1;elsif answer=1 then n:=n+1;r:=r+2;else f:=f+1;g:=g+1;e:=e+2;end if;end loop;
 nature:=case when b>=n and b>=f then 'guard' when n>=f then 'benevolent' else 'free' end;
 aspect:=case when entry_aspect='righteous' and g>=2 or entry_aspect='evil' and n>=2 then 'shaken' else entry_aspect end;
 trial:=jsonb_build_object('aspect',aspect,'nature',nature,'entryAspect',entry_aspect,'completedAt',floor(extract(epoch from now())*1000));
 update private.player_moral_states set righteousness=righteousness+r,evil_qi=evil_qi+e,qi_heart_traits=jsonb_set(qi_heart_traits,array[nature],to_jsonb(least(3,coalesce((qi_heart_traits->>nature)::integer,0)+1)),true),qi_heart_trials=jsonb_set(qi_heart_trials,array[p_milestone::text],trial,true),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'qi_heart_completed',p_request_id,jsonb_build_object('milestone',p_milestone,'answers',to_jsonb(p_answers)));
 return private.moral_snapshot(s);
end $$;
