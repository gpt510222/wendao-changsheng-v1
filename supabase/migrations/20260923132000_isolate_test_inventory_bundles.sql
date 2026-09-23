alter function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid)rename to player_inventory_consume_bundle_without_channel_guard;
revoke all on function public.player_inventory_consume_bundle_without_channel_guard(text,text,integer,bigint,uuid)from public,anon,authenticated;

create function public.player_inventory_consume_bundle(p_channel text,p_item_key text,p_quantity integer,p_expected_wallet_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
begin
 if p_item_key in('testCultivationPillCount','testSpiritStoneTenMillionCount')and p_channel<>'test'then raise exception '測試道具不可於正式版使用';end if;
 return public.player_inventory_consume_bundle_without_channel_guard(p_channel,p_item_key,p_quantity,p_expected_wallet_revision,p_request_id);
end$$;

revoke execute on function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid)from public,anon;
grant execute on function public.player_inventory_consume_bundle(text,text,integer,bigint,uuid)to authenticated;
