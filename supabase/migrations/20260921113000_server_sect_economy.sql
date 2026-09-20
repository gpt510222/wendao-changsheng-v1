create table if not exists private.player_sect_states(
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('formal','test')),
  revision bigint not null default 1 check(revision>0),
  sect_rank integer not null default 0 check(sect_rank between 0 and 4),
  acting_leader boolean not null default false,
  legacy_imported boolean not null default false,
  last_salary_day date,
  last_practice_day date,
  practice_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,channel)
);
alter table private.player_sect_states enable row level security;
revoke all on private.player_sect_states from public,anon,authenticated;

create or replace function private.sect_snapshot(s private.player_sect_states)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('revision',s.revision,'sectRank',s.sect_rank,'actingLeader',s.acting_leader,
  'lastSalaryDay',s.last_salary_day,'lastPracticeDay',s.last_practice_day,'practiceUntil',s.practice_until)
$$;

create or replace function public.player_sect_bootstrap(p_channel text,p_rank integer default 0,p_acting_leader boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') then raise exception 'invalid channel';end if;
 insert into private.player_sect_states(user_id,channel) values(uid,p_channel) on conflict do nothing;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if not s.legacy_imported then update private.player_sect_states set sect_rank=least(4,greatest(0,coalesce(p_rank,0))),acting_leader=coalesce(p_acting_leader,false),legacy_imported=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;end if;
 return private.sect_snapshot(s);
end $$;

create or replace function public.player_sect_economy(p_channel text,p_action text,p_expected_wallet_revision bigint default null,p_expected_sect_revision bigint default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;w private.player_resource_wallets;today date:=(now() at time zone 'Asia/Taipei')::date;salary integer;duration interval;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in ('formal','test') or p_action not in ('get','claim_salary','start_practice') then raise exception 'invalid request';end if;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if s.user_id is null or w.user_id is null then raise exception 'player state not initialized';end if;
 if p_action<>'get' then
  if p_request_id is null or w.revision<>p_expected_wallet_revision or s.revision<>p_expected_sect_revision then raise exception 'resource revision conflict';end if;
  if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception 'duplicate request';end if;
 end if;
 if p_action='claim_salary' then
  if s.last_salary_day=today then raise exception '今日已領取俸祿';end if;
  salary:=(array[300,750,1500,2700,4500])[s.sect_rank+1];w.spirit_stone:=w.spirit_stone+salary;s.last_salary_day:=today;
 elsif p_action='start_practice' then
  if s.sect_rank<1 then raise exception '需晉升內門弟子才能使用練功房';end if;if s.last_practice_day=today then raise exception '今日已完成練功';end if;if w.spirit_stone<300 then raise exception '靈石不足';end if;
  duration:=case when s.acting_leader then interval '5 hours' else interval '2 hours 30 minutes' end;w.spirit_stone:=w.spirit_stone-300;s.last_practice_day:=today;s.practice_until:=greatest(now(),coalesce(s.practice_until,now()))+duration;
 end if;
 if p_action<>'get' then
  update private.player_resource_wallets set spirit_stone=w.spirit_stone,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_sect_states set last_salary_day=s.last_salary_day,last_practice_day=s.last_practice_day,practice_until=s.practice_until,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_'||p_action,p_request_id,jsonb_build_object('wallet_revision',w.revision));
 end if;
 return jsonb_build_object('sect',private.sect_snapshot(s),'wallet',private.cangji_wallet_json(w),'salary',coalesce(salary,0));
end $$;

create or replace function private.sect_practice_overlap_ticks(s private.player_sect_states,p_from timestamptz,p_ticks integer)
returns numeric language sql stable set search_path='' as $$
select case when s.practice_until is null or s.practice_until<=p_from then 0 else greatest(0,extract(epoch from least(s.practice_until,p_from+make_interval(secs=>p_ticks*5))-p_from)/5) end
$$;

alter function public.player_state_claim_elapsed(text,bigint,uuid) rename to player_state_claim_elapsed_sect_base;
create or replace function public.player_state_claim_elapsed(p_channel text,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());started timestamptz;result jsonb;ticks integer;overlap numeric;infused numeric:=0;s private.player_sect_states;c private.player_cave_states;w private.player_resource_wallets;bonus numeric:=0;rewards jsonb;
begin
 select last_settled_at into started from private.player_states where user_id=uid and channel=p_channel;
 result:=public.player_state_claim_elapsed_sect_base(p_channel,p_expected_revision,p_request_id);ticks:=coalesce((result->>'elapsed_ticks')::integer,0);if ticks<1 then return result;end if;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel;select * into c from private.player_cave_states where user_id=uid and channel=p_channel;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if s.user_id is not null then overlap:=private.sect_practice_overlap_ticks(s,started,ticks);infused:=private.infusion_overlap_ticks(c,'qi',started,ticks);bonus:=floor(coalesce((w.earning_profile->>'cultivation_rate')::numeric,0)*(4*overlap+.48*least(overlap,infused)));end if;
 if bonus>0 then update private.player_resource_wallets set cultivation=cultivation+bonus,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;rewards:=coalesce(result->'rewards','{}'::jsonb);rewards:=jsonb_set(rewards,'{free}',to_jsonb((coalesce((rewards->>'free')::numeric,0)+bonus)::text));result:=result||jsonb_build_object('rewards',rewards,'wallet_revision',w.revision);end if;
 return result;
end $$;

alter function public.offline_reward_prepare(text) rename to offline_reward_prepare_sect_base;
create or replace function public.offline_reward_prepare(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());started timestamptz;segment_start timestamptz;old_ticks integer:=0;result jsonb;total_ticks integer;added_ticks integer;overlap numeric;infused numeric:=0;s private.player_sect_states;c private.player_cave_states;w private.player_resource_wallets;v private.offline_reward_vaults;rewards jsonb;bonus numeric:=0;
begin
 select last_settled_at into started from private.player_states where user_id=uid and channel=p_channel;select coalesce(elapsed_ticks,0) into old_ticks from private.offline_reward_vaults where user_id=uid and channel=p_channel and status='pending';
 result:=public.offline_reward_prepare_sect_base(p_channel);total_ticks:=coalesce((result->>'elapsed_ticks')::integer,0);added_ticks:=greatest(0,total_ticks-coalesce(old_ticks,0));if added_ticks<1 then return result;end if;
 segment_start:=started+make_interval(secs=>old_ticks*5);select * into s from private.player_sect_states where user_id=uid and channel=p_channel;select * into c from private.player_cave_states where user_id=uid and channel=p_channel;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel;
 if s.user_id is not null then overlap:=private.sect_practice_overlap_ticks(s,segment_start,added_ticks);infused:=private.infusion_overlap_ticks(c,'qi',segment_start,added_ticks);bonus:=floor(coalesce((w.earning_profile->>'cultivation_rate')::numeric,0)*(4*overlap+.48*least(overlap,infused)));end if;
 if bonus>0 then select * into v from private.offline_reward_vaults where id=(result->>'vault_id')::uuid for update;rewards:=v.rewards;rewards:=jsonb_set(rewards,'{free}',to_jsonb((coalesce((rewards->>'free')::numeric,0)+bonus)::text));update private.offline_reward_vaults set rewards=rewards,updated_at=now() where id=v.id returning * into v;result:=result||jsonb_build_object('rewards',v.rewards);end if;
 return result;
end $$;

revoke execute on function public.player_sect_bootstrap(text,integer,boolean),public.player_sect_economy(text,text,bigint,bigint,uuid),public.player_state_claim_elapsed_sect_base(text,bigint,uuid),public.offline_reward_prepare_sect_base(text) from public,anon,authenticated;
grant execute on function public.player_sect_bootstrap(text,integer,boolean),public.player_sect_economy(text,text,bigint,bigint,uuid),public.player_state_claim_elapsed(text,bigint,uuid),public.offline_reward_prepare(text) to authenticated;
revoke all on function private.sect_snapshot(private.player_sect_states),private.sect_practice_overlap_ticks(private.player_sect_states,timestamptz,integer) from public,anon,authenticated;
