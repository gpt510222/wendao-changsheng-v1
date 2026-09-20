alter function public.player_state_claim_elapsed(text,bigint,uuid) rename to player_state_claim_elapsed_base;
alter function public.offline_reward_prepare(text) rename to offline_reward_prepare_base;

create or replace function private.infusion_overlap_ticks(c private.player_cave_states,p_path text,p_from timestamptz,p_ticks int)
returns numeric language sql stable set search_path='' as $$
select case when c.infusion_path=p_path and c.infusion_until is not null
then greatest(0,extract(epoch from least(p_from+make_interval(secs=>p_ticks*5),c.infusion_until)-greatest(p_from,c.infusion_until-interval '4 hours'))/5)
else 0 end $$;

create or replace function public.player_state_claim_elapsed(p_channel text,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); started timestamptz; result jsonb; ticks int; c private.player_cave_states; w private.player_resource_wallets; profile jsonb; bonus numeric:=0; rewards jsonb; path text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select last_settled_at into started from private.player_states where user_id=uid and channel=p_channel;
  result:=public.player_state_claim_elapsed_base(p_channel,p_expected_revision,p_request_id);
  ticks:=coalesce((result->>'elapsed_ticks')::int,0);
  if ticks<1 then return result; end if;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel for update;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  profile:=w.earning_profile;path:=c.infusion_path;
  if path='qi' then bonus:=floor(coalesce((profile->>'cultivation_rate')::numeric,0)*.12*private.infusion_overlap_ticks(c,'qi',started,ticks));
  elsif path='sword' then bonus:=floor(coalesce((profile->>'sword_rate')::numeric,0)*.12*private.infusion_overlap_ticks(c,'sword',started,ticks));end if;
  if bonus>0 then
    if path='qi' then update private.player_resource_wallets set cultivation=cultivation+bonus,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
    else update private.player_resource_wallets set sword_essence=sword_essence+bonus,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;end if;
    rewards:=coalesce(result->'rewards','{}'::jsonb);
    rewards:=jsonb_set(rewards,array[case when path='qi' then 'free' else 'swordEssence' end],to_jsonb((coalesce((rewards->>case when path='qi' then 'free' else 'swordEssence' end)::numeric,0)+bonus)::text));
    result:=jsonb_set(jsonb_set(result,'{rewards}',rewards),'{wallet_revision}',to_jsonb(w.revision));
  end if;
  return result;
end $$;

create or replace function public.offline_reward_prepare(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); started timestamptz; old_ticks int:=0; result jsonb; total_ticks int; added_ticks int; c private.player_cave_states; w private.player_resource_wallets; v private.offline_reward_vaults; profile jsonb; reward_data jsonb; bonus numeric:=0; path text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select last_settled_at into started from private.player_states where user_id=uid and channel=p_channel;
  select coalesce(elapsed_ticks,0) into old_ticks from private.offline_reward_vaults where user_id=uid and channel=p_channel and status='pending';
  result:=public.offline_reward_prepare_base(p_channel);
  total_ticks:=coalesce((result->>'elapsed_ticks')::int,0);added_ticks:=greatest(0,total_ticks-coalesce(old_ticks,0));
  if added_ticks<1 then return result;end if;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel;
  path:=c.infusion_path;profile:=w.earning_profile;
  if path='qi' then bonus:=floor(coalesce((profile->>'cultivation_rate')::numeric,0)*.12*private.infusion_overlap_ticks(c,'qi',started,added_ticks));
  elsif path='sword' then bonus:=floor(coalesce((profile->>'sword_rate')::numeric,0)*.12*private.infusion_overlap_ticks(c,'sword',started,added_ticks));end if;
  if bonus>0 then
    select * into v from private.offline_reward_vaults where id=(result->>'vault_id')::uuid for update;reward_data:=v.rewards;
    reward_data:=jsonb_set(reward_data,array[case when path='qi' then 'free' else 'swordEssence' end],to_jsonb((coalesce((reward_data->>case when path='qi' then 'free' else 'swordEssence' end)::numeric,0)+bonus)::text));
    update private.offline_reward_vaults set rewards=reward_data,updated_at=now() where id=v.id returning * into v;
    result:=jsonb_set(result,'{rewards}',v.rewards);
  end if;
  return result;
end $$;

create or replace function public.player_aura_infusion_get(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); c private.player_cave_states;
begin
  if uid is null then raise exception 'authentication required';end if;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel;
  return jsonb_build_object('revision',c.revision,'path',c.infusion_path,'until',c.infusion_until);
end $$;

revoke execute on function public.player_state_claim_elapsed_base(text,bigint,uuid),public.offline_reward_prepare_base(text) from public,anon,authenticated;
revoke execute on function public.player_state_claim_elapsed(text,bigint,uuid),public.offline_reward_prepare(text),public.player_aura_infusion_get(text) from public,anon;
grant execute on function public.player_state_claim_elapsed(text,bigint,uuid),public.offline_reward_prepare(text),public.player_aura_infusion_get(text) to authenticated;
