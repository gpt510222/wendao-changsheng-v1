create or replace function public.player_resource_wallet_bootstrap(p_channel text,p_resources jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());wallet private.player_resource_wallets;source jsonb;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')or p_resources is null or jsonb_typeof(p_resources)<>'object'then raise exception 'invalid request';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then p_resources else private.sealed_legacy_state(uid,p_channel)end;
 insert into private.player_resource_wallets(user_id,channel,cultivation,sword_essence,aura,spirit_stone,food,wood,meteor_iron)
 values(uid,p_channel,private.legacy_resource_amount(source,'free'),private.legacy_resource_amount(source,'swordEssence'),private.legacy_resource_amount(source,'aura'),private.legacy_resource_amount(source,'spiritStone'),private.legacy_resource_amount(source,'food'),private.legacy_resource_amount(source,'wood'),private.legacy_resource_amount(source,'meteorIron'))on conflict(user_id,channel)do nothing;
 select * into wallet from private.player_resource_wallets where user_id=uid and channel=p_channel;
 if wallet.revision=1 and not exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.event_type='resource_wallet_legacy_import')then insert into private.player_state_events(user_id,channel,revision,event_type,payload)values(uid,p_channel,1,'resource_wallet_legacy_import',jsonb_build_object('wallet_revision',wallet.revision,'source','sealed'));end if;
 return jsonb_build_object('revision',wallet.revision,'migration_status',wallet.migration_status,'resources',jsonb_build_object('free',wallet.cultivation::text,'swordEssence',wallet.sword_essence::text,'aura',wallet.aura::text,'spiritStone',wallet.spirit_stone::text,'food',wallet.food::text,'wood',wallet.wood::text,'meteorIron',wallet.meteor_iron::text));
end $$;

