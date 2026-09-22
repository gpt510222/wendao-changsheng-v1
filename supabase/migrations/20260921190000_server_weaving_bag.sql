create table if not exists private.player_weaving_states(
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 bag_rank integer not null default 1 check(bag_rank between 1 and 19),
 mending_silk integer not null default 0 check(mending_silk between 0 and 999999),
 job_tier integer check(job_tier between 1 and 9),
 job_amount integer check(job_amount between 1 and 55),
 job_started_at timestamptz,
 job_ready_at timestamptz,
 legacy_imported boolean not null default false,
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 primary key(user_id,channel),
 check((job_tier is null and job_amount is null and job_started_at is null and job_ready_at is null) or (job_tier is not null and job_amount is not null and job_started_at is not null and job_ready_at is not null))
);
alter table private.player_weaving_states enable row level security;
revoke all on private.player_weaving_states from public,anon,authenticated;

create or replace function private.weaving_snapshot(s private.player_weaving_states)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object(
 'revision',s.revision,'bagRank',s.bag_rank,'mendingSilk',s.mending_silk,'serverNow',floor(extract(epoch from now())*1000),
 'job',case when s.job_tier is null then null else jsonb_build_object('tier',s.job_tier,'amount',s.job_amount,'startAt',floor(extract(epoch from s.job_started_at)*1000),'endAt',floor(extract(epoch from s.job_ready_at)*1000),'status',case when now()>=s.job_ready_at then 'ready' else 'working' end) end
) $$;

create or replace function private.weaving_recipe(p_tier integer)
returns table(amount integer,years integer,wood_cost numeric,stone_cost numeric) language sql immutable set search_path='' as $$
 select a[p_tier],y[p_tier],w[p_tier],s[p_tier] from
 (select array[2,4,7,11,16,22,30,40,55] a,array[12,14,16,18,20,24,28,32,36] y,
 array[100,250,500,900,1500,2400,3600,5200,7500]::numeric[] w,
 array[500,1500,4000,10000,25000,60000,150000,400000,1000000]::numeric[] s) r
 where p_tier between 1 and 9
$$;

create or replace function public.player_weaving_bootstrap(p_channel text,p_legacy_bag_rank integer,p_legacy_mending_silk integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());st private.player_weaving_states;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-weaving-'||p_channel));
 insert into private.player_weaving_states(user_id,channel) values(uid,p_channel) on conflict do nothing;
 select * into st from private.player_weaving_states where user_id=uid and channel=p_channel for update;
 if not st.legacy_imported then
  update private.player_weaving_states set bag_rank=least(19,greatest(1,coalesce(p_legacy_bag_rank,1))),mending_silk=least(9999,greatest(0,coalesce(p_legacy_mending_silk,0))),legacy_imported=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into st;
  insert into private.player_state_events(user_id,channel,revision,event_type,payload) values(uid,p_channel,st.revision,'weaving_legacy_import',jsonb_build_object('bagRank',st.bag_rank,'mendingSilk',st.mending_silk));
 end if;
 return private.weaving_snapshot(st);
end $$;

create or replace function public.player_weaving_command(p_channel text,p_action text,p_tier integer,p_expected_wallet_revision bigint,p_expected_weaving_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());st private.player_weaving_states;w private.player_resource_wallets;p private.player_progression_states;r record;max_tier integer;upgrade_cost integer;costs integer[]:=array[10,15,22,30,40,52,66,82,100,120,142,166,192,220,250,282,316,352];
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_action not in('start','claim','upgrade') or p_request_id is null then raise exception '織天臺請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的織天臺請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-weaving-'||p_channel));
 select * into st from private.player_weaving_states where user_id=uid and channel=p_channel for update;
 if st.user_id is null or not st.legacy_imported then raise exception '伺服器織天臺尚未建立';end if;
 if p_expected_weaving_revision is not null and st.revision<>p_expected_weaving_revision then raise exception '儲物狀態已在其他裝置變更，請重新同步';end if;
 if p_action='start' then
  if st.job_tier is not null then raise exception '織天臺已在運作';end if;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
  if p.user_id is null then raise exception '伺服器修行進度尚未建立';end if;
  max_tier:=least(9,greatest(p.spirit_level/10+1,p.sword_level/10+1,p.body_level/4+1));
  if p_tier is null or p_tier<1 or p_tier>max_tier then raise exception '目前境界尚未解鎖此織法';end if;
  select * into r from private.weaving_recipe(p_tier);
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  if w.user_id is null then raise exception '伺服器資源帳本尚未建立';end if;
  if p_expected_wallet_revision is not null and w.revision<>p_expected_wallet_revision then raise exception '資源已在其他裝置變更，請重新同步';end if;
  if w.wood<r.wood_cost or w.spirit_stone<r.stone_cost then raise exception '織天臺所需木材或靈石不足';end if;
  update private.player_resource_wallets set wood=wood-r.wood_cost,spirit_stone=spirit_stone-r.stone_cost,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_weaving_states set job_tier=p_tier,job_amount=r.amount,job_started_at=now(),job_ready_at=now()+make_interval(secs=>r.years*900),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into st;
 elsif p_action='claim' then
  if st.job_tier is null then raise exception '目前沒有可領取的補天絲';end if;
  if now()<st.job_ready_at then raise exception '補天絲尚未織成';end if;
  update private.player_weaving_states set mending_silk=mending_silk+job_amount,job_tier=null,job_amount=null,job_started_at=null,job_ready_at=null,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into st;
 else
  if st.bag_rank>=19 then raise exception '儲物袋已達滿階';end if;
  upgrade_cost:=costs[st.bag_rank];
  if st.mending_silk<upgrade_cost then raise exception '補天絲不足';end if;
  update private.player_weaving_states set mending_silk=mending_silk-upgrade_cost,bag_rank=bag_rank+1,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into st;
 end if;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,st.revision,'weaving_'||p_action,p_request_id,jsonb_build_object('tier',p_tier,'bagRank',st.bag_rank,'mendingSilk',st.mending_silk));
 return jsonb_build_object('weaving',private.weaving_snapshot(st),'wallet',case when w.user_id is null then null else private.wallet_snapshot(w) end);
end $$;

revoke all on function private.weaving_snapshot(private.player_weaving_states),private.weaving_recipe(integer) from public,anon,authenticated;
revoke execute on function public.player_weaving_bootstrap(text,integer,integer),public.player_weaving_command(text,text,integer,bigint,bigint,uuid) from public,anon;
grant execute on function public.player_weaving_bootstrap(text,integer,integer),public.player_weaving_command(text,text,integer,bigint,bigint,uuid) to authenticated;
