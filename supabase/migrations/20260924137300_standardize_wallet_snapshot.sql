-- Keep legacy top-level fields while also exposing the resources object expected
-- by all current browser command handlers.
create or replace function private.wallet_snapshot(w private.player_resource_wallets)
returns jsonb language sql immutable set search_path='' as $$
with values as (
 select jsonb_build_object(
  'free',w.cultivation::text,'swordEssence',w.sword_essence::text,'aura',w.aura::text,
  'spiritStone',w.spirit_stone::text,'food',w.food::text,'wood',w.wood::text,'meteorIron',w.meteor_iron::text
 ) resources
)
select jsonb_build_object('revision',w.revision,'resources',values.resources)||values.resources from values
$$;

revoke all on function private.wallet_snapshot(private.player_resource_wallets) from public,anon,authenticated;
