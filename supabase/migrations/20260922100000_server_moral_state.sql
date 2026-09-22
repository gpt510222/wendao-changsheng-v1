create table if not exists private.player_moral_states(
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 righteousness bigint not null default 0 check(righteousness>=0),
 evil_qi bigint not null default 0 check(evil_qi>=0),
 qi_heart_traits jsonb not null default '{"guard":0,"benevolent":0,"free":0}',
 qi_heart_trials jsonb not null default '{}',
 sword_trial_choices jsonb not null default '{}',
 imported boolean not null default false,
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key(user_id,channel)
);
alter table private.player_moral_states enable row level security;

create or replace function private.moral_snapshot(s private.player_moral_states) returns jsonb
language sql stable set search_path='' as $$select jsonb_build_object(
 'revision',s.revision,'righteousness',s.righteousness,'evilQi',s.evil_qi,
 'qiHeartTraits',s.qi_heart_traits,'qiHeartTrials',s.qi_heart_trials,
 'swordTrialChoices',s.sword_trial_choices
)$$;

create or replace function public.player_moral_bootstrap(p_channel text,p_legacy_righteousness bigint default 0,p_legacy_evil_qi bigint default 0,p_legacy_traits jsonb default '{}',p_legacy_trials jsonb default '{}',p_legacy_sword_choices jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_moral_states;traits jsonb;trials jsonb;choices jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-moral-'||p_channel));
 insert into private.player_moral_states(user_id,channel) values(uid,p_channel) on conflict do nothing;
 select * into s from private.player_moral_states where user_id=uid and channel=p_channel for update;
 if not s.imported then
  traits:=jsonb_build_object('guard',least(3,greatest(0,coalesce((p_legacy_traits->>'guard')::integer,0))),'benevolent',least(3,greatest(0,coalesce((p_legacy_traits->>'benevolent')::integer,0))),'free',least(3,greatest(0,coalesce((p_legacy_traits->>'free')::integer,0))));
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into trials from jsonb_each(coalesce(p_legacy_trials,'{}'::jsonb)) where key in('30','60','90') and jsonb_typeof(value)='object';
  select coalesce(jsonb_object_agg(key,to_jsonb(value#>>'{}')),'{}'::jsonb) into choices from jsonb_each(coalesce(p_legacy_sword_choices,'{}'::jsonb)) where key in('10','20','30','40','50','60','70','80','90') and value#>>'{}' in('righteous','evil','balance');
  update private.player_moral_states set righteousness=least(1000000,greatest(0,coalesce(p_legacy_righteousness,0))),evil_qi=least(1000000,greatest(0,coalesce(p_legacy_evil_qi,0))),qi_heart_traits=traits,qi_heart_trials=trials,sword_trial_choices=choices,imported=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 end if;
 return private.moral_snapshot(s);
end $$;

create or replace function public.player_moral_consume_pill(p_channel text,p_item_key text,p_quantity integer,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_moral_states;b private.player_mail_item_balances;quantity integer;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_item_key not in('righteousQiPillCount','evilQiPillCount') or p_request_id is null then raise exception '丹藥請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的丹藥請求';end if;
 quantity:=least(10000,greatest(1,coalesce(p_quantity,0)));
 perform pg_advisory_xact_lock(hashtext(uid::text||'-moral-'||p_channel));
 select * into s from private.player_moral_states where user_id=uid and channel=p_channel for update;
 select * into b from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=p_item_key for update;
 if s.user_id is null or not s.imported then raise exception '伺服器善惡狀態尚未建立';end if;
 if b.user_id is null or b.amount<quantity then raise exception '伺服器丹藥數量不足';end if;
 update private.player_mail_item_balances set amount=amount-quantity,updated_at=now() where user_id=uid and channel=p_channel and item_key=p_item_key returning * into b;
 update private.player_moral_states set righteousness=righteousness+case when p_item_key='righteousQiPillCount' then quantity else 0 end,evil_qi=evil_qi+case when p_item_key='evilQiPillCount' then quantity else 0 end,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'moral_pill_consumed',p_request_id,jsonb_build_object('itemKey',p_item_key,'quantity',quantity));
 return jsonb_build_object('moral',private.moral_snapshot(s),'itemBalances',jsonb_build_object(p_item_key,b.amount));
end $$;

create or replace function public.player_sword_trial_moral_choice(p_channel text,p_stage integer,p_path text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_moral_states;p private.player_progression_states;gain integer;half_gain integer;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_stage not in(10,20,30,40,50,60,70,80,90) or p_path not in('righteous','evil','balance') or p_request_id is null then raise exception '劍途選擇不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的劍途請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-moral-'||p_channel));
 select * into s from private.player_moral_states where user_id=uid and channel=p_channel for update;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if s.user_id is null or p.user_id is null or not s.imported then raise exception '伺服器角色狀態尚未建立';end if;
 if p.sword_trial_wins<p_stage then raise exception '尚未通過此試劍關卡';end if;
 if s.sword_trial_choices?(p_stage::text) then raise exception '此關劍途已經決定';end if;
 gain:=5+floor(p_stage/10.0)::integer*2;half_gain:=ceil(gain/2.0)::integer;
 update private.player_moral_states set righteousness=righteousness+case when p_path='righteous' then gain when p_path='balance' then half_gain else 0 end,evil_qi=evil_qi+case when p_path='evil' then gain when p_path='balance' then half_gain else 0 end,sword_trial_choices=jsonb_set(sword_trial_choices,array[p_stage::text],to_jsonb(p_path),true),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sword_trial_moral_choice',p_request_id,jsonb_build_object('stage',p_stage,'path',p_path));
 return private.moral_snapshot(s);
end $$;

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

revoke execute on function public.player_moral_bootstrap(text,bigint,bigint,jsonb,jsonb,jsonb),public.player_moral_consume_pill(text,text,integer,uuid),public.player_sword_trial_moral_choice(text,integer,text,uuid),public.player_qi_heart_submit(text,integer,integer[],uuid) from public,anon;
grant execute on function public.player_moral_bootstrap(text,bigint,bigint,jsonb,jsonb,jsonb),public.player_moral_consume_pill(text,text,integer,uuid),public.player_sword_trial_moral_choice(text,integer,text,uuid),public.player_qi_heart_submit(text,integer,integer[],uuid) to authenticated;
