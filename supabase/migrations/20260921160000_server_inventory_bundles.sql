create or replace function private.inventory_bundle_reward(p_item_key text)
returns table(resource_key text,reward_amount numeric)
language plpgsql immutable set search_path='' as $$
begin
 if p_item_key='reputationspiritStone100Count' then return query select 'spiritStone',100::numeric;
 elsif p_item_key='reputationspiritStone1000Count' then return query select 'spiritStone',1000::numeric;
 elsif p_item_key='reputationspiritStone10000Count' then return query select 'spiritStone',10000::numeric;
 elsif p_item_key='reputationwood100Count' then return query select 'wood',100::numeric;
 elsif p_item_key='reputationwood1000Count' then return query select 'wood',1000::numeric;
 elsif p_item_key='reputationwood10000Count' then return query select 'wood',10000::numeric;
 elsif p_item_key='reputationmeteorIron100Count' then return query select 'meteorIron',100::numeric;
 elsif p_item_key='reputationmeteorIron1000Count' then return query select 'meteorIron',1000::numeric;
 elsif p_item_key='reputationmeteorIron10000Count' then return query select 'meteorIron',10000::numeric;
 elsif p_item_key='marketwood100Count' then return query select 'wood',100::numeric;
 elsif p_item_key='marketwood1000Count' then return query select 'wood',1000::numeric;
 elsif p_item_key='marketwood10000Count' then return query select 'wood',10000::numeric;
 elsif p_item_key='marketfood100Count' then return query select 'food',100::numeric;
 elsif p_item_key='marketfood1000Count' then return query select 'food',1000::numeric;
 elsif p_item_key='marketfood10000Count' then return query select 'food',10000::numeric;
 elsif p_item_key='marketmeteorIron100Count' then return query select 'meteorIron',100::numeric;
 elsif p_item_key='marketmeteorIron1000Count' then return query select 'meteorIron',1000::numeric;
 elsif p_item_key='marketmeteorIron10000Count' then return query select 'meteorIron',10000::numeric;
 elsif p_item_key='marketCultivationCasket1Count' then return query select 'free',106200::numeric;
 elsif p_item_key='marketCultivationCasket2Count' then return query select 'free',248400::numeric;
 elsif p_item_key='marketCultivationCasket3Count' then return query select 'free',531000::numeric;
 elsif p_item_key='marketCultivationCasket4Count' then return query select 'free',1135800::numeric;
 elsif p_item_key='marketCultivationCasket5Count' then return query select 'free',1632600::numeric;
 elsif p_item_key='testCultivationPillCount' then return query select 'free',1000000000::numeric;
 elsif p_item_key='testSpiritStoneTenMillionCount' then return query select 'spiritStone',10000000::numeric;
 end if;
end $$;

create or replace function public.player_inventory_consume_bundle(p_channel text,p_item_key text,p_quantity integer,p_expected_wallet_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());bundle record;balance_row private.player_mail_item_balances;w private.player_resource_wallets;quantity integer;total numeric;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_request_id is null then raise exception '請求資料不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的道具使用請求';end if;
 select * into bundle from private.inventory_bundle_reward(p_item_key);
 if bundle.resource_key is null then raise exception '此道具尚未開放伺服器使用';end if;
 quantity:=greatest(1,least(9999,coalesce(p_quantity,1)));
 perform pg_advisory_xact_lock(hashtext(uid::text||'-inventory-'||p_channel));
 select * into balance_row from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=p_item_key for update;
 if balance_row.user_id is null or balance_row.amount<quantity then raise exception '伺服器道具數量不足';end if;
 select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if w.user_id is null then raise exception '伺服器資源帳本尚未建立';end if;
 if p_expected_wallet_revision is not null and w.revision<>p_expected_wallet_revision then raise exception '資源已在其他裝置變更，請重新同步';end if;
 total:=bundle.reward_amount*quantity;
 update private.player_mail_item_balances set amount=amount-quantity,updated_at=now() where user_id=uid and channel=p_channel and item_key=p_item_key returning * into balance_row;
 update private.player_resource_wallets set
  cultivation=cultivation+case when bundle.resource_key='free' then total else 0 end,
  spirit_stone=spirit_stone+case when bundle.resource_key='spiritStone' then total::bigint else 0 end,
  food=food+case when bundle.resource_key='food' then total::bigint else 0 end,
  wood=wood+case when bundle.resource_key='wood' then total::bigint else 0 end,
  meteor_iron=meteor_iron+case when bundle.resource_key='meteorIron' then total::bigint else 0 end,
  revision=revision+1,updated_at=now()
 where user_id=uid and channel=p_channel returning * into w;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,w.revision,'inventory_bundle_consumed',p_request_id,jsonb_build_object('itemKey',p_item_key,'quantity',quantity,'resource',bundle.resource_key,'reward',total));
 return jsonb_build_object('wallet',private.wallet_snapshot(w),'itemBalances',jsonb_build_object(p_item_key,balance_row.amount),'resource',bundle.resource_key,'reward',total,'quantity',quantity);
end $$;

revoke all on function private.inventory_bundle_reward(text) from public,anon,authenticated;
revoke all on function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid) from public,anon;
grant execute on function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid) to authenticated;
