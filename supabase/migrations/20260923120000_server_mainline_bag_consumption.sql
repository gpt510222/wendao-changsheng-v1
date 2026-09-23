alter function private.inventory_bundle_reward(text)rename to inventory_bundle_reward_pre_mainline;
create or replace function private.inventory_bundle_reward(p_item_key text)returns table(resource_key text,reward_amount numeric)language plpgsql immutable set search_path=''as $$
begin
 if p_item_key='mainlineSpiritStoneBag'then return query select 'spiritStone',1::numeric;return;
 elsif p_item_key='mainlineWoodBag'then return query select 'wood',1::numeric;return;
 elsif p_item_key='mainlineIronBag'then return query select 'meteorIron',1::numeric;return;
 elsif p_item_key='mainlineFoodBag'then return query select 'food',1::numeric;return;
 end if;
 return query select * from private.inventory_bundle_reward_pre_mainline(p_item_key);
end$$;
revoke all on function private.inventory_bundle_reward_pre_mainline(text),private.inventory_bundle_reward(text)from public,anon,authenticated;

