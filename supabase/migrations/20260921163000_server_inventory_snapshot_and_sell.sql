create or replace function public.player_inventory_get(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());items jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 select coalesce(jsonb_object_agg(item_key,amount),'{}'::jsonb) into items from private.player_mail_item_balances where user_id=uid and channel=p_channel;
 return jsonb_build_object('itemBalances',items);
end $$;

create or replace function public.player_inventory_sell(p_channel text,p_item_key text,p_quantity integer,p_expected_wallet_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());b private.player_mail_item_balances;w private.player_resource_wallets;quantity integer;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_request_id is null or p_item_key is null or length(p_item_key)>120 then raise exception '請求資料不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的出售請求';end if;
 quantity:=greatest(1,least(9999,coalesce(p_quantity,1)));
 perform pg_advisory_xact_lock(hashtext(uid::text||'-inventory-sell-'||p_channel));
 select * into b from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=p_item_key for update;
 if b.user_id is null or b.amount<quantity then raise exception '伺服器道具數量不足';end if;
 select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if w.user_id is null then raise exception '伺服器資源帳本尚未建立';end if;
 if p_expected_wallet_revision is not null and w.revision<>p_expected_wallet_revision then raise exception '資源已在其他裝置變更，請重新同步';end if;
 update private.player_mail_item_balances set amount=amount-quantity,updated_at=now() where user_id=uid and channel=p_channel and item_key=p_item_key returning * into b;
 update private.player_resource_wallets set spirit_stone=spirit_stone+quantity,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,w.revision,'inventory_item_sold',p_request_id,jsonb_build_object('itemKey',p_item_key,'quantity',quantity,'spiritStone',quantity));
 return jsonb_build_object('wallet',private.wallet_snapshot(w),'itemBalances',jsonb_build_object(p_item_key,b.amount),'quantity',quantity,'earned',quantity);
end $$;

revoke all on function public.player_inventory_get(text),public.player_inventory_sell(text,text,integer,bigint,uuid) from public,anon;
grant execute on function public.player_inventory_get(text),public.player_inventory_sell(text,text,integer,bigint,uuid) to authenticated;
