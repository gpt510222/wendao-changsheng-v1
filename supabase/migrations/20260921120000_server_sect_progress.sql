alter table private.player_sect_states
 add column if not exists progress_imported boolean not null default false,
 add column if not exists sect_merit numeric not null default 0 check(sect_merit>=0),
 add column if not exists sect_contribution numeric not null default 0 check(sect_contribution>=0),
 add column if not exists prestige numeric not null default 0 check(prestige>=0),
 add column if not exists task_id text not null default '',
 add column if not exists task_settled_at timestamptz not null default now();

create or replace function private.sect_task_values(p_task text)
returns table(realm integer,gain integer,stone integer,prestige integer) language sql immutable set search_path='' as $$
select v.realm,v.gain,v.stone,v.prestige from (values
 ('sweep',1,10,100,5),('cook',2,12,150,6),('herb',3,14,220,7),('escort',4,16,320,8),('gate',5,18,460,9),('vein',6,20,650,10),('demon',7,22,900,12),('array',8,24,1250,14),('realm',9,26,1700,17),('diplomacy',11,28,2300,21),('rift',13,30,3100,25),('skyward',15,34,4200,30),('domain',17,38,5700,36),('voidward',19,42,7700,43),('worldaxis',21,46,10400,51),('heavenorder',23,50,14000,60)
) v(id,realm,gain,stone,prestige) where id=p_task
$$;

create or replace function private.sect_progress_snapshot(s private.player_sect_states)
returns jsonb language sql stable set search_path='' as $$
select private.sect_snapshot(s)||jsonb_build_object('sectMerit',s.sect_merit::text,'sectContribution',s.sect_contribution::text,'prestige',s.prestige::text,'sectTask',s.task_id)
$$;

create or replace function private.settle_sect_progress(p_uid uuid,p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.player_sect_states;w private.player_resource_wallets;t record;years integer:=0;stone_gain numeric:=0;
begin
 select * into s from private.player_sect_states where user_id=p_uid and channel=p_channel for update;select * into w from private.player_resource_wallets where user_id=p_uid and channel=p_channel for update;
 if s.user_id is null or w.user_id is null then return '{}'::jsonb;end if;
 years:=least(35040,greatest(0,floor(extract(epoch from now()-s.task_settled_at)/900)::integer));
 if years>0 then
  select * into t from private.sect_task_values(s.task_id);
  if t.realm is not null then s.sect_merit:=s.sect_merit+years*t.gain;s.sect_contribution:=s.sect_contribution+years*t.gain;s.prestige:=s.prestige+years*t.prestige;stone_gain:=years*t.stone;w.spirit_stone:=w.spirit_stone+stone_gain;end if;
  update private.player_sect_states set sect_merit=s.sect_merit,sect_contribution=s.sect_contribution,prestige=s.prestige,task_settled_at=task_settled_at+make_interval(secs=>years*900),revision=revision+1,updated_at=now() where user_id=p_uid and channel=p_channel returning * into s;
  if stone_gain>0 then update private.player_resource_wallets set spirit_stone=w.spirit_stone,revision=revision+1,updated_at=now() where user_id=p_uid and channel=p_channel returning * into w;end if;
 end if;
 return jsonb_build_object('sect',private.sect_progress_snapshot(s),'wallet',private.cangji_wallet_json(w),'years',years,'stoneGain',stone_gain::text);
end $$;

create or replace function public.player_sect_progress_bootstrap(p_channel text,p_merit numeric,p_contribution numeric,p_prestige numeric,p_task text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') then raise exception 'invalid channel';end if;select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;if s.user_id is null then raise exception 'sect state not initialized';end if;
 if not s.progress_imported then update private.player_sect_states set sect_merit=least(1000000000,greatest(0,coalesce(p_merit,0))),sect_contribution=least(1000000000,greatest(0,coalesce(p_contribution,0))),prestige=least(1000000000,greatest(0,coalesce(p_prestige,0))),task_id=case when exists(select 1 from private.sect_task_values(p_task)) then p_task else '' end,progress_imported=true,task_settled_at=now(),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel;end if;
 return private.settle_sect_progress(uid,p_channel);
end $$;

create or replace function public.player_sect_progress(p_channel text,p_action text,p_task text default null,p_expected_sect_revision bigint default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;p private.player_progression_states;t record;highest integer;need integer;result jsonb;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') or p_action not in ('get','set_task','promote') then raise exception 'invalid request';end if;
 result:=private.settle_sect_progress(uid,p_channel);select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if p_action<>'get' then if p_request_id is null or s.revision<>p_expected_sect_revision then raise exception 'sect revision conflict';end if;if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception 'duplicate request';end if;end if;
 if p_action='set_task' then select * into t from private.sect_task_values(p_task);if t.realm is null then raise exception 'invalid sect task';end if;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;highest:=greatest(floor(p.spirit_level/10.0),floor(p.sword_level/10.0),floor(p.body_level/10.0))+1;if highest<t.realm then raise exception '修行境界不足';end if;s.task_id:=p_task;
 elsif p_action='promote' then if s.sect_rank>=4 then raise exception '已達最高職位';end if;need:=(array[300,900,2000,4500])[s.sect_rank+1];if s.sect_merit<need then raise exception '門派功勳不足';end if;s.sect_rank:=s.sect_rank+1;end if;
 if p_action<>'get' then update private.player_sect_states set task_id=s.task_id,sect_rank=s.sect_rank,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_progress_'||p_action,p_request_id,jsonb_build_object('task',p_task));end if;
 return jsonb_build_object('sect',private.sect_progress_snapshot(s),'wallet',(result->'wallet'),'years',result->'years','stoneGain',result->'stoneGain');
end $$;

revoke execute on function public.player_sect_progress_bootstrap(text,numeric,numeric,numeric,text),public.player_sect_progress(text,text,text,bigint,uuid) from public,anon;
grant execute on function public.player_sect_progress_bootstrap(text,numeric,numeric,numeric,text),public.player_sect_progress(text,text,text,bigint,uuid) to authenticated;
revoke all on function private.sect_task_values(text),private.sect_progress_snapshot(private.player_sect_states),private.settle_sect_progress(uuid,text) from public,anon,authenticated;
