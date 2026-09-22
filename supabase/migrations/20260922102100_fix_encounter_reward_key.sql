create or replace function public.player_encounter_choose(p_channel text,p_event_id text,p_choice integer,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_encounter_states;m private.player_moral_states;event jsonb;choice jsonb;reward jsonb;amount bigint;bonus numeric;reward_key text;balance bigint;entry jsonb;trimmed jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_choice not between 0 and 2 or p_request_id is null then raise exception '奇遇選擇不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的奇遇請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-encounter-'||p_channel));
 select * into s from private.player_encounter_states where user_id=uid and channel=p_channel for update;select * into m from private.player_moral_states where user_id=uid and channel=p_channel for update;
 event:=s.queue->0;if event is null or event->>'id'<>p_event_id then raise exception '奇遇已結束或順序不正確';end if;choice:=event->'choices'->p_choice;if choice is null then raise exception '奇遇選擇不存在';end if;
 bonus:=1+least(3,coalesce((m.qi_heart_traits->>'benevolent')::integer,0))*.05;
 reward:=choice->'rewards'->0;reward_key:=reward->>'itemKey';amount:=greatest(1,ceil((reward->>'amount')::numeric*bonus)::bigint);
 if reward_key not in('mainlineFoodBag','mainlineWoodBag','mainlineIronBag','mainlineMaterial_xuansi','mainlineMaterial_xuanjuan','mainlineMaterial_xuanpi','tribPill1','tribPill2','tribPill3','tribPill4','tribPill5','tribPill6','tribPill7','tribPill8') then raise exception '奇遇獎勵不正確';end if;
 insert into private.player_mail_item_balances(user_id,channel,item_key,amount) values(uid,p_channel,reward_key,amount) on conflict(user_id,channel,item_key) do update set amount=private.player_mail_item_balances.amount+excluded.amount,updated_at=now() returning private.player_mail_item_balances.amount into balance;
 update private.player_moral_states set righteousness=righteousness+coalesce((choice->'moral'->>'righteousness')::integer,0),evil_qi=evil_qi+coalesce((choice->'moral'->>'evilQi')::integer,0),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into m;
 entry:=jsonb_build_object('title',event->>'title','choice',choice->>'label','result',(choice->>'result')||' 獲得獎勵 ×'||amount||'。','year',event->'year','at',floor(extract(epoch from now())*1000),'tags',jsonb_build_array(case when event->>'kind'='realm' then 'cultivation' else 'life' end));
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into trimmed from jsonb_array_elements(jsonb_build_array(entry)||(s.history)) with ordinality x(value,ord) where ord<=60;
 update private.player_encounter_states set queue=queue-0,history=trimmed,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'encounter_resolved',p_request_id,jsonb_build_object('eventId',p_event_id,'choice',p_choice,'itemKey',reward_key,'amount',amount));
 return jsonb_build_object('encounter',private.encounter_snapshot(s),'moral',private.moral_snapshot(m),'itemBalances',jsonb_build_object(reward_key,balance),'reward',jsonb_build_object('item',reward->>'item','amount',amount));
end $$;
