-- The vault row is the durable idempotency key.  If the grant committed but the
-- HTTP response was lost, a retry returns the original receipt without crediting
-- the wallet a second time.
create or replace function public.offline_reward_claim(
  p_channel text,
  p_vault_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  vault private.offline_reward_vaults;
  wallet private.player_resource_wallets;
  r jsonb;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_vault_id is null or p_request_id is null then
    raise exception 'invalid request';
  end if;

  select * into vault from private.offline_reward_vaults
  where id=p_vault_id and user_id=uid and channel=p_channel for update;
  if vault.id is null or vault.status not in ('pending','claimed') then
    raise exception 'offline reward is unavailable';
  end if;

  select * into wallet from private.player_resource_wallets
  where user_id=uid and channel=p_channel for update;
  if wallet.user_id is null then raise exception 'resource wallet not initialized'; end if;

  r := vault.rewards;
  if vault.status='claimed' then
    return jsonb_build_object(
      'vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'status','claimed',
      'wallet_revision',wallet.revision,'rewards',r,'alreadyClaimed',true
    );
  end if;

  update private.player_resource_wallets set
    cultivation=cultivation+coalesce((r->>'free')::numeric,0),
    sword_essence=sword_essence+coalesce((r->>'swordEssence')::numeric,0),
    aura=aura+coalesce((r->>'aura')::numeric,0),
    spirit_stone=spirit_stone+coalesce((r->>'spiritStone')::numeric,0),
    food=food+coalesce((r->>'food')::numeric,0),
    wood=wood+coalesce((r->>'wood')::numeric,0),
    meteor_iron=meteor_iron+coalesce((r->>'meteorIron')::numeric,0),
    revision=revision+1,updated_at=now()
  where user_id=uid and channel=p_channel returning * into wallet;

  update private.offline_reward_vaults
  set status='claimed',claimed_at=now(),updated_at=now() where id=vault.id;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,wallet.revision,'offline_reward_claimed',p_request_id,
    jsonb_build_object('vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'rewards',r));

  return jsonb_build_object(
    'vault_id',vault.id,'elapsed_ticks',vault.elapsed_ticks,'status','claimed',
    'wallet_revision',wallet.revision,'rewards',r,'alreadyClaimed',false
  );
end $$;

revoke all on function public.offline_reward_claim(text,uuid,uuid) from public,anon;
grant execute on function public.offline_reward_claim(text,uuid,uuid) to authenticated;
