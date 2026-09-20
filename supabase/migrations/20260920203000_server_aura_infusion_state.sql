alter table private.player_cave_states
  add column if not exists infusion_path text check (infusion_path is null or infusion_path in ('qi','sword','body')),
  add column if not exists infusion_until timestamptz;

create or replace function public.player_aura_infusion(p_channel text,p_expected_wallet_revision bigint,p_expected_cave_revision bigint,p_request_id uuid,p_path text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); c private.player_cave_states; w private.player_resource_wallets; capacity numeric; cost numeric;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_request_id is null or p_path not in ('qi','sword','body') then raise exception 'invalid request'; end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request'; end if;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  select * into c from private.player_cave_states where user_id=uid and channel=p_channel for update;
  if w.user_id is null or c.user_id is null then raise exception 'player resources not initialized'; end if;
  if w.revision<>p_expected_wallet_revision or c.revision<>p_expected_cave_revision then raise exception 'resource revision conflict'; end if;
  if p_path='qi' and not c.spirit_path_opened or p_path='sword' and not c.sword_path_opened or p_path='body' and not c.body_path_opened then raise exception 'cultivation path locked'; end if;
  capacity:=floor(20000*power(c.spirit_pool_level::numeric,1.35));
  cost:=greatest(1000,floor(capacity*.2));
  if w.aura<cost then raise exception 'insufficient aura'; end if;
  update private.player_resource_wallets set aura=aura-cost,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_cave_states set infusion_path=p_path,infusion_until=now()+interval '4 hours',revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into c;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,w.revision,'aura_infusion_started',p_request_id,jsonb_build_object('path',p_path,'cost',cost::text,'until',c.infusion_until,'cave_revision',c.revision));
  return jsonb_build_object('wallet',private.wallet_snapshot(w),'cave_revision',c.revision,'path',c.infusion_path,'until',c.infusion_until,'cost',cost::text);
end $$;

revoke execute on function public.player_aura_infusion(text,bigint,bigint,uuid,text) from public,anon;
grant execute on function public.player_aura_infusion(text,bigint,bigint,uuid,text) to authenticated;
