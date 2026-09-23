create table if not exists private.player_partner_states(
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 established boolean not null default false,
 partner_name text not null default '',
 partner_gender text not null default '',
 partner_route text not null default '',
 personality text not null default '',
 partnered_at_year bigint not null default 0,
 active_route text not null default '',
 active_from timestamptz,
 active_until timestamptz,
 cooldown_until timestamptz,
 legacy_imported boolean not null default false,
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key(user_id,channel),
 check(partner_gender in('','男','女')),
 check(partner_route in('','qi','sword','body')),
 check(active_route in('','qi','sword','body')),
 check(personality in('','warm','reserved','free','devoted'))
);
alter table private.player_partner_states enable row level security;
revoke all on private.player_partner_states from public,anon,authenticated;

create or replace function private.partner_snapshot(s private.player_partner_states)
returns jsonb language sql stable set search_path='' as $$select jsonb_build_object(
 'revision',s.revision,'established',s.established,'partnerName',s.partner_name,'partnerGender',s.partner_gender,
 'partnerRoute',s.partner_route,'personality',s.personality,'partneredAtYear',s.partnered_at_year,
 'activeRoute',case when s.active_until>now()then s.active_route else '' end,
 'activeFrom',case when s.active_until>now()then s.active_from else null end,
 'activeUntil',case when s.active_until>now()then s.active_until else null end,
 'cooldownUntil',s.cooldown_until,'serverTime',now()
)$$;

create or replace function private.partner_overlap_ticks(s private.player_partner_states,p_route text,p_from timestamptz,p_ticks integer)
returns numeric language sql stable set search_path='' as $$select case when s.established and s.active_route=p_route then greatest(0,extract(epoch from least(p_from+make_interval(secs=>p_ticks*5),coalesce(s.active_until,p_from))-greatest(p_from,coalesce(s.active_from,p_from)))/5) else 0 end$$;

create or replace function public.player_partner_bootstrap(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;ps jsonb;s private.player_partner_states;est boolean:=false;
begin
 if uid is null or p_channel not in('formal','test')then raise exception '請求資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-partner-'||p_channel));
 insert into private.player_partner_states(user_id,channel)values(uid,p_channel)on conflict do nothing;
 select * into s from private.player_partner_states where user_id=uid and channel=p_channel for update;
 if not s.legacy_imported then
  source:=private.sealed_legacy_state(uid,p_channel);ps:=source->'partnerSystem';est:=coalesce((ps->>'established')::boolean,false);
  update private.player_partner_states set established=est,
   partner_name=case when est then left(coalesce(ps#>>'{partner,name}',''),8)else''end,
   partner_gender=case when est and ps#>>'{partner,gender}'in('男','女')then ps#>>'{partner,gender}'else''end,
   partner_route=case when est and ps#>>'{partner,route}'in('qi','sword','body')then ps#>>'{partner,route}'else''end,
   personality=case when est and ps#>>'{partner,personality}'in('warm','reserved','free','devoted')then ps#>>'{partner,personality}'else''end,
   partnered_at_year=case when est then greatest(0,coalesce((ps->>'partneredAtYear')::bigint,0))else 0 end,
   legacy_imported=true,revision=revision+1,updated_at=now()
  where user_id=uid and channel=p_channel returning * into s;
 end if;
 return private.partner_snapshot(s);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '封存道侶資料不正確';end$$;

create or replace function public.player_partner_practice(p_channel text,p_route text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_partner_states;p private.player_progression_states;
begin
 if uid is null or p_channel not in('formal','test')or p_route not in('qi','sword','body')or p_request_id is null then raise exception '請求資料不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-partner-'||p_channel));
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複的同修請求';end if;
 select * into s from private.player_partner_states where user_id=uid and channel=p_channel for update;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if s.user_id is null or not s.established then raise exception '尚未結為道侶';end if;
 if s.cooldown_until>now()then raise exception '同修心境尚未平復';end if;
 if(p_route='qi'and not p.spirit_path_opened)or(p_route='sword'and not p.sword_path_opened)or(p_route='body'and not p.body_path_opened)then raise exception '尚未開啟此道途';end if;
 update private.player_partner_states set active_route=p_route,active_from=now(),active_until=now()+interval '24 hours',cooldown_until=now()+interval '48 hours',revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,s.revision,'partner_practice_started',p_request_id,jsonb_build_object('route',p_route,'active_until',s.active_until,'cooldown_until',s.cooldown_until));
 return private.partner_snapshot(s);
end$$;

alter function public.player_state_claim_elapsed(text,bigint,uuid) rename to player_state_claim_elapsed_partner_base;
create or replace function public.player_state_claim_elapsed(p_channel text,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());started timestamptz;result jsonb;ticks integer;ps private.player_partner_states;w private.player_resource_wallets;qi_ticks numeric;sword_ticks numeric;qi_bonus numeric:=0;sword_bonus numeric:=0;r jsonb;
begin
 select last_settled_at into started from private.player_states where user_id=uid and channel=p_channel;
 result:=public.player_state_claim_elapsed_partner_base(p_channel,p_expected_revision,p_request_id);ticks:=coalesce((result->>'elapsed_ticks')::integer,0);if ticks<1 then return result;end if;
 select * into ps from private.player_partner_states where user_id=uid and channel=p_channel;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if ps.user_id is not null then qi_ticks:=private.partner_overlap_ticks(ps,'qi',started,ticks);sword_ticks:=private.partner_overlap_ticks(ps,'sword',started,ticks);qi_bonus:=floor(coalesce((w.earning_profile->>'cultivation_rate')::numeric,0)*.03*qi_ticks);sword_bonus:=floor(coalesce((w.earning_profile->>'sword_rate')::numeric,0)*.03*sword_ticks);end if;
 if qi_bonus>0 or sword_bonus>0 then update private.player_resource_wallets set cultivation=cultivation+qi_bonus,sword_essence=sword_essence+sword_bonus,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into w;r:=coalesce(result->'rewards','{}'::jsonb);r:=jsonb_set(r,'{free}',to_jsonb((coalesce((r->>'free')::numeric,0)+qi_bonus)::text));r:=jsonb_set(r,'{swordEssence}',to_jsonb((coalesce((r->>'swordEssence')::numeric,0)+sword_bonus)::text));result:=result||jsonb_build_object('rewards',r,'wallet_revision',w.revision);end if;return result;
end$$;

alter function public.offline_reward_prepare(text) rename to offline_reward_prepare_partner_base;
create or replace function public.offline_reward_prepare(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());started timestamptz;segment_start timestamptz;old_ticks integer:=0;result jsonb;total_ticks integer;added_ticks integer;ps private.player_partner_states;w private.player_resource_wallets;v private.offline_reward_vaults;qi_bonus numeric:=0;sword_bonus numeric:=0;r jsonb;
begin
 select last_settled_at into started from private.player_states where user_id=uid and channel=p_channel;select coalesce(elapsed_ticks,0)into old_ticks from private.offline_reward_vaults where user_id=uid and channel=p_channel and status='pending';result:=public.offline_reward_prepare_partner_base(p_channel);total_ticks:=coalesce((result->>'elapsed_ticks')::integer,0);added_ticks:=greatest(0,total_ticks-old_ticks);if added_ticks<1 then return result;end if;segment_start:=started+make_interval(secs=>old_ticks*5);
 select * into ps from private.player_partner_states where user_id=uid and channel=p_channel;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel;
 if ps.user_id is not null then qi_bonus:=floor(coalesce((w.earning_profile->>'cultivation_rate')::numeric,0)*.03*private.partner_overlap_ticks(ps,'qi',segment_start,added_ticks));sword_bonus:=floor(coalesce((w.earning_profile->>'sword_rate')::numeric,0)*.03*private.partner_overlap_ticks(ps,'sword',segment_start,added_ticks));end if;
 if qi_bonus>0 or sword_bonus>0 then select * into v from private.offline_reward_vaults where id=(result->>'vault_id')::uuid for update;r:=v.rewards;r:=jsonb_set(r,'{free}',to_jsonb((coalesce((r->>'free')::numeric,0)+qi_bonus)::text));r:=jsonb_set(r,'{swordEssence}',to_jsonb((coalesce((r->>'swordEssence')::numeric,0)+sword_bonus)::text));update private.offline_reward_vaults set rewards=r,updated_at=now()where id=v.id returning * into v;result:=result||jsonb_build_object('rewards',v.rewards);end if;return result;
end$$;

revoke all on function private.partner_snapshot(private.player_partner_states),private.partner_overlap_ticks(private.player_partner_states,text,timestamptz,integer),public.player_state_claim_elapsed_partner_base(text,bigint,uuid),public.offline_reward_prepare_partner_base(text)from public,anon,authenticated;
revoke execute on function public.player_partner_bootstrap(text),public.player_partner_practice(text,text,uuid),public.player_state_claim_elapsed(text,bigint,uuid),public.offline_reward_prepare(text)from public,anon;
grant execute on function public.player_partner_bootstrap(text),public.player_partner_practice(text,text,uuid),public.player_state_claim_elapsed(text,bigint,uuid),public.offline_reward_prepare(text)to authenticated;
